import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { calendarViewModel } from '@spacefly/client/features/reports/calendar.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { BreakpointService } from '../../shared/charts/breakpoint';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { CalendarGrid } from '../../shared/components/calendar-grid';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { Select } from '../../shared/components/select';

@Component({
  selector: 'sf-calendar-page',
  imports: [TranslocoPipe, HlmToggleGroupImports, CalendarGrid, Chart, ChartCard, KpiCard, Money, PageHeader, Select, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t('nav.calendar')" [description]="vm.i18n.t('calendar.description')">
      <hlm-toggle-group type="single" variant="outline" size="sm" [value]="vm.view()" [nullable]="false" (valueChange)="$event && vm.setView($any($event))">
        <button hlmToggleGroupItem value="month">{{ 'calendar.month' | transloco }}</button>
        <button hlmToggleGroupItem value="year">{{ 'calendar.year' | transloco }}</button>
      </hlm-toggle-group>
    </sf-page-header>

    @if (vm.view() === 'month') {
      <div class="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <span class="mr-2 text-sm font-medium capitalize">{{ vm.month().start | fdate: 'month' }}</span>
        <sf-select class="w-44" [options]="vm.accountOptions()" [placeholder]="vm.i18n.t('calendar.allAccounts')" [label]="vm.i18n.t('common.account')" [value]="vm.account()" (valueChange)="vm.setFilter('account', $event)" />
        <sf-select class="w-44" [options]="vm.categoryOptions()" [placeholder]="vm.i18n.t('calendar.allCategories')" [label]="vm.i18n.t('common.category')" [value]="vm.category()" (valueChange)="vm.setFilter('category', $event)" />
        <sf-select class="w-40" [options]="vm.tagOptions()" [placeholder]="vm.i18n.t('calendar.allTags')" [label]="vm.i18n.t('common.tag')" [value]="vm.tag()" (valueChange)="vm.setFilter('tag', $event)" />
      </div>

      <section class="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <sf-kpi [label]="vm.i18n.t('common.income')" [value]="vm.cal.data()?.totals?.income ?? null" accent="var(--money-income)" [loading]="vm.cal.initialLoading()" />
        <sf-kpi [label]="vm.i18n.t('common.expenses')" [value]="vm.cal.data()?.totals?.expense ?? null" accent="var(--money-expense)" [loading]="vm.cal.initialLoading()" />
        <sf-kpi class="col-span-2 lg:col-span-1" [label]="vm.i18n.t('calendar.endBalance')" [value]="vm.endBalance()" accent="var(--money-net)" [loading]="vm.cal.initialLoading()" />
      </section>

      <section class="grid gap-4 xl:grid-cols-5">
        <sf-chart-card class="xl:col-span-3" [title]="vm.i18n.t('monthly.dailyCashFlow')" [subtitle]="vm.i18n.t('calendar.clickDay')" [exportable]="false" [table]="vm.dayTable()" [loading]="vm.cal.loading()" [initialLoading]="vm.cal.initialLoading()" skeletonHeight="28rem">
          @if (vm.cal.data(); as c) {
            <div class="px-2"><sf-calendar-grid [days]="c.days" [scheduled]="c.scheduled" (dayClick)="vm.openDay($event)" /></div>
          }
        </sf-chart-card>
        <div class="flex flex-col gap-4 xl:col-span-2">
          <sf-chart-card [title]="vm.i18n.t('calendar.runningBalance')" [loading]="vm.cal.loading()" [initialLoading]="vm.cal.initialLoading()" fileName="running-balance">
            @if (vm.balanceOptions(); as o) {
              <sf-chart [options]="o" height="14rem" />
            } @else {
              <p class="px-3 py-10 text-center text-sm text-muted-foreground">{{ 'calendar.noBalance' | transloco }}</p>
            }
          </sf-chart-card>
          <section class="rounded-xl border border-border bg-card p-4">
            <h2 class="card-title mb-2">{{ 'calendar.scheduled' | transloco }}</h2>
            <ul class="divide-y divide-border/70 text-sm">
              @for (s of vm.cal.data()?.scheduled ?? []; track s.kind + s.id + s.date) {
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
      <sf-chart-card [title]="vm.i18n.t('calendar.heatmapTitle', { year: vm.year() })" [subtitle]="vm.i18n.t('calendar.heatmapHint')" [table]="vm.yearTable()" [loading]="vm.yearRes.loading()" [initialLoading]="vm.yearRes.initialLoading()" fileName="spending-heatmap">
        @if (vm.heatmapOptions(); as o) {
          <sf-chart [options]="o" [height]="bp.mobile() ? '52rem' : '15rem'" (chartClick)="vm.openDay($any($event.data)[0])" />
        }
      </sf-chart-card>
    }
  `,
})
export class CalendarPage {
  protected readonly bp = inject(BreakpointService);
  protected readonly vm = calendarViewModel({ compactHeatmap: () => this.bp.mobile() });
}
