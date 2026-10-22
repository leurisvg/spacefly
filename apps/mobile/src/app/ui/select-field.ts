import { Component, computed, inject, input, NO_ERRORS_SCHEMA } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { I18n } from '@spacefly/client/i18n/i18n';
import { pickOne, type PickerOption } from './picker';
import { TapField } from './tap-field';

/** A form field that is one of a list: shows the chosen label, and a tap opens the picker sheet. */
@Component({
  selector: 'ns-select-field',
  imports: [TapField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-tap-field [label]="label()" [required]="required()" [field]="field()" [value]="shown()" [chevron]="true" [disabled]="field()().disabled()" (pressed)="choose()" />
  `,
})
export class SelectField {
  private readonly i18n = inject(I18n);
  readonly label = input.required<string>();
  readonly required = input(false);
  readonly field = input.required<FieldTree<string>>();
  readonly options = input.required<readonly PickerOption[]>();
  protected readonly shown = computed(() => this.options().find((o) => o.value === this.field()().value())?.label ?? '');

  protected async choose(): Promise<void> {
    const picked = await pickOne(this.label(), this.options(), this.i18n.t('forms.cancel'), { selected: this.field()().value() });
    if (picked !== null) this.field()().value.set(picked);
  }
}
