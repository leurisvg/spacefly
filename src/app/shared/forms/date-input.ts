import { ChangeDetectionStrategy, Component, inject, input, model, output } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { addDays, todayIso } from '@shared';
import { HlmInput } from '@spartan-ng/helm/input';
import { I18n } from '../../core/i18n/i18n';

/** Native date field with Today / Yesterday shortcuts. The model is `YYYY-MM-DD` (empty when unset). */
@Component({
  selector: 'sf-date-input',
  imports: [HlmInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <input
        hlmInput
        type="date"
        class="h-8 w-40 text-sm"
        [value]="value()"
        [disabled]="disabled()"
        [attr.aria-invalid]="invalid() || null"
        [attr.aria-label]="ariaLabel() || null"
        (input)="value.set($any($event.target).value)"
        (blur)="touch.emit()"
      />
      <button type="button" class="text-xs text-primary hover:underline disabled:opacity-50" [disabled]="disabled()" (click)="set(0)">
        {{ i18n.t('forms.today') }}
      </button>
      <button type="button" class="text-xs text-primary hover:underline disabled:opacity-50" [disabled]="disabled()" (click)="set(-1)">
        {{ i18n.t('forms.yesterday') }}
      </button>
    </div>
  `,
})
export class DateInput implements FormValueControl<string> {
  protected readonly i18n = inject(I18n);

  readonly value = model('');
  readonly ariaLabel = input('');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly touch = output<void>();

  protected set(offsetDays: number): void {
    this.value.set(addDays(todayIso(), offsetDays));
    this.touch.emit();
  }
}
