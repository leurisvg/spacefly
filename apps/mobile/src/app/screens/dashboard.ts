import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { inject } from '@angular/core';
import { dashboardViewModel } from '@spacefly/client/features/dashboard/dashboard.vm';
import { FormatService } from '@spacefly/client/format/format.service';
import { ChartClick, ChartWebView } from '../ui/chart-webview';
import { EmptyState } from '../ui/empty-state';
import { KpiCard } from '../ui/kpi-card';
import { Meter } from '../ui/meter';
import { Money } from '../ui/money';

/** The dashboard tab: KPIs, income vs expenses, top categories, net worth, budgets, upcoming bills and the largest transactions. */
@Component({
  selector: 'ns-dashboard',
  imports: [ChartWebView, EmptyState, KpiCard, Meter, Money],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ScrollView>
      <StackLayout class="screen-pad">
        @if (vm.res.error() && !vm.data()) {
          <ns-empty [error]="true" [title]="vm.i18n.t('errors.load')" />
        }

        <GridLayout columns="*, *" rows="auto, auto, auto">
          <ns-kpi col="0" row="0" [label]="vm.i18n.t('common.income')" [value]="vm.data()?.kpis?.income?.value ?? null" [previous]="vm.data()?.kpis?.income?.previous ?? null" accent="#199e70" />
          <ns-kpi col="1" row="0" [label]="vm.i18n.t('common.expenses')" [value]="vm.data()?.kpis?.expense?.value ?? null" [previous]="vm.data()?.kpis?.expense?.previous ?? null" [upIsGood]="false" accent="#e66767" />
          <ns-kpi col="0" row="1" [label]="vm.i18n.t('common.net')" [value]="vm.data()?.kpis?.net?.value ?? null" [previous]="vm.data()?.kpis?.net?.previous ?? null" accent="#3987e5" />
          <ns-kpi col="1" row="1" [label]="vm.i18n.t('common.savingsRate')" format="pct" [value]="vm.data()?.kpis?.savingsRate?.value ?? null" [previous]="vm.data()?.kpis?.savingsRate?.previous ?? null" accent="#008300" />
          <ns-kpi col="0" row="2" colSpan="2" [label]="vm.i18n.t('common.netWorth')" [value]="vm.data()?.kpis?.netWorth?.value ?? null" [previous]="vm.data()?.kpis?.netWorth?.previous ?? null" accent="#9085e9" />
        </GridLayout>

        @if (vm.incomeOptions(); as o) {
          <StackLayout class="card" marginTop="8">
            <Label [text]="vm.i18n.t('dashboard.incomeVsExpense')" class="card-title"></Label>
            <Label [text]="vm.i18n.t('dashboard.last12')" class="muted small"></Label>
            <ns-chart [options]="o" [height]="240" (chartClick)="month($any($event))" />
          </StackLayout>
        }

        @if (vm.slices().length) {
          <StackLayout class="card">
            <Label [text]="vm.i18n.t('dashboard.topCategories')" class="card-title"></Label>
            <ns-chart [options]="vm.donut()!" [height]="200" (chartClick)="category($any($event))" />
            @for (s of vm.slices(); track s.id; let i = $index) {
              <GridLayout columns="auto, *, auto" class="row-divider" (tap)="openCategory(i)">
                <Label col="0" text="●" [style.color]="s.color" marginRight="8"></Label>
                <Label col="1" [text]="s.name" textWrap="false"></Label>
                <ns-money col="2" [value]="s.value" />
              </GridLayout>
            }
          </StackLayout>
        }

        @if (vm.nwOptions(); as o) {
          <StackLayout class="card">
            <Label [text]="vm.i18n.t('common.netWorth')" class="card-title"></Label>
            <ns-chart [options]="o" [height]="200" />
          </StackLayout>
        }

        <StackLayout class="card">
          <Label [text]="vm.i18n.t('nav.budgets')" class="card-title"></Label>
          @for (b of vm.data()?.budgets ?? []; track b.id) {
            <StackLayout class="row-divider" (tap)="drill(b.name, { type: 'withdrawal', budget: b.id })">
              <GridLayout columns="*, auto">
                <Label col="0" [text]="b.name" textWrap="false"></Label>
                <Label col="1" [text]="f.compact(b.spent.value) + ' / ' + f.compact(b.limit.value)" class="muted small"></Label>
              </GridLayout>
              <ns-meter [ratio]="b.pct" marginTop="4" />
            </StackLayout>
          } @empty {
            <Label [text]="vm.i18n.t('budget.none')" class="muted"></Label>
          }
        </StackLayout>

        <StackLayout class="card">
          <Label [text]="vm.i18n.t('dashboard.upcomingBills')" class="card-title"></Label>
          @for (b of vm.data()?.upcomingBills ?? []; track b.id + b.date) {
            <GridLayout columns="60, *, auto" class="row-divider">
              <Label col="0" [text]="f.date(b.date, 'short')" class="muted small"></Label>
              <Label col="1" [text]="b.name" textWrap="false"></Label>
              <ns-money col="2" [value]="b.amount" />
            </GridLayout>
          } @empty {
            <Label [text]="vm.i18n.t('dashboard.noUpcoming')" class="muted"></Label>
          }
        </StackLayout>

        <StackLayout class="card">
          <Label [text]="vm.i18n.t('dashboard.largest')" class="card-title"></Label>
          @for (t of vm.data()?.largest ?? []; track t.id) {
            <GridLayout columns="*, auto" class="row-divider" (tap)="open(t.groupId)">
              <StackLayout col="0">
                <Label [text]="t.description" textWrap="false"></Label>
                <Label [text]="f.date(t.date, 'short')" class="muted small"></Label>
              </StackLayout>
              <ns-money col="1" [value]="t.type === 'withdrawal' ? -t.amount : t.amount" [tone]="t.type === 'withdrawal' ? 'expense' : t.type === 'deposit' ? 'income' : 'none'" />
            </GridLayout>
          }
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `,
})
export class Dashboard {
  protected readonly vm = dashboardViewModel();
  protected readonly f = inject(FormatService);
  private readonly router = inject(RouterExtensions);

  protected month(click: ChartClick): void {
    this.vm.openMonth(click.dataIndex);
    this.toDrill();
  }

  protected category(click: ChartClick): void {
    this.openCategory(click.dataIndex);
  }

  protected openCategory(index: number): void {
    this.vm.openCategory(index);
    this.toDrill();
  }

  protected drill(title: string, filter: Record<string, string>): void {
    this.vm.detail.open(title, filter);
    this.toDrill();
  }

  protected open(groupId: string): void {
    void this.router.navigate(['/transactions', groupId]);
  }

  private toDrill(): void {
    if (this.vm.detail.request()) void this.router.navigate(['/drill']);
  }
}
