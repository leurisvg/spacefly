import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import type { AccountInput, AccountSlot, EditorAccount } from '@spacefly/shared';
import { accountPickerViewModel } from '@spacefly/client/features/editor/account-picker.vm';
import { Combobox } from './combobox';

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
      [options]="vm.options()"
      [value]="vm.comboValue()"
      [created]="vm.comboCreated()"
      [suffix]="vm.selectedBalance()?.text ?? ''"
      [suffixNegative]="vm.selectedBalance()?.negative ?? false"
      [placeholder]="placeholder()"
      [ariaLabel]="ariaLabel()"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [allowCreate]="true"
      [createLabel]="vm.createLabel()"
      [createInvalid]="vm.createInvalid()"
      [createInvalidReason]="vm.i18n.t('forms.account.incompatible')"
      (selection)="vm.select($event)"
      (touch)="touch.emit()"
    />
  `,
})
export class AccountPicker implements FormValueControl<AccountInput | null> {
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

  protected readonly vm = accountPickerViewModel({ value: this.value, accounts: this.accounts, side: this.side, other: this.other });
}
