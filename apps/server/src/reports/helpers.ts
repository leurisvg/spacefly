import { daysBetween, monthsInRange, type Amount, type Period } from '@spacefly/shared';
import type { Account } from '../core/firefly-data';
import { isExpense, isIncome, round, signOf, type ReportContext, type Split } from '../core/ledger';
import type { FfBudget, FfBudgetLimit, FfResource } from '../firefly/firefly.types';

export function amount(ctx: ReportContext, value: number, splits: Split[], signed = true): Amount {
  const parts = ctx.parts(splits, signed);
  return parts ? { value: round(value), parts } : { value: round(value) };
}

export interface Totals {
  income: number;
  expense: number;
  net: number;
}

export function totals(ctx: ReportContext, splits: Split[]): Totals {
  let income = 0;
  let expense = 0;
  for (const s of splits) {
    if (isIncome(s)) income += ctx.value(s);
    else if (isExpense(s)) expense += ctx.value(s);
  }
  return { income: round(income), expense: round(expense), net: round(income - expense) };
}

export function savingsRate(t: Totals): number {
  return t.income > 0 ? round((t.net / t.income) * 100, 1) : 0;
}

/** Signed per-category totals (earned − spent), like Firefly's category spent/earned. */
export function categoryTotals(ctx: ReportContext, splits: Split[]) {
  const map = new Map<string | null, { name: string; spent: number; earned: number; splits: Split[] }>();
  for (const s of splits) {
    const sign = signOf(s);
    if (!sign) continue;
    const key = s.categoryId;
    const entry = map.get(key) ?? { name: s.categoryName ?? '', spent: 0, earned: 0, splits: [] };
    const v = ctx.value(s);
    if (sign > 0) entry.earned += v;
    else entry.spent += v;
    entry.splits.push(s);
    map.set(key, entry);
  }
  return map;
}

export function sumBy<T>(items: T[], fn: (t: T) => number): number {
  let total = 0;
  for (const i of items) total += fn(i);
  return total;
}

/**
 * Budget limit applicable to a period, in the display currency. Limits overlapping the
 * period are pro-rated by days; auto-budgets without a stored limit fall back to their amount.
 */
export function budgetLimitFor(
  ctx: ReportContext,
  budget: FfResource<FfBudget>,
  limits: FfResource<FfBudgetLimit>[],
  period: Period,
): { value: number; currency: string; original: number } {
  let value = 0;
  let original = 0;
  let currency = '';
  for (const l of limits) {
    if (l.attributes.budget_id !== budget.id) continue;
    const ls = l.attributes.start.slice(0, 10);
    const le = l.attributes.end.slice(0, 10);
    const os = ls > period.start ? ls : period.start;
    const oe = le < period.end ? le : period.end;
    if (os > oe) continue;
    const share = daysBetween(os, oe) / daysBetween(ls, le);
    const cur = l.attributes.currency_code || ctx.primary;
    const amt = Number(l.attributes.amount) * share;
    currency = cur;
    original += amt;
    value += ctx.convert(amt, cur, ls);
  }
  if (value === 0) {
    const a = budget.attributes;
    const auto = Number(a.auto_budget_amount ?? 0);
    if (auto > 0 && a.auto_budget_period === 'monthly') {
      const months = monthsInRange(period.start, period.end).length;
      const cur = a.currency_code || ctx.primary;
      currency = cur;
      original = auto * months;
      value = ctx.convert(original, cur, period.start);
    }
  }
  return { value: round(value), currency: currency || ctx.primary, original: round(original) };
}

/** Asset accounts considered "savings" (excludes credit cards and user exclusions). */
export function savingsAccounts(accounts: Account[], excluded: string[]): Account[] {
  const ex = new Set(excluded);
  return accounts.filter((a) => !a.isCreditCard && !ex.has(a.id));
}

export function balanceIn(ctx: ReportContext, a: Account, date: string): number {
  if (a.currency === ctx.currency) return a.balance;
  if (ctx.currency === ctx.primary && a.pcBalance !== null && a.currency !== ctx.primary) return a.pcBalance;
  return ctx.convert(a.balance, a.currency, date);
}

export function netWorthOf(ctx: ReportContext, accounts: Account[], date: string): number {
  return round(sumBy(accounts.filter((a) => a.includeNetWorth), (a) => balanceIn(ctx, a, date)));
}

export function topN<T>(items: T[], n: number, by: (t: T) => number): T[] {
  return [...items].sort((a, b) => by(b) - by(a)).slice(0, n);
}
