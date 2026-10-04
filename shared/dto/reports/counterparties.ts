import type { TxRow } from '../ledger';
import type { RankedItem } from './accounts';

/** Expense accounts are where money goes (withdrawals); revenue accounts where it comes from (deposits). */
export type CounterpartyKind = 'expense' | 'income';

export interface CounterpartyItem {
  id: string;
  name: string;
  active: boolean;
  /** Total in the period, display currency. */
  value: number;
  previous: number;
  count: number;
  avg: number;
  /** Share of the period total (0–1). */
  share: number;
  /** Latest transaction in the last 12 months. */
  lastDate: string | null;
}

export interface CounterpartiesReport {
  kind: CounterpartyKind;
  items: CounterpartyItem[];
  total: number;
  previousTotal: number;
  count: number;
  /** Trailing 12 months of the whole kind. */
  months: string[];
  monthly: number[];
}

export interface CounterpartyDetailReport {
  kind: CounterpartyKind;
  account: { id: string; name: string; type: string; active: boolean; iban: string | null; notes: string | null };
  totals: { value: number; previous: number; count: number; avg: number; share: number };
  /** Amount per day of the period. */
  days: { date: string; value: number; count: number }[];
  /** Trailing 12 months ending at the period end. */
  months: { month: string; value: number; count: number }[];
  /** Totals per weekday, Monday first. */
  byWeekday: number[];
  topCategories: RankedItem[];
  /** The asset accounts the money was paid from (expenses) or received in (income). */
  topAccounts: RankedItem[];
  /** Newest first. */
  rows: TxRow[];
}
