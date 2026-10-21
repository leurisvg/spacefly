import { Component, computed, inject, input, NO_ERRORS_SCHEMA } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { fieldErrorMessages } from '@spacefly/client/features/editor/field-errors';
import { I18n } from '@spacefly/client/i18n/i18n';

/** A form field's label, its control (projected) and the first error of the field. */
@Component({
  selector: 'ns-field-box',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <StackLayout>
      <Label [text]="label() + (required() ? ' *' : '')" class="field-label"></Label>
      <ng-content></ng-content>
      <Label [text]="error()" class="field-error" [visibility]="error() ? 'visible' : 'collapse'" textWrap="true"></Label>
    </StackLayout>
  `,
})
export class FieldBox {
  private readonly i18n = inject(I18n);
  readonly label = input.required<string>();
  readonly required = input(false);
  /** The field whose errors are shown. */
  readonly field = input<FieldTree<unknown> | null>(null);
  protected readonly error = computed(() => {
    const field = this.field();
    return field ? (fieldErrorMessages(this.i18n, field())[0] ?? '') : '';
  });
}
