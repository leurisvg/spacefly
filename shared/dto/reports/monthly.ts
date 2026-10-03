import type { Amount } from '../money';
import type { TxRow } from '../ledger';

export interface CategoryRow {
  id: string | null;
  name: string;
  /** earned − spent, same sign convention as the email (negative = net expense). */
  total: Amount;
  spent: number;
  earned: number;
  previous: number;
}

export interface BudgetRow {
  id: string;
  name: string;
  limit: Amount;
  /** Positive amount spent. */
  spent: Amount;
  remaining: number;
  /** spent / limit (0–n), null when no limit. */
  pct: number | null;
}

export interface AssetActivityRow {
  id: string;
  name: string;
  income: number;
  expense: number;
  net: number;
  topIncome: TxRow[];
  topExpenses: TxRow[];
}

export interface SummaryBlock {
  earned: Amount;
  spent: Amount;
  net: Amount;
}

export interface MonthlyReport {
  kpis: { earned: number; spent: number; net: number; savingsRate: number };
  categories: CategoryRow[];
  /** Names of categories with zero activity, grouped like the email. */
  zeroCategories: string[];
  previousPeriod: { start: string; end: string };
  budgets: BudgetRow[];
  zeroBudgets: { names: string[]; limit: number };
  topExpenses: TxRow[];
  assets: AssetActivityRow[];
  savings: SavingsSeries;
  overview: { month: SummaryBlock; ytd: SummaryBlock; netWorth: Amount };
}

export interface SavingsSeries {
  months: string[];
  accounts: { id: string; name: string; currency: string; balances: number[] }[];
}
