import { Component, input, NO_ERRORS_SCHEMA, output } from '@angular/core';
import { piggyFormViewModel } from '@spacefly/client/features/editor/piggy-form.vm';
import { FieldBox } from '../../ui/field-box';
import { FormShell } from '../../ui/form-shell';
import { NsField } from '../../ui/ns-field';
import { pickOne } from '../../ui/picker';
import { SelectField } from '../../ui/select-field';

/** Create or edit a goal: target, dates and the accounts it saves from, each with its amount and an add / remove adjustment. */
@Component({
  selector: 'ns-piggy-form',
  imports: [FieldBox, FormShell, NsField, SelectField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-form-shell [vm]="vm">
      <ns-field-box [label]="vm.i18n.t('editor.fields.name')" [required]="true" [field]="vm.f.name">
        <TextField class="field" [nsField]="vm.f.name"></TextField>
      </ns-field-box>
      <ns-select-field [label]="vm.i18n.t('editor.fields.currency')" [field]="vm.f.currency" [options]="vm.currencyOptions()" />
      <ns-field-box [label]="vm.i18n.t('editor.entity.piggy.target')" [field]="vm.f.targetAmount">
        <TextField class="field" keyboardType="number" [nsField]="vm.f.targetAmount"></TextField>
      </ns-field-box>
      <ns-field-box [label]="vm.i18n.t('editor.entity.piggy.startDate')" [field]="vm.f.startDate">
        <TextField class="field" hint="YYYY-MM-DD" [nsField]="vm.f.startDate"></TextField>
      </ns-field-box>
      <ns-field-box [label]="vm.i18n.t('editor.entity.piggy.targetDate')" [field]="vm.f.targetDate">
        <TextField class="field" hint="YYYY-MM-DD" [nsField]="vm.f.targetDate"></TextField>
      </ns-field-box>

      <Label [text]="vm.i18n.t('editor.entity.piggy.accounts')" class="card-title" marginTop="4"></Label>
      <Label [text]="vm.i18n.t('editor.entity.piggy.adjustHint')" class="muted small" textWrap="true" marginBottom="6"></Label>
      @for (row of vm.f.accounts; track row().keyInParent(); let i = $index) {
        <StackLayout class="card">
          <GridLayout columns="*, auto">
            <Label col="0" [text]="vm.accountName(vm.model().accounts[i]?.accountId)" class="card-title" textWrap="false"></Label>
            <Label col="1" [text]="vm.i18n.t('forms.delete')" class="chip" (tap)="vm.removeAccount(i)"></Label>
          </GridLayout>
          <ns-field-box [label]="vm.i18n.t('editor.entity.piggy.saved')" [field]="row.currentAmount">
            <TextField class="field" keyboardType="number" [nsField]="row.currentAmount"></TextField>
          </ns-field-box>
          <ns-field-box [label]="vm.i18n.t('editor.entity.piggy.adjustLabel')">
            <TextField class="field" keyboardType="number" [nsField]="row.adjust"></TextField>
          </ns-field-box>
          <GridLayout columns="*, *">
            <Button col="0" [text]="'＋ ' + vm.i18n.t('editor.entity.piggy.add')" class="btn btn-outline" marginRight="4" [isEnabled]="vm.canAdjust(i)" (tap)="vm.adjust(i, 1)"></Button>
            <Button col="1" [text]="'－ ' + vm.i18n.t('editor.entity.piggy.subtract')" class="btn btn-outline" marginLeft="4" [isEnabled]="vm.canAdjust(i)" (tap)="vm.adjust(i, -1)"></Button>
          </GridLayout>
        </StackLayout>
      }
      <ns-field-box [label]="''" [field]="vm.f.accounts">
        <Button [text]="vm.i18n.t('editor.entity.piggy.addAccount')" class="btn btn-outline" (tap)="addAccount()"></Button>
      </ns-field-box>

      <ns-field-box [label]="vm.i18n.t('editor.fields.group')" [field]="vm.f.group">
        <TextField class="field" [nsField]="vm.f.group"></TextField>
      </ns-field-box>
      <ns-field-box [label]="vm.i18n.t('editor.fields.notes')" [field]="vm.f.notes">
        <TextView class="field" height="90" [nsField]="vm.f.notes"></TextView>
      </ns-field-box>
    </ns-form-shell>
  `,
})
export class PiggyForm {
  readonly id = input<string | null>(null);
  readonly done = output<void>();
  protected readonly vm = piggyFormViewModel({ id: this.id, done: () => this.done.emit() });

  protected async addAccount(): Promise<void> {
    const picked = await pickOne(this.vm.i18n.t('editor.entity.piggy.addAccount'), this.vm.accountOptions(), this.vm.i18n.t('forms.cancel'));
    if (picked) this.vm.addAccount(picked);
  }
}
