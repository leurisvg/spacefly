import {
  accountKind,
  amountSide,
  inferTransactionType,
  isPositiveAmount,
  type AccountInput,
  type AccountKind,
  type AccountSlot,
  type TxEditPayload,
  type TxKind,
} from '@spacefly/shared';
import type { FfAccount, FfBill, FfBudget, FfCategory, FfPiggyBank, FfResource, FfTag, FfTransactionGroup } from '../firefly/firefly.types';
import { NotEditable, ValidationFailed } from '../routes/errors';
import type {
  AccountEditPayload,
  AccountWrite,
  AccountWriteType,
  AutoBudgetPeriod,
  AutoBudgetType,
  BillEditPayload,
  BillWrite,
  BudgetEditPayload,
  BudgetWrite,
  CategoryEditPayload,
  CategoryWrite,
  InterestPeriod,
  LiabilityDirection,
  LiabilityType,
  PiggyEditPayload,
  PiggyWrite,
  RepeatFreq,
  TagEditPayload,
  TagWrite,
} from '@spacefly/shared';
import type { TxWriteBody } from '../routes/write.schemas';
import type { Account } from './firefly-data';

/** One side of a transaction after matching what the user picked against real accounts. */
export interface Side {
  slot: AccountSlot;
  /** The existing account, or `null` for a name Firefly will create. */
  account: Account | null;
  /** The typed name of an account that doesn't exist yet. */
  name: string | null;
}

const SOURCE_KINDS: AccountKind[] = ['asset', 'liability', 'revenue', 'cash'];
const DESTINATION_KINDS: AccountKind[] = ['asset', 'liability', 'expense', 'cash'];

export function resolveSide(input: AccountInput, side: 'source' | 'destination', accounts: Account[]): Side {
  if ('id' in input) {
    const account = accounts.find((a) => a.id === input.id);
    const kind = account ? accountKind(account.type) : null;
    if (!account || !kind) throw new ValidationFailed({ [side]: ['The selected account does not exist.'] });
    return { slot: kind, account, name: null };
  }
  const allowed = side === 'source' ? SOURCE_KINDS : DESTINATION_KINDS;
  const wanted = input.name.trim().toLowerCase();
  const match = accounts.find((a) => a.name.toLowerCase() === wanted && allowed.includes(accountKind(a.type) as AccountKind));
  if (match) return { slot: accountKind(match.type), account: match, name: null };
  return { slot: 'new', account: null, name: input.name.trim() };
}

export interface Resolved {
  type: TxKind;
  source: Side;
  destination: Side;
  /** Currency of `amount`. */
  currency: string;
  foreign: { amount: string; currency: string } | null;
}

/** Infers the type and the currencies; throws a field-level `ValidationFailed` when something is off. */
export function resolveTransaction(
  req: TxWriteBody,
  accounts: Account[],
  primary: string,
  enabledCurrencies: Set<string>,
): Resolved {
  const source = resolveSide(req.source, 'source', accounts);
  const destination = resolveSide(req.destination, 'destination', accounts);
  const type = inferTransactionType(source.slot, destination.slot);
  if (!type) {
    throw new ValidationFailed({ destination: ['These two accounts cannot be combined in a transaction.'] });
  }
  if (!isPositiveAmount(req.amount)) throw new ValidationFailed({ amount: ['The amount must be greater than zero.'] });

  const amountAccount = amountSide(type) === 'source' ? source.account : destination.account;
  const currency = amountAccount?.currency || primary;

  let foreign: Resolved['foreign'] = null;
  if (type === 'transfer') {
    const received = destination.account?.currency || primary;
    if (received !== currency) {
      if (!isPositiveAmount(req.foreignAmount)) {
        throw new ValidationFailed({ foreignAmount: ['Enter the amount received in the destination currency.'] });
      }
      foreign = { amount: req.foreignAmount!, currency: received };
    }
  } else if (req.foreignAmount) {
    if (!isPositiveAmount(req.foreignAmount)) throw new ValidationFailed({ foreignAmount: ['The amount must be greater than zero.'] });
    if (!req.foreignCurrency) throw new ValidationFailed({ foreignCurrency: ['Choose the currency.'] });
    if (req.foreignCurrency === currency) throw new ValidationFailed({ foreignCurrency: ['It must differ from the main currency.'] });
    if (!enabledCurrencies.has(req.foreignCurrency)) throw new ValidationFailed({ foreignCurrency: ['This currency is not enabled in Firefly.'] });
    foreign = { amount: req.foreignAmount, currency: req.foreignCurrency };
  }
  return { type, source, destination, currency, foreign };
}

/** Noon, so a timezone shift can never move the transaction to another day. */
export const noon = (date: string): string => `${date}T12:00:00`;

/** The moment sent to Firefly: the chosen time, or noon when none was chosen. */
export const momentOf = (date: string, time: string | null): string => (time ? `${date}T${time}:00` : noon(date));

/**
 * The body for `POST /v1/transactions` or `PUT /v1/transactions/{id}`. Rules and webhooks always
 * run. On update, cleared fields are sent explicitly empty, otherwise Firefly would keep the old value.
 */
export function transactionBody(
  req: TxWriteBody,
  r: Resolved,
  opts: { date: string; journalId?: string },
): Record<string, unknown> {
  const update = opts.journalId !== undefined;
  const t: Record<string, unknown> = {
    type: r.type,
    date: opts.date,
    description: req.description,
    amount: req.amount,
    currency_code: r.currency,
  };
  if (update) t['transaction_journal_id'] = opts.journalId;
  for (const [key, side] of [
    ['source', r.source],
    ['destination', r.destination],
  ] as const) {
    if (side.account) t[`${key}_id`] = side.account.id;
    else t[`${key}_name`] = side.name;
  }
  if (r.foreign) {
    t['foreign_amount'] = r.foreign.amount;
    t['foreign_currency_code'] = r.foreign.currency;
  } else if (update) {
    t['foreign_amount'] = null;
    t['foreign_currency_code'] = null;
  }

  const withdrawal = r.type === 'withdrawal';
  const set = (key: string, value: unknown, empty: unknown) => {
    if (value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)) t[key] = value;
    else if (update) t[key] = empty;
  };
  set('category_name', req.category, '');
  set('budget_id', withdrawal ? req.budgetId : null, null);
  set('bill_id', withdrawal ? req.billId : null, null);
  set('tags', req.tags, []);
  set('notes', req.notes, '');

  return { apply_rules: true, fire_webhooks: true, error_if_duplicate_hash: false, transactions: [t] };
}

const EDITABLE: string[] = ['withdrawal', 'deposit', 'transfer'];

/** Only single-split withdrawals, deposits and transfers are edited here. */
export function assertEditable(group: FfResource<FfTransactionGroup>): void {
  const splits = group.attributes.transactions;
  if (splits.length !== 1) {
    throw new NotEditable('This transaction has several parts; edit it in Firefly.', 'splits');
  }
  if (!EDITABLE.includes(splits[0]!.type)) {
    throw new NotEditable('This kind of transaction cannot be edited here.', 'type');
  }
}

export function toEditPayload(group: FfResource<FfTransactionGroup>): TxEditPayload {
  assertEditable(group);
  const t = group.attributes.transactions[0]!;
  const abs = (v: string | null | undefined) => (v ? v.replace(/^-/, '') : '');
  return {
    groupId: group.id,
    journalId: t.transaction_journal_id,
    type: t.type as TxKind,
    description: t.description,
    date: t.date.slice(0, 10),
    time: /^\d{2}:\d{2}/.test(t.date.slice(11, 16)) ? t.date.slice(11, 16) : null,
    source: { id: t.source_id, name: t.source_name, kind: accountKind(t.source_type) },
    destination: { id: t.destination_id, name: t.destination_name, kind: accountKind(t.destination_type) },
    amount: abs(t.amount),
    currency: t.currency_code,
    foreignAmount: t.foreign_amount && Number(t.foreign_amount) !== 0 ? abs(t.foreign_amount) : null,
    foreignCurrency: t.foreign_amount && Number(t.foreign_amount) !== 0 ? (t.foreign_currency_code ?? null) : null,
    category: t.category_name || null,
    budgetId: t.budget_id || null,
    billId: t.bill_id || t.subscription_id || null,
    tags: t.tags ?? [],
    notes: t.notes || null,
  };
}

// ── Categories and tags ───────────────────────────────────────────────────────

export function categoryBody(w: CategoryWrite, current?: FfResource<FfCategory>): Record<string, unknown> {
  const body: Record<string, unknown> = { name: w.name };
  if (w.notes !== null) body['notes'] = w.notes;
  else if (current) body['notes'] = '';
  return body;
}

export function toCategoryEdit(r: FfResource<FfCategory>): CategoryEditPayload {
  return { id: r.id, name: r.attributes.name, notes: r.attributes.notes || null };
}

export function tagBody(w: TagWrite, current?: FfResource<FfTag>): Record<string, unknown> {
  const body: Record<string, unknown> = { tag: w.tag };
  if (w.date !== null) body['date'] = w.date;
  else if (current) body['date'] = null;
  if (w.description !== null) body['description'] = w.description;
  else if (current) body['description'] = '';
  return body;
}

export function toTagEdit(r: FfResource<FfTag>): TagEditPayload {
  return { id: r.id, tag: r.attributes.tag, date: r.attributes.date?.slice(0, 10) || null, description: r.attributes.description || null };
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export function budgetBody(w: BudgetWrite, current?: FfResource<FfBudget>): Record<string, unknown> {
  const body: Record<string, unknown> = { name: w.name, active: w.active };
  if (w.notes !== null) body['notes'] = w.notes;
  else if (current) body['notes'] = '';
  if (w.autoBudget) {
    body['auto_budget_type'] = w.autoBudget.type;
    body['auto_budget_amount'] = w.autoBudget.amount;
    body['auto_budget_period'] = w.autoBudget.period;
    body['auto_budget_currency_code'] = w.autoBudget.currency;
  } else if (current) {
    // 'none' switches the automatic budget off.
    body['auto_budget_type'] = 'none';
  }
  return body;
}

export function toBudgetEdit(r: FfResource<FfBudget>, primary: string): BudgetEditPayload {
  const a = r.attributes;
  const type = a.auto_budget_type && a.auto_budget_type !== 'none' ? (a.auto_budget_type as AutoBudgetType) : null;
  return {
    id: r.id,
    name: a.name,
    active: a.active !== false,
    notes: a.notes || null,
    autoBudget: type
      ? {
          type,
          amount: a.auto_budget_amount ?? '',
          period: (a.auto_budget_period ?? 'monthly') as AutoBudgetPeriod,
          currency: a.currency_code ?? primary,
        }
      : null,
  };
}

// ── Subscriptions (bills) ─────────────────────────────────────────────────────

export function billBody(w: BillWrite, current?: FfResource<FfBill>): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: w.name,
    amount_min: w.amountMin,
    amount_max: w.amountMax,
    currency_code: w.currency,
    date: w.date,
    repeat_freq: w.repeatFreq,
    skip: w.skip,
    active: w.active,
  };
  if (w.endDate !== null) body['end_date'] = w.endDate;
  else if (current) body['end_date'] = null;
  if (w.group !== null) body['object_group_title'] = w.group;
  else if (current) body['object_group_title'] = '';
  if (w.notes !== null) body['notes'] = w.notes;
  else if (current) body['notes'] = '';
  return body;
}

export function toBillEdit(r: FfResource<FfBill>, primary: string): BillEditPayload {
  const a = r.attributes;
  return {
    id: r.id,
    name: a.name,
    amountMin: a.amount_min,
    amountMax: a.amount_max,
    currency: a.currency_code ?? primary,
    date: a.date.slice(0, 10),
    repeatFreq: a.repeat_freq as RepeatFreq,
    skip: a.skip ?? 0,
    endDate: a.end_date ? a.end_date.slice(0, 10) : null,
    active: a.active !== false,
    group: a.object_group_title || null,
    notes: a.notes || null,
  };
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export function accountBody(w: AccountWrite, current?: FfResource<FfAccount>): Record<string, unknown> {
  const body: Record<string, unknown> = { type: w.type, name: w.name, active: w.active };
  const optional = (key: string, value: string | null) => {
    if (value !== null) body[key] = value;
    else if (current) body[key] = '';
  };
  optional('iban', w.iban);
  optional('notes', w.notes);
  if (w.type === 'asset' || w.type === 'liability') {
    body['include_net_worth'] = w.includeNetWorth;
    body['currency_code'] = w.currency;
    if (w.openingBalance !== null) {
      body['opening_balance'] = w.openingBalance;
      body['opening_balance_date'] = w.openingBalanceDate;
    }
  }
  if (w.type === 'asset') {
    body['account_role'] = w.role;
    if (w.role === 'ccAsset') {
      body['credit_card_type'] = w.creditCardType;
      body['monthly_payment_date'] = w.monthlyPaymentDate;
    }
  }
  if (w.type === 'liability') {
    body['liability_type'] = w.liabilityType;
    body['liability_direction'] = w.liabilityDirection;
    body['interest'] = w.interest;
    body['interest_period'] = w.interestPeriod;
  }
  return body;
}

export function toAccountEdit(r: FfResource<FfAccount>, transactionCount: number): AccountEditPayload {
  const a = r.attributes;
  const kind = accountKind(a.type);
  if (kind !== 'asset' && kind !== 'liability' && kind !== 'expense' && kind !== 'revenue') {
    throw new NotEditable('This kind of account cannot be edited here.', 'type');
  }
  const type: AccountWriteType = kind;
  const owned = type === 'asset' || type === 'liability';
  return {
    id: r.id,
    type,
    name: a.name,
    active: a.active !== false,
    iban: a.iban || null,
    notes: a.notes || null,
    currency: owned ? (a.currency_code ?? null) : null,
    includeNetWorth: a.include_net_worth !== false,
    role: type === 'asset' ? (a.account_role ?? null) : null,
    creditCardType: type === 'asset' && a.account_role === 'ccAsset' ? (a.credit_card_type ?? null) : null,
    monthlyPaymentDate: type === 'asset' && a.account_role === 'ccAsset' && a.monthly_payment_date ? a.monthly_payment_date.slice(0, 10) : null,
    openingBalance: owned && a.opening_balance && Number(a.opening_balance) !== 0 ? a.opening_balance : null,
    openingBalanceDate: owned && a.opening_balance && Number(a.opening_balance) !== 0 && a.opening_balance_date ? a.opening_balance_date.slice(0, 10) : null,
    liabilityType: type === 'liability' ? ((a.liability_type ?? null) as LiabilityType | null) : null,
    liabilityDirection: type === 'liability' ? ((a.liability_direction ?? null) as LiabilityDirection | null) : null,
    interest: type === 'liability' ? (a.interest ?? null) : null,
    interestPeriod: type === 'liability' ? ((a.interest_period ?? null) as InterestPeriod | null) : null,
    transactionCount,
  };
}

// ── Goals (piggy banks) ───────────────────────────────────────────────────────

export function piggyBody(w: PiggyWrite, current?: FfResource<FfPiggyBank>): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: w.name,
    currency_code: w.currency,
    transaction_currency_code: w.currency,
    // Firefly syncs the goal's accounts with this list: it must always be the complete one.
    accounts: w.accounts.map((a) => ({ account_id: a.accountId, current_amount: a.currentAmount })),
  };
  const optional = (key: string, value: string | null, empty: string | null) => {
    if (value !== null) body[key] = value;
    else if (current) body[key] = empty;
  };
  optional('target_amount', w.targetAmount, null);
  optional('start_date', w.startDate, null);
  optional('target_date', w.targetDate, null);
  optional('object_group_title', w.group, '');
  optional('notes', w.notes, '');
  return body;
}

export function toPiggyEdit(r: FfResource<FfPiggyBank>, primary: string): PiggyEditPayload {
  const a = r.attributes;
  return {
    id: r.id,
    name: a.name,
    currency: a.currency_code ?? primary,
    targetAmount: a.target_amount && Number(a.target_amount) > 0 ? a.target_amount : null,
    startDate: a.start_date ? a.start_date.slice(0, 10) : null,
    targetDate: a.target_date ? a.target_date.slice(0, 10) : null,
    group: a.object_group_title || null,
    notes: a.notes || null,
    accounts: (a.accounts ?? []).map((x) => ({ accountId: x.account_id ?? x.id ?? '', currentAmount: x.current_amount ?? '0' })),
  };
}
