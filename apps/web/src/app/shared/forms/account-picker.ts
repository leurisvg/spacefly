import { ChangeDetectionStrategy, Component, computed, inject, input, model, output } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { inferTransactionType, type AccountInput, type AccountKind, type AccountSlot, type EditorAccount } from '@spacefly/shared';
import { FormatService } from '../../core/format/format.service';
import { I18n } from '../../core/i18n/i18n';
import { Combobox, type ComboOption, type ComboSelection } from './combobox';

const SOURCE_GROUPS: AccountKind[] = ['asset', 'liability', 'revenue', 'cash'];
const DESTINATION_GROUPS: AccountKind[] = ['asset', 'liability', 'expense', 'cash'];
/** Kinds whose balance means something to the person paying from them. */
const WITH_BALANCE: AccountKind[] = ['asset', 'liability', 'cash'];

/**
 * Account chooser for one side of a transaction: accounts grouped by kind (the kinds that make sense
 * for that side), anything typed that doesn't exist can be created on the fly (a new expense account as
 * destination, a new income source as source). Options that can't be combined with the account on the
 * other side are shown as not valid. As a source it also shows each account's balance (red when negative). The value is `{ id }`, `{ name }` (new) or `null`.
 */
@Component({
  selector: 'sf-account-picker',
  imports: [Combobox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <sf-combobox
      [options]="options()"
      [value]="comboValue()"
      [created]="comboCreated()"
      [suffix]="selectedBalance()?.text ?? ''"
      [suffixNegative]="selectedBalance()?.negative ?? false"
      [placeholder]="placeholder()"
      [ariaLabel]="ariaLabel()"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [allowCreate]="true"
      [createLabel]="createLabel()"
      [createInvalid]="createInvalid()"
      [createInvalidReason]="i18n.t('forms.account.incompatible')"
      (selection)="onSelection($event)"
      (touch)="touch.emit()"
    />
  `,
})
export class AccountPicker implements FormValueControl<AccountInput | null> {
  protected readonly i18n = inject(I18n);
  private readonly format = inject(FormatService);

  readonly value = model<AccountInput | null>(null);
  readonly accounts = input.required<EditorAccount[]>();
  readonly side = input.required<'source' | 'destination'>();
  /** The kind of account chosen on the other side (`'new'` for a name that doesn't exist yet). */
  readonly other = input<AccountSlot>(null);
  readonly placeholder = input('');
  readonly ariaLabel = input('');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly touch = output<void>();

  /** Is `slot` allowed on this side next to the other side's account? */
  private readonly compatible = computed(() => {
    const side = this.side();
    const other = this.other();
    return (slot: AccountSlot): boolean => {
      if (!other) return true;
      return (side === 'source' ? inferTransactionType(slot, other) : inferTransactionType(other, slot)) !== null;
    };
  });

  /** The balance to show for an account: only on the source side, and only where it is meaningful. */
  private balanceOf(a: EditorAccount): { text: string; negative: boolean } | null {
    if (this.side() !== 'source' || !WITH_BALANCE.includes(a.kind)) return null;
    return { text: this.format.money(a.balance, a.currency), negative: a.balance < 0 };
  }

  protected readonly selectedBalance = computed(() => {
    const v = this.value();
    const account = v && 'id' in v ? this.accounts().find((a) => a.id === v.id) : undefined;
    return account ? this.balanceOf(account) : null;
  });

  protected readonly options = computed<ComboOption[]>(() => {
    const groups = this.side() === 'source' ? SOURCE_GROUPS : DESTINATION_GROUPS;
    const fits = this.compatible();
    const reason = this.i18n.t('forms.account.incompatible');
    return groups.flatMap((kind) =>
      this.accounts()
        .filter((a) => a.kind === kind)
        .map((a) => {
          const balance = this.balanceOf(a);
          return {
            value: a.id,
            label: a.name,
            group: this.i18n.t(`forms.accountGroups.${kind}`),
            hint: balance?.text ?? a.currency,
            hintTone: balance?.negative ? ('negative' as const) : undefined,
            invalid: !fits(kind),
            invalidReason: reason,
          };
        }),
    );
  });

  protected readonly comboValue = computed(() => {
    const v = this.value();
    return v ? ('id' in v ? v.id : v.name) : '';
  });
  protected readonly comboCreated = computed(() => {
    const v = this.value();
    return !!v && 'name' in v;
  });
  protected readonly createInvalid = computed(() => !this.compatible()('new'));
  protected readonly createLabel = computed(() => {
    const key = this.side() === 'destination' ? 'forms.account.newExpense' : 'forms.account.newRevenue';
    return (name: string) => this.i18n.t(key, { name });
  });

  protected onSelection(s: ComboSelection): void {
    this.value.set(!s.value ? null : s.created ? { name: s.value } : { id: s.value });
  }
}
