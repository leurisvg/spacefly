import { Component, computed, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { ActionBarComponent } from '@nativescript/angular';
import { annualViewModel } from '@spacefly/client/features/reports/annual.vm';
import { money } from '@spacefly/client/charts/series-colors';
import { FormatService } from '@spacefly/client/format/format.service';
import { ChartClick, ChartWebView } from '../ui/chart-webview';
import { DrillLauncher } from '../ui/drill-launcher';
import { KpiCard } from '../ui/kpi-card';
import { Money } from '../ui/money';
import { ScreenHeader } from '../ui/screen-header';

/** The annual report: income and expenses per month, savings rate, best and worst month and the category × month matrix. */
@Component({
  selector: 'ns-annual',
  imports: [ActionBarComponent, ChartWebView, KpiCard, Money, ScreenHeader],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="vm.i18n.t('annual.title', { year: vm.year() })"></ActionBar>
    <ScrollView class="screen">
      <StackLayout>
        <ns-screen-header [error]="!!vm.res.error() && !vm.r()" />
        <StackLayout class="screen-pad">
          <GridLayout columns="*, *" rows="auto, auto">
            <ns-kpi col="0" row="0" [label]="vm.i18n.t('annual.avgIncome')" [value]="vm.r()?.averages?.income ?? null" [accent]="money.income()" />
            <ns-kpi col="1" row="0" [label]="vm.i18n.t('annual.avgExpense')" [value]="vm.r()?.averages?.expense ?? null" [accent]="money.expense()" [upIsGood]="false" />
            <StackLayout col="0" row="1" class="card">
              <Label [text]="vm.i18n.t('annual.best')" class="eyebrow"></Label>
              @if (vm.r()?.best; as b) {
                <Label [text]="f.date(b.month, 'month')" class="card-title"></Label>
                <ns-money [value]="b.net" tone="auto" [signed]="true" />
              }
            </StackLayout>
            <StackLayout col="1" row="1" class="card">
              <Label [text]="vm.i18n.t('annual.worst')" class="eyebrow"></Label>
              @if (vm.r()?.worst; as w) {
                <Label [text]="f.date(w.month, 'month')" class="card-title"></Label>
                <ns-money [value]="w.net" tone="auto" [signed]="true" />
              }
            </StackLayout>
          </GridLayout>

          @if (vm.res.initialLoading()) {
            <ActivityIndicator busy="true"></ActivityIndicator>
          }

          @if (vm.barOptions(); as o) {
            <StackLayout class="card" marginTop="8">
              <Label [text]="vm.i18n.t('annual.byMonth')" class="card-title"></Label>
              <ns-chart [options]="o" [height]="260" (chartClick)="month($any($event))" />
            </StackLayout>
          }

          @if (vm.rateOptions(); as o) {
            <StackLayout class="card">
              <Label [text]="vm.i18n.t('annual.savingsRate')" class="card-title"></Label>
              <ns-chart [options]="o" [height]="220" />
            </StackLayout>
          }

          @if (vm.matrixOptions(); as o) {
            <StackLayout class="card">
              <Label [text]="vm.i18n.t('annual.matrix')" class="card-title"></Label>
              <Label [text]="vm.i18n.t('annual.matrixHint')" class="muted small" textWrap="true"></Label>
              <ns-chart [options]="o" [height]="matrixHeight()" (chartClick)="cell($any($event))" />
            </StackLayout>
          }
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `,
})
export class Annual {
  /** Ten categories fit a phone; the rest are in the web matrix. */
  protected readonly vm = annualViewModel({ matrixLimit: 10 });
  protected readonly f = inject(FormatService);
  protected readonly money = money;
  private readonly drills = inject(DrillLauncher);
  protected readonly matrixHeight = computed(() => this.vm.matrixCount() * 28 + 90);

  protected month(click: ChartClick): void {
    this.vm.openMonth(click.dataIndex);
    this.drills.show();
  }

  protected cell(click: ChartClick): void {
    this.vm.openCellAt(click.dataIndex);
    this.drills.show();
  }
}
