import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { sparklineGeometry } from '@spacefly/client/ui-logic/sparkline';

/** 12-point trend in the de-emphasis hue with the current period in the accent (stat-tile contract). */
@Component({
  selector: 'sf-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'aria-hidden': 'true' },
  template: `
    @if (geometry(); as g) {
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="h-full w-full overflow-visible" preserveAspectRatio="none">
        <path [attr.d]="g.area" [attr.fill]="color()" opacity="0.1" />
        <polyline [attr.points]="g.line" fill="none" stroke="var(--chart-muted)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
        <circle [attr.cx]="g.last[0]" [attr.cy]="g.last[1]" r="3" [attr.fill]="color()" stroke="var(--chart-surface)" stroke-width="2" vector-effect="non-scaling-stroke" />
      </svg>
    }
  `,
})
export class Sparkline {
  readonly values = input<number[]>([]);
  readonly color = input('var(--money-net)');
  protected readonly width = 100;
  protected readonly height = 32;

  protected readonly geometry = computed(() => sparklineGeometry(this.values(), this.width, this.height));
}
