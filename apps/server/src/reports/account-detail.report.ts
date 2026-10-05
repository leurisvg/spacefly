import { daysInRange, weekdayMon0, type AccountDetailReport, type AccountTxRow, type RankedItem } from '@spacefly/shared';
import type { Account } from '../core/firefly-data';
import { groupBy, isExpense, isIncome, isTransfer, round, type ReportContext, type Split } from '../core/ledger';
import { balanceIn } from './helpers';

type Snapshot = { month: string; date: string; accounts: Account[] };

interface Input {
  ctx: ReportContext;
  account: Account;
  excluded: boolean;
  /** Last day with a known balance: the period end, or today when the period runs into the future. */
  asOf: string;
  /** Splits of the period that touch the account, oldest first. */
  splits: Split[];
  /** Trailing 12 months of splits, any account. */
  trend: Split[];
  months: string[];
  history: Snapshot[];
}

/** Display-currency amount a split moves in or out of the account (the destination side prefers the foreign amount). */
function flowOf(ctx: ReportContext, a: Account, s: Split): number {
  if (s.destId === a.id) {
    return s.foreignCurrency === a.currency && s.foreignAmount ? ctx.convert(s.foreignAmount, a.currency, s.date) : ctx.value(s);
  }
  return -ctx.value(s);
}

/** Same movement in the account's own currency. */
function flowInOwn(ctx: ReportContext, a: Account, s: Split): number {
  const amount =
    s.currency === a.currency
      ? s.amount
      : s.foreignCurrency === a.currency && s.foreignAmount
        ? s.foreignAmount
        : ctx.fx.fromPrimary(ctx.primaryValue(s), a.currency, s.date);
  return s.destId === a.id ? amount : -amount;
}

function ranked(ctx: ReportContext, a: Account, splits: Split[], key: (s: Split) => string | null, name: (s: Split) => string): RankedItem[] {
  return [...groupBy(splits, key, name)]
    .map(([id, g]) => ({
      id,
      name: g.name,
      value: round(ctx.sum(g.splits)),
      count: g.splits.length,
      valueOriginal: round(g.splits.reduce((sum, s) => sum + Math.abs(flowInOwn(ctx, a, s)), 0)),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

/**
 * Everything about one asset account in the period. The balance is anchored on the account's real
 * balance at `asOf` and walked backwards through the records, so the last day always matches Firefly.
 */
export function buildAccountDetail({ ctx, account: a, excluded, asOf, splits, trend, months, history }: Input): AccountDetailReport {
  const mine = (s: Split) => s.sourceId === a.id || s.destId === a.id;
  const settled = splits.filter((s) => s.date <= asOf);
  const closing = balanceIn(ctx, a, asOf);
  const opening = closing - settled.reduce((sum, s) => sum + flowOf(ctx, a, s), 0);

  let running = opening;
  const after = new Map<string, number>();
  for (const s of settled) after.set(s.id, (running += flowOf(ctx, a, s)));

  const openingOwn = a.balance - settled.reduce((sum, s) => sum + flowInOwn(ctx, a, s), 0);
  let runningOwn = openingOwn;
  const afterOwn = new Map<string, number>();
  for (const s of settled) afterOwn.set(s.id, (runningOwn += flowInOwn(ctx, a, s)));

  const ownTotal = (list: Split[]) => round(list.reduce((sum, s) => sum + Math.abs(flowInOwn(ctx, a, s)), 0));

  const byDay = new Map<string, Split[]>();
  for (const s of splits) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
  running = opening;
  runningOwn = openingOwn;
  const days = daysInRange(ctx.period.start, ctx.period.end).map((date) => {
    const list = byDay.get(date) ?? [];
    const sum = (pred: (s: Split) => boolean) => round(ctx.sum(list.filter(pred)));
    const sumOwn = (pred: (s: Split) => boolean) => ownTotal(list.filter(pred));
    if (date <= asOf) {
      running += list.reduce((acc, s) => acc + flowOf(ctx, a, s), 0);
      runningOwn += list.reduce((acc, s) => acc + flowInOwn(ctx, a, s), 0);
    }
    return {
      date,
      income: sum((s) => isIncome(s) && s.destId === a.id),
      expense: sum((s) => isExpense(s) && s.sourceId === a.id),
      transferIn: sum((s) => isTransfer(s) && s.destId === a.id),
      transferOut: sum((s) => isTransfer(s) && s.sourceId === a.id),
      count: list.length,
      balance: date <= asOf ? round(running) : null,
      balanceOriginal: date <= asOf ? round(runningOwn) : null,
      incomeOriginal: sumOwn((s) => isIncome(s) && s.destId === a.id),
      expenseOriginal: sumOwn((s) => isExpense(s) && s.sourceId === a.id),
      transferInOriginal: sumOwn((s) => isTransfer(s) && s.destId === a.id),
      transferOutOriginal: sumOwn((s) => isTransfer(s) && s.sourceId === a.id),
    };
  });

  const incomes = splits.filter((s) => isIncome(s) && s.destId === a.id);
  const expenses = splits.filter((s) => isExpense(s) && s.sourceId === a.id);
  const byWeekday = Array.from({ length: 7 }, () => 0);
  const byWeekdayOriginal = Array.from({ length: 7 }, () => 0);
  for (const s of expenses) {
    byWeekday[weekdayMon0(s.date)] += ctx.value(s);
    byWeekdayOriginal[weekdayMon0(s.date)] += Math.abs(flowInOwn(ctx, a, s));
  }

  const trendMine = trend.filter(mine);
  const monthly = months.map((month, i) => {
    const inMonth = trendMine.filter((s) => s.date.startsWith(month));
    const snap = history[i]?.accounts.find((x) => x.id === a.id);
    const monthIncome = inMonth.filter((s) => isIncome(s) && s.destId === a.id);
    const monthExpense = inMonth.filter((s) => isExpense(s) && s.sourceId === a.id);
    const own = (list: Split[]) => round(list.reduce((sum, s) => sum + Math.abs(flowInOwn(ctx, a, s)), 0));
    return {
      month,
      income: round(ctx.sum(monthIncome)),
      expense: round(ctx.sum(monthExpense)),
      balance: snap ? round(balanceIn(ctx, a, history[i].date)) : 0,
      incomeOriginal: own(monthIncome),
      expenseOriginal: own(monthExpense),
      balanceOriginal: snap ? round(snap.balance) : 0,
    };
  });

  const rows: AccountTxRow[] = splits
    .map((s) => ({
      ...ctx.row(s),
      flow: round(flowOf(ctx, a, s)),
      balance: after.has(s.id) ? round(after.get(s.id)!) : null,
      flowOriginal: round(flowInOwn(ctx, a, s)),
      balanceOriginal: afterOwn.has(s.id) ? round(afterOwn.get(s.id)!) : null,
    }))
    .reverse();

  const transfersIn = splits.filter((s) => isTransfer(s) && s.destId === a.id);
  const transfersOut = splits.filter((s) => isTransfer(s) && s.sourceId === a.id);

  const first = round(opening);
  return {
    account: { id: a.id, name: a.name, role: a.role, type: a.type, currency: a.currency, iban: a.iban, includeNetWorth: a.includeNetWorth, excluded },
    balanceOriginal: round(a.balance),
    openingOriginal: round(openingOwn),
    opening: first,
    closing: round(closing),
    change: { abs: round(closing - opening), pct: first !== 0 ? (closing - opening) / Math.abs(first) : null },
    changeOriginal: round(a.balance - openingOwn),
    totals: {
      income: round(ctx.sum(incomes)),
      expense: round(ctx.sum(expenses)),
      transferIn: round(ctx.sum(transfersIn)),
      transferOut: round(ctx.sum(transfersOut)),
      count: splits.length,
    },
    totalsOriginal: { income: ownTotal(incomes), expense: ownTotal(expenses), transferIn: ownTotal(transfersIn), transferOut: ownTotal(transfersOut) },
    days,
    months: monthly,
    byWeekday: byWeekday.map((v) => round(v)),
    byWeekdayOriginal: byWeekdayOriginal.map((v) => round(v)),
    topCategories: ranked(ctx, a, expenses, (s) => s.categoryId, (s) => s.categoryName ?? ''),
    topMerchants: ranked(ctx, a, expenses, (s) => s.destId, (s) => s.destName),
    topIncomeSources: ranked(ctx, a, incomes, (s) => s.sourceId, (s) => s.sourceName),
    rows,
  };
}
