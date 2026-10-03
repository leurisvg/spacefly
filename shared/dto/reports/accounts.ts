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
