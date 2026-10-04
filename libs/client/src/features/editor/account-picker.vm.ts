import { computed, inject, type Signal, type WritableSignal } from '@angular/core';
import { inferTransactionType, type AccountInput, type AccountKind, type AccountSlot, type EditorAccount } from '@spacefly/shared';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';

const SOURCE_GROUPS: AccountKind[] = ['asset', 'liability', 'revenue', 'cash'];
const DESTINATION_GROUPS: AccountKind[] = ['asset', 'liability', 'expense', 'cash'];
/** Kinds whose balance means something to the person paying from them. */
const WITH_BALANCE: AccountKind[] = ['asset', 'liability', 'cash'];

export type AccountSide = 'source' | 'destination';

export interface AccountOption {
  value: string;
  label: string;
  group: string;
  hint: string;
  hintTone?: 'negative';
  invalid: boolean;
  invalidReason: string;
}

/** What `{ id } | { name } | null` looks like to a picker control. */
export const comboValueOf = (v: AccountInput | null): string => (v ? ('id' in v ? v.id : v.name) : '');
export const isCreated = (v: AccountInput | null): boolean => !!v && 'name' in v;

/** Is `slot` allowed on `side` next to the account of kind `other` on the other side? */
export function slotFits(side: AccountSide, other: AccountSlot, slot: AccountSlot): boolean {
  if (!other) return true;
  return (side === 'source' ? inferTransactionType(slot, other) : inferTransactionType(other, slot)) !== null;
}

/**
 * Account chooser for one side of a transaction: accounts grouped by the kinds that make sense for that
 * side, options that can't be combined with the other side's account marked as not valid, and (as a
 * source) each account's balance. The selected value is `{ id }`, `{ name }` (new) or `null`.
 */
export function accountPickerViewModel(inputs: {
  value: WritableSignal<AccountInput | null>;
  accounts: Signal<EditorAccount[]>;
  side: Signal<AccountSide>;
  other: Signal<AccountSlot>;
}) {
  const i18n = inject(I18n);
  const format = inject(FormatService);

  /** The balance to show for an account: only on the source side, and only where it is meaningful. */
  const balanceOf = (a: EditorAccount): { text: string; negative: boolean } | null =>
    inputs.side() !== 'source' || !WITH_BALANCE.includes(a.kind) ? null : { text: format.money(a.balance, a.currency), negative: a.balance < 0 };

  const selectedBalance = computed(() => {
    const v = inputs.value();
    const account = v && 'id' in v ? inputs.accounts().find((a) => a.id === v.id) : undefined;
    return account ? balanceOf(account) : null;
  });

  const options = computed<AccountOption[]>(() => {
    const side = inputs.side();
    const groups = side === 'source' ? SOURCE_GROUPS : DESTINATION_GROUPS;
    const other = inputs.other();
    const reason = i18n.t('forms.account.incompatible');
    return groups.flatMap((kind) =>
      inputs
        .accounts()
        .filter((a) => a.kind === kind)
        .map((a) => {
          const balance = balanceOf(a);
          return {
            value: a.id,
            label: a.name,
            group: i18n.t(`forms.accountGroups.${kind}`),
            hint: balance?.text ?? a.currency,
            hintTone: balance?.negative ? ('negative' as const) : undefined,
            invalid: !slotFits(side, other, kind),
            invalidReason: reason,
          };
        }),
    );
  });

  return {
    i18n,
    options,
    selectedBalance,
    comboValue: computed(() => comboValueOf(inputs.value())),
    comboCreated: computed(() => isCreated(inputs.value())),
    createInvalid: computed(() => !slotFits(inputs.side(), inputs.other(), 'new')),
    createLabel: computed(() => {
      const key = inputs.side() === 'destination' ? 'forms.account.newExpense' : 'forms.account.newRevenue';
      return (name: string) => i18n.t(key, { name });
    }),

    /** The picker emitted a selection: an existing account id, a typed new name, or nothing. */
    select(selection: { value: string; created?: boolean }): void {
      inputs.value.set(!selection.value ? null : selection.created ? { name: selection.value } : { id: selection.value });
    },
  };
}
