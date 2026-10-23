import { ChangeDetectionStrategy, Component } from '@angular/core';
import { netWorthViewModel } from '@spacefly/client/features/accounts/net-worth.vm';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { KpiCard } from '../../shared/components/kpi-card';
import { PageHeader } from '../../shared/components/page-header';
import { MonthsPicker } from './months-picker';

@Component({
  selector: 'sf-net-worth',
  imports: [Chart, ChartCard, KpiCard, PageHeader, MonthsPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t('nav.netWorth')" [description]="vm.i18n.t('netWorth.description')">
      <sf-months-picker [value]="vm.months()" (changed)="vm.setMonths($event)" />
    </sf-page-header>
    <section class="grid grid-cols-2 gap-3">
      <sf-kpi [label]="vm.i18n.t('netWorth.current')" [value]="vm.r()?.current ?? null" [previous]="vm.first()" [spark]="vm.r()?.total ?? null" accent="var(--money-revenue)" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('netWorth.change', { n: vm.r()?.months?.length ?? vm.months() })" [value]="vm.r()?.change?.abs ?? null" accent="var(--money-net)" [loading]="vm.res.initialLoading()" />
    </section>
    <sf-chart-card [title]="vm.i18n.t('netWorth.total')" [table]="vm.table()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="net-worth">
      @if (vm.totalOpts(); as o) {
        <sf-chart [options]="o" height="18rem" />
      }
    </sf-chart-card>
    <sf-chart-card [title]="vm.i18n.t('netWorth.byAccount')" [subtitle]="vm.i18n.t('netWorth.stackedHint')" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="net-worth-by-account">
      @if (vm.stackOpts(); as o) {
        <sf-chart [options]="o" height="24rem" />
      }
    </sf-chart-card>
  `,
})
export class NetWorth {
  protected readonly vm = netWorthViewModel();
}
