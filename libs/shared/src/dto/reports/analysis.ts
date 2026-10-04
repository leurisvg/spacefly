import type { GroupBy, MonthPoint, NamedValue } from './common';

export interface CompareRow {
  id: string | null;
  name: string;
  a: number;
  b: number;
  delta: number;
  pct: number | null;
}

export interface CompareReport {
  groupBy: GroupBy;
  a: { start: string; end: string; income: number; expense: number };
  b: { start: string; end: string; income: number; expense: number };
  rows: CompareRow[];
  /** Rolling 12 months ending at A.end — expense and income per month. */
  trend: { month: string; income: number; expense: number }[];
}

export interface AnnualReport {
  year: number;
  months: string[];
  categories: { id: string | null; name: string; values: number[]; total: number }[];
  income: number[];
  expense: number[];
  savingsRate: (number | null)[];
  best: { month: string; net: number } | null;
  worst: { month: string; net: number } | null;
  averages: { income: number; expense: number; net: number };
}

/** Shared by categories, tags, counterparties. */
export interface RankingReport {
  kind: 'expense' | 'income';
  total: number;
  items: (NamedValue & { count: number; avg: number; share: number; previous: number })[];
  months: string[];
  /** Monthly series for the top items (by id). */
  trend: { id: string | null; name: string; points: MonthPoint[] }[];
}

export interface BudgetDetail {
  id: string;
  name: string;
  limit: number;
  spent: number;
  remaining: number;
  pct: number | null;
  autoBudget: { type: string | null; period: string | null; amount: number | null };
  /** Spend projected to the end of the period at the current daily pace (null for past periods). */
  projected: number | null;
  categories: { id: string | null; name: string; value: number }[];
  /** Spent vs limit for the last 12 months. */
  history: { month: string; limit: number; spent: number }[];
}

export interface BudgetsReport {
  available: { amount: number; spentInBudgets: number; spentOutsideBudgets: number } | null;
  budgets: BudgetDetail[];
  unbudgeted: number;
  elapsedRatio: number;
}
