import type { AssetActivityRow, BudgetRow, CategoryRow, MonthlyReport, Period, SavingsSeries } from '@shared';
import type { Account } from '../core/firefly-data';
import { isExpense, isIncome, round, type ReportContext, type Split } from '../core/ledger';
import type { FfBudget, FfBudgetLimit, FfResource } from '../firefly/firefly.types';
import {
  amount,
  balanceIn,
  budgetLimitFor,
  categoryTotals,
  netWorthOf,
  savingsAccounts,
  savingsRate,
  topN,
  totals,
} from './helpers';

export interface MonthlyInput {
  ctx: ReportContext;
  splits: Split[];
  previousSplits: Split[];
  previousPeriod: Period;
  ytdSplits: Split[];
  categories: { id: string; name: string }[];
  budgets: FfResource<FfBudget>[];
  limits: FfResource<FfBudgetLimit>[];
  /** Asset accounts at each month end, oldest first (for the savings chart). */
  balances: { month: string; date: string; accounts: Account[] }[];
  /** Asset + liability accounts at the end of the period (net worth). */
  netWorthAccounts: Account[];
  excludedAccounts: string[];
}

export function buildMonthly(input: MonthlyInput): MonthlyReport {
  const { ctx, splits } = input;
  const t = totals(ctx, splits);

  return {
    kpis: { earned: t.income, spent: t.expense, net: t.net, savingsRate: savingsRate(t) },
    ...buildCategories(input),
    previousPeriod: input.previousPeriod,
    ...buildBudgets(ctx, splits, input.budgets, input.limits),
    topExpenses: topN(splits.filter(isExpense), 5, (s) => ctx.value(s)).map((s) => ctx.row(s)),
    assets: buildAssetActivity(ctx, splits),
    savings: buildSavingsSeries(ctx, input.balances, input.excludedAccounts),
    overview: {
      month: summaryBlock(ctx, splits),
      ytd: summaryBlock(ctx, input.ytdSplits),
      netWorth: { value: netWorthOf(ctx, input.netWorthAccounts, ctx.period.end) },
    },
  };
}

/** Category table: sorted by |total| desc, with zero-activity categories grouped (email parity). */
export function buildCategories(input: Pick<MonthlyInput, 'ctx' | 'splits' | 'previousSplits' | 'categories'>) {
  const { ctx } = input;
  const current = categoryTotals(ctx, input.splits);
  const previous = categoryTotals(ctx, input.previousSplits);
  const rows: CategoryRow[] = [];
  for (const [id, c] of current) {
    const total = c.earned - c.spent;
    const prev = previous.get(id);
    rows.push({
      id,
      name: c.name,
      total: amount(ctx, total, c.splits),
      spent: round(c.spent),
      earned: round(c.earned),
      previous: prev ? round(prev.earned - prev.spent) : 0,
    });
  }
  rows.sort((a, b) => Number(a.total.value === 0) - Number(b.total.value === 0) || Math.abs(b.total.value) - Math.abs(a.total.value));
  const active = new Set(rows.filter((r) => r.total.value !== 0).map((r) => r.id));
  const zeroCategories = input.categories
    .filter((c) => !active.has(c.id))
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b));
  return { categories: rows.filter((r) => r.total.value !== 0), zeroCategories };
}

export function buildBudgets(
  ctx: ReportContext,
  splits: Split[],
  budgets: FfResource<FfBudget>[],
  limits: FfResource<FfBudgetLimit>[],
): { budgets: BudgetRow[]; zeroBudgets: { names: string[]; limit: number } } {
  const rows: BudgetRow[] = [];
  for (const b of budgets) {
    if (!b.attributes.active) continue;
    const own = splits.filter((s) => isExpense(s) && s.budgetId === b.id);
    const spent = round(own.reduce((sum, s) => sum + ctx.value(s), 0));
    const limit = budgetLimitFor(ctx, b, limits, ctx.period);
    if (!limit.value && !spent) continue;
    const limitParts =
      limit.currency !== ctx.currency && limit.original
        ? [{ original: limit.original, currency: limit.currency, rate: limit.value / limit.original }]
        : undefined;
    rows.push({
      id: b.id,
      name: b.attributes.name,
      limit: limitParts ? { value: limit.value, parts: limitParts } : { value: limit.value },
      spent: amount(ctx, spent, own, false),
      remaining: round(limit.value - spent),
      pct: limit.value > 0 ? spent / limit.value : null,
    });
  }
  rows.sort((a, b) => Number(a.spent.value === 0) - Number(b.spent.value === 0) || b.spent.value - a.spent.value);
  const zero = rows.filter((r) => r.spent.value === 0);
  return {
    budgets: rows.filter((r) => r.spent.value !== 0),
    zeroBudgets: { names: zero.map((r) => r.name), limit: round(zero.reduce((s, r) => s + r.limit.value, 0)) },
  };
}

export function buildAssetActivity(ctx: ReportContext, splits: Split[]): AssetActivityRow[] {
  const map = new Map<string, { name: string; income: Split[]; expense: Split[] }>();
  const entry = (id: string, name: string) => {
    const e = map.get(id) ?? { name, income: [], expense: [] };
    map.set(id, e);
    return e;
  };
  for (const s of splits) {
    if (isIncome(s) && s.destId) entry(s.destId, s.destName).income.push(s);
    else if (isExpense(s) && s.sourceId) entry(s.sourceId, s.sourceName).expense.push(s);
  }
  const rows: AssetActivityRow[] = [...map.entries()].map(([id, e]) => {
    const income = round(ctx.sum(e.income));
    const expense = round(ctx.sum(e.expense));
    return {
      id,
      name: e.name,
      income,
      expense,
      net: round(income - expense),
      topIncome: topN(e.income, 5, (s) => ctx.value(s)).map((s) => ctx.row(s)),
      topExpenses: topN(e.expense, 5, (s) => ctx.value(s)).map((s) => ctx.row(s)),
    };
  });
  return rows.sort((a, b) => b.net - a.net);
}

export function buildSavingsSeries(
  ctx: ReportContext,
  balances: { month: string; date: string; accounts: Account[] }[],
  excluded: string[],
): SavingsSeries {
  const months = balances.map((b) => b.month);
  const series = new Map<string, { id: string; name: string; currency: string; balances: number[] }>();
  balances.forEach((snap, i) => {
    for (const a of savingsAccounts(snap.accounts, excluded)) {
      const s = series.get(a.id) ?? { id: a.id, name: a.name, currency: a.currency, balances: months.map(() => 0) };
      s.balances[i] = round(balanceIn(ctx, a, snap.date));
      series.set(a.id, s);
    }
  });
  return { months, accounts: [...series.values()].filter((s) => s.balances.some((v) => v !== 0)) };
}

function summaryBlock(ctx: ReportContext, splits: Split[]) {
  const income = splits.filter(isIncome);
  const expense = splits.filter(isExpense);
  const t = totals(ctx, splits);
  return {
    earned: amount(ctx, t.income, income, false),
    spent: amount(ctx, t.expense, expense, false),
    net: amount(ctx, t.net, [...income, ...expense]),
  };
}
