import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { dashboardViewModel } from '@spacefly/client/features/dashboard/dashboard.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { CalendarGrid } from '../../shared/components/calendar-grid';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Meter } from '../../shared/components/meter';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { TransactionList } from '../../shared/components/transaction-list';

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
    <sf-page-header [title]="vm.i18n.t('nav.dashboard')" [description]="vm.i18n.t('dashboard.description')" />

    @if (vm.res.error() && !vm.data()) {
      <sf-empty [error]="true" [title]="vm.i18n.t('errors.load')" />
    }

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <sf-kpi [label]="vm.i18n.t('common.income')" [value]="vm.data()?.kpis?.income?.value ?? null" [previous]="vm.data()?.kpis?.income?.previous ?? null" [spark]="vm.data()?.kpis?.income?.spark ?? null" accent="var(--money-income)" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('common.expenses')" [value]="vm.data()?.kpis?.expense?.value ?? null" [previous]="vm.data()?.kpis?.expense?.previous ?? null" [spark]="vm.data()?.kpis?.expense?.spark ?? null" accent="var(--money-expense)" [upIsGood]="false" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('common.net')" [value]="vm.data()?.kpis?.net?.value ?? null" [previous]="vm.data()?.kpis?.net?.previous ?? null" [spark]="vm.data()?.kpis?.net?.spark ?? null" accent="var(--money-net)" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('common.savingsRate')" format="pct" [value]="vm.data()?.kpis?.savingsRate?.value ?? null" [previous]="vm.data()?.kpis?.savingsRate?.previous ?? null" [spark]="vm.data()?.kpis?.savingsRate?.spark ?? null" accent="var(--money-savings)" [loading]="vm.res.initialLoading()" />
      <sf-kpi class="col-span-2 lg:col-span-1" [label]="vm.i18n.t('common.netWorth')" [value]="vm.data()?.kpis?.netWorth?.value ?? null" [previous]="vm.data()?.kpis?.netWorth?.previous ?? null" [spark]="vm.data()?.kpis?.netWorth?.spark ?? null" accent="var(--money-revenue)" [loading]="vm.res.initialLoading()" />
    </section>

    <section class="grid gap-4 xl:grid-cols-3">
      <sf-chart-card class="xl:col-span-2" [title]="vm.i18n.t('dashboard.incomeVsExpense')" [subtitle]="vm.i18n.t('dashboard.last12')" [table]="vm.monthsTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="income-vs-expenses">
        @if (vm.incomeOptions(); as o) {
          <sf-chart [options]="o" height="18rem" (chartClick)="vm.openMonth($event.dataIndex)" />
        }
      </sf-chart-card>
      <sf-chart-card [title]="vm.i18n.t('dashboard.topCategories')" [table]="vm.catTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="top-categories">
        @if (vm.slices().length) {
          <sf-chart [options]="vm.donut()!" height="13rem" (chartClick)="vm.openCategory($event.dataIndex)" />
          <ul class="mt-2 space-y-1 px-2 text-sm">
            @for (s of vm.slices(); track s.id; let i = $index) {
              <li>
                <button type="button" class="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-muted" (click)="vm.openCategory(i)">
                  <span class="size-2.5 shrink-0 rounded-sm" [style.background]="s.color"></span>
                  <span class="flex-1 truncate">{{ s.name }}</span>
                  <sf-money class="text-xs text-muted-foreground" [value]="s.value" />
                </button>
              </li>
            }
          </ul>
        } @else if (!vm.res.initialLoading()) {
          <sf-empty [title]="vm.i18n.t('common.noData')" />
        }
      </sf-chart-card>
    </section>

    <section class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <sf-chart-card [title]="vm.i18n.t('common.netWorth')" [subtitle]="vm.i18n.t('dashboard.last12')" [table]="vm.nwTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="net-worth">
        @if (vm.nwOptions(); as o) {
          <sf-chart [options]="o" height="14rem" />
        }
      </sf-chart-card>

      <section class="flex flex-col rounded-xl border border-border bg-card p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="card-title">{{ 'nav.budgets' | transloco }}</h2>
          <a hlmBtn variant="link" size="xs" routerLink="/analysis/budgets" queryParamsHandling="preserve">{{ 'common.viewAll' | transloco }}</a>
        </div>
        <ul class="flex flex-col gap-3">
          @for (b of vm.data()?.budgets ?? []; track b.id) {
            <li>
              <button type="button" class="w-full text-left" (click)="vm.detail.open(b.name, { type: 'withdrawal', budget: b.id })">
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
          @for (b of vm.data()?.upcomingBills ?? []; track b.id + b.date) {
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
          <h2 class="card-title capitalize">{{ vm.calendarMonth() | fdate: 'month' }}</h2>
          <a hlmBtn variant="link" size="xs" routerLink="/reports/calendar" queryParamsHandling="preserve">{{ 'common.viewAll' | transloco }}</a>
        </div>
        @if (vm.data(); as data) {
          <sf-calendar-grid [days]="data.calendar" [compact]="true" (dayClick)="vm.openDay($event)" />
        }
      </section>
      <section class="rounded-xl border border-border bg-card p-4">
        <h2 class="card-title mb-1">{{ 'dashboard.largest' | transloco }}</h2>
        <sf-transaction-list [rows]="vm.data()?.largest ?? []" />
      </section>
    </section>
  `,
})
export class Dashboard {
  protected readonly vm = dashboardViewModel();
}
