import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { endOfMonth, isFullMonth, startOfMonth, type CalendarReport, type YearHeatmapReport } from '@spacefly/shared';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { reportResource } from '@spacefly/client/api/report-resource';
import { FormatService } from '@spacefly/client/format/format.service';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { I18n } from '@spacefly/client/i18n/i18n';
import { FiltersStore } from '@spacefly/client/state/filters.store';
import { MetaStore } from '@spacefly/client/state/meta.store';
import { yearHeatmapOption } from '@spacefly/client/charts/builders';
import { BreakpointService } from '../../shared/charts/breakpoint';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import type { ChartTable } from '@spacefly/client/charts/chart-table';
import { palette } from '@spacefly/client/charts/palette';
import { tooltipRow, tooltipTitle } from '@spacefly/client/charts/chart-theme';
import { money } from '@spacefly/client/charts/series-colors';
import { CalendarGrid } from '../../shared/components/calendar-grid';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { Select } from '../../shared/components/select';
import { TxDetailService } from '@spacefly/client/state/tx-detail.service';

@Component({
  selector: 'sf-calendar-page',
  imports: [TranslocoPipe, HlmToggleGroupImports, CalendarGrid, Chart, ChartCard, KpiCard, Money, PageHeader, Select, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.calendar')" [description]="i18n.t('calendar.description')">
      <hlm-toggle-group type="single" variant="outline" size="sm" [value]="view()" [nullable]="false" (valueChange)="$event && filters.setParams({ view: $any($event) })">
        <button hlmToggleGroupItem value="month">{{ 'calendar.month' | transloco }}</button>
        <button hlmToggleGroupItem value="year">{{ 'calendar.year' | transloco }}</button>
      </hlm-toggle-group>
    </sf-page-header>

    @if (view() === 'month') {
      <div class="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <span class="mr-2 text-sm font-medium capitalize">{{ month().start | fdate: 'month' }}</span>
        <sf-select class="w-44" [options]="accountOptions()" [placeholder]="i18n.t('calendar.allAccounts')" [label]="i18n.t('common.account')" [value]="account()" (valueChange)="filters.setParams({ account: $event || null })" />
        <sf-select class="w-44" [options]="categoryOptions()" [placeholder]="i18n.t('calendar.allCategories')" [label]="i18n.t('common.category')" [value]="category()" (valueChange)="filters.setParams({ category: $event || null })" />
        <sf-select class="w-40" [options]="tagOptions()" [placeholder]="i18n.t('calendar.allTags')" [label]="i18n.t('common.tag')" [value]="tag()" (valueChange)="filters.setParams({ tag: $event || null })" />
      </div>

      <section class="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <sf-kpi [label]="i18n.t('common.income')" [value]="cal.data()?.totals?.income ?? null" accent="var(--money-income)" [loading]="cal.initialLoading()" />
        <sf-kpi [label]="i18n.t('common.expenses')" [value]="cal.data()?.totals?.expense ?? null" accent="var(--money-expense)" [loading]="cal.initialLoading()" />
        <sf-kpi class="col-span-2 lg:col-span-1" [label]="i18n.t('calendar.endBalance')" [value]="endBalance()" accent="var(--money-net)" [loading]="cal.initialLoading()" />
      </section>

      <section class="grid gap-4 xl:grid-cols-5">
        <sf-chart-card class="xl:col-span-3" [title]="i18n.t('monthly.dailyCashFlow')" [subtitle]="i18n.t('calendar.clickDay')" [exportable]="false" [table]="dayTable()" [loading]="cal.loading()" [initialLoading]="cal.initialLoading()" skeletonHeight="28rem">
          @if (cal.data(); as c) {
            <div class="px-2"><sf-calendar-grid [days]="c.days" [scheduled]="c.scheduled" (dayClick)="openDay($event)" /></div>
          }
        </sf-chart-card>
        <div class="flex flex-col gap-4 xl:col-span-2">
          <sf-chart-card [title]="i18n.t('calendar.runningBalance')" [loading]="cal.loading()" [initialLoading]="cal.initialLoading()" fileName="running-balance">
            @if (balanceOptions(); as o) {
              <sf-chart [options]="o" height="14rem" />
            } @else {
              <p class="px-3 py-10 text-center text-sm text-muted-foreground">{{ 'calendar.noBalance' | transloco }}</p>
            }
          </sf-chart-card>
          <section class="rounded-xl border border-border bg-card p-4">
            <h2 class="card-title mb-2">{{ 'calendar.scheduled' | transloco }}</h2>
            <ul class="divide-y divide-border/70 text-sm">
              @for (s of cal.data()?.scheduled ?? []; track s.kind + s.id + s.date) {
                <li class="flex items-center gap-3 py-2">
                  <span class="size-2 shrink-0 rounded-full" [class.bg-status-warning]="s.kind === 'bill'" [class.bg-primary]="s.kind === 'recurrence'"></span>
                  <span class="w-14 shrink-0 text-xs text-muted-foreground">{{ s.date | fdate: 'short' }}</span>
                  <span class="flex-1 truncate">{{ s.name }}</span>
                  <sf-money [value]="s.type === 'deposit' ? s.amount : -s.amount" [signed]="true" [tone]="s.type === 'deposit' ? 'income' : 'expense'" class="text-xs" />
                </li>
              } @empty {
                <li class="py-6 text-center text-muted-foreground">{{ 'calendar.noScheduled' | transloco }}</li>
              }
            </ul>
          </section>
        </div>
      </section>
    } @else {
      <sf-chart-card [title]="i18n.t('calendar.heatmapTitle', { year: year() })" [subtitle]="i18n.t('calendar.heatmapHint')" [table]="yearTable()" [loading]="yearRes.loading()" [initialLoading]="yearRes.initialLoading()" fileName="spending-heatmap">
        @if (heatmapOptions(); as o) {
          <sf-chart [options]="o" [height]="bp.mobile() ? '52rem' : '15rem'" (chartClick)="openDay($any($event.data)[0])" />
        }
      </sf-chart-card>
    }
  `,
})
export class CalendarPage {
  protected readonly i18n = inject(I18n);
  protected readonly filters = inject(FiltersStore);
  protected readonly bp = inject(BreakpointService);
  private readonly f = inject(FormatService);
  private readonly meta = inject(MetaStore);
  private readonly detail = inject(TxDetailService);

  private readonly viewParam = this.filters.param('view');
  protected readonly view = computed(() => (this.viewParam() === 'year' ? 'year' : 'month'));
  protected readonly account = computed(() => this.filters.param('account')() ?? '');
  protected readonly category = computed(() => this.filters.param('category')() ?? '');
  protected readonly tag = computed(() => this.filters.param('tag')() ?? '');

  /** The calendar is month-based: a non-month period shows the month of its end date. */
  protected readonly month = computed(() => {
    const p = this.filters.period();
    return isFullMonth(p) ? p : { start: startOfMonth(p.end), end: endOfMonth(p.end) };
  });
  protected readonly year = computed(() => Number(this.filters.period().end.slice(0, 4)));

  protected readonly cal = reportResource<CalendarReport>('reports/calendar', () =>
    this.view() !== 'month'
      ? null
      : {
          ...this.month(),
          ...(this.account() ? { account: this.account() } : {}),
          ...(this.category() ? { category: this.category() } : {}),
          ...(this.tag() ? { tag: this.tag() } : {}),
        },
  );
  protected readonly yearRes = reportResource<YearHeatmapReport>('reports/calendar/year', () => (this.view() === 'year' ? { year: this.year() } : null));

  protected readonly accountOptions = computed(() => (this.meta.lookups()?.accounts ?? []).map((a) => ({ value: a.id, label: a.name })));
  protected readonly categoryOptions = computed(() => [
    { value: 'none', label: this.i18n.t('common.uncategorized') },
    ...(this.meta.lookups()?.categories ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]);
  protected readonly tagOptions = computed(() => (this.meta.lookups()?.tags ?? []).map((t) => ({ value: t.name, label: t.name })));

  protected readonly endBalance = computed(() => {
    const days = this.cal.data()?.days.filter((d) => d.balance !== null) ?? [];
    return days.length ? days[days.length - 1].balance : null;
  });

  protected readonly balanceOptions = computed(() => {
    const days = this.cal.data()?.days.filter((d) => d.balance !== null);
    if (!days?.length) return null;
    const color = money.net();
    return {
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (p: { dataIndex: number }[]) =>
          tooltipTitle(this.f.date(days[p[0].dataIndex].date, 'full')) + tooltipRow(color, this.i18n.t('calendar.balance'), this.f.money(days[p[0].dataIndex].balance)),
      },
      xAxis: { type: 'category', data: days.map((d) => d.date.slice(8)), boundaryGap: false },
      yAxis: { type: 'value', scale: true, axisLabel: { formatter: (v: number) => this.f.compact(v) }, splitNumber: 4 },
      series: [
        {
          type: 'line',
          data: days.map((d) => d.balance),
          showSymbol: false,
          lineStyle: { color, width: 2 },
          itemStyle: { color },
          areaStyle: { color, opacity: 0.1 },
          markLine: { silent: true, symbol: 'none', lineStyle: { color: palette.chartAxis, type: 'solid' }, label: { show: false }, data: [{ yAxis: 0 }] },
        },
      ],
    };
  });

  protected readonly dayTable = computed<ChartTable | null>(() => {
    const days = this.cal.data()?.days;
    if (!days) return null;
    return {
      columns: [this.i18n.t('common.date'), this.i18n.t('common.income'), this.i18n.t('common.expenses'), this.i18n.t('calendar.balance')],
      rows: days.filter((d) => d.income || d.expense).map((d) => [this.f.date(d.date, 'day'), this.f.money(d.income), this.f.money(d.expense), this.f.money(d.balance)]),
      numeric: [1, 2, 3],
    };
  });

  protected readonly heatmapOptions = computed(() => {
    const y = this.yearRes.data();
    return y ? yearHeatmapOption(this.f, this.i18n.t, y.year, y.days, y.max, this.bp.mobile()) : null;
  });

  protected readonly yearTable = computed<ChartTable | null>(() => {
    const y = this.yearRes.data();
    if (!y) return null;
    const byMonth = new Map<string, number>();
    for (const d of y.days) byMonth.set(d.date.slice(0, 7), (byMonth.get(d.date.slice(0, 7)) ?? 0) + d.expense);
    return {
      columns: [this.i18n.t('common.month'), this.i18n.t('common.expenses')],
      rows: [...byMonth].map(([m, v]) => [this.f.date(m, 'month'), this.f.money(v)]),
      numeric: [1],
    };
  });

  protected openDay(date: string): void {
    const f: Record<string, string> = { start: date, end: date };
    if (this.account()) f['account'] = this.account();
    if (this.category()) f['category'] = this.category();
    if (this.tag()) f['tag'] = this.tag();
    this.detail.open(this.f.date(date, 'full'), f);
  }
}
