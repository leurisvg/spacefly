import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, untracked } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { BrnCalendarI18nService } from '@spartan-ng/brain/calendar';
import { addDays, isIsoDate, todayIso } from '@spacefly/shared';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { FormatService } from '@spacefly/client/format/format.service';
import { I18n } from '@spacefly/client/i18n/i18n';

/** `YYYY-MM-DD` → a local `Date` (the calendar works in local time). */
const toDate = (iso: string): Date | undefined => {
  if (!isIsoDate(iso)) return undefined;
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};

const toIso = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Date field built on spartan's date picker (a button that opens a calendar), with Today / Yesterday
 * shortcuts. The model is `YYYY-MM-DD` (empty when unset). It also localizes the calendar (month and
 * weekday names, Monday first) for the active language.
 */
@Component({
  selector: 'sf-date-input',
  imports: [HlmDatePickerImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <hlm-date-picker
        class="w-52"
        align="start"
        captionLayout="dropdown"
        [date]="date()"
        [formatDate]="formatDate"
        [autoCloseOnSelect]="true"
        [disabled]="disabled()"
        (dateChange)="onPick($event)"
      >
        <hlm-date-picker-trigger class="w-full" [forceInvalid]="invalid()">{{ placeholder() || i18n.t('forms.pickDate') }}</hlm-date-picker-trigger>
      </hlm-date-picker>
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
  private readonly format = inject(FormatService);
  private readonly calendar = inject(BrnCalendarI18nService);

  readonly value = model('');
  readonly placeholder = input('');
  readonly ariaLabel = input('');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly touch = output<void>();

  /**
   * Stable between changes of the value: the calendar resets the month it shows whenever its `date` input changes
   * identity, so a method returning a new `Date` on every check would undo every month or year the user navigates to.
   */
  protected readonly date = computed(() => toDate(this.value()));

  protected readonly formatDate = (date: Date): string => this.format.date(toIso(date), 'long');

  constructor() {
    // The calendar speaks the app's language and starts the week on Monday, like the rest of SpaceFly.
    effect(() => {
      const locale = this.format.locale();
      const names = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, opts);
      const weekday = names({ weekday: 'short' });
      const weekdayLong = names({ weekday: 'long' });
      const month = names({ month: 'short' });
      // 2024-01-07 was a Sunday: index 0 = Sunday, like the calendar expects.
      const day = (i: number) => new Date(2024, 0, 7 + i);
      // `use()` reads the current config before setting it; untracked, or the effect re-triggers itself forever.
      untracked(() =>
        this.calendar.use({
          formatWeekdayName: (i) => weekday.format(day(i)).replace('.', '').slice(0, 2),
          labelWeekday: (i) => weekdayLong.format(day(i)),
          months: () => Array.from({ length: 12 }, (_, i) => month.format(new Date(2000, i, 1)).replace('.', '')) as never,
          formatMonth: (i) => month.format(new Date(2000, i, 1)).replace('.', ''),
          formatHeader: (m, y) => names({ month: 'long', year: 'numeric' }).format(new Date(y, m, 1)),
          formatYear: (y) => String(y),
          labelPrevious: () => this.i18n.t('forms.previousMonth'),
          labelNext: () => this.i18n.t('forms.nextMonth'),
          firstDayOfWeek: () => 1,
        }),
      );
    });
  }

  protected onPick(date: Date | null): void {
    this.value.set(date ? toIso(date) : '');
    this.touch.emit();
  }

  protected set(offsetDays: number): void {
    this.value.set(addDays(todayIso(), offsetDays));
    this.touch.emit();
  }
}
