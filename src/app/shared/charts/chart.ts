import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import type { ECElementEvent, ECharts, EChartsCoreOption } from 'echarts/core';
import { PrivacyStore } from '../../core/state/privacy.store';
import { ChartCard } from './chart-card';

/**
 * ECharts host with the SpaceFly theme. Registers itself with an enclosing `sf-chart-card`
 * (PNG export). Height is explicit so the x-axis band always fits inside the container.
 * ECharts only initialises once the chart nears the viewport, so long pages (annual matrix,
 * heatmap, tall Sankey) don't render canvases the user hasn't scrolled to.
 */
@Component({
  selector: 'sf-chart',
  imports: [NgxEchartsDirective, HlmSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  template: `
    @defer (on viewport; prefetch on idle) {
      <div
        echarts
        theme="spacefly"
        [options]="merged()"
        [autoResize]="true"
        [style.height]="height()"
        class="w-full"
        role="img"
        [attr.aria-label]="ariaLabel()"
        (chartInit)="onInit($event)"
        (chartClick)="chartClick.emit($event)"
      ></div>
    } @placeholder {
      <div hlmSkeleton class="w-full" [style.height]="height()"></div>
    }
  `,
})
export class Chart {
  private readonly card = inject(ChartCard, { optional: true });
  private readonly privacy = inject(PrivacyStore);
  readonly options = input.required<EChartsCoreOption>();
  readonly height = input('18rem');
  readonly ariaLabel = input<string>('');
  readonly chartClick = output<ECElementEvent>();
  readonly init = output<ECharts>();

  protected readonly merged = computed<EChartsCoreOption>(() => ({
    animationDuration: 400,
    animationDurationUpdate: 300,
    // Reading `hidden` hands ECharts a fresh option object when privacy toggles, so tooltip and axis
    // formatters (plain closures that read it live) re-render. ECharts' generated aria text lists the data values.
    aria: { enabled: !this.privacy.hidden(), decal: { show: false } },
    ...this.options(),
  }));

  protected onInit(chart: ECharts): void {
    this.card?.register(chart);
    this.init.emit(chart);
  }
}
