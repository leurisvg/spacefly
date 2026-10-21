import { openSheet, type PickerOption } from './sheet-state';

export type { PickerOption };

export interface PickOptions {
  /** Show a search box; by default only when the list is long. */
  search?: boolean;
  /** The value that is current now, marked in the list. */
  selected?: string | null;
  /** Adds a row that chooses the typed text itself (a new category…); gets the text, returns the row's label. */
  create?: (text: string) => string;
}

/** Sheet for choosing one of `options`; resolves the chosen value or `null` when dismissed. */
export async function pickOne(title: string, options: readonly PickerOption[], cancel: string, opts: PickOptions = {}): Promise<string | null> {
  if (!options.length && !opts.create) return null;
  return openSheet({ kind: 'list', title, options, cancel, search: opts.search ?? options.length > 8, selected: opts.selected ?? null, createLabel: opts.create ?? null });
}

export interface PickDateLabels {
  title: string;
  ok: string;
  cancel: string;
  today: string;
  /** Adds a button that clears the date (an optional one). */
  clear?: string;
}

/** Date picker sheet: resolves `YYYY-MM-DD`, `''` when cleared, `null` when dismissed. */
export async function pickDate(value: string, today: string, labels: PickDateLabels): Promise<string | null> {
  return openSheet({ kind: 'date', title: labels.title, value, today, clear: labels.clear ?? null, ok: labels.ok, cancel: labels.cancel, todayLabel: labels.today });
}

export interface PickTimeLabels {
  title: string;
  ok: string;
  cancel: string;
  now: string;
  clear?: string;
}

/** Time picker sheet: resolves `HH:mm`, `''` when cleared, `null` when dismissed. */
export async function pickTime(value: string, now: string, labels: PickTimeLabels): Promise<string | null> {
  return openSheet({ kind: 'time', title: labels.title, value, now, clear: labels.clear ?? null, ok: labels.ok, cancel: labels.cancel, nowLabel: labels.now });
}
