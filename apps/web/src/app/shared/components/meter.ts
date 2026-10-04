import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideOctagonAlert, lucideTriangleAlert } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { FormatService } from '@spacefly/client/format/format.service';
import { PctPipe } from '@spacefly/client/format/pipes';
import { meterModel } from '@spacefly/client/ui-logic/budget-status';

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
      [attr.aria-label]="label() || (hidden() ? null : ('budget.status.' + status() | transloco))"
    >
      <div class="h-full rounded-full transition-[width] duration-500" [style.width.%]="fill()" [style.background]="color()"></div>
      @if (marker() !== null) {
        <div class="absolute inset-y-0 w-0.5 bg-foreground/70" [style.left.%]="marker()! * 100" [title]="'budget.expectedPace' | transloco"></div>
      }
    </div>
    @if (showLabel()) {
      <div class="flex items-center gap-1 text-[11px]" [style.color]="color()">
        @if (!hidden()) {
          <ng-icon [name]="icon()" />
          <span>{{ 'budget.status.' + status() | transloco }}</span>
        }
        <span class="ml-auto num text-muted-foreground">{{ ratio() ?? 0 | pct: 0 }}</span>
      </div>
    }
  `,
})
export class Meter {
  private readonly f = inject(FormatService);
  /** In privacy mode the bar, its status and its percentage would all reveal the hidden ratio. */
  protected readonly hidden = this.f.hidden;
  /** spent / limit. */
  readonly ratio = input<number | null>(null);
  /** Optional expected pace marker (elapsed share of the period). */
  readonly marker = input<number | null>(null);
  readonly showLabel = input(true);
  readonly label = input<string>('');

  private readonly model = computed(() => meterModel(this.ratio(), this.hidden()));
  protected readonly status = computed(() => this.model().status);
  protected readonly fill = computed(() => this.model().fill);
  protected readonly pctValue = computed(() => this.model().percent);
  protected readonly color = computed(() => (this.hidden() ? 'var(--muted-foreground)' : `var(--status-${this.status()})`));
  protected readonly track = computed(() => `color-mix(in oklab, ${this.hidden() ? 'var(--muted-foreground)' : `var(--status-${this.status()})`} 18%, transparent)`);
  protected readonly icon = computed(
    () => ({ good: 'lucideCircleCheck', warning: 'lucideTriangleAlert', critical: 'lucideOctagonAlert' })[this.status()],
  );
}
