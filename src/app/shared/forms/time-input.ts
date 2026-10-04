import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, input, model, output, signal, untracked, viewChild } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { HlmInput } from '@spartan-ng/helm/input';
import { I18n } from '../../core/i18n/i18n';

/**
 * Reads what a person types as a time: `9`, `930`, `9:30`, `0930`, `21.05`. Returns `HH:mm` (24 hours)
 * or `null` when it isn't a time.
 */
export function parseTime(input: string): string | null {
  const m = /^(\d{1,2})(?:[:.]?(\d{2}))?$/.exec(input.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2] ?? 0);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Time of day field (24 h, `HH:mm`) with a "Now" shortcut. ↑ / ↓ move it by 5 minutes. Anything that
 * isn't a time stays in the model as typed so validation can flag it.
 */
@Component({
  selector: 'sf-time-input',
  imports: [HlmInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <input
        #field
        hlmInput
        type="text"
        inputmode="numeric"
        autocomplete="off"
        placeholder="HH:mm"
        class="num h-8 w-24 text-center text-sm"
        [value]="text()"
        [disabled]="disabled()"
        [attr.aria-invalid]="invalid() || null"
        [attr.aria-label]="ariaLabel() || null"
        (input)="onInput($any($event.target).value)"
        (blur)="onBlur()"
        (keydown)="onKey($event)"
      />
      <button type="button" class="text-xs text-primary hover:underline disabled:opacity-50" [disabled]="disabled()" (click)="now()">
        {{ i18n.t('forms.now') }}
      </button>
    </div>
  `,
})
export class TimeInput implements FormValueControl<string> {
  protected readonly i18n = inject(I18n);

  readonly value = model('');
  readonly ariaLabel = input('');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly touch = output<void>();

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  protected readonly text = signal('');

  constructor() {
    // Follow the model when it changes from outside (form reset, loaded transaction…) but not while typing.
    effect(() => {
      const v = this.value();
      if (document.activeElement !== untracked(this.field).nativeElement || parseTime(untracked(this.text)) !== v) this.text.set(v);
    });
  }

  protected onInput(raw: string): void {
    this.text.set(raw);
    this.value.set(parseTime(raw) ?? raw.trim());
  }

  protected onBlur(): void {
    const parsed = parseTime(this.text());
    if (parsed) this.text.set(parsed);
    this.touch.emit();
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const current = parseTime(this.text()) ?? nowTime();
    const [h, m] = current.split(':').map(Number) as [number, number];
    const total = (h * 60 + m + (event.key === 'ArrowUp' ? 5 : -5) + 1440) % 1440;
    const next = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    event.preventDefault();
    this.text.set(next);
    this.value.set(next);
  }

  protected now(): void {
    const t = nowTime();
    this.text.set(t);
    this.value.set(t);
    this.touch.emit();
  }
}
