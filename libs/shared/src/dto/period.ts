/** Inclusive calendar range, both ends formatted YYYY-MM-DD. */
export interface Period {
  start: string;
  end: string;
}

export type PeriodPreset = 'month' | 'quarter' | 'year' | 'ytd' | 'custom';
