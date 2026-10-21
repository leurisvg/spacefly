import { Component, computed, inject, input, NO_ERRORS_SCHEMA } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { FormatService } from '@spacefly/client/format/format.service';
import { I18n } from '@spacefly/client/i18n/i18n';
import { todayIso } from '@spacefly/shared';
import { FieldBox } from './field-box';
import { pickDate } from './picker';

/** A `YYYY-MM-DD` form field: shows the date and a tap opens the date picker. An optional date can be cleared there. */
@Component({
  selector: 'ns-date-field',
  imports: [FieldBox],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-field-box [label]="label()" [required]="required()" [field]="field()">
      <Label [text]="shown()" class="field" [class.field-placeholder]="!field()().value()" [isEnabled]="!field()().disabled()" (tap)="choose()"></Label>
    </ns-field-box>
  `,
})
export class DateField {
  private readonly i18n = inject(I18n);
  private readonly f = inject(FormatService);
  readonly label = input.required<string>();
  readonly required = input(false);
  readonly field = input.required<FieldTree<string>>();
  protected readonly shown = computed(() => {
    const value = this.field()().value();
    return value ? this.f.date(value, 'long') : '—';
  });

  protected async choose(): Promise<void> {
    const state = this.field()();
    const picked = await pickDate(state.value(), todayIso(), {
      title: this.label(),
      ok: this.i18n.t('forms.ok'),
      cancel: this.i18n.t('forms.cancel'),
      today: this.i18n.t('forms.today'),
      clear: this.required() ? undefined : this.i18n.t('forms.clear'),
    });
    if (picked === null) return;
    state.value.set(picked);
    state.markAsTouched();
  }
}
