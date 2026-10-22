import { Component, inject, input, NO_ERRORS_SCHEMA } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { I18n } from '@spacefly/client/i18n/i18n';
import { nowTime } from '@spacefly/client/ui-logic/time';
import { pickTime } from './picker';
import { TapField } from './tap-field';

/** An `HH:mm` form field: shows the time and a tap opens the time picker. An optional time can be cleared there. */
@Component({
  selector: 'ns-time-field',
  imports: [TapField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-tap-field
      [label]="label()"
      [required]="required()"
      [field]="field()"
      [value]="field()().value()"
      [icon]="icon()"
      [surface]="surface()"
      [compact]="compact()"
      [disabled]="field()().disabled()"
      (pressed)="choose()"
    />
  `,
})
export class TimeField {
  private readonly i18n = inject(I18n);
  readonly label = input.required<string>();
  readonly required = input(false);
  readonly field = input.required<FieldTree<string>>();
  readonly icon = input('');
  readonly surface = input<'background' | 'card'>('background');
  readonly compact = input(false);

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
