import { Component, computed, inject, input, NO_ERRORS_SCHEMA } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { FormatService } from '@spacefly/client/format/format.service';
import { I18n } from '@spacefly/client/i18n/i18n';
import { todayIso } from '@spacefly/shared';
import { pickDate } from './picker';
import { TapField } from './tap-field';

/** A `YYYY-MM-DD` form field: shows the date and a tap opens the date picker. An optional date can be cleared there. */
@Component({
  selector: 'ns-date-field',
  imports: [TapField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-tap-field
      [label]="label()"
      [required]="required()"
      [field]="field()"
      [value]="shown()"
      [icon]="icon()"
      [surface]="surface()"
      [compact]="compact()"
      [disabled]="field()().disabled()"
      (pressed)="choose()"
    />
  `,
})
export class DateField {
  private readonly i18n = inject(I18n);
  private readonly f = inject(FormatService);
  readonly label = input.required<string>();
  readonly required = input(false);
  readonly field = input.required<FieldTree<string>>();
  readonly icon = input('');
  readonly surface = input<'background' | 'card'>('background');
  /** The tight box of the amount | date | time row: the short date with its year. */
  readonly compact = input(false);
  protected readonly shown = computed(() => {
    const value = this.field()().value();
    if (!value) return '';
    return this.compact() ? `${this.f.date(value, 'short')} ${value.slice(0, 4)}` : this.f.date(value, 'long');
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
