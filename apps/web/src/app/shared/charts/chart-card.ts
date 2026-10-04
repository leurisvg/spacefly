import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChartColumn, lucideDownload, lucideTable2 } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import type { ECharts } from 'echarts/core';
import { palette } from '@spacefly/client/charts/palette';
import type { ChartTable } from '@spacefly/client/charts/chart-table';

/**
 * Card around a chart: title, subtitle, a table view toggle (every chart has one), and PNG export.
 * While data reloads the previous render is kept; the skeleton only shows on first load.
 */
@Component({
  selector: 'sf-chart-card',
  imports: [NgIcon, TranslocoPipe, HlmButton, HlmTooltip, HlmSkeleton],
  providers: [provideIcons({ lucideTable2, lucideChartColumn, lucideDownload })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col rounded-xl border border-border bg-card text-card-foreground min-w-0' },
  template: `
    <header class="flex items-start gap-2 px-4 pt-4 sm:px-5">
      <div class="min-w-0 flex-1">
        <h2 class="card-title truncate">{{ title() }}</h2>
        @if (subtitle()) {
          <p class="mt-0.5 text-xs text-muted-foreground">{{ subtitle() }}</p>
        }
      </div>
      <ng-content select="[card-actions]" />
      @if (table()) {
        <button
          hlmBtn
          variant="ghost"
          size="icon-sm"
          [hlmTooltip]="(showTable() ? 'chart.showChart' : 'chart.showTable') | transloco"
          [attr.aria-pressed]="showTable()"
          [attr.aria-label]="(showTable() ? 'chart.showChart' : 'chart.showTable') | transloco"
          (click)="showTable.set(!showTable())"
        >
          <ng-icon [name]="showTable() ? 'lucideChartColumn' : 'lucideTable2'" />
        </button>
      }
      @if (exportable() && !showTable()) {
        <button
          hlmBtn
          variant="ghost"
          size="icon-sm"
          [hlmTooltip]="'chart.download' | transloco"
          [attr.aria-label]="'chart.download' | transloco"
          (click)="downloadPng()"
        >
          <ng-icon name="lucideDownload" />
        </button>
      }
    </header>
    <div class="relative flex-1 px-2 pb-3 pt-2 sm:px-3" [class.opacity-60]="loading() && !initialLoading()">
      @if (initialLoading()) {
        <div class="px-2 py-2"><div hlmSkeleton class="w-full" [style.height]="skeletonHeight()"></div></div>
      } @else if (showTable() && table(); as t) {
        <div class="max-h-[28rem] overflow-auto px-2">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-card">
              <tr>
                @for (c of t.columns; track $index) {
                  <th class="eyebrow border-b border-border py-2 text-left" [class.text-right]="t.numeric?.includes($index)">{{ c }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (r of t.rows; track $index) {
                <tr class="border-b border-border/60 last:border-0">
                  @for (cell of r; track $index) {
                    <td class="py-1.5 pr-2" [class.num]="t.numeric?.includes($index)" [class.text-right]="t.numeric?.includes($index)">{{ cell }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <ng-content />
      }
    </div>
  `,
})
export class ChartCard {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly table = input<ChartTable | null>(null);
  readonly loading = input(false);
  readonly initialLoading = input(false);
  readonly exportable = input(true);
  readonly fileName = input('spacefly-chart');
  readonly skeletonHeight = input('18rem');
  protected readonly showTable = signal(false);
  private chart: ECharts | null = null;

  register(chart: ECharts): void {
    this.chart = chart;
  }

  protected downloadPng(): void {
    if (!this.chart) return;
    const url = this.chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: palette.chartSurface });
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.fileName()}.png`;
    a.click();
  }
}
