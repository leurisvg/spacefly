import { computed, effect, inject, signal, untracked, type Signal } from '@angular/core';
import { disabled, max, maxLength, min, validate } from '@angular/forms/signals';
import {
  daysInMonth,
  isIsoDate,
  todayIso,
  type AccountEditPayload,
  type AccountWrite,
  type AccountWriteType,
  type InterestPeriod,
  type LiabilityDirection,
  type LiabilityType,
} from '@spacefly/shared';
import { I18n } from '../../i18n/i18n';
import { EditorLookupsStore } from '../../state/editor-lookups.store';
import { MetaStore } from '../../state/meta.store';
import { entityFormViewModel, type EntityFormInputs } from './entity-form.vm';

export interface AccountModel {
  type: AccountWriteType;
  name: string;
  active: boolean;
  iban: string;
  notes: string;
  currency: string;
  includeNetWorth: boolean;
  role: string;
  cardType: string;
  paymentDay: number;
  openingBalance: string;
  openingBalanceDate: string;
  liabilityType: LiabilityType;
  liabilityDirection: LiabilityDirection;
  interest: string;
  interestPeriod: InterestPeriod;
}

const TYPES: AccountWriteType[] = ['asset', 'liability', 'expense', 'revenue'];
const ROLES = ['defaultAsset', 'sharedAsset', 'savingAsset', 'ccAsset', 'cashWalletAsset'];
const SIGNED = /^-?\d+(\.\d+)?$/;

/** A card's payment day as a date this month (Firefly stores a date and only uses its day). */
export function paymentDate(day: number): string {
  const month = todayIso().slice(0, 7);
  const clamped = Math.min(Math.max(Math.trunc(day) || 1, 1), daysInMonth(`${month}-01`));
  return `${month}-${String(clamped).padStart(2, '0')}`;
}

export interface AccountFormInputs extends EntityFormInputs {
  /** The kind a new account starts as. */
  accountType: Signal<AccountWriteType>;
}

/**
 * Create or edit an account of any kind. The kind is chosen when creating and then fixed; the fields shown follow it (role and
 * opening balance for assets, interest and debt for liabilities…). Deleting asks to type the account's name and says how many
 * transactions go with it.
 */
export function accountFormViewModel(inputs: AccountFormInputs) {
  const i18n = inject(I18n);
  const lookups = inject(EditorLookupsStore);
  const meta = inject(MetaStore);
  let transactionCount = 0;
  const blank = (): AccountModel => ({
    type: 'asset',
    name: '',
    active: true,
    iban: '',
    notes: '',
    currency: meta.primary(),
    includeNetWorth: true,
    role: 'defaultAsset',
    cardType: 'monthlyFull',
    paymentDay: 1,
    openingBalance: '',
    openingBalanceDate: '',
    liabilityType: 'loan',
    liabilityDirection: 'debit',
    interest: '0',
    interestPeriod: 'monthly',
  });
  const model = signal(blank());
  const isAsset = computed(() => model().type === 'asset');
  const isLiability = computed(() => model().type === 'liability');
  const isOwned = computed(() => isAsset() || isLiability());

  const base = entityFormViewModel<AccountModel, AccountEditPayload>({
    id: inputs.id,
    done: inputs.done,
    kind: 'account',
    path: 'accounts',
    model,
    schema: (p) => {
      disabled(p.type, () => !!inputs.id());
      validate(p.name, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
      maxLength(p.name, 255);
      maxLength(p.iban, 64);
      maxLength(p.notes, 65000);
      validate(p.paymentDay, (c) => (model().role === 'ccAsset' && !(c.value() >= 1 && c.value() <= 31) ? { kind: 'day' } : undefined));
      min(p.paymentDay, 1);
      max(p.paymentDay, 31);
      validate(p.interest, (c) => (isLiability() && !/^\d+(\.\d+)?$/.test(c.value().trim()) ? { kind: 'interest' } : undefined));
      validate(p.openingBalance, (c) => (!c.value().trim() || SIGNED.test(c.value()) ? undefined : { kind: 'amount' }));
      validate(p.openingBalanceDate, (c) => {
        if (!c.value()) return model().openingBalance.trim() ? { kind: 'required' } : undefined;
        return isIsoDate(c.value()) ? undefined : { kind: 'date' };
      });
    },
    blank,
    toModel: (p) => {
      transactionCount = p.transactionCount;
      return {
        type: p.type,
        name: p.name,
        active: p.active,
        iban: p.iban ?? '',
        notes: p.notes ?? '',
        currency: p.currency ?? meta.primary(),
        includeNetWorth: p.includeNetWorth,
        role: p.role ?? 'defaultAsset',
        cardType: p.creditCardType ?? 'monthlyFull',
        paymentDay: p.monthlyPaymentDate ? Number(p.monthlyPaymentDate.slice(8, 10)) : 1,
        openingBalance: p.openingBalance ?? '',
        openingBalanceDate: p.openingBalanceDate ?? '',
        liabilityType: p.liabilityType ?? 'loan',
        liabilityDirection: p.liabilityDirection ?? 'debit',
        interest: p.interest ?? '0',
        interestPeriod: p.interestPeriod ?? 'monthly',
      };
    },
    toRequest: (m): AccountWrite => {
      const owned = m.type === 'asset' || m.type === 'liability';
      const card = m.type === 'asset' && m.role === 'ccAsset';
      const hasBalance = owned && m.openingBalance.trim() !== '';
      return {
        type: m.type,
        name: m.name.trim(),
        active: m.active,
        iban: m.iban.trim() || null,
        notes: m.notes.trim() || null,
        currency: owned ? m.currency : null,
        includeNetWorth: m.includeNetWorth,
        role: m.type === 'asset' ? m.role : null,
        creditCardType: card ? m.cardType : null,
        monthlyPaymentDate: card ? paymentDate(m.paymentDay) : null,
        openingBalance: hasBalance ? m.openingBalance.trim() : null,
        openingBalanceDate: hasBalance ? m.openingBalanceDate : null,
        liabilityType: m.type === 'liability' ? m.liabilityType : null,
        liabilityDirection: m.type === 'liability' ? m.liabilityDirection : null,
        interest: m.type === 'liability' ? m.interest.trim() : null,
        interestPeriod: m.type === 'liability' ? m.interestPeriod : null,
      };
    },
    displayName: (m) => m.name,
    deleteWarning: () => (transactionCount ? i18n.t('editor.entity.account.deleteWarning', { count: transactionCount }) : null),
    deleteRequireText: (m) => m.name,
  });

  // A new account starts as the kind it was opened for.
  effect(() => {
    const type = inputs.accountType();
    untracked(() => {
      if (!inputs.id()) model.update((m) => ({ ...m, type }));
    });
  });

  const t = i18n.t;
  return {
    ...base,
    isAsset,
    isLiability,
    isOwned,
    typeOptions: computed(() => TYPES.map((x) => ({ value: x, label: t(`editor.entity.account.types.${x}`) }))),
    roleOptions: computed(() => ROLES.map((r) => ({ value: r, label: t(`accounts.roles.${r}`) }))),
    cardOptions: computed(() => [{ value: 'monthlyFull', label: t('editor.entity.account.cardTypes.monthlyFull') }]),
    liabilityOptions: computed(() => (['loan', 'debt', 'mortgage'] as const).map((x) => ({ value: x, label: t(`editor.entity.account.liabilityTypes.${x}`) }))),
    directionOptions: computed(() => (['debit', 'credit'] as const).map((x) => ({ value: x, label: t(`editor.entity.account.directions.${x}`) }))),
    interestPeriodOptions: computed(() => (['daily', 'monthly', 'yearly'] as const).map((x) => ({ value: x, label: t(`editor.entity.account.interestPeriods.${x}`) }))),
    currencyOptions: computed(() => lookups.currencies().map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))),
  };
}
