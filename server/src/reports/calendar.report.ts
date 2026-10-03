import { daysInRange, todayIso, type CalendarDay, type CalendarReport, type Period, type ScheduledItem, type YearHeatmapReport } from '@shared';
import { isExpense, isIncome, round, type ReportContext, type Split } from '../core/ledger';
import type { FfBill, FfRecurrence, FfResource } from '../firefly/firefly.types';

/**
 * Daily income/expense grid of the email ("Daily Cash Flow") plus a running balance
 * and markers for scheduled bills/recurring transactions.
 */
export function buildCalendar(
  ctx: ReportContext,
  splits: Split[],
  startBalance: number | null,
  scheduled: ScheduledItem[],
): CalendarReport {
  const today = todayIso();
  const byDay = new Map<string, { income: number; expense: number; count: number }>();
  for (const s of splits) {
    const d = byDay.get(s.date) ?? { income: 0, expense: 0, count: 0 };
    if (isIncome(s)) d.income += ctx.value(s);
    else if (isExpense(s)) d.expense += ctx.value(s);
    d.count++;
    byDay.set(s.date, d);
  }

  let running = startBalance;
  let income = 0;
  let expense = 0;
  let maxValue = 0;
  const days: CalendarDay[] = daysInRange(ctx.period.start, ctx.period.end).map((date) => {
    const d = byDay.get(date) ?? { income: 0, expense: 0, count: 0 };
    income += d.income;
    expense += d.expense;
    maxValue = Math.max(maxValue, d.income, d.expense);
    if (running !== null) running += d.income - d.expense;
    return {
      date,
      income: round(d.income),
      expense: round(d.expense),
      count: d.count,
      balance: running !== null && date <= today ? round(running) : null,
    };
  });

  return {
    days,
    scheduled: scheduled.filter((s) => s.date >= ctx.period.start && s.date <= ctx.period.end),
    totals: { income: round(income), expense: round(expense) },
    maxValue: round(maxValue),
  };
}

export function buildYearHeatmap(ctx: ReportContext, year: number, splits: Split[]): YearHeatmapReport {
  const byDay = new Map<string, { expense: number; income: number }>();
  for (const s of splits) {
    const d = byDay.get(s.date) ?? { expense: 0, income: 0 };
    if (isExpense(s)) d.expense += ctx.value(s);
    else if (isIncome(s)) d.income += ctx.value(s);
    byDay.set(s.date, d);
  }
  let max = 0;
  const days = daysInRange(`${year}-01-01`, `${year}-12-31`).map((date) => {
    const d = byDay.get(date) ?? { expense: 0, income: 0 };
    max = Math.max(max, d.expense);
    return { date, expense: round(d.expense), income: round(d.income) };
  });
  return { year, days, max: round(max) };
}

/** Expected bill payments and recurring-transaction occurrences inside a period. */
export function scheduledItems(
  ctx: ReportContext,
  period: Period,
  bills: FfResource<FfBill>[],
  recurrences: FfResource<FfRecurrence>[],
): ScheduledItem[] {
  const out: ScheduledItem[] = [];
  for (const b of bills) {
    const a = b.attributes;
    if (!a.active) continue;
    const avg = (Number(a.amount_min) + Number(a.amount_max)) / 2;
    for (const raw of a.pay_dates ?? []) {
      const date = raw.slice(0, 10);
      if (date < period.start || date > period.end) continue;
      out.push({
        date,
        kind: 'bill',
        id: b.id,
        name: a.name,
        amount: round(ctx.convert(avg, a.currency_code || ctx.primary, date)),
        type: 'withdrawal',
      });
    }
  }
  for (const r of recurrences) {
    const a = r.attributes;
    if (!a.active) continue;
    const type = (a.type === 'deposit' || a.type === 'transfer' ? a.type : 'withdrawal') as ScheduledItem['type'];
    for (const rep of a.repetitions) {
      for (const raw of rep.occurrences ?? []) {
        const date = raw.slice(0, 10);
        if (date < period.start || date > period.end) continue;
        const amount = a.transactions.reduce((sum, t) => sum + ctx.convert(Number(t.amount), t.currency_code || ctx.primary, date), 0);
        out.push({ date, kind: 'recurrence', id: r.id, name: a.title, amount: round(amount), type });
      }
    }
  }
  return out.sort((x, y) => x.date.localeCompare(y.date));
}
