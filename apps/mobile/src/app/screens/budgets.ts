import { Component, computed, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { budgetsViewModel } from '@spacefly/client/features/analysis/budgets.vm';
import { money } from '@spacefly/client/charts/series-colors';
import { budgetStatus } from '@spacefly/client/ui-logic/budget-status';
import { ChartClick, ChartWebView } from '../ui/chart-webview';
import { DrillLauncher } from '../ui/drill-launcher';
import { EmptyState } from '../ui/empty-state';
import { KpiCard } from '../ui/kpi-card';
import { Meter } from '../ui/meter';
import { Money } from '../ui/money';
import { ScreenHeader } from '../ui/screen-header';

/** Budgets: totals, each budget with its meter and status, and for the selected one its history and spending by category. */
@Component({
  selector: 'ns-budgets',
  imports: [ChartWebView, EmptyState, KpiCard, Meter, Money, ScreenHeader],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="vm.i18n.t('nav.budgets')"></ActionBar>
    <ScrollView class="screen">
      <StackLayout>
        <ns-screen-header [error]="!!vm.res.error() && !vm.r()" />
        <StackLayout class="screen-pad">
          <GridLayout columns="*, *" rows="auto, auto">
            <ns-kpi col="0" row="0" [label]="vm.i18n.t('budget.totalLimit')" [value]="vm.totals().limit" [accent]="money.budget()" />
            <ns-kpi col="1" row="0" [label]="vm.i18n.t('budget.spentInBudgets')" [value]="vm.r()?.available?.spentInBudgets ?? vm.totals().spent" [accent]="money.expense()" />
            <ns-kpi col="0" row="1" [label]="vm.i18n.t('budget.unbudgeted')" [value]="vm.r()?.unbudgeted ?? null" [accent]="money.other()" />
            <ns-kpi col="1" row="1" [label]="vm.i18n.t('budget.available')" [value]="vm.r()?.available?.amount ?? null" [accent]="money.income()" />
          </GridLayout>

          @if (vm.res.initialLoading()) {
            <ActivityIndicator busy="true"></ActivityIndicator>
          }

          @if (vm.r(); as data) {
            @for (b of data.budgets; track b.id) {
              <StackLayout class="card" [class.card-selected]="vm.selected()?.id === b.id" (tap)="vm.select(b.id)">
                <GridLayout columns="*, auto">
                  <Label col="0" [text]="b.name" class="card-title" textWrap="false"></Label>
                  <Label col="1" [text]="vm.i18n.t('budget.status.' + status(b.pct))" class="muted small"></Label>
                </GridLayout>
                <ns-meter [ratio]="b.pct" />
                <GridLayout columns="*, *, *" marginTop="6">
                  <StackLayout col="0"><Label [text]="vm.i18n.t('budget.limit')" class="eyebrow"></Label><ns-money [value]="b.limit" /></StackLayout>
                  <StackLayout col="1"><Label [text]="vm.i18n.t('budget.spent')" class="eyebrow"></Label><ns-money [value]="b.spent" /></StackLayout>
                  <StackLayout col="2"><Label [text]="vm.i18n.t('budget.remaining')" class="eyebrow"></Label><ns-money [value]="b.remaining" tone="auto" /></StackLayout>
                </GridLayout>
                @if (vm.selected()?.id === b.id) {
                  <GridLayout columns="*, auto" marginTop="8">
                    <Label col="0" [text]="vm.i18n.t('nav.explorer') + ' ›'" class="muted small" (tap)="open(b)"></Label>
                    <Label col="1" [text]="vm.i18n.t('editor.tx.edit')" class="chip" (tap)="edit(b.id)"></Label>
                  </GridLayout>
                }
              </StackLayout>
            } @empty {
              @if (!vm.res.initialLoading()) {
                <ns-empty [title]="vm.i18n.t('budget.none')" />
              }
            }

            @if (vm.selected(); as b) {
              @if (vm.historyOpts(); as o) {
                <StackLayout class="card">
                  <Label [text]="vm.i18n.t('budget.history', { name: b.name })" class="card-title" textWrap="true"></Label>
                  <ns-chart [options]="o" [height]="240" />
                </StackLayout>
              }
              @if (b.categories.length) {
                <StackLayout class="card">
                  <Label [text]="vm.i18n.t('budget.byCategory', { name: b.name })" class="card-title" textWrap="true"></Label>
                  <ns-chart [options]="vm.categoryOpts()" [height]="categoryHeight()" (chartClick)="category($any($event))" />
                </StackLayout>
              }
            }
          }
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `,
})
export class Budgets {
  protected readonly vm = budgetsViewModel();
  protected readonly money = money;
  private readonly drills = inject(DrillLauncher);
  private readonly router = inject(RouterExtensions);
  protected readonly status = budgetStatus;
  protected readonly categoryHeight = computed(() => Math.max(140, this.vm.categoryCount() * 32 + 16));

  protected category(click: ChartClick): void {
    this.vm.openCategory(click.dataIndex);
    this.drills.show();
  }

  protected edit(id: string): void {
    void this.router.navigate(['/edit/budget', id]);
  }

  protected open(b: { id: string; name: string }): void {
    this.vm.openBudget(b);
    this.drills.show();
  }
}
