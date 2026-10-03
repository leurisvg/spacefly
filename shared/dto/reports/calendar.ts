export interface CalendarDay {
  date: string;
  income: number;
  expense: number;
  count: number;
  /** Running asset balance at the end of the day (null for future days). */
  balance: number | null;
}

export interface ScheduledItem {
  date: string;
  kind: 'bill' | 'recurrence';
  id: string;
  name: string;
  amount: number;
  type: 'withdrawal' | 'deposit' | 'transfer';
}

export interface CalendarReport {
  days: CalendarDay[];
  scheduled: ScheduledItem[];
  totals: { income: number; expense: number };
  maxValue: number;
}

export interface YearHeatmapReport {
  year: number;
  days: { date: string; expense: number; income: number }[];
  max: number;
}
