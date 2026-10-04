import { daysBetween, endOfMonth, todayIso, type BudgetsReport, type Period } from '@spacefly/shared';
import { isExpense, round, type ReportContext, type Split } from '../core/ledger';
import type { FfAvailableBudget, FfBudget, FfBudgetLimit, FfResource } from '../firefly/firefly.types';
import { budgetLimitFor } from './helpers';

export interface BudgetsInput {
  ctx: ReportContext;
  splits: Split[];
  budgets: FfResource<FfBudget>[];
  limits: FfResource<FfBudgetLimit>[];
  available: FfResource<FfAvailableBudget>[];
  /** 12 months of splits + limits ending at the period end, for compliance history. */
  historySplits: Split[];
  historyLimits: FfResource<FfBudgetLimit>[];
  months: string[];
}

export function buildBudgets(input: BudgetsInput): BudgetsReport {
  const { ctx, splits } = input;
  const p = ctx.period;
  const today = todayIso();
  const total = daysBetween(p.start, p.end);
  const elapsed = today < p.start ? 0 : today > p.end ? total : daysBetween(p.start, today);
  const elapsedRatio = elapsed / total;
  const expenses = splits.filter(isExpense);

  const budgets = input.budgets
    .filter((b) => b.attributes.active)
    .map((b) => {
      const own = expenses.filter((s) => s.budgetId === b.id);
      const spent = round(ctx.sum(own));
      const limit = budgetLimitFor(ctx, b, input.limits, p).value;
      const cats = new Map<string | null, { name: string; value: number }>();
      for (const s of own) {
        const c = cats.get(s.categoryId) ?? { name: s.categoryName ?? '', value: 0 };
        c.value += ctx.value(s);
        cats.set(s.categoryId, c);
      }
      const history = input.months.map((month) => {
        const mp: Period = { start: `${month}-01`, end: endOfMonth(`${month}-01`) };
        const mSpent = input.historySplits
          .filter((s) => isExpense(s) && s.budgetId === b.id && s.date.startsWith(month))
          .reduce((sum, s) => sum + ctx.value(s), 0);
        return { month, limit: budgetLimitFor(ctx, b, input.historyLimits, mp).value, spent: round(mSpent) };
      });
      const a = b.attributes;
      return {
        id: b.id,
        name: a.name,
        limit,
        spent,
        remaining: round(limit - spent),
        pct: limit > 0 ? spent / limit : null,
        autoBudget: {
          type: a.auto_budget_type ?? null,
          period: a.auto_budget_period ?? null,
          amount: a.auto_budget_amount ? Number(a.auto_budget_amount) : null,
        },
        projected: elapsed > 0 && elapsed < total ? round((spent / elapsed) * total) : null,
        categories: [...cats.entries()]
          .map(([id, c]) => ({ id, name: c.name, value: round(c.value) }))
          .sort((x, y) => y.value - x.value),
        history,
      };
    })
    .filter((b) => b.limit > 0 || b.spent > 0 || b.history.some((h) => h.spent > 0))
    .sort((x, y) => y.spent - x.spent);

  const spentInBudgets = round(ctx.sum(expenses.filter((s) => s.budgetId)));
  const unbudgeted = round(ctx.sum(expenses.filter((s) => !s.budgetId)));
  let availableAmount = 0;
  for (const ab of input.available) {
    const s = ab.attributes.start.slice(0, 10);
    const e = ab.attributes.end.slice(0, 10);
    const os = s > p.start ? s : p.start;
    const oe = e < p.end ? e : p.end;
    if (os > oe) continue;
    const share = daysBetween(os, oe) / daysBetween(s, e);
    availableAmount += ctx.convert(Number(ab.attributes.amount) * share, ab.attributes.currency_code || ctx.primary, s);
  }

  return {
    available: input.available.length
      ? { amount: round(availableAmount), spentInBudgets, spentOutsideBudgets: unbudgeted }
      : null,
    budgets,
    unbudgeted,
    elapsedRatio,
  };
}
