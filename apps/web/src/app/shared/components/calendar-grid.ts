import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CalendarDay, ScheduledItem } from '@spacefly/shared';
import { buildCalendarCells, calendarBlanks, shortAmount } from '@spacefly/client/ui-logic/calendar-cells';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { FormatService } from '@spacefly/client/format/format.service';

/**
 * The email's "Daily Cash Flow" calendar rebuilt in CSS grid: per day an income bar (left)
 * and an expense bar (right) growing from the bottom, the value inside the bar when it fits
 * or just above it, the day number centred, and markers for scheduled bills/recurrences.
 */
@Component({
  selector: 'sf-calendar-grid',
  imports: [TranslocoPipe, HlmTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="grid grid-cols-7" [class]="small() ? 'gap-0.5' : 'gap-1 sm:gap-1.5'" role="grid" [attr.aria-label]="'calendar.title' | transloco">
      @for (w of weekdays(); track $index) {
        <div class="pb-1 text-center font-semibold text-muted-foreground" [class]="small() ? 'text-[10px]' : 'text-[11px]'" role="columnheader">{{ w }}</div>
      }
      @for (_ of blanks(); track $index) {
        <div aria-hidden="true"></div>
      }
      @for (c of cells(); track c.day.date) {
        <button
          type="button"
          role="gridcell"
          class="group relative overflow-hidden rounded-md border border-border bg-card text-left outline-none transition hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/60"
          [class.aspect-square]="!compact()"
          [class.h-10]="compact()"
          [class.ring-1]="c.today"
          [class.ring-primary]="c.today"
          [class.opacity-60]="c.future && !c.scheduled.length"
          [hlmTooltip]="c.tip"
          [attr.aria-label]="c.tip"
          (click)="dayClick.emit(c.day.date)"
        >
          <!-- translucent strips -->
          <span class="absolute inset-y-0 left-0 w-1/2 bg-income/10" aria-hidden="true"></span>
          <span class="absolute inset-y-0 right-0 w-1/2 bg-expense/10" aria-hidden="true"></span>
          @if (c.incH > 0) {
            <span class="absolute bottom-0 left-0 w-1/2 bg-income/85" [style.height.%]="c.incH" aria-hidden="true"></span>
          }
          @if (c.expH > 0) {
            <span class="absolute bottom-0 right-0 w-1/2 bg-expense/85" [style.height.%]="c.expH" aria-hidden="true"></span>
          }
          @if (!compact()) {
            @if (c.day.income > 0) {
              <span
                class="absolute left-0 w-1/2 text-center font-bold leading-none"
                [class]="small() ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'"
                [class.text-white]="c.incInside"
                [class.text-positive]="!c.incInside"
                [style.bottom]="c.incInside ? 'calc(' + c.incH + '% - 1.1em)' : 'calc(' + c.incH + '% + 2px)'"
              >{{ short(c.day.income) }}</span>
            }
            @if (c.day.expense > 0) {
              <span
                class="absolute right-0 w-1/2 text-center font-bold leading-none"
                [class]="small() ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'"
                [class.text-white]="c.expInside"
                [class.text-negative]="!c.expInside"
                [style.bottom]="c.expInside ? 'calc(' + c.expH + '% - 1.1em)' : 'calc(' + c.expH + '% + 2px)'"
              >{{ short(c.day.expense) }}</span>
            }
          }
          <span class="absolute inset-0 grid place-items-center font-bold text-foreground drop-shadow" [class]="small() ? 'text-[11px]' : 'text-xs sm:text-sm'">{{ c.num }}</span>
          @if (c.scheduled.length) {
            <span class="absolute right-1 top-1 flex gap-0.5" aria-hidden="true">
              @for (s of c.scheduled.slice(0, 3); track $index) {
                <span class="size-1.5 rounded-full" [class.bg-status-warning]="s.kind === 'bill'" [class.bg-primary]="s.kind === 'recurrence'"></span>
              }
            </span>
          }
        </button>
      }
    </div>
    @if (!compact()) {
      <div class="mt-3 flex flex-wrap items-center justify-end gap-4 text-xs text-muted-foreground">
        <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-income"></span>{{ 'common.income' | transloco }}</span>
        <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-expense"></span>{{ 'common.expenses' | transloco }}</span>
        @if (hasScheduled()) {
          <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-status-warning"></span>{{ 'calendar.bill' | transloco }}</span>
          <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-primary"></span>{{ 'calendar.recurrence' | transloco }}</span>
        }
      </div>
    }
  `,
})
export class CalendarGrid {
  private readonly f = inject(FormatService);
  readonly days = input.required<CalendarDay[]>();
  readonly scheduled = input<ScheduledItem[]>([]);
  readonly compact = input(false);
  /** Smaller cells and type, for several months side by side. */
  readonly size = input<'md' | 'sm'>('md');
  /** Value that fills a cell; defaults to the largest day shown (pass one to compare several months). */
  readonly scale = input<number | null>(null);
  readonly dayClick = output<string>();

  protected readonly small = computed(() => this.size() === 'sm');
  protected readonly weekdays = computed(() => this.f.weekdayNames());
  protected readonly blanks = computed(() => Array.from({ length: calendarBlanks(this.days()) }));
  protected readonly hasScheduled = computed(() => this.scheduled().length > 0);
  protected readonly cells = computed(() => buildCalendarCells(this.f, this.days(), this.scheduled(), this.scale()));

  protected short(v: number): string {
    return shortAmount(v, this.f.hidden(), this.small());
  }
}
