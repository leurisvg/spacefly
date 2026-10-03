import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { FORMAT_PIPES } from '../../core/format/pipes';
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
          @default { {{ value() | money }} }
        }
      </div>
    }
    <div class="flex items-end justify-between gap-3">
      <span class="text-xs text-muted-foreground">
        @if (previous() !== null && !loading()) {
          {{ 'kpi.vsPrevious' | transloco }}
          @switch (format()) {
            @case ('pct') { {{ previous()! / 100 | pct: 1 }} }
            @default { {{ previous() | compact }} }
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
  readonly label = input.required<string>();
  readonly value = input<number | null>(null);
  readonly previous = input<number | null>(null);
  readonly spark = input<number[] | null>(null);
  readonly format = input<'money' | 'pct' | 'compact'>('money');
  readonly upIsGood = input(true);
  readonly accent = input('var(--money-net)');
  readonly loading = input(false);
  protected readonly negative = computed(() => (this.value() ?? 0) < 0);
}
