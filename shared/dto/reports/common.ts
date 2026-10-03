import type { Period } from '../period';

export interface ReportMeta {
  period: Period;
  currency: string;
  primaryCurrency: string;
  generatedAt: string;
}

export interface Report<T> {
  meta: ReportMeta;
  data: T;
}

/** Generic named value, used by rankings/donuts/treemaps. */
export interface NamedValue {
  id: string | null;
  name: string;
  value: number;
}

export interface MonthPoint {
  month: string;
  value: number;
}

export interface Kpi {
  value: number;
  previous: number;
  /** Last 12 months, oldest first. */
  spark: number[];
}

export type GroupBy = 'category' | 'tag' | 'budget' | 'account' | 'counterparty';
