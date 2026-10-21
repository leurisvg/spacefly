import { Component, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import type { CategoryRow } from '@spacefly/shared';
import { ActionBarComponent, RouterExtensions } from '@nativescript/angular';
import { monthlyViewModel } from '@spacefly/client/features/reports/monthly.vm';
import { FormatService } from '@spacefly/client/format/format.service';
import { money } from '@spacefly/client/charts/series-colors';
import { CalendarGrid } from '../ui/calendar-grid';
import { DrillLauncher } from '../ui/drill-launcher';
import { EmptyState } from '../ui/empty-state';
import { KpiCard } from '../ui/kpi-card';
import { Meter } from '../ui/meter';
import { Money } from '../ui/money';
import { ScreenHeader } from '../ui/screen-header';

/** The monthly summary: highlights, categories against the previous period, daily cash flow, budgets, top expenses, account activity and overview. */
@Component({
  selector: 'ns-monthly',
  imports: [ActionBarComponent, CalendarGrid, EmptyState, KpiCard, Meter, Money, ScreenHeader],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="vm.i18n.t('nav.monthly')"></ActionBar>
    <ScrollView class="screen">
      <StackLayout>
        <ns-screen-header [error]="!!vm.res.error() && !vm.d()" />
        <StackLayout class="screen-pad">
          <GridLayout columns="*, *" rows="auto, auto">
            <ns-kpi col="0" row="0" [label]="vm.i18n.t('monthly.earned')" [value]="vm.d()?.kpis?.earned ?? null" [accent]="money.income()" />
            <ns-kpi col="1" row="0" [label]="vm.i18n.t('monthly.spent')" [value]="vm.d()?.kpis?.spent ?? null" [accent]="money.expense()" [upIsGood]="false" />
            <ns-kpi col="0" row="1" [label]="vm.i18n.t('monthly.netChange')" [value]="vm.d()?.kpis?.net ?? null" [accent]="money.net()" />
            <ns-kpi col="1" row="1" [label]="vm.i18n.t('common.savingsRate')" format="pct" [value]="vm.d()?.kpis?.savingsRate ?? null" [accent]="money.savings()" />
          </GridLayout>

          @if (vm.res.initialLoading()) {
            <ActivityIndicator busy="true"></ActivityIndicator>
          }

          @if (vm.d(); as data) {
            <StackLayout class="card" marginTop="8">
              <Label [text]="vm.i18n.t('monthly.categories')" class="card-title"></Label>
              <Label [text]="vm.i18n.t('monthly.vsPrevious', { month: f.date(data.previousPeriod.start, 'month') })" class="muted small"></Label>
              @for (c of data.categories; track c.id ?? 'none') {
                @let ch = vm.change(c);
                <GridLayout columns="*, auto" rows="auto, auto" class="row-divider" (tap)="category(c)">
                  <Label col="0" row="0" [text]="vm.i18n.name(c.name, c.id)" textWrap="false"></Label>
                  <StackLayout col="0" row="1" class="category-bar" [width]="vm.relative(c) + '%'" horizontalAlignment="left"></StackLayout>
                  <ns-money col="1" row="0" [value]="c.total.value" tone="auto" [signed]="true" />
                  <Label col="1" row="1" [text]="ch.isNew ? vm.i18n.t('monthly.new') : (vm.hidden() ? '' : ch.up ? '↑' : '↓') + f.pct(ch.ratio)" [class]="ch.isNew || vm.hidden() ? 'muted small' : ch.up ? 'tone-positive small' : 'tone-negative small'" horizontalAlignment="right"></Label>
                </GridLayout>
              } @empty {
                <Label [text]="vm.i18n.t('common.noData')" class="muted"></Label>
              }
              @if (data.zeroCategories.length) {
                <Label [text]="data.zeroCategories.join(', ')" class="muted small" textWrap="true" marginTop="6"></Label>
              }
            </StackLayout>

            @if (vm.calendar.data(); as cal) {
              <StackLayout class="card">
                <Label [text]="vm.i18n.t('monthly.dailyCashFlow')" class="card-title"></Label>
                <ns-calendar-grid [days]="cal.days" [scheduled]="cal.scheduled" (dayClick)="day($event)" />
              </StackLayout>
            }

            <GridLayout columns="*, auto" class="card" (tap)="flow()">
              <Label col="0" [text]="vm.i18n.t('monthly.moneyFlow')" class="card-title"></Label>
              <Label col="1" [text]="vm.i18n.t('monthly.openInteractive') + ' ›'" class="muted small"></Label>
            </GridLayout>

            <StackLayout class="card">
              <Label [text]="vm.i18n.t('monthly.budgets')" class="card-title"></Label>
              @for (b of data.budgets; track b.id) {
                <StackLayout class="row-divider" (tap)="budget(b)">
                  <GridLayout columns="*, auto">
                    <Label col="0" [text]="b.name" textWrap="false"></Label>
                    <Label col="1" [text]="f.compact(b.spent.value) + ' / ' + f.compact(b.limit.value)" class="muted small"></Label>
                  </GridLayout>
                  @if (b.pct !== null) {
                    <ns-meter [ratio]="b.pct" marginTop="4" />
                  }
                </StackLayout>
              } @empty {
                <Label [text]="vm.i18n.t('budget.none')" class="muted"></Label>
              }
              @if (data.zeroBudgets.names.length) {
                <Label [text]="data.zeroBudgets.names.join(', ')" class="muted small" textWrap="true" marginTop="6"></Label>
              }
            </StackLayout>

            <StackLayout class="card">
              <Label [text]="vm.i18n.t('monthly.top5')" class="card-title"></Label>
              @for (t of data.topExpenses; track t.id) {
                <GridLayout columns="*, auto" class="row-divider" (tap)="open(t.groupId)">
                  <StackLayout col="0">
                    <Label [text]="t.description" textWrap="false"></Label>
                    <Label [text]="f.date(t.date, 'short')" class="muted small"></Label>
                  </StackLayout>
                  <ns-money col="1" [value]="-t.amount" tone="expense" />
                </GridLayout>
              } @empty {
                <Label [text]="vm.i18n.t('common.noData')" class="muted"></Label>
              }
            </StackLayout>

            <StackLayout class="card">
              <Label [text]="vm.i18n.t('monthly.assetActivity')" class="card-title"></Label>
              @for (a of data.assets; track a.id) {
                <StackLayout class="row-divider" (tap)="vm.toggleAsset(a.id)">
                  <GridLayout columns="*, auto" rows="auto, auto">
                    <Label col="0" row="0" [text]="(vm.expanded().has(a.id) ? '▾ ' : '▸ ') + a.name" textWrap="false"></Label>
                    <ns-money col="1" row="0" [value]="a.net" tone="auto" />
                    <Label col="0" row="1" colSpan="2" [text]="vm.i18n.t('common.income') + ' ' + f.compact(a.income) + ' · ' + vm.i18n.t('common.expenses') + ' ' + f.compact(a.expense)" class="muted small"></Label>
                  </GridLayout>
                  @if (vm.expanded().has(a.id)) {
                    @if (a.topIncome.length) {
                      <Label [text]="vm.i18n.t('monthly.topIncome')" class="eyebrow" marginTop="6"></Label>
                      @for (t of a.topIncome; track t.id) {
                        <GridLayout columns="*, auto" (tap)="open(t.groupId)">
                          <Label col="0" [text]="t.description" textWrap="false" class="small"></Label>
                          <ns-money col="1" [value]="t.amount" tone="income" />
                        </GridLayout>
                      }
                    }
                    @if (a.topExpenses.length) {
                      <Label [text]="vm.i18n.t('monthly.topExpenses')" class="eyebrow" marginTop="6"></Label>
                      @for (t of a.topExpenses; track t.id) {
                        <GridLayout columns="*, auto" (tap)="open(t.groupId)">
                          <Label col="0" [text]="t.description" textWrap="false" class="small"></Label>
                          <ns-money col="1" [value]="-t.amount" tone="expense" />
                        </GridLayout>
                      }
                    }
                  }
                </StackLayout>
              }
            </StackLayout>

            <StackLayout class="card">
              <Label [text]="vm.i18n.t('monthly.overview')" class="card-title"></Label>
              @for (block of [{ key: 'monthly.thisPeriod', v: data.overview.month }, { key: 'monthly.ytd', v: data.overview.ytd }]; track block.key) {
                <Label [text]="vm.i18n.t(block.key)" class="eyebrow" marginTop="6"></Label>
                <GridLayout columns="*, *, *">
                  <StackLayout col="0"><Label [text]="vm.i18n.t('monthly.earned')" class="muted small"></Label><ns-money [value]="block.v.earned.value" tone="income" /></StackLayout>
                  <StackLayout col="1"><Label [text]="vm.i18n.t('monthly.spent')" class="muted small"></Label><ns-money [value]="block.v.spent.value" tone="expense" /></StackLayout>
                  <StackLayout col="2"><Label [text]="vm.i18n.t('common.net')" class="muted small"></Label><ns-money [value]="block.v.net.value" tone="auto" /></StackLayout>
                </GridLayout>
              }
              <Label [text]="vm.i18n.t('monthly.currentNetWorth')" class="eyebrow" marginTop="10"></Label>
              <ns-money [value]="data.overview.netWorth.value" tone="auto" />
            </StackLayout>
          }
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `,
})
export class Monthly {
  /** The phone shows the daily calendar but not the Sankey (that is the Flow screen). */
  protected readonly vm = monthlyViewModel({ calendar: true });
  protected readonly f = inject(FormatService);
  protected readonly money = money;
  private readonly drills = inject(DrillLauncher);
  private readonly router = inject(RouterExtensions);

  protected category(c: CategoryRow): void {
    this.vm.openCategory(c);
    this.drills.show();
  }

  protected budget(b: { id: string; name: string }): void {
    this.vm.openBudget(b);
    this.drills.show();
  }

  protected day(date: string): void {
    this.vm.openDay(date);
    this.drills.show();
  }

  protected flow(): void {
    void this.router.navigate(['/reports/flow']);
  }

  protected open(groupId: string): void {
    void this.router.navigate(['/transactions', groupId]);
  }
}
