import { Component, input, NO_ERRORS_SCHEMA, output } from '@angular/core';
import { tagFormViewModel } from '@spacefly/client/features/editor/tag-form.vm';
import { FieldBox } from '../../ui/field-box';
import { FormShell } from '../../ui/form-shell';
import { NsField } from '../../ui/ns-field';

/** Create or edit a tag. */
@Component({
  selector: 'ns-tag-form',
  imports: [FieldBox, FormShell, NsField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-form-shell [vm]="vm">
      <ns-field-box [label]="vm.i18n.t('editor.fields.name')" [required]="true" [field]="vm.f.tag">
        <TextField class="field" [nsField]="vm.f.tag"></TextField>
      </ns-field-box>
      <ns-field-box [label]="vm.i18n.t('editor.entity.tag.date')" [field]="vm.f.date">
        <TextField class="field" hint="YYYY-MM-DD" [nsField]="vm.f.date"></TextField>
      </ns-field-box>
      <ns-field-box [label]="vm.i18n.t('editor.fields.description')" [field]="vm.f.description">
        <TextView class="field" height="90" [nsField]="vm.f.description"></TextView>
      </ns-field-box>
    </ns-form-shell>
  `,
})
export class TagForm {
  readonly id = input<string | null>(null);
  readonly done = output<void>();
  protected readonly vm = tagFormViewModel({ id: this.id, done: () => this.done.emit() });
}
