import { Component, input, NO_ERRORS_SCHEMA, output } from '@angular/core';
import { budgetFormViewModel } from '@spacefly/client/features/editor/budget-form.vm';
import { FieldBox } from '../../ui/field-box';
import { FormShell } from '../../ui/form-shell';
import { NsField } from '../../ui/ns-field';
import { SelectField } from '../../ui/select-field';

/** Create or edit a budget, with its optional automatic budget. */
@Component({
  selector: 'ns-budget-form',
  imports: [FieldBox, FormShell, NsField, SelectField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-form-shell [vm]="vm">
      <ns-field-box [label]="vm.i18n.t('editor.fields.name')" [required]="true" [field]="vm.f.name">
        <TextField class="field" [nsField]="vm.f.name"></TextField>
      </ns-field-box>
      <GridLayout columns="*, auto" marginBottom="8">
        <Label col="0" [text]="vm.i18n.t('editor.fields.active')" verticalAlignment="center"></Label>
        <Switch col="1" [nsField]="vm.f.active"></Switch>
      </GridLayout>
      <ns-field-box [label]="vm.i18n.t('editor.fields.notes')" [field]="vm.f.notes">
        <TextView class="field" height="90" [nsField]="vm.f.notes"></TextView>
      </ns-field-box>

      <GridLayout columns="*, auto" marginBottom="4">
        <Label col="0" [text]="vm.i18n.t('editor.entity.budget.auto')" verticalAlignment="center"></Label>
        <Switch col="1" [nsField]="vm.f.auto"></Switch>
      </GridLayout>
      <Label [text]="vm.i18n.t('editor.entity.budget.autoHint')" class="muted small" textWrap="true" marginBottom="8"></Label>
      @if (vm.model().auto) {
        <ns-select-field [label]="vm.i18n.t('editor.entity.budget.autoType')" [field]="vm.f.autoType" [options]="vm.typeOptions()" />
        <ns-field-box [label]="vm.i18n.t('editor.entity.budget.autoAmount')" [required]="true" [field]="vm.f.autoAmount">
          <TextField class="field" keyboardType="number" [nsField]="vm.f.autoAmount"></TextField>
        </ns-field-box>
        <ns-select-field [label]="vm.i18n.t('editor.fields.currency')" [field]="vm.f.autoCurrency" [options]="vm.currencyOptions()" />
        <ns-select-field [label]="vm.i18n.t('editor.entity.budget.autoPeriod')" [field]="vm.f.autoPeriod" [options]="vm.periodOptions()" />
      }
    </ns-form-shell>
  `,
})
export class BudgetForm {
  readonly id = input<string | null>(null);
  readonly done = output<void>();
  protected readonly vm = budgetFormViewModel({ id: this.id, done: () => this.done.emit() });
}
