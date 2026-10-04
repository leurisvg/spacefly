import { ChangeDetectionStrategy, Component, computed, Directive, ElementRef, inject, input, model, output, signal } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
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
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const pad = (n: number): string => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

/** Centers the selected option of a time column when it renders (the popover opens on the current value). */
@Directive({ selector: '[sfScrollSelected]' })
export class ScrollSelected {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly sfScrollSelected = input(false);

  constructor() {
    queueMicrotask(() => {
      const column = this.el.parentElement;
      if (!this.sfScrollSelected() || !column) return;
      column.scrollTop = this.el.offsetTop - column.clientHeight / 2 + this.el.clientHeight / 2;
    });
  }
}

/**
 * Time of day field (24 h, `HH:mm`) built on spartan's popover, like the date field: a button that opens
 * an hour column and a minute column, with Now / Clear shortcuts. Empty means "let the server decide".
 */
@Component({
  selector: 'sf-time-input',
  imports: [NgIcon, HlmButton, HlmPopoverImports, ScrollSelected],
  providers: [provideIcons({ lucideClock })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <hlm-popover [state]="open() ? 'open' : 'closed'" (stateChanged)="open.set($event === 'open')" align="start" sideOffset="6">
        <button
          hlmBtn
          hlmPopoverTrigger
          type="button"
          variant="outline"
          class="num w-32 justify-between data-placeholder:text-muted-foreground"
          [disabled]="disabled()"
          [attr.data-placeholder]="value() ? null : ''"
          [attr.aria-invalid]="invalid() || null"
          [attr.aria-label]="ariaLabel() || null"
        >
          <span class="truncate">{{ value() || i18n.t('forms.pickTime') }}</span>
          <ng-icon name="lucideClock" aria-hidden="true" />
        </button>
        <hlm-popover-content *hlmPopoverPortal="let ctx" class="w-auto p-2">
          <div class="flex gap-2">
            <div class="relative flex h-56 w-14 flex-col gap-0.5 overflow-y-auto" role="listbox" [attr.aria-label]="i18n.t('forms.hour')">
              @for (h of hours; track h) {
                <button
                  type="button"
                  role="option"
                  class="flex h-8 shrink-0 items-center justify-center rounded-md text-sm hover:bg-muted aria-selected:bg-primary aria-selected:text-primary-foreground"
                  [attr.aria-selected]="h === hour()"
                  [sfScrollSelected]="h === hour()"
                  (click)="setHour(h)"
                >
                  {{ h }}
                </button>
              }
            </div>
            <div class="relative flex h-56 w-14 flex-col gap-0.5 overflow-y-auto" role="listbox" [attr.aria-label]="i18n.t('forms.minute')">
              @for (m of minutes; track m) {
                <button
                  type="button"
                  role="option"
                  class="flex h-8 shrink-0 items-center justify-center rounded-md text-sm hover:bg-muted aria-selected:bg-primary aria-selected:text-primary-foreground"
                  [attr.aria-selected]="m === minute()"
                  [sfScrollSelected]="m === minute()"
                  (click)="setMinute(m)"
                >
                  {{ m }}
                </button>
              }
            </div>
          </div>
        </hlm-popover-content>
      </hlm-popover>
      <button type="button" class="text-xs text-primary hover:underline disabled:opacity-50" [disabled]="disabled()" (click)="now()">
        {{ i18n.t('forms.now') }}
      </button>
      @if (value()) {
        <button type="button" class="text-xs text-primary hover:underline disabled:opacity-50" [disabled]="disabled()" (click)="clear()">
          {{ i18n.t('forms.clear') }}
        </button>
      }
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

  protected readonly hours = HOURS;
  protected readonly minutes = MINUTES;
  protected readonly open = signal(false);

  private readonly parsed = computed(() => parseTime(this.value()));
  protected readonly hour = computed(() => this.parsed()?.slice(0, 2) ?? '');
  protected readonly minute = computed(() => this.parsed()?.slice(3) ?? '');

  protected setHour(hour: string): void {
    this.value.set(`${hour}:${this.minute() || '00'}`);
    this.touch.emit();
  }

  protected setMinute(minute: string): void {
    this.value.set(`${this.hour() || nowTime().slice(0, 2)}:${minute}`);
    this.open.set(false);
    this.touch.emit();
  }

  protected now(): void {
    this.value.set(nowTime());
    this.touch.emit();
  }

  protected clear(): void {
    this.value.set('');
    this.touch.emit();
  }
}
