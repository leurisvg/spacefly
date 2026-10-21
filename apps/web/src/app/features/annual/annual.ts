import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { annualViewModel } from '@spacefly/client/features/reports/annual.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { KpiCard } from '../../shared/components/kpi-card';
import { PageHeader } from '../../shared/components/page-header';

@Component({
  selector: 'sf-annual',
  imports: [TranslocoPipe, Chart, ChartCard, KpiCard, PageHeader, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t('annual.title', { year: vm.year() })" [description]="vm.i18n.t('annual.description')" />

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <sf-kpi [label]="vm.i18n.t('annual.avgIncome')" [value]="vm.r()?.averages?.income ?? null" accent="var(--money-income)" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('annual.avgExpense')" [value]="vm.r()?.averages?.expense ?? null" accent="var(--money-expense)" [loading]="vm.res.initialLoading()" />
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="eyebrow">{{ 'annual.best' | transloco }}</div>
        @if (vm.r()?.best; as b) {
          <div class="mt-2 text-lg font-semibold capitalize">{{ b.month | fdate: 'month' }}</div>
          <div class="num text-sm text-positive">{{ b.net | money: null : true }}</div>
        }
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="eyebrow">{{ 'annual.worst' | transloco }}</div>
        @if (vm.r()?.worst; as w) {
          <div class="mt-2 text-lg font-semibold capitalize">{{ w.month | fdate: 'month' }}</div>
          <div class="num text-sm" [class.text-negative]="w.net < 0">{{ w.net | money: null : true }}</div>
        }
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-3">
      <sf-chart-card class="xl:col-span-2" [title]="vm.i18n.t('annual.byMonth')" [table]="vm.monthTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="annual-by-month">
        @if (vm.barOptions(); as o) {
          <sf-chart [options]="o" height="20rem" (chartClick)="vm.openMonth($event.dataIndex)" />
        }
      </sf-chart-card>
      <sf-chart-card [title]="vm.i18n.t('annual.savingsRate')" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="annual-savings-rate">
        @if (vm.rateOptions(); as o) {
          <sf-chart [options]="o" height="20rem" />
        }
      </sf-chart-card>
    </section>

    <sf-chart-card [title]="vm.i18n.t('annual.matrix')" [subtitle]="vm.i18n.t('annual.matrixHint')" [table]="vm.matrixTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="annual-categories">
      @if (vm.matrixOptions(); as o) {
        <sf-chart [options]="o" [height]="matrixHeight()" (chartClick)="vm.openCell($any($event.data)[0], $any($event.data)[1])" />
      }
    </sf-chart-card>
  `,
})
export class Annual {
  protected readonly vm = annualViewModel();
  protected readonly matrixHeight = computed(() => `${this.vm.matrixCount() * 2.2 + 5}rem`);
}
