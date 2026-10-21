import { signal } from '@angular/core';

export interface PickerOption {
  value: string;
  label: string;
}

/** Choose one of a list, with an optional search box and an optional "create what I typed" row. */
export interface ListSheet {
  kind: 'list';
  title: string;
  options: readonly PickerOption[];
  cancel: string;
  search: boolean;
  /** The value shown as the current one. */
  selected: string | null;
  /** The label of the "create" row for the typed text; `null` when only listed options may be chosen. */
  createLabel: ((text: string) => string) | null;
  resolve: (value: string | null) => void;
}

/** A native date picker; resolves `YYYY-MM-DD`, or `''` when cleared. */
export interface DateSheet {
  kind: 'date';
  title: string;
  value: string;
  /** Today as `YYYY-MM-DD`: the quick choice, and the date shown when `value` is empty. */
  today: string;
  clear: string | null;
  ok: string;
  cancel: string;
  todayLabel: string;
  resolve: (value: string | null) => void;
}

/** A native time picker; resolves `HH:mm`, or `''` when cleared. */
export interface TimeSheet {
  kind: 'time';
  title: string;
  value: string;
  /** The current time as `HH:mm`: the quick choice, and the time shown when `value` is empty. */
  now: string;
  clear: string | null;
  ok: string;
  cancel: string;
  nowLabel: string;
  resolve: (value: string | null) => void;
}

export type SheetRequest = ListSheet | DateSheet | TimeSheet;
type Draft<T> = T extends SheetRequest ? Omit<T, 'resolve'> : never;

/** What the sheet host shows, or `null` when no sheet is open. */
export const sheet = signal<SheetRequest | null>(null);

/** Opens a sheet; a sheet that is already open is dismissed first. Resolves what the user chose, or `null` when dismissed. */
export function openSheet(request: Draft<SheetRequest>): Promise<string | null> {
  return new Promise((resolve) => {
    sheet()?.resolve(null);
    sheet.set({ ...request, resolve } as SheetRequest);
  });
}

export function closeSheet(value: string | null): void {
  const open = sheet();
  if (!open) return;
  sheet.set(null);
  open.resolve(value);
}
