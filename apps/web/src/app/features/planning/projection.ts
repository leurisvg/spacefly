import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ProjectionReport } from '@spacefly/shared';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { reportResource } from '../../core/api/report-resource';
import { FormatService } from '../../core/format/format.service';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { I18n } from '../../core/i18n/i18n';
import { FiltersStore } from '../../core/state/filters.store';
import { Chart } from '../../shared/charts/chart';
import { ChartCard, type ChartTable } from '../../shared/charts/chart-card';
import { cssVar, tooltipRow, tooltipTitle } from '../../shared/charts/chart-theme';
import { money } from '../../shared/charts/series-colors';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { Section } from '../../shared/components/section';

@Component({
  selector: 'sf-projection',
  imports: [TranslocoPipe, HlmToggleGroupImports, Chart, ChartCard, KpiCard, Money, PageHeader, Section, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.projection')" [description]="i18n.t('projection.description')">
      <hlm-toggle-group type="single" variant="outline" size="sm" [value]="days()" [nullable]="false" (valueChange)="$event && filters.setParams({ days: $any($event) })">
        @for (d of ['30', '60', '90', '180']; track d) {
          <button hlmToggleGroupItem [value]="d" class="text-xs">{{ d }}{{ 'projection.daysShort' | transloco }}</button>
        }
      </hlm-toggle-group>
    </sf-page-header>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <sf-kpi [label]="i18n.t('projection.today')" [value]="r()?.startBalance ?? null" accent="var(--money-net)" [loading]="res.initialLoading()" />
      @for (h of r()?.horizons ?? []; track h.days) {
        <sf-kpi [label]="i18n.t('projection.in', { n: h.days })" [value]="h.balance" [previous]="r()!.startBalance" accent="var(--money-net)" />
      }
    </section>

    <sf-chart-card [title]="i18n.t('projection.chart')" [subtitle]="lowestLabel()" [table]="table()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="cash-flow-projection">
      @if (options(); as o) {
        <sf-chart [options]="o" height="20rem" />
      }
    </sf-chart-card>

    <sf-section [title]="i18n.t('projection.events')" [loading]="res.initialLoading()">
      <ul class="divide-y divide-border/70 text-sm">
        @for (e of r()?.events ?? []; track $index) {
          <li class="flex items-center gap-3 py-2">
            <span class="size-2 shrink-0 rounded-full" [class.bg-status-warning]="e.kind === 'bill'" [class.bg-primary]="e.kind === 'recurrence'"></span>
            <span class="w-24 shrink-0 text-xs text-muted-foreground">{{ e.date | fdate: 'day' }}</span>
            <span class="flex-1 truncate">{{ e.name }}</span>
            <sf-money [value]="e.amount" [signed]="true" tone="auto" />
          </li>
        } @empty {
          <li class="py-6 text-center text-muted-foreground">{{ 'projection.noEvents' | transloco }}</li>
        }
      </ul>
    </sf-section>
  `,
})
export class Projection {
  protected readonly i18n = inject(I18n);
  protected readonly filters = inject(FiltersStore);
  private readonly f = inject(FormatService);
  private readonly daysParam = this.filters.param('days');
  protected readonly days = computed(() => (['30', '60', '90', '180'].includes(this.daysParam() ?? '') ? this.daysParam()! : '90'));
  protected readonly res = reportResource<ProjectionReport>('reports/projection', () => ({ days: this.days() }), { global: false });
  protected readonly r = this.res.data;

  protected readonly lowestLabel = computed(() => {
    const l = this.r()?.lowest;
    return l ? this.i18n.t('projection.lowest', { amount: this.f.money(l.balance), date: this.f.date(l.date, 'long') }) : '';
  });

  protected readonly options = computed(() => {
    const r = this.r();
    if (!r) return null;
    const color = money.net();
    return {
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (p: { dataIndex: number }[]) => {
          const d = r.days[p[0].dataIndex];
          const events = r.events.filter((e) => e.date === d.date);
          return (
            tooltipTitle(this.f.date(d.date, 'full')) +
            tooltipRow(color, this.i18n.t('calendar.balance'), this.f.money(d.balance)) +
            events.map((e) => tooltipRow(e.amount < 0 ? money.expense() : money.income(), e.name, this.f.money(e.amount, undefined, { signed: true }))).join('')
          );
        },
      },
      xAxis: { type: 'category', data: r.days.map((d) => this.f.date(d.date, 'short')), boundaryGap: false },
      yAxis: { type: 'value', scale: true, axisLabel: { formatter: (v: number) => this.f.compact(v) }, splitNumber: 4 },
      series: [
        {
          type: 'line',
          step: 'end',
          data: r.days.map((d) => d.balance),
          showSymbol: false,
          lineStyle: { color, width: 2 },
          itemStyle: { color },
          areaStyle: { color, opacity: 0.1 },
          markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: cssVar('--chart-axis'), type: 'solid' }, data: [{ yAxis: 0 }] },
        },
      ],
    };
  });

  protected readonly table = computed<ChartTable | null>(() => {
    const r = this.r();
    return r
      ? {
          columns: [this.i18n.t('common.date'), this.i18n.t('projection.inflow'), this.i18n.t('projection.outflow'), this.i18n.t('calendar.balance')],
          rows: r.days.filter((d) => d.inflow || d.outflow).map((d) => [this.f.date(d.date, 'day'), this.f.money(d.inflow), this.f.money(d.outflow), this.f.money(d.balance)]),
          numeric: [1, 2, 3],
        }
      : null;
  });
}
