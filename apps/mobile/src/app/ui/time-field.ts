import { Component, inject, input, NO_ERRORS_SCHEMA } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { I18n } from '@spacefly/client/i18n/i18n';
import { nowTime } from '@spacefly/client/ui-logic/time';
import { FieldBox } from './field-box';
import { pickTime } from './picker';

/** An `HH:mm` form field: shows the time and a tap opens the time picker. An optional time can be cleared there. */
@Component({
  selector: 'ns-time-field',
  imports: [FieldBox],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-field-box [label]="label()" [required]="required()" [field]="field()">
      <Label [text]="field()().value() || '—'" class="field" [class.field-placeholder]="!field()().value()" [isEnabled]="!field()().disabled()" (tap)="choose()"></Label>
    </ns-field-box>
  `,
})
export class TimeField {
  private readonly i18n = inject(I18n);
  readonly label = input.required<string>();
  readonly required = input(false);
  readonly field = input.required<FieldTree<string>>();

  protected async choose(): Promise<void> {
    const state = this.field()();
    const picked = await pickTime(state.value(), nowTime(), {
      title: this.label(),
      ok: this.i18n.t('forms.ok'),
      cancel: this.i18n.t('forms.cancel'),
      now: this.i18n.t('forms.now'),
      clear: this.required() ? undefined : this.i18n.t('forms.clear'),
    });
    if (picked === null) return;
    state.value.set(picked);
    state.markAsTouched();
  }
}
