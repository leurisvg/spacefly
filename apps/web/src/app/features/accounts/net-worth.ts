import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { NetWorthReport } from '@shared';
import { reportResource } from '../../core/api/report-resource';
import { FormatService } from '../../core/format/format.service';
import { I18n } from '../../core/i18n/i18n';
import { FiltersStore } from '../../core/state/filters.store';
import { linesOption } from '../../shared/charts/builders';
import { Chart } from '../../shared/charts/chart';
import { ChartCard, type ChartTable } from '../../shared/charts/chart-card';
import { money, SeriesColors } from '../../shared/charts/series-colors';
import { KpiCard } from '../../shared/components/kpi-card';
import { PageHeader } from '../../shared/components/page-header';
import { MonthsPicker } from './months-picker';

@Component({
  selector: 'sf-net-worth',
  imports: [Chart, ChartCard, KpiCard, PageHeader, MonthsPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.netWorth')" [description]="i18n.t('netWorth.description')">
      <sf-months-picker [value]="months()" (changed)="filters.setParams({ months: $event })" />
    </sf-page-header>
    <section class="grid grid-cols-2 gap-3">
      <sf-kpi [label]="i18n.t('netWorth.current')" [value]="r()?.current ?? null" [previous]="first()" [spark]="r()?.total ?? null" accent="var(--money-revenue)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('netWorth.change', { n: r()?.months?.length ?? months() })" [value]="r()?.change?.abs ?? null" accent="var(--money-net)" [loading]="res.initialLoading()" />
    </section>
    <sf-chart-card [title]="i18n.t('netWorth.total')" [table]="table()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="net-worth">
      @if (totalOpts(); as o) {
        <sf-chart [options]="o" height="18rem" />
      }
    </sf-chart-card>
    <sf-chart-card [title]="i18n.t('netWorth.byAccount')" [subtitle]="i18n.t('netWorth.stackedHint')" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="net-worth-by-account">
      @if (stackOpts(); as o) {
        <sf-chart [options]="o" height="24rem" />
      }
    </sf-chart-card>
  `,
})
export class NetWorth {
  protected readonly i18n = inject(I18n);
  protected readonly filters = inject(FiltersStore);
  private readonly f = inject(FormatService);
  private readonly colors = inject(SeriesColors);
  private readonly monthsParam = this.filters.param('months');
  protected readonly months = computed(() => this.monthsParam() ?? '24');
  protected readonly res = reportResource<NetWorthReport>('reports/net-worth', () => ({ months: this.months() }));
  protected readonly r = this.res.data;
  protected readonly first = computed(() => this.r()?.total[0] ?? null);

  protected readonly totalOpts = computed(() => {
    const r = this.r();
    return r ? linesOption(this.f, r.months, [{ id: 'nw', name: this.i18n.t('common.netWorth'), values: r.total, color: money.revenue(), area: true }]) : null;
  });

  /** Positive balances stacked; liabilities (negative) are shown in the total chart and table. */
  protected readonly stackOpts = computed(() => {
    const r = this.r();
    if (!r?.byAccount.length) return null;
    const positive = r.byAccount.filter((a) => a.balances.some((b) => b > 0));
    return linesOption(
      this.f,
      r.months,
      positive.map((a) => ({ id: a.id, name: a.name, values: a.balances.map((b) => Math.max(b, 0)), color: this.colors.color('account', a.id) })),
      { stack: true },
    );
  });

  protected readonly table = computed<ChartTable | null>(() => {
    const r = this.r();
    if (!r) return null;
    return {
      columns: [this.i18n.t('common.account'), ...r.months.map((m) => this.f.monthLabel(m))],
      rows: [...r.byAccount.map((a) => [a.name, ...a.balances.map((b) => this.f.compact(b))]), [this.i18n.t('common.total'), ...r.total.map((v) => this.f.compact(v))]],
      numeric: r.months.map((_, i) => i + 1),
    };
  });
}
