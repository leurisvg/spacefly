import { Component, input, NO_ERRORS_SCHEMA, output } from '@angular/core';
import { billFormViewModel } from '@spacefly/client/features/editor/bill-form.vm';
import { DateField } from '../../ui/date-field';
import { FieldBox } from '../../ui/field-box';
import { FormShell } from '../../ui/form-shell';
import { NsField } from '../../ui/ns-field';
import { SelectField } from '../../ui/select-field';

/** Create or edit a subscription. */
@Component({
  selector: 'ns-bill-form',
  imports: [DateField, FieldBox, FormShell, NsField, SelectField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-form-shell [vm]="vm">
      <ns-field-box [label]="vm.i18n.t('editor.fields.name')" [required]="true" [field]="vm.f.name">
        <TextField class="field" [nsField]="vm.f.name"></TextField>
      </ns-field-box>

      <GridLayout columns="*, auto" marginBottom="8">
        <Label col="0" [text]="vm.i18n.t('editor.entity.bill.fixed')" verticalAlignment="center"></Label>
        <Switch col="1" [nsField]="vm.f.fixed"></Switch>
      </GridLayout>
      <ns-field-box [label]="vm.i18n.t(vm.model().fixed ? 'editor.entity.bill.amount' : 'editor.entity.bill.amountMin')" [required]="true" [field]="vm.f.amountMin">
        <TextField class="field" keyboardType="number" [nsField]="vm.f.amountMin"></TextField>
      </ns-field-box>
      @if (!vm.model().fixed) {
        <ns-field-box [label]="vm.i18n.t('editor.entity.bill.amountMax')" [required]="true" [field]="vm.f.amountMax">
          <TextField class="field" keyboardType="number" [nsField]="vm.f.amountMax"></TextField>
        </ns-field-box>
      }
      <ns-select-field [label]="vm.i18n.t('editor.fields.currency')" [field]="vm.f.currency" [options]="vm.currencyOptions()" />

      <ns-select-field [label]="vm.i18n.t('editor.entity.bill.freq')" [field]="vm.f.repeatFreq" [options]="vm.freqOptions()" />
      <ns-field-box [label]="vm.i18n.t('editor.entity.bill.skip')" [field]="vm.f.skip">
        <TextField class="field" keyboardType="number" [nsField]="vm.f.skip"></TextField>
      </ns-field-box>
      <Label [text]="vm.i18n.t('editor.entity.bill.skipHint')" class="muted small" textWrap="true" marginBottom="8"></Label>

      <ns-date-field [label]="vm.i18n.t('editor.entity.bill.date')" [required]="true" [field]="vm.f.date" />
      <ns-date-field [label]="vm.i18n.t('editor.entity.bill.endDate')" [field]="vm.f.endDate" />

      <GridLayout columns="*, auto" marginBottom="8">
        <Label col="0" [text]="vm.i18n.t('editor.fields.active')" verticalAlignment="center"></Label>
        <Switch col="1" [nsField]="vm.f.active"></Switch>
      </GridLayout>
      <ns-field-box [label]="vm.i18n.t('editor.fields.group')" [field]="vm.f.group">
        <TextField class="field" [nsField]="vm.f.group"></TextField>
      </ns-field-box>
      <ns-field-box [label]="vm.i18n.t('editor.fields.notes')" [field]="vm.f.notes">
        <TextView class="field" height="90" [nsField]="vm.f.notes"></TextView>
      </ns-field-box>
    </ns-form-shell>
  `,
})
export class BillForm {
  readonly id = input<string | null>(null);
  readonly done = output<void>();
  protected readonly vm = billFormViewModel({ id: this.id, done: () => this.done.emit() });
}
