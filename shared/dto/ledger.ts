export type TxType =
  | 'withdrawal'
  | 'deposit'
  | 'transfer'
  | 'opening balance'
  | 'reconciliation'
  | 'liability credit'
  | string;

export interface Ref {
  id: string;
  name: string;
}

export interface AccountRef extends Ref {
  type: string;
}

/** A single transaction split as delivered to the browser, amounts in the display currency. */
export interface TxRow {
  id: string;
  groupId: string;
  /** Splits in the transaction group: only single-split transactions can be edited here. */
  splitCount: number;
  date: string;
  type: TxType;
  description: string;
  /** Always positive, in the display currency. */
  amount: number;
  originalAmount: number;
  originalCurrency: string;
  foreignAmount: number | null;
  foreignCurrency: string | null;
  /** Display units per 1 original unit (1 when the original is already the display currency). */
  rate: number;
  category: Ref | null;
  budget: Ref | null;
  bill: Ref | null;
  tags: string[];
  source: AccountRef;
  destination: AccountRef;
  notes: string | null;
}

/**
 * Filter accepted by `/api/transactions`, used by every drill-down.
 * Use the literal value `none` to ask for splits without category/budget/tag.
 */
export interface TxFilter {
  start: string;
  end: string;
  type?: 'withdrawal' | 'deposit' | 'transfer';
  category?: string;
  /** Comma-separated category ids (`none` = uncategorized), for slices that group several categories. */
  categories?: string;
  budget?: string;
  tag?: string;
  bill?: string;
  /** Asset account id (source or destination). */
  account?: string;
  /** Expense/revenue account id (the "other side"). */
  counterparty?: string;
  q?: string;
}

export interface TxListResponse {
  rows: TxRow[];
  totals: { income: number; expense: number; transfer: number };
}

export interface SearchResponse {
  rows: TxRow[];
  page: number;
  totalPages: number;
  total: number;
}
