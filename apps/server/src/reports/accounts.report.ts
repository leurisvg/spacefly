import type { AccountsReport, NetWorthReport } from '@spacefly/shared';
import type { Account } from '../core/firefly-data';
import { isExpense, isIncome, round, type ReportContext, type Split } from '../core/ledger';
import { balanceIn, netWorthOf } from './helpers';

type Snapshot = { month: string; date: string; accounts: Account[] };

/** Asset accounts: balances at the period end, activity in the period and balance history. Listed in the user's order, then by balance. */
export function buildAccounts(
  ctx: ReportContext,
  current: Account[],
  splits: Split[],
  history: Snapshot[],
  excluded: string[],
  order: string[] = [],
): AccountsReport {
  const ex = new Set(excluded);
  const rank = new Map(order.map((id, i) => [id, i]));
  const date = ctx.period.end;
  const accounts = current
    .filter((a) => a.active || a.balance !== 0)
    .map((a) => {
      const income = splits.filter((s) => isIncome(s) && s.destId === a.id);
      const expense = splits.filter((s) => isExpense(s) && s.sourceId === a.id);
      return {
        id: a.id,
        name: a.name,
        role: a.role,
        type: a.type,
        currency: a.currency,
        balanceOriginal: round(a.balance),
        balance: round(balanceIn(ctx, a, date)),
        includeNetWorth: a.includeNetWorth,
        excluded: ex.has(a.id),
        income: round(ctx.sum(income)),
        expense: round(ctx.sum(expense)),
      };
    })
    .sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) || b.balance - a.balance);

  return {
    accounts,
    months: history.map((h) => h.month),
    history: seriesByAccount(ctx, history, (a) => !ex.has(a.id)),
    total: round(accounts.filter((a) => !a.excluded).reduce((s, a) => s + a.balance, 0)),
  };
}

/** Net worth per month (assets + liabilities included in net worth), total and stacked by account. */
export function buildNetWorth(ctx: ReportContext, history: Snapshot[], excluded: string[]): NetWorthReport {
  const ex = new Set(excluded);
  const filtered = history.map((h) => ({ ...h, accounts: h.accounts.filter((a) => !ex.has(a.id)) }));
  const total = filtered.map((h) => netWorthOf(ctx, h.accounts, h.date));
  const current = total.at(-1) ?? 0;
  const first = total[0] ?? 0;
  return {
    months: history.map((h) => h.month),
    total,
    byAccount: seriesByAccount(ctx, filtered, (a) => a.includeNetWorth),
    current,
    change: { abs: round(current - first), pct: first !== 0 ? (current - first) / Math.abs(first) : null },
  };
}

function seriesByAccount(ctx: ReportContext, history: Snapshot[], keep: (a: Account) => boolean) {
  const series = new Map<string, { id: string; name: string; balances: number[] }>();
  history.forEach((snap, i) => {
    for (const a of snap.accounts) {
      if (!keep(a)) continue;
      const s = series.get(a.id) ?? { id: a.id, name: a.name, balances: history.map(() => 0) };
      s.balances[i] = round(balanceIn(ctx, a, snap.date));
      series.set(a.id, s);
    }
  });
  return [...series.values()].filter((s) => s.balances.some((v) => v !== 0));
}
