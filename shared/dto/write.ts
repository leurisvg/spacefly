import type { CurrencyInfo } from './money';
import type { Ref } from './ledger';
import type { AccountKind, TxKind } from '../utils/tx-type';

/**
 * Write-side DTOs. Amounts are always decimal strings ("1234.56") and dates `YYYY-MM-DD`.
 * Each entity has a `*Write` body (create / update) and an `*EditPayload` (what the form loads).
 */

// ── Lookups for the editors ──────────────────────────────────────────────────

export interface EditorAccount {
  id: string;
  name: string;
  kind: AccountKind;
  /** `loan`, `debt` or `mortgage` for liabilities. */
  liabilityType: string | null;
  currency: string;
  role: string | null;
  group: string | null;
}

export interface EditorBill {
  id: string;
  name: string;
  currency: string;
  active: boolean;
}

export interface EditorPiggy {
  id: string;
  name: string;
  currency: string;
}

export interface EditorLookups {
  accounts: EditorAccount[];
  categories: Ref[];
  tags: Ref[];
  budgets: Ref[];
  bills: EditorBill[];
  piggyBanks: EditorPiggy[];
  currencies: CurrencyInfo[];
  /** The user's default asset account, pre-selected in new transactions. */
  defaultAccountId: string | null;
}

// ── Errors ───────────────────────────────────────────────────────────────────

/** Body of a 422: `fields` are keyed by the DTO field names of the request. */
export interface ValidationErrorBody {
  error: 'validation';
  message: string;
  fields: Record<string, string[]>;
}

// ── Transactions ─────────────────────────────────────────────────────────────

/** An existing account by id, or a name that doesn't exist yet (Firefly creates it). */
export type AccountInput = { id: string } | { name: string };

export interface TxWriteRequest {
  description: string;
  date: string;
  source: AccountInput;
  destination: AccountInput;
  /** In the currency of the account on the amount side (see `amountSide`). */
  amount: string;
  /** The amount in another currency: the received amount of a cross-currency transfer, or "other currency" on expenses/income. */
  foreignAmount: string | null;
  foreignCurrency: string | null;
  category: string | null;
  budgetId: string | null;
  billId: string | null;
  tags: string[];
  notes: string | null;
}

export interface TxWriteResult {
  groupId: string;
  journalId: string;
  type: TxKind;
}

export interface TxEditPayload extends Omit<TxWriteRequest, 'source' | 'destination'> {
  groupId: string;
  journalId: string;
  type: TxKind;
  currency: string;
  source: { id: string; name: string; kind: AccountKind | null };
  destination: { id: string; name: string; kind: AccountKind | null };
}

// ── Categories and tags ──────────────────────────────────────────────────────

export interface CategoryWrite {
  name: string;
  notes: string | null;
}

export interface CategoryEditPayload extends CategoryWrite {
  id: string;
}

export interface TagWrite {
  tag: string;
  date: string | null;
  description: string | null;
}

export interface TagEditPayload extends TagWrite {
  id: string;
}

// ── Budgets ──────────────────────────────────────────────────────────────────

export type AutoBudgetType = 'reset' | 'rollover' | 'adjusted';
export type AutoBudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half-year' | 'yearly';

export interface AutoBudgetWrite {
  type: AutoBudgetType;
  amount: string;
  period: AutoBudgetPeriod;
  currency: string;
}

export interface BudgetWrite {
  name: string;
  active: boolean;
  notes: string | null;
  /** `null` turns the automatic budget off. */
  autoBudget: AutoBudgetWrite | null;
}

export interface BudgetEditPayload extends BudgetWrite {
  id: string;
}

// ── Subscriptions (bills) ────────────────────────────────────────────────────

export type RepeatFreq = 'weekly' | 'monthly' | 'quarterly' | 'half-year' | 'yearly';

export interface BillWrite {
  name: string;
  amountMin: string;
  amountMax: string;
  currency: string;
  date: string;
  repeatFreq: RepeatFreq;
  skip: number;
  endDate: string | null;
  active: boolean;
  group: string | null;
  notes: string | null;
}

export interface BillEditPayload extends BillWrite {
  id: string;
}

// ── Accounts ─────────────────────────────────────────────────────────────────

export type AccountWriteType = 'asset' | 'liability' | 'expense' | 'revenue';
export type LiabilityType = 'loan' | 'debt' | 'mortgage';
export type LiabilityDirection = 'credit' | 'debit';
export type InterestPeriod = 'daily' | 'monthly' | 'yearly';

export interface AccountWrite {
  type: AccountWriteType;
  name: string;
  active: boolean;
  iban: string | null;
  notes: string | null;
  /** Asset and liability accounts only. */
  currency: string | null;
  includeNetWorth: boolean;
  /** Asset accounts only. */
  role: string | null;
  creditCardType: string | null;
  monthlyPaymentDate: string | null;
  openingBalance: string | null;
  openingBalanceDate: string | null;
  /** Liabilities only. */
  liabilityType: LiabilityType | null;
  liabilityDirection: LiabilityDirection | null;
  interest: string | null;
  interestPeriod: InterestPeriod | null;
}

export interface AccountEditPayload extends AccountWrite {
  id: string;
  /** Deleting the account deletes these transactions too. */
  transactionCount: number;
}

// ── Goals (piggy banks) ──────────────────────────────────────────────────────

export interface PiggyAccountAmount {
  accountId: string;
  /** Money currently saved in this goal from that account. */
  currentAmount: string;
}

export interface PiggyWrite {
  name: string;
  currency: string;
  targetAmount: string | null;
  startDate: string | null;
  targetDate: string | null;
  group: string | null;
  notes: string | null;
  /** Always the full list: Firefly syncs the accounts of a goal with it. */
  accounts: PiggyAccountAmount[];
}

export interface PiggyEditPayload extends PiggyWrite {
  id: string;
}
