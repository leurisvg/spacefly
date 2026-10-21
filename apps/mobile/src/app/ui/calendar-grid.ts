import { Component, computed, inject, input, NO_ERRORS_SCHEMA, output } from '@angular/core';
import type { CalendarDay, ScheduledItem } from '@spacefly/shared';
import { FormatService } from '@spacefly/client/format/format.service';
import { buildCalendarCells, calendarBlanks, type CalendarCell } from '@spacefly/client/ui-logic/calendar-cells';

const COLUMNS = 7;

/**
 * The daily cash flow calendar, native (no WebView): per day an income bar (left) and an expense bar (right) growing from the
 * bottom, the day number on top, and a dot for scheduled bills or recurrences. Weeks start on Monday.
 */
@Component({
  selector: 'ns-calendar-grid',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <StackLayout>
      <GridLayout columns="*, *, *, *, *, *, *">
        @for (w of weekdays(); track $index) {
          <Label [col]="$index" [text]="w" class="muted small" horizontalAlignment="center"></Label>
        }
      </GridLayout>
      @for (week of weeks(); track $index) {
        <GridLayout columns="*, *, *, *, *, *, *" height="46">
          @for (c of week; track $index; let i = $index) {
            @if (c) {
              <GridLayout [col]="i" columns="*, *" class="cal-cell" [class.cal-today]="c.today" [opacity]="c.future && !c.scheduled.length ? 0.6 : 1" (tap)="dayClick.emit(c.day.date)">
                <StackLayout col="0" class="cal-income" verticalAlignment="bottom" [height]="c.incH + '%'"></StackLayout>
                <StackLayout col="1" class="cal-expense" verticalAlignment="bottom" [height]="c.expH + '%'"></StackLayout>
                <Label colSpan="2" [text]="'' + c.num" class="cal-num" horizontalAlignment="center" verticalAlignment="center"></Label>
                @if (c.scheduled.length) {
                  <Label colSpan="2" text="●" class="cal-dot" horizontalAlignment="right" verticalAlignment="top"></Label>
                }
              </GridLayout>
            }
          }
        </GridLayout>
      }
    </StackLayout>
  `,
})
export class CalendarGrid {
  private readonly f = inject(FormatService);
  readonly days = input.required<CalendarDay[]>();
  readonly scheduled = input<ScheduledItem[]>([]);
  /** Value that fills a cell; defaults to the largest day shown. */
  readonly scale = input<number | null>(null);
  readonly dayClick = output<string>();

  protected readonly weekdays = computed(() => this.f.weekdayNames());
  /** The days in rows of seven, with `null` for the blanks before the first day and after the last. */
  protected readonly weeks = computed<(CalendarCell | null)[][]>(() => {
    const cells: (CalendarCell | null)[] = [...Array<null>(calendarBlanks(this.days())).fill(null), ...buildCalendarCells(this.f, this.days(), this.scheduled(), this.scale())];
    while (cells.length % COLUMNS) cells.push(null);
    return Array.from({ length: cells.length / COLUMNS }, (_, i) => cells.slice(i * COLUMNS, (i + 1) * COLUMNS));
  });
}
