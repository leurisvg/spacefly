import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { ECElementEvent, ECharts, EChartsCoreOption } from 'echarts/core';
import { ChartCard } from './chart-card';

/**
 * ECharts host with the SpaceFly theme. Registers itself with an enclosing `sf-chart-card`
 * (PNG export). Height is explicit so the x-axis band always fits inside the container.
 */
@Component({
  selector: 'sf-chart',
  imports: [NgxEchartsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  template: `
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
  `,
})
export class Chart {
  private readonly card = inject(ChartCard, { optional: true });
  readonly options = input.required<EChartsCoreOption>();
  readonly height = input('18rem');
  readonly ariaLabel = input<string>('');
  readonly chartClick = output<ECElementEvent>();
  readonly init = output<ECharts>();

  protected readonly merged = computed<EChartsCoreOption>(() => ({
    animationDuration: 400,
    animationDurationUpdate: 300,
    aria: { enabled: true, decal: { show: false } },
    ...this.options(),
  }));

  protected onInit(chart: ECharts): void {
    this.card?.register(chart);
    this.init.emit(chart);
  }
}
