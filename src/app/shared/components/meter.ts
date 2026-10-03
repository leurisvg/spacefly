import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideOctagonAlert, lucideTriangleAlert } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { PctPipe } from '../../core/format/pipes';

export type MeterStatus = 'good' | 'warning' | 'critical';

export function budgetStatus(ratio: number | null): MeterStatus {
  if (ratio === null) return 'good';
  return ratio >= 1 ? 'critical' : ratio >= 0.8 ? 'warning' : 'good';
}

/**
 * Budget meter (green / amber at 80 % / red at 100 %, as in the email). Status colors are
 * reserved and always ship with an icon + label. The track is a lighter step of the same hue.
 */
@Component({
  selector: 'sf-meter',
  imports: [NgIcon, TranslocoPipe, PctPipe],
  providers: [provideIcons({ lucideCircleCheck, lucideTriangleAlert, lucideOctagonAlert })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-1' },
  template: `
    <div
      class="relative h-1.5 w-full overflow-hidden rounded-full"
      [style.background]="track()"
      role="meter"
      [attr.aria-valuenow]="pctValue()"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-label]="label() || ('budget.status.' + status() | transloco)"
    >
      <div class="h-full rounded-full transition-[width] duration-500" [style.width.%]="fill()" [style.background]="color()"></div>
      @if (marker() !== null) {
        <div class="absolute inset-y-0 w-0.5 bg-foreground/70" [style.left.%]="marker()! * 100" [title]="'budget.expectedPace' | transloco"></div>
      }
    </div>
    @if (showLabel()) {
      <div class="flex items-center gap-1 text-[11px]" [style.color]="color()">
        <ng-icon [name]="icon()" />
        <span>{{ 'budget.status.' + status() | transloco }}</span>
        <span class="ml-auto num text-muted-foreground">{{ ratio() ?? 0 | pct: 0 }}</span>
      </div>
    }
  `,
})
export class Meter {
  /** spent / limit. */
  readonly ratio = input<number | null>(null);
  /** Optional expected pace marker (elapsed share of the period). */
  readonly marker = input<number | null>(null);
  readonly showLabel = input(true);
  readonly label = input<string>('');

  protected readonly status = computed(() => budgetStatus(this.ratio()));
  protected readonly fill = computed(() => Math.min((this.ratio() ?? 0) * 100, 100));
  protected readonly pctValue = computed(() => Math.round((this.ratio() ?? 0) * 100));
  protected readonly color = computed(() => `var(--status-${this.status()})`);
  protected readonly track = computed(() => `color-mix(in oklab, var(--status-${this.status()}) 18%, transparent)`);
  protected readonly icon = computed(
    () => ({ good: 'lucideCircleCheck', warning: 'lucideTriangleAlert', critical: 'lucideOctagonAlert' })[this.status()],
  );
}
