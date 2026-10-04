/**
 * Transaction type inference. The user never picks a type: Firefly derives it from the
 * kind of the source and destination accounts (`config/firefly.php` → `account_to_transaction`).
 */

export type TxKind = 'withdrawal' | 'deposit' | 'transfer';

/** What an account is, ignoring Firefly's two spellings (`Asset account` vs `asset`). */
export type AccountKind = 'asset' | 'liability' | 'expense' | 'revenue' | 'cash';

/** A picked side of a transaction: an existing account kind, a name that doesn't exist yet, or nothing. */
export type AccountSlot = AccountKind | 'new' | null;

const KINDS: Record<string, AccountKind> = {
  asset: 'asset',
  'asset account': 'asset',
  'default account': 'asset',
  expense: 'expense',
  'expense account': 'expense',
  beneficiary: 'expense',
  revenue: 'revenue',
  'revenue account': 'revenue',
  cash: 'cash',
  'cash account': 'cash',
  liability: 'liability',
  liabilities: 'liability',
  loan: 'liability',
  debt: 'liability',
  mortgage: 'liability',
};

/** Maps any of Firefly's account type spellings to a kind; `null` for system accounts (opening balance…). */
export function accountKind(type: string | null | undefined): AccountKind | null {
  if (!type) return null;
  return KINDS[type.trim().toLowerCase()] ?? null;
}

const isOwned = (k: AccountSlot): boolean => k === 'asset' || k === 'liability';

/**
 * The transaction type for a source/destination pair, or `null` when the pair is not allowed.
 * A new name typed in the destination becomes an expense account; in the source, a revenue account.
 */
export function inferTransactionType(source: AccountSlot, destination: AccountSlot): TxKind | null {
  if (!source || !destination) return null;
  const from: AccountKind | null = source === 'new' ? 'revenue' : source;
  const to: AccountKind | null = destination === 'new' ? 'expense' : destination;
  if (source === 'new' && destination === 'new') return null;

  if (from === 'asset') {
    if (to === 'asset') return 'transfer';
    if (to === 'expense' || to === 'cash' || to === 'liability') return 'withdrawal';
    return null;
  }
  if (from === 'liability') {
    if (to === 'asset') return 'deposit';
    if (to === 'liability') return 'transfer';
    if (to === 'expense') return 'withdrawal';
    return null;
  }
  if (from === 'revenue' || from === 'cash') {
    return isOwned(to) ? 'deposit' : null;
  }
  return null;
}

/** Which account's currency the main amount is expressed in. */
export function amountSide(type: TxKind): 'source' | 'destination' {
  return type === 'deposit' ? 'destination' : 'source';
}
