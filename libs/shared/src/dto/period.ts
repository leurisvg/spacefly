/** Inclusive calendar range, both ends formatted YYYY-MM-DD. */
export interface Period {
  start: string;
  end: string;
}

/** `last30` / `last6m` are rolling windows ending on the anchor (today): the last 30 days and the last 6 months, today included. */
export type PeriodPreset = 'month' | 'quarter' | 'year' | 'ytd' | 'last30' | 'last6m' | 'custom';
