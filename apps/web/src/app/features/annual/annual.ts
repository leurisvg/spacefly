import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { endOfMonth, type AnnualReport } from '@shared';
import { reportResource } from '../../core/api/report-resource';
import { FormatService } from '../../core/format/format.service';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { I18n } from '../../core/i18n/i18n';
import { FiltersStore } from '../../core/state/filters.store';
import { incomeExpenseOption, matrixHeatmapOption } from '../../shared/charts/builders';
import { Chart } from '../../shared/charts/chart';
import { ChartCard, type ChartTable } from '../../shared/charts/chart-card';
import { cssVar, tooltipRow, tooltipTitle } from '../../shared/charts/chart-theme';
import { money } from '../../shared/charts/series-colors';
import { KpiCard } from '../../shared/components/kpi-card';
import { PageHeader } from '../../shared/components/page-header';
import { TxDetailService } from '../../shared/components/tx-detail.service';

@Component({
  selector: 'sf-annual',
  imports: [TranslocoPipe, Chart, ChartCard, KpiCard, PageHeader, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('annual.title', { year: year() })" [description]="i18n.t('annual.description')" />

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <sf-kpi [label]="i18n.t('annual.avgIncome')" [value]="r()?.averages?.income ?? null" accent="var(--money-income)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('annual.avgExpense')" [value]="r()?.averages?.expense ?? null" accent="var(--money-expense)" [loading]="res.initialLoading()" />
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="eyebrow">{{ 'annual.best' | transloco }}</div>
        @if (r()?.best; as b) {
          <div class="mt-2 text-lg font-semibold capitalize">{{ b.month | fdate: 'month' }}</div>
          <div class="num text-sm text-positive">{{ b.net | money: null : true }}</div>
        }
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="eyebrow">{{ 'annual.worst' | transloco }}</div>
        @if (r()?.worst; as w) {
          <div class="mt-2 text-lg font-semibold capitalize">{{ w.month | fdate: 'month' }}</div>
          <div class="num text-sm" [class.text-negative]="w.net < 0">{{ w.net | money: null : true }}</div>
        }
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-3">
      <sf-chart-card class="xl:col-span-2" [title]="i18n.t('annual.byMonth')" [table]="monthTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="annual-by-month">
        @if (barOptions(); as o) {
          <sf-chart [options]="o" height="20rem" (chartClick)="openMonth($event.dataIndex)" />
        }
      </sf-chart-card>
      <sf-chart-card [title]="i18n.t('annual.savingsRate')" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="annual-savings-rate">
        @if (rateOptions(); as o) {
          <sf-chart [options]="o" height="20rem" />
        }
      </sf-chart-card>
    </section>

    <sf-chart-card [title]="i18n.t('annual.matrix')" [subtitle]="i18n.t('annual.matrixHint')" [table]="matrixTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="annual-categories">
      @if (matrixOptions(); as o) {
        <sf-chart [options]="o" [height]="matrixHeight()" (chartClick)="openCell($any($event.data))" />
      }
    </sf-chart-card>
  `,
})
export class Annual {
  protected readonly i18n = inject(I18n);
  private readonly f = inject(FormatService);
  private readonly filters = inject(FiltersStore);
  private readonly detail = inject(TxDetailService);
  protected readonly year = computed(() => Number(this.filters.period().end.slice(0, 4)));
  protected readonly res = reportResource<AnnualReport>('reports/annual', () => ({ year: this.year() }));
  protected readonly r = this.res.data;

  private readonly rows = computed(() => {
    const r = this.r();
    return r ? r.months.map((month, i) => ({ month, income: r.income[i], expense: r.expense[i], net: r.income[i] - r.expense[i] })) : [];
  });

  protected readonly barOptions = computed(() => (this.rows().length ? incomeExpenseOption(this.f, this.i18n.t, this.rows()) : null));

  protected readonly rateOptions = computed(() => {
    const r = this.r();
    if (!r) return null;
    const color = money.savings();
    return {
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (p: { dataIndex: number }[]) => {
          const i = p[0].dataIndex;
          const v = r.savingsRate[i];
          return tooltipTitle(this.f.date(r.months[i], 'month')) + tooltipRow(color, this.i18n.t('common.savingsRate'), v === null ? '—' : this.f.pct(v / 100));
        },
      },
      xAxis: { type: 'category', data: r.months.map((m) => this.f.monthLabel(m, false)) },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => this.f.share(v) }, splitNumber: 4 },
      series: [
        {
          type: 'bar',
          data: r.savingsRate.map((v) => (v === null ? null : { value: v, itemStyle: { color: v >= 0 ? color : money.expense(), borderRadius: v >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4] } })),
          markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: cssVar('--chart-axis'), type: 'solid' }, data: [{ yAxis: 0 }] },
        },
      ],
    };
  });

  protected readonly matrixOptions = computed(() => {
    const r = this.r();
    return r?.categories.length ? matrixHeatmapOption(this.f, r.months, r.categories.map((c) => ({ name: this.i18n.name(c.name, c.id), values: c.values }))) : null;
  });
  protected readonly matrixHeight = computed(() => `${Math.min(this.r()?.categories.length ?? 0, 15) * 2.2 + 5}rem`);

  protected readonly monthTable = computed<ChartTable | null>(() =>
    this.rows().length
      ? {
          columns: [this.i18n.t('common.month'), this.i18n.t('common.income'), this.i18n.t('common.expenses'), this.i18n.t('common.net'), this.i18n.t('common.savingsRate')],
          rows: this.rows().map((m, i) => [
            this.f.date(m.month, 'month'),
            this.f.money(m.income),
            this.f.money(m.expense),
            this.f.money(m.net),
            this.r()!.savingsRate[i] === null ? '—' : this.f.pct(this.r()!.savingsRate[i]! / 100),
          ]),
          numeric: [1, 2, 3, 4],
        }
      : null,
  );

  protected readonly matrixTable = computed<ChartTable | null>(() => {
    const r = this.r();
    if (!r) return null;
    return {
      columns: [this.i18n.t('common.category'), ...r.months.map((m) => this.f.monthLabel(m, false)), this.i18n.t('common.total')],
      rows: r.categories.map((c) => [this.i18n.name(c.name, c.id), ...c.values.map((v) => (v ? this.f.compact(v, false) : '·')), this.f.money(c.total)]),
      numeric: Array.from({ length: 13 }, (_, i) => i + 1),
    };
  });

  protected openMonth(i: number): void {
    const m = this.r()?.months[i];
    if (m) this.detail.open(this.f.date(m, 'month'), { start: `${m}-01`, end: endOfMonth(`${m}-01`) });
  }

  protected openCell(data: [number, number, number]): void {
    const r = this.r();
    if (!r) return;
    const m = r.months[data[0]];
    const c = r.categories[data[1]];
    this.detail.open(`${this.i18n.name(c.name, c.id)} · ${this.f.date(m, 'month')}`, { start: `${m}-01`, end: endOfMonth(`${m}-01`), type: 'withdrawal', category: c.id ?? 'none' });
  }
}
