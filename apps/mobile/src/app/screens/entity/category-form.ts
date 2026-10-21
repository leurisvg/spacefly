import { Component, input, NO_ERRORS_SCHEMA, output } from '@angular/core';
import { categoryFormViewModel } from '@spacefly/client/features/editor/category-form.vm';
import { FieldBox } from '../../ui/field-box';
import { FormShell } from '../../ui/form-shell';
import { NsField } from '../../ui/ns-field';

/** Create or edit a category. */
@Component({
  selector: 'ns-category-form',
  imports: [FieldBox, FormShell, NsField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-form-shell [vm]="vm">
      <ns-field-box [label]="vm.i18n.t('editor.fields.name')" [required]="true" [field]="vm.f.name">
        <TextField class="field" [nsField]="vm.f.name"></TextField>
      </ns-field-box>
      <ns-field-box [label]="vm.i18n.t('editor.fields.notes')" [field]="vm.f.notes">
        <TextView class="field" height="90" [nsField]="vm.f.notes"></TextView>
      </ns-field-box>
    </ns-form-shell>
  `,
})
export class CategoryForm {
  readonly id = input<string | null>(null);
  readonly done = output<void>();
  protected readonly vm = categoryFormViewModel({ id: this.id, done: () => this.done.emit() });
}
