import { todayIso, weekdayMon0, type CalendarDay, type ScheduledItem } from '@spacefly/shared';
import type { FormatService } from '../format/format.service';

export interface CalendarCell {
  day: CalendarDay;
  num: number;
  /** Bar heights as a percentage of the cell. */
  incH: number;
  expH: number;
  /** The value fits inside its bar instead of above it. */
  incInside: boolean;
  expInside: boolean;
  future: boolean;
  today: boolean;
  scheduled: ScheduledItem[];
  /** Plain-text summary of the day (tooltip / accessibility label). */
  tip: string;
}

/** Empty cells before the first day so it lands on its weekday (weeks start on Monday). */
export const calendarBlanks = (days: CalendarDay[]): number => (days.length ? weekdayMon0(days[0].date) : 0);

/**
 * One cell per day: an income bar and an expense bar scaled to `scale` (defaults to the largest day
 * shown; pass one to compare several months), plus the day's scheduled bills/recurrences. `currency` is the one the
 * day amounts are in when it isn't the display currency (an account kept in a foreign currency).
 */
export function buildCalendarCells(f: FormatService, days: CalendarDay[], scheduledItems: ScheduledItem[], scale: number | null = null, today = todayIso(), currency?: string): CalendarCell[] {
  const max = scale ?? Math.max(1, ...days.map((d) => Math.max(d.income, d.expense)));
  const byDate = new Map<string, ScheduledItem[]>();
  for (const s of scheduledItems) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
  return days.map((day) => {
    const incH = (day.income / max) * 100;
    const expH = (day.expense / max) * 100;
    const scheduled = byDate.get(day.date) ?? [];
    const parts = [f.date(day.date, 'full')];
    if (day.income) parts.push(`+${f.money(day.income, currency)}`);
    if (day.expense) parts.push(`−${f.money(day.expense, currency)}`);
    if (day.balance !== null) parts.push(`= ${f.money(day.balance, currency)}`);
    for (const s of scheduled) parts.push(`• ${s.name} ${f.money(s.amount)}`);
    return {
      day,
      num: Number(day.date.slice(8, 10)),
      incH,
      expH,
      incInside: incH >= 28,
      expInside: expH >= 28,
      future: day.date > today,
      today: day.date === today,
      scheduled,
      tip: parts.join('\n'),
    };
  });
}

/** Same compact labels as the email: 950 / 1.2k (`small` cells drop the decimal from 10k up). */
export function shortAmount(v: number, hidden: boolean, small = false): string {
  if (hidden) return '0';
  if (small && v >= 10000) return `${Math.round(v / 1000)}k`;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
}
