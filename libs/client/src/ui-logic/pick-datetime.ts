import { isIsoDate } from '@spacefly/shared';
import { parseTime } from './time';

const pad = (n: number): string => String(n).padStart(2, '0');

/** `YYYY-MM-DD` as the local date a native date picker takes; `fallback` (an ISO date) when it is not one. */
export function isoToLocalDate(iso: string, fallback: string): Date {
  const [y, m, d] = (isIsoDate(iso) ? iso : fallback).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The local date a native date picker reports, as `YYYY-MM-DD`. */
export function localDateToIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `HH:mm` (or what `parseTime` reads) as the date a native time picker takes; `fallback` (`HH:mm`) when it is not a time. */
export function timeToLocalDate(time: string, fallback: string): Date {
  const [h, m] = (parseTime(time) ?? fallback).split(':').map(Number);
  return new Date(2000, 0, 1, h, m);
}

/** The time a native time picker reports, as `HH:mm`. */
export function localDateToTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
