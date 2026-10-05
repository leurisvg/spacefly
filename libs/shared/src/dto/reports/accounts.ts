import type { TxRow } from '../ledger';

export interface AccountSummary {
  id: string;
  name: string;
  role: string | null;
  type: string;
  currency: string;
  /** Balance in the account's own currency. */
  balanceOriginal: number;
  /** Balance converted to the display currency. */
  balance: number;
  includeNetWorth: boolean;
  excluded: boolean;
  income: number;
  expense: number;
}

export interface AccountsReport {
  accounts: AccountSummary[];
  months: string[];
  history: { id: string; name: string; balances: number[] }[];
  total: number;
}

export interface NetWorthReport {
  months: string[];
  total: number[];
  byAccount: { id: string; name: string; balances: number[] }[];
  current: number;
  change: { abs: number; pct: number | null };
}

/** A transaction as it affects one account: `flow` is signed from that account's point of view. */
export interface AccountTxRow extends TxRow {
  flow: number;
  /** Account balance right after this record (null for future-dated records). */
  balance: number | null;
  /** The same two numbers in the account's own currency. */
  flowOriginal: number;
  balanceOriginal: number | null;
}

export interface AccountDay {
  date: string;
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  count: number;
  /** Balance at the end of the day (null for future days). */
  balance: number | null;
  /** The same balance in the account's own currency. */
  balanceOriginal: number | null;
  /** The four flows above in the account's own currency. */
  incomeOriginal: number;
  expenseOriginal: number;
  transferInOriginal: number;
  transferOutOriginal: number;
}

export interface AccountMonth {
  month: string;
  income: number;
  expense: number;
  /** Closing balance of the month. */
  balance: number;
  /** The same three numbers in the account's own currency. */
  incomeOriginal: number;
  expenseOriginal: number;
  balanceOriginal: number;
}

export interface RankedItem {
  id: string | null;
  name: string;
  value: number;
  count: number;
  /** The same total in the account's own currency (account detail only). */
  valueOriginal?: number;
}

/** One asset account over the selected period: daily series, totals, rankings and every record. */
export interface AccountDetailReport {
  account: {
    id: string;
    name: string;
    role: string | null;
    type: string;
    currency: string;
    iban: string | null;
    includeNetWorth: boolean;
    excluded: boolean;
  };
  /** Current balance in the account's own currency. */
  balanceOriginal: number;
  opening: number;
  openingOriginal: number;
  closing: number;
  /** Change over the period: the own-currency change converted at the closing rate, and its ratio to the opening balance. */
  change: { abs: number; pct: number | null };
  /** `change.abs` in the account's own currency. */
  changeOriginal: number;
  totals: { income: number; expense: number; transferIn: number; transferOut: number; count: number };
  /** The same totals (without `count`) in the account's own currency. */
  totalsOriginal: { income: number; expense: number; transferIn: number; transferOut: number };
  days: AccountDay[];
  /** Trailing 12 months ending at the period end. */
  months: AccountMonth[];
  /** Expenses per weekday, Monday first. */
  byWeekday: number[];
  /** The same, in the account's own currency. */
  byWeekdayOriginal: number[];
  topCategories: RankedItem[];
  topMerchants: RankedItem[];
  topIncomeSources: RankedItem[];
  /** Newest first. */
  rows: AccountTxRow[];
}
