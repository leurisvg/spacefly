import type { AnnualReport, CompareReport, CompareRow, GroupBy, Period } from '@spacefly/shared';
import { isExpense, isIncome, round, type ReportContext, type Split } from '../core/ledger';
import { totals } from './helpers';
import { aggregate, keyFns, kindFilter } from './ranking.report';

/** Period A vs period B grouped by category/tag/budget/account/merchant. */
export function buildCompare(
  ctx: ReportContext,
  groupBy: GroupBy,
  kind: 'expense' | 'income',
  a: { period: Period; splits: Split[] },
  b: { period: Period; splits: Split[] },
  trendSplits: Split[],
  months: string[],
): CompareReport {
  const filter = kindFilter(kind);
  const aggA = aggregate(ctx, a.splits.filter(filter), keyFns[groupBy]);
  const aggB = aggregate(ctx, b.splits.filter(filter), keyFns[groupBy]);
  const ids = new Set([...aggA.keys(), ...aggB.keys()]);
  const rows: CompareRow[] = [...ids].map((id) => {
    const va = round(aggA.get(id)?.value ?? 0);
    const vb = round(aggB.get(id)?.value ?? 0);
    const delta = round(va - vb);
    return {
      id,
      name: aggA.get(id)?.name ?? aggB.get(id)?.name ?? '',
      a: va,
      b: vb,
      delta,
      pct: vb !== 0 ? delta / Math.abs(vb) : null,
    };
  });
  rows.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  const ta = totals(ctx, a.splits);
  const tb = totals(ctx, b.splits);
  return {
    groupBy,
    a: { ...a.period, income: ta.income, expense: ta.expense },
    b: { ...b.period, income: tb.income, expense: tb.expense },
    rows,
    trend: monthlyTotals(ctx, trendSplits, months),
  };
}

export function monthlyTotals(ctx: ReportContext, splits: Split[], months: string[]) {
  const map = new Map(months.map((m) => [m, { income: 0, expense: 0 }]));
  for (const s of splits) {
    const e = map.get(s.date.slice(0, 7));
    if (!e) continue;
    if (isIncome(s)) e.income += ctx.value(s);
    else if (isExpense(s)) e.expense += ctx.value(s);
  }
  return months.map((month) => {
    const e = map.get(month)!;
    return { month, income: round(e.income), expense: round(e.expense) };
  });
}

/** Year view: month × category matrix, monthly totals, best/worst month and averages. */
export function buildAnnual(ctx: ReportContext, year: number, splits: Split[], lastMonth: string): AnnualReport {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  const idx = new Map(months.map((m, i) => [m, i]));
  const cats = new Map<string | null, { name: string; values: number[] }>();
  const income = months.map(() => 0);
  const expense = months.map(() => 0);
  for (const s of splits) {
    const i = idx.get(s.date.slice(0, 7));
    if (i === undefined) continue;
    const v = ctx.value(s);
    if (isIncome(s)) income[i] += v;
    else if (isExpense(s)) {
      expense[i] += v;
      const c = cats.get(s.categoryId) ?? { name: s.categoryName ?? '', values: months.map(() => 0) };
      c.values[i] += v;
      cats.set(s.categoryId, c);
    }
  }
  const categories = [...cats.entries()]
    .map(([id, c]) => {
      const values = c.values.map((v) => round(v));
      return { id, name: c.name, values, total: round(values.reduce((a, b) => a + b, 0)) };
    })
    .sort((a, b) => b.total - a.total);

  const elapsed = months.filter((m) => m <= lastMonth);
  const nets = elapsed.map((m) => ({ month: m, net: round(income[idx.get(m)!] - expense[idx.get(m)!]) }));
  const sorted = [...nets].sort((a, b) => b.net - a.net);
  const n = Math.max(elapsed.length, 1);
  const sumElapsed = (arr: number[]) => elapsed.reduce((s, m) => s + arr[idx.get(m)!], 0);
  return {
    year,
    months,
    categories,
    income: income.map((v) => round(v)),
    expense: expense.map((v) => round(v)),
    savingsRate: months.map((m, i) => (m > lastMonth || income[i] <= 0 ? null : round(((income[i] - expense[i]) / income[i]) * 100, 1))),
    best: sorted[0] ?? null,
    worst: sorted.length ? sorted[sorted.length - 1] : null,
    averages: {
      income: round(sumElapsed(income) / n),
      expense: round(sumElapsed(expense) / n),
      net: round((sumElapsed(income) - sumElapsed(expense)) / n),
    },
  };
}
