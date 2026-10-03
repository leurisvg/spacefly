import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { DashboardReport } from '@shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { reportResource } from '../../core/api/report-resource';
import { FormatService } from '../../core/format/format.service';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { I18n } from '../../core/i18n/i18n';
import { FiltersStore } from '../../core/state/filters.store';
import { donutOption, incomeExpenseOption, linesOption, type Slice } from '../../shared/charts/builders';
import { Chart } from '../../shared/charts/chart';
import { ChartCard, type ChartTable } from '../../shared/charts/chart-card';
import { money, SeriesColors } from '../../shared/charts/series-colors';
import { CalendarGrid } from '../../shared/components/calendar-grid';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Meter } from '../../shared/components/meter';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { TransactionList } from '../../shared/components/transaction-list';
import { TxDetailService } from '../../shared/components/tx-detail.service';

@Component({
  selector: 'sf-dashboard',
  imports: [
    RouterLink,
    TranslocoPipe,
    HlmButton,
    Chart,
    ChartCard,
    KpiCard,
    Meter,
    Money,
    PageHeader,
    CalendarGrid,
    TransactionList,
    EmptyState,
    ...FORMAT_PIPES,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.dashboard')" [description]="i18n.t('dashboard.description')" />

    @if (res.error() && !d()) {
      <sf-empty [error]="true" [title]="i18n.t('errors.load')" />
    }

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <sf-kpi [label]="i18n.t('common.income')" [value]="d()?.kpis?.income?.value ?? null" [previous]="d()?.kpis?.income?.previous ?? null" [spark]="d()?.kpis?.income?.spark ?? null" accent="var(--money-income)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('common.expenses')" [value]="d()?.kpis?.expense?.value ?? null" [previous]="d()?.kpis?.expense?.previous ?? null" [spark]="d()?.kpis?.expense?.spark ?? null" accent="var(--money-expense)" [upIsGood]="false" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('common.net')" [value]="d()?.kpis?.net?.value ?? null" [previous]="d()?.kpis?.net?.previous ?? null" [spark]="d()?.kpis?.net?.spark ?? null" accent="var(--money-net)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('common.savingsRate')" format="pct" [value]="d()?.kpis?.savingsRate?.value ?? null" [previous]="d()?.kpis?.savingsRate?.previous ?? null" [spark]="d()?.kpis?.savingsRate?.spark ?? null" accent="var(--money-savings)" [loading]="res.initialLoading()" />
      <sf-kpi class="col-span-2 lg:col-span-1" [label]="i18n.t('common.netWorth')" [value]="d()?.kpis?.netWorth?.value ?? null" [previous]="d()?.kpis?.netWorth?.previous ?? null" [spark]="d()?.kpis?.netWorth?.spark ?? null" accent="var(--money-revenue)" [loading]="res.initialLoading()" />
    </section>

    <section class="grid gap-4 xl:grid-cols-3">
      <sf-chart-card class="xl:col-span-2" [title]="i18n.t('dashboard.incomeVsExpense')" [subtitle]="i18n.t('dashboard.last12')" [table]="monthsTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="income-vs-expenses">
        @if (incomeOptions(); as o) {
          <sf-chart [options]="o" height="18rem" (chartClick)="openMonth($event.dataIndex)" />
        }
      </sf-chart-card>
      <sf-chart-card [title]="i18n.t('dashboard.topCategories')" [table]="catTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="top-categories">
        @if (slices().length) {
          <sf-chart [options]="donut()!" height="13rem" (chartClick)="openCategory($event.dataIndex)" />
          <ul class="mt-2 space-y-1 px-2 text-sm">
            @for (s of slices(); track s.id; let i = $index) {
              <li>
                <button type="button" class="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-muted" (click)="openCategory(i)">
                  <span class="size-2.5 shrink-0 rounded-sm" [style.background]="s.color"></span>
                  <span class="flex-1 truncate">{{ s.name }}</span>
                  <sf-money class="text-xs text-muted-foreground" [value]="s.value" />
                </button>
              </li>
            }
          </ul>
        } @else if (!res.initialLoading()) {
          <sf-empty [title]="i18n.t('common.noData')" />
        }
      </sf-chart-card>
    </section>

    <section class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <sf-chart-card [title]="i18n.t('common.netWorth')" [subtitle]="i18n.t('dashboard.last12')" [table]="nwTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="net-worth">
        @if (nwOptions(); as o) {
          <sf-chart [options]="o" height="14rem" />
        }
      </sf-chart-card>

      <section class="flex flex-col rounded-xl border border-border bg-card p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="card-title">{{ 'nav.budgets' | transloco }}</h2>
          <a hlmBtn variant="link" size="xs" routerLink="/analysis/budgets" queryParamsHandling="preserve">{{ 'common.viewAll' | transloco }}</a>
        </div>
        <ul class="flex flex-col gap-3">
          @for (b of d()?.budgets ?? []; track b.id) {
            <li>
              <button type="button" class="w-full text-left" (click)="detail.open(b.name, { type: 'withdrawal', budget: b.id })">
                <div class="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span class="truncate font-medium">{{ b.name }}</span>
                  <span class="num text-xs text-muted-foreground">{{ b.spent.value | compact }} / {{ b.limit.value | compact }}</span>
                </div>
                <sf-meter [ratio]="b.pct" />
              </button>
            </li>
          } @empty {
            <li class="py-6 text-center text-sm text-muted-foreground">{{ 'budget.none' | transloco }}</li>
          }
        </ul>
      </section>

      <section class="flex flex-col rounded-xl border border-border bg-card p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="card-title">{{ 'dashboard.upcomingBills' | transloco }}</h2>
          <a hlmBtn variant="link" size="xs" routerLink="/planning/bills" queryParamsHandling="preserve">{{ 'common.viewAll' | transloco }}</a>
        </div>
        <ul class="divide-y divide-border/70">
          @for (b of d()?.upcomingBills ?? []; track b.id + b.date) {
            <li class="flex items-center gap-3 py-2 text-sm">
              <span class="w-14 shrink-0 text-xs text-muted-foreground">{{ b.date | fdate: 'short' }}</span>
              <span class="flex-1 truncate">{{ b.name }}</span>
              <sf-money [value]="b.amount" class="text-xs" />
            </li>
          } @empty {
            <li class="py-6 text-center text-sm text-muted-foreground">{{ 'dashboard.noUpcoming' | transloco }}</li>
          }
        </ul>
      </section>
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      <section class="rounded-xl border border-border bg-card p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="card-title capitalize">{{ calendarMonth() | fdate: 'month' }}</h2>
          <a hlmBtn variant="link" size="xs" routerLink="/reports/calendar" queryParamsHandling="preserve">{{ 'common.viewAll' | transloco }}</a>
        </div>
        @if (d(); as data) {
          <sf-calendar-grid [days]="data.calendar" [compact]="true" (dayClick)="openDay($event)" />
        }
      </section>
      <section class="rounded-xl border border-border bg-card p-4">
        <h2 class="card-title mb-1">{{ 'dashboard.largest' | transloco }}</h2>
        <sf-transaction-list [rows]="d()?.largest ?? []" />
      </section>
    </section>
  `,
})
export class Dashboard {
  protected readonly i18n = inject(I18n);
  protected readonly detail = inject(TxDetailService);
  private readonly f = inject(FormatService);
  private readonly filters = inject(FiltersStore);
  private readonly colors = inject(SeriesColors);
  protected readonly res = reportResource<DashboardReport>('reports/dashboard');
  protected readonly d = this.res.data;

  protected readonly calendarMonth = computed(() => this.filters.period().end.slice(0, 7));

  protected readonly incomeOptions = computed(() => {
    const months = this.d()?.months;
    return months ? incomeExpenseOption(this.f, this.i18n.t, months) : null;
  });

  protected readonly monthsTable = computed<ChartTable | null>(() => {
    const months = this.d()?.months;
    if (!months) return null;
    return {
      columns: [this.i18n.t('common.month'), this.i18n.t('common.income'), this.i18n.t('common.expenses'), this.i18n.t('common.net')],
      rows: months.map((m) => [this.f.date(m.month, 'month'), this.f.money(m.income), this.f.money(m.expense), this.f.money(m.net)]),
      numeric: [1, 2, 3],
    };
  });

  protected readonly slices = computed<Slice[]>(() =>
    (this.d()?.topCategories ?? []).map((c) => ({
      id: c.id,
      name: this.i18n.name(c.name, c.id),
      value: c.value,
      color: c.id === '__others__' ? money.other() : this.colors.color('category', c.id),
    })),
  );

  protected readonly donut = computed(() => {
    const s = this.slices();
    return s.length ? donutOption(this.f, s, this.i18n.t('common.expenses'), s.reduce((a, b) => a + b.value, 0)) : null;
  });

  protected readonly catTable = computed<ChartTable | null>(() =>
    this.slices().length
      ? {
          columns: [this.i18n.t('common.category'), this.i18n.t('common.amount')],
          rows: this.slices().map((s) => [s.name, this.f.money(s.value)]),
          numeric: [1],
        }
      : null,
  );

  protected readonly nwOptions = computed(() => {
    const nw = this.d()?.netWorth;
    if (!nw?.length) return null;
    return linesOption(this.f, nw.map((n) => n.month), [
      { id: 'nw', name: this.i18n.t('common.netWorth'), values: nw.map((n) => n.value), color: money.revenue(), area: true },
    ]);
  });

  protected readonly nwTable = computed<ChartTable | null>(() => {
    const nw = this.d()?.netWorth;
    return nw ? { columns: [this.i18n.t('common.month'), this.i18n.t('common.netWorth')], rows: nw.map((n) => [this.f.date(n.month, 'month'), this.f.money(n.value)]), numeric: [1] } : null;
  });

  protected openMonth(index: number): void {
    const m = this.d()?.months[index];
    if (!m) return;
    const start = `${m.month}-01`;
    const end = new Date(Date.UTC(Number(m.month.slice(0, 4)), Number(m.month.slice(5, 7)), 0)).toISOString().slice(0, 10);
    this.detail.open(this.f.date(m.month, 'month'), { start, end });
  }

  protected openCategory(index: number): void {
    const s = this.slices()[index];
    if (!s || s.id === '__others__') return;
    this.detail.open(s.name, { type: 'withdrawal', category: s.id ?? 'none' });
  }

  protected openDay(date: string): void {
    this.detail.open(this.f.date(date, 'full'), { start: date, end: date });
  }
}
