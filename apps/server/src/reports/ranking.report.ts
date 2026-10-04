import type { GroupBy, RankingReport } from '@spacefly/shared';
import { counterpartySide, isExpense, isIncome, round, assetSide, type ReportContext, type Split } from '../core/ledger';

export interface Key {
  id: string | null;
  name: string;
}
export type KeyFn = (s: Split) => Key[];

export const keyFns: Record<GroupBy, KeyFn> = {
  category: (s) => [{ id: s.categoryId, name: s.categoryName ?? '' }],
  budget: (s) => [{ id: s.budgetId, name: s.budgetName ?? '' }],
  tag: (s) => (s.tags.length ? s.tags.map((t) => ({ id: t, name: t })) : [{ id: null, name: '' }]),
  account: (s) => [assetSide(s)],
  counterparty: (s) => [counterpartySide(s)],
};

export function kindFilter(kind: 'expense' | 'income'): (s: Split) => boolean {
  return kind === 'income' ? isIncome : isExpense;
}

/** Sums a value per key. Multi-key splits (tags) count fully for every key they carry. */
export function aggregate(ctx: ReportContext, splits: Split[], keys: KeyFn) {
  const map = new Map<string | null, { name: string; value: number; count: number }>();
  for (const s of splits) {
    const v = ctx.value(s);
    for (const k of keys(s)) {
      const e = map.get(k.id) ?? { name: k.name, value: 0, count: 0 };
      e.value += v;
      e.count++;
      map.set(k.id, e);
    }
  }
  return map;
}

/**
 * Ranking used by Categories, Tags, Merchants (expense accounts) and Income sources
 * (revenue accounts): totals, count, average ticket, share, previous period and a
 * monthly trend for the top items.
 */
export function buildRanking(
  ctx: ReportContext,
  kind: 'expense' | 'income',
  splits: Split[],
  previous: Split[],
  trendSplits: Split[],
  months: string[],
  keys: KeyFn,
  topTrend = 8,
): RankingReport {
  const filter = kindFilter(kind);
  const own = splits.filter(filter);
  const total = round(ctx.sum(own));
  const current = aggregate(ctx, own, keys);
  const prev = aggregate(ctx, previous.filter(filter), keys);

  const items = [...current.entries()]
    .map(([id, e]) => ({
      id,
      name: e.name,
      value: round(e.value),
      count: e.count,
      avg: round(e.value / e.count),
      share: total ? e.value / total : 0,
      previous: round(prev.get(id)?.value ?? 0),
    }))
    .sort((a, b) => b.value - a.value);

  const top = items.slice(0, topTrend);
  const byMonth = new Map<string, Map<string | null, number>>();
  for (const s of trendSplits.filter(filter)) {
    const m = s.date.slice(0, 7);
    const mm = byMonth.get(m) ?? new Map<string | null, number>();
    for (const k of keys(s)) mm.set(k.id, (mm.get(k.id) ?? 0) + ctx.value(s));
    byMonth.set(m, mm);
  }
  const trend = top.map((it) => ({
    id: it.id,
    name: it.name,
    points: months.map((month) => ({ month, value: round(byMonth.get(month)?.get(it.id) ?? 0) })),
  }));

  return { kind, total, items, months, trend };
}
