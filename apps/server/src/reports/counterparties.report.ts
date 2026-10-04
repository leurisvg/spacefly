import { daysInRange, weekdayMon0, type CounterpartiesReport, type CounterpartyDetailReport, type CounterpartyKind, type RankedItem } from '@spacefly/shared';
import type { Account } from '../core/firefly-data';
import { assetSide, counterpartySide, groupBy, round, type ReportContext, type Split } from '../core/ledger';
import { kindFilter } from './ranking.report';

interface ListInput {
  ctx: ReportContext;
  kind: CounterpartyKind;
  accounts: Account[];
  splits: Split[];
  previous: Split[];
  /** Trailing 12 months. */
  trend: Split[];
  months: string[];
}

/** Every expense (or revenue) account with what moved through it in the period, the one before and its last activity. */
export function buildCounterparties({ ctx, kind, accounts, splits, previous, trend, months }: ListInput): CounterpartiesReport {
  // Only real expense/revenue accounts: payments to a loan or a cash account aren't counterparties here.
  const known = new Map(accounts.map((a) => [a.id, a]));
  const own = (s: Split) => kindFilter(kind)(s) && known.has(counterpartySide(s).id);
  const sums = (list: Split[]) => {
    const map = new Map<string, { name: string; value: number; count: number }>();
    for (const s of list.filter(own)) {
      const c = counterpartySide(s);
      const e = map.get(c.id) ?? { name: c.name, value: 0, count: 0 };
      e.value += ctx.value(s);
      e.count++;
      map.set(c.id, e);
    }
    return map;
  };
  const now = sums(splits);
  const before = sums(previous);
  const last = new Map<string, string>();
  for (const s of trend.filter(own)) {
    const id = counterpartySide(s).id;
    if ((last.get(id) ?? '') < s.date) last.set(id, s.date);
  }

  const total = [...now.values()].reduce((sum, e) => sum + e.value, 0);
  const items = [...known.keys()]
    .map((id) => {
      const e = now.get(id);
      const a = known.get(id)!;
      const value = e?.value ?? 0;
      const count = e?.count ?? 0;
      return {
        id,
        name: a.name,
        active: a.active,
        value: round(value),
        previous: round(before.get(id)?.value ?? 0),
        count,
        avg: count ? round(value / count) : 0,
        share: total ? value / total : 0,
        lastDate: last.get(id) ?? null,
      };
    })
    .sort((a, b) => b.value - a.value || b.previous - a.previous || a.name.localeCompare(b.name));

  return {
    kind,
    items,
    total: round(total),
    previousTotal: round([...before.values()].reduce((sum, e) => sum + e.value, 0)),
    count: [...now.values()].reduce((sum, e) => sum + e.count, 0),
    months,
    monthly: months.map((m) => round(ctx.sum(trend.filter((s) => own(s) && s.date.startsWith(m))))),
  };
}

interface DetailInput {
  ctx: ReportContext;
  kind: CounterpartyKind;
  account: Account;
  /** Period splits of this account (already of the right kind), oldest first. */
  splits: Split[];
  /** Total of the whole kind in the period, for the share. */
  kindTotal: number;
  previousTotal: number;
  /** Trailing 12 months of this account. */
  trend: Split[];
  months: string[];
}

function ranked(ctx: ReportContext, splits: Split[], key: (s: Split) => string | null, name: (s: Split) => string): RankedItem[] {
  return [...groupBy(splits, key, name)]
    .map(([id, g]) => ({ id, name: g.name, value: round(ctx.sum(g.splits)), count: g.splits.length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function buildCounterpartyDetail({ ctx, kind, account, splits, kindTotal, previousTotal, trend, months }: DetailInput): CounterpartyDetailReport {
  const value = ctx.sum(splits);
  const byDay = new Map<string, Split[]>();
  for (const s of splits) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
  const byWeekday = Array.from({ length: 7 }, () => 0);
  for (const s of splits) byWeekday[weekdayMon0(s.date)] += ctx.value(s);

  return {
    kind,
    account: { id: account.id, name: account.name, type: account.type, active: account.active, iban: account.iban, notes: account.notes },
    totals: {
      value: round(value),
      previous: round(previousTotal),
      count: splits.length,
      avg: splits.length ? round(value / splits.length) : 0,
      share: kindTotal ? value / kindTotal : 0,
    },
    days: daysInRange(ctx.period.start, ctx.period.end).map((date) => {
      const list = byDay.get(date) ?? [];
      return { date, value: round(ctx.sum(list)), count: list.length };
    }),
    months: months.map((month) => {
      const list = trend.filter((s) => s.date.startsWith(month));
      return { month, value: round(ctx.sum(list)), count: list.length };
    }),
    byWeekday: byWeekday.map((v) => round(v)),
    topCategories: ranked(ctx, splits, (s) => s.categoryId, (s) => s.categoryName ?? ''),
    topAccounts: ranked(ctx, splits, (s) => assetSide(s).id, (s) => assetSide(s).name),
    rows: splits.map((s) => ctx.row(s)).reverse(),
  };
}
