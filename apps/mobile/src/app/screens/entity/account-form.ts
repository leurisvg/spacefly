import { Component, input, NO_ERRORS_SCHEMA, output } from '@angular/core';
import { accountFormViewModel } from '@spacefly/client/features/editor/account-form.vm';
import type { AccountWriteType } from '@spacefly/shared';
import { DateField } from '../../ui/date-field';
import { FieldBox } from '../../ui/field-box';
import { FormShell } from '../../ui/form-shell';
import { NsField } from '../../ui/ns-field';
import { SelectField } from '../../ui/select-field';

/** Create or edit an account of any kind; the fields shown follow the kind. */
@Component({
  selector: 'ns-account-form',
  imports: [DateField, FieldBox, FormShell, NsField, SelectField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-form-shell [vm]="vm">
      <ns-select-field [label]="vm.i18n.t('editor.entity.account.type')" [field]="vm.f.type" [options]="vm.typeOptions()" />
      @if (vm.isEdit()) {
        <Label [text]="vm.i18n.t('editor.entity.account.typeLocked')" class="muted small" textWrap="true" marginBottom="8"></Label>
      }
      <ns-field-box [label]="vm.i18n.t('editor.fields.name')" [required]="true" [field]="vm.f.name">
        <TextField class="field" [nsField]="vm.f.name"></TextField>
      </ns-field-box>

      @if (vm.isAsset()) {
        <ns-select-field [label]="vm.i18n.t('editor.entity.account.role')" [required]="true" [field]="vm.f.role" [options]="vm.roleOptions()" />
        @if (vm.model().role === 'ccAsset') {
          <ns-select-field [label]="vm.i18n.t('editor.entity.account.cardType')" [field]="vm.f.cardType" [options]="vm.cardOptions()" />
          <ns-field-box [label]="vm.i18n.t('editor.entity.account.paymentDay')" [required]="true" [field]="vm.f.paymentDay">
            <TextField class="field" keyboardType="number" [nsField]="vm.f.paymentDay"></TextField>
          </ns-field-box>
        }
      }

      @if (vm.isLiability()) {
        <ns-select-field [label]="vm.i18n.t('editor.entity.account.liabilityType')" [field]="vm.f.liabilityType" [options]="vm.liabilityOptions()" />
        <ns-select-field [label]="vm.i18n.t('editor.entity.account.direction')" [field]="vm.f.liabilityDirection" [options]="vm.directionOptions()" />
        <ns-field-box [label]="vm.i18n.t('editor.entity.account.interest')" [required]="true" [field]="vm.f.interest">
          <TextField class="field" keyboardType="number" [nsField]="vm.f.interest"></TextField>
        </ns-field-box>
        <ns-select-field [label]="vm.i18n.t('editor.entity.account.interestPeriod')" [field]="vm.f.interestPeriod" [options]="vm.interestPeriodOptions()" />
      }

      @if (vm.isOwned()) {
        <ns-select-field [label]="vm.i18n.t('editor.fields.currency')" [field]="vm.f.currency" [options]="vm.currencyOptions()" />
        <ns-field-box [label]="vm.i18n.t(vm.isLiability() ? 'editor.entity.account.owed' : 'editor.entity.account.openingBalance')" [field]="vm.f.openingBalance">
          <TextField class="field" keyboardType="number" [nsField]="vm.f.openingBalance"></TextField>
        </ns-field-box>
        <ns-date-field [label]="vm.i18n.t(vm.isLiability() ? 'editor.entity.account.startDate' : 'editor.entity.account.openingBalanceDate')" [field]="vm.f.openingBalanceDate" />
        <GridLayout columns="*, auto" marginBottom="8">
          <Label col="0" [text]="vm.i18n.t('editor.entity.account.includeNetWorth')" verticalAlignment="center" textWrap="true"></Label>
          <Switch col="1" [nsField]="vm.f.includeNetWorth"></Switch>
        </GridLayout>
      }

      <ns-field-box [label]="vm.i18n.t('editor.entity.account.iban')" [field]="vm.f.iban">
        <TextField class="field" autocapitalizationType="allcharacters" [nsField]="vm.f.iban"></TextField>
      </ns-field-box>
      <GridLayout columns="*, auto" marginBottom="8">
        <Label col="0" [text]="vm.i18n.t('editor.fields.active')" verticalAlignment="center"></Label>
        <Switch col="1" [nsField]="vm.f.active"></Switch>
      </GridLayout>
      <ns-field-box [label]="vm.i18n.t('editor.fields.notes')" [field]="vm.f.notes">
        <TextView class="field" height="90" [nsField]="vm.f.notes"></TextView>
      </ns-field-box>
    </ns-form-shell>
  `,
})
export class AccountForm {
  readonly id = input<string | null>(null);
  /** The kind a new account starts as. */
  readonly accountType = input<AccountWriteType>('asset');
  readonly done = output<void>();
  protected readonly vm = accountFormViewModel({ id: this.id, done: () => this.done.emit(), accountType: this.accountType });
}
