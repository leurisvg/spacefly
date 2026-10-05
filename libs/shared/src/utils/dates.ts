/**
 * Pure date helpers on ISO calendar dates (YYYY-MM-DD).
 * All math is done in UTC so results never depend on the host timezone.
 */
import type { Period, PeriodPreset } from '../dto/period';

export type IsoDate = string;

export function parseIso(date: IsoDate): Date {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function todayIso(): IsoDate {
  const now = new Date();
  return toIso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = parseIso(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/** Adds months clamping the day to the target month length (Jan 31 + 1 = Feb 28/29). */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const d = parseIso(date);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const last = daysInMonth(toIso(target));
  target.setUTCDate(Math.min(day, last));
  return toIso(target);
}

export function startOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-${String(daysInMonth(date)).padStart(2, '0')}`;
}

export function startOfYear(date: IsoDate): IsoDate {
  return `${date.slice(0, 4)}-01-01`;
}

export function endOfYear(date: IsoDate): IsoDate {
  return `${date.slice(0, 4)}-12-31`;
}

export function startOfQuarter(date: IsoDate): IsoDate {
  const m = Number(date.slice(5, 7));
  const qm = Math.floor((m - 1) / 3) * 3 + 1;
  return `${date.slice(0, 4)}-${String(qm).padStart(2, '0')}-01`;
}

export function endOfQuarter(date: IsoDate): IsoDate {
  return endOfMonth(addMonths(startOfQuarter(date), 2));
}

export function daysInMonth(date: IsoDate): number {
  const d = parseIso(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

/** Inclusive number of days between two dates. */
export function daysBetween(start: IsoDate, end: IsoDate): number {
  return Math.round((parseIso(end).getTime() - parseIso(start).getTime()) / 86_400_000) + 1;
}

/** Monday = 0 … Sunday = 6 (matches Python's calendar.monthrange). */
export function weekdayMon0(date: IsoDate): number {
  return (parseIso(date).getUTCDay() + 6) % 7;
}

export function monthKey(date: IsoDate): string {
  return date.slice(0, 7);
}

/** Month keys (YYYY-MM) touched by the period, in order. */
export function monthsInRange(start: IsoDate, end: IsoDate): string[] {
  const out: string[] = [];
  let cur = startOfMonth(start);
  while (cur <= end) {
    out.push(monthKey(cur));
    cur = addMonths(cur, 1);
  }
  return out;
}

export function daysInRange(start: IsoDate, end: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) out.push(cur);
  return out;
}

export function isFullMonth(p: Period): boolean {
  return p.start === startOfMonth(p.start) && p.end === endOfMonth(p.start);
}

/** Period of the same "shape" immediately before the given one. */
export function previousPeriod(p: Period): Period {
  if (isFullMonth(p)) {
    const start = addMonths(p.start, -1);
    return { start, end: endOfMonth(start) };
  }
  const monthsSpan = monthsInRange(p.start, p.end).length;
  if (p.start === startOfMonth(p.start) && p.end === endOfMonth(p.end)) {
    const start = addMonths(p.start, -monthsSpan);
    return { start, end: endOfMonth(addMonths(start, monthsSpan - 1)) };
  }
  const len = daysBetween(p.start, p.end);
  return { start: addDays(p.start, -len), end: addDays(p.start, -1) };
}

export function samePeriodLastYear(p: Period): Period {
  const start = addMonths(p.start, -12);
  const end = p.end === endOfMonth(p.end) ? endOfMonth(addMonths(p.end, -12)) : addMonths(p.end, -12);
  return { start, end };
}

/** Builds the period for a preset anchored at a given date. */
export function presetPeriod(preset: Exclude<PeriodPreset, 'custom'>, anchor: IsoDate): Period {
  switch (preset) {
    case 'month':
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    case 'quarter':
      return { start: startOfQuarter(anchor), end: endOfQuarter(anchor) };
    case 'year':
      return { start: startOfYear(anchor), end: endOfYear(anchor) };
    case 'ytd':
      return { start: startOfYear(anchor), end: anchor };
    case 'last30':
      return { start: addDays(anchor, -29), end: anchor };
    case 'last6m':
      return { start: addDays(addMonths(anchor, -6), 1), end: anchor };
  }
}

/** Shifts a preset period by n steps (◀ ▶ navigation). */
export function shiftPeriod(preset: PeriodPreset, p: Period, steps: number): Period {
  switch (preset) {
    case 'month':
      return presetPeriod('month', addMonths(p.start, steps));
    case 'quarter':
      return presetPeriod('quarter', addMonths(p.start, steps * 3));
    case 'year':
      return presetPeriod('year', addMonths(p.start, steps * 12));
    case 'ytd': {
      const start = addMonths(p.start, steps * 12);
      return { start, end: addMonths(p.end, steps * 12) };
    }
    case 'last30':
      return { start: addDays(p.start, steps * 30), end: addDays(p.end, steps * 30) };
    case 'last6m':
      return presetPeriod('last6m', addMonths(p.end, steps * 6));
    case 'custom': {
      const len = daysBetween(p.start, p.end);
      return { start: addDays(p.start, steps * len), end: addDays(p.end, steps * len) };
    }
  }
}

export function clampPeriod(p: Period, maxEnd: IsoDate): Period {
  return { start: p.start, end: p.end > maxEnd ? maxEnd : p.end };
}

export function isIsoDate(v: unknown): v is IsoDate {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && toIso(parseIso(v)) === v;
}
