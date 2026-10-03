import { addDays, todayIso, type DashboardReport, type Kpi, type NamedValue } from '@shared';
import type { Account } from '../core/firefly-data';
import { isExpense, round, type ReportContext, type Split } from '../core/ledger';
import type { FfBill, FfBudget, FfBudgetLimit, FfResource } from '../firefly/firefly.types';
import { buildCalendar } from './calendar.report';
import { monthlyTotals } from './compare.report';
import { netWorthOf, savingsRate, topN, totals } from './helpers';
import { buildBudgets } from './monthly.report';

export interface DashboardInput {
  ctx: ReportContext;
  splits: Split[];
  previousSplits: Split[];
  /** 12 months of splits ending at the period end. */
  yearSplits: Split[];
  months: string[];
  /** Assets + liabilities at each month end (same order as `months`). */
  netWorthHistory: { month: string; date: string; accounts: Account[] }[];
  /** Net worth at the end of the previous period. */
  previousNetWorthAccounts: Account[];
  previousEnd: string;
  budgets: FfResource<FfBudget>[];
  limits: FfResource<FfBudgetLimit>[];
  bills: FfResource<FfBill>[];
  /** Days of the mini calendar (the month containing the period end). */
  calendarSplits: Split[];
  calendarCtx: ReportContext;
}

export function buildDashboard(input: DashboardInput): DashboardReport {
  const { ctx } = input;
  const cur = totals(ctx, input.splits);
  const prev = totals(ctx, input.previousSplits);
  const months = monthlyTotals(ctx, input.yearSplits, input.months).map((m) => ({ ...m, net: round(m.income - m.expense) }));
  const netWorth = input.netWorthHistory.map((h) => ({ month: h.month, value: netWorthOf(ctx, h.accounts, h.date) }));
  const nwNow = netWorth.at(-1)?.value ?? 0;
  const nwPrev = netWorthOf(ctx, input.previousNetWorthAccounts, input.previousEnd);

  const kpi = (value: number, previous: number, spark: number[]): Kpi => ({ value: round(value), previous: round(previous), spark });
  const rate = (i: number, e: number) => savingsRate({ income: i, expense: e, net: i - e });

  // Top categories: top 6 + "others"
  const cats = new Map<string | null, NamedValue>();
  for (const s of input.splits.filter(isExpense)) {
    const c = cats.get(s.categoryId) ?? { id: s.categoryId, name: s.categoryName ?? '', value: 0 };
    c.value += ctx.value(s);
    cats.set(s.categoryId, c);
  }
  const sortedCats = [...cats.values()].sort((a, b) => b.value - a.value);
  const top = sortedCats.slice(0, 6).map((c) => ({ ...c, value: round(c.value) }));
  const rest = sortedCats.slice(6).reduce((s, c) => s + c.value, 0);
  if (rest > 0) top.push({ id: '__others__', name: '', value: round(rest) });

  const today = todayIso();
  const horizon = addDays(today, 30);
  const upcomingBills = input.bills
    .filter((b) => b.attributes.active)
    .flatMap((b) =>
      (b.attributes.pay_dates ?? [])
        .map((d) => d.slice(0, 10))
        .filter((d) => d >= today && d <= horizon)
        .map((date) => ({
          id: b.id,
          name: b.attributes.name,
          date,
          amount: round(
            ctx.convert(
              (Number(b.attributes.amount_min) + Number(b.attributes.amount_max)) / 2,
              b.attributes.currency_code || ctx.primary,
              date,
            ),
          ),
        })),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    kpis: {
      income: kpi(cur.income, prev.income, months.map((m) => m.income)),
      expense: kpi(cur.expense, prev.expense, months.map((m) => m.expense)),
      net: kpi(cur.net, prev.net, months.map((m) => m.net)),
      savingsRate: kpi(rate(cur.income, cur.expense), rate(prev.income, prev.expense), months.map((m) => rate(m.income, m.expense))),
      netWorth: kpi(nwNow, nwPrev, netWorth.map((n) => n.value)),
    },
    months,
    netWorth,
    topCategories: top,
    budgets: buildBudgets(ctx, input.splits, input.budgets, input.limits).budgets,
    upcomingBills,
    calendar: buildCalendar(input.calendarCtx, input.calendarSplits, null, []).days,
    largest: topN(input.splits.filter(isExpense), 5, (s) => ctx.value(s)).map((s) => ctx.row(s)),
  };
}
