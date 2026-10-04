import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { FormatService } from '@spacefly/client/format/format.service';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Delta } from './delta';
import { Sparkline } from './sparkline';

/** Stat tile: label · value · delta vs previous period · 12-point sparkline. */
@Component({
  selector: 'sf-kpi',
  imports: [Sparkline, Delta, HlmSkeleton, TranslocoPipe, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative flex flex-col gap-2 overflow-hidden rounded-xl border border-border bg-card p-4 min-w-0' },
  template: `
    <span class="absolute inset-y-0 left-0 w-1" [style.background]="accent()" aria-hidden="true"></span>
    <div class="flex items-center justify-between gap-2">
      <span class="eyebrow truncate">{{ label() }}</span>
      @if (previous() !== null && !loading()) {
        <sf-delta [value]="value() ?? 0" [previous]="previous()" [upIsGood]="upIsGood()" [points]="format() === 'pct'" />
      }
    </div>
    @if (loading()) {
      <div hlmSkeleton class="h-8 w-3/4"></div>
    } @else {
      <div class="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]" [class.text-negative]="negative()">
        @switch (format()) {
          @case ('pct') { {{ (value() ?? 0) / 100 | pct: 1 }} }
          @case ('compact') { {{ value() | compact }} }
          @default { {{ value() | money: currency() }} }
        }
      </div>
    }
    @if (note() && !loading()) {
      <div class="-mt-1 text-xs text-muted-foreground">{{ note() }}</div>
    }
    <div class="flex items-end justify-between gap-3">
      <span class="text-xs text-muted-foreground">
        @if (previous() !== null && !loading()) {
          {{ 'kpi.vsPrevious' | transloco }}
          @switch (format()) {
            @case ('pct') { {{ previous()! / 100 | pct: 1 }} }
            @default { {{ previous() | compact: currency() }} }
          }
        }
      </span>
      @if (spark()?.length) {
        <sf-sparkline class="h-8 w-24 shrink-0" [values]="spark()!" [color]="accent()" />
      }
    </div>
  `,
})
export class KpiCard {
  private readonly f = inject(FormatService);
  readonly label = input.required<string>();
  readonly value = input<number | null>(null);
  readonly previous = input<number | null>(null);
  readonly spark = input<number[] | null>(null);
  readonly format = input<'money' | 'pct' | 'compact'>('money');
  readonly upIsGood = input(true);
  readonly accent = input('var(--money-net)');
  readonly loading = input(false);
  /** Currency of `value` and `previous` when it isn't the display currency. */
  readonly currency = input<string | undefined>(undefined);
  /** Small line under the value (e.g. its conversion). */
  readonly note = input<string | null>(null);
  protected readonly negative = computed(() => !this.f.hidden() && (this.value() ?? 0) < 0);
}
