import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { SavingsSeries } from '@spacefly/shared';
import { FormatService } from '@spacefly/client/format/format.service';
import { Money } from '../components/money';
import { linesOption } from '@spacefly/client/charts/builders';
import { Chart } from './chart';
import { SeriesColors } from '@spacefly/client/charts/series-colors';

/** One small chart per account (the email's 6-month savings grid), each on its own scale. */
@Component({
  selector: 'sf-savings-multiples',
  imports: [Chart, Money],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' },
  template: `
    @for (a of charts(); track a.id) {
      <div class="rounded-lg border border-border/70 bg-background/30 p-3">
        <div class="flex items-baseline justify-between gap-2 px-1">
          <span class="flex min-w-0 items-center gap-2 text-sm font-medium">
            <span class="size-2.5 shrink-0 rounded-sm" [style.background]="a.color"></span>
            <span class="truncate">{{ a.name }}</span>
          </span>
          <sf-money class="text-xs" [value]="a.last" />
        </div>
        <sf-chart [options]="a.options" height="9.5rem" [ariaLabel]="a.name" />
      </div>
    }
  `,
})
export class SavingsMultiples {
  private readonly f = inject(FormatService);
  private readonly colors = inject(SeriesColors);
  readonly series = input.required<SavingsSeries>();

  protected readonly charts = computed(() => {
    const s = this.series();
    return s.accounts.map((a) => {
      const color = this.colors.color('account', a.id);
      const o = linesOption(this.f, s.months, [{ id: a.id, name: a.name, values: a.balances, color, area: true }]) as Record<string, unknown>;
      return { id: a.id, name: a.name, color, last: a.balances.at(-1) ?? 0, options: { ...o, grid: { left: 4, right: 40, top: 12, bottom: 4, containLabel: true } } };
    });
  });
}
