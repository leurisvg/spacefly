import { Component, computed, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { ActionBarComponent } from '@nativescript/angular';
import { calendarViewModel } from '@spacefly/client/features/reports/calendar.vm';
import { money } from '@spacefly/client/charts/series-colors';
import { FormatService } from '@spacefly/client/format/format.service';
import { ChartClick, ChartWebView } from '../ui/chart-webview';
import { CalendarGrid } from '../ui/calendar-grid';
import { DrillLauncher } from '../ui/drill-launcher';
import { KpiCard } from '../ui/kpi-card';
import { Money } from '../ui/money';
import { pickOne, type PickerOption } from '../ui/picker';
import { ScreenHeader } from '../ui/screen-header';
import { Segmented } from '../ui/segmented';

type Filter = 'account' | 'category' | 'tag';

/** The calendar: a native month grid of daily cash flow with its running balance and scheduled items, or the year as a spending heatmap. */
@Component({
  selector: 'ns-calendar',
  imports: [ActionBarComponent, CalendarGrid, ChartWebView, KpiCard, Money, ScreenHeader, Segmented],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="vm.i18n.t('nav.calendar')"></ActionBar>
    <ScrollView class="screen">
      <StackLayout>
        <ns-screen-header [error]="!!vm.cal.error() && !vm.cal.data()" />
        <StackLayout class="screen-pad">
          <ns-segmented [options]="views()" [value]="vm.view()" (valueChange)="vm.setView($any($event))" />

          @if (vm.view() === 'month') {
            <WrapLayout marginTop="4">
              <Label [text]="vm.account() ? nameOf('account') : vm.i18n.t('calendar.allAccounts')" class="chip" [class.chip-on]="!!vm.account()" (tap)="pick('account')"></Label>
              <Label [text]="vm.category() ? nameOf('category') : vm.i18n.t('calendar.allCategories')" class="chip" [class.chip-on]="!!vm.category()" (tap)="pick('category')"></Label>
              <Label [text]="vm.tag() ? nameOf('tag') : vm.i18n.t('calendar.allTags')" class="chip" [class.chip-on]="!!vm.tag()" (tap)="pick('tag')"></Label>
            </WrapLayout>

            <GridLayout columns="*, *, *" marginTop="8">
              <ns-kpi col="0" [label]="vm.i18n.t('common.income')" [value]="vm.cal.data()?.totals?.income ?? null" [accent]="money.income()" />
              <ns-kpi col="1" [label]="vm.i18n.t('common.expenses')" [value]="vm.cal.data()?.totals?.expense ?? null" [accent]="money.expense()" [upIsGood]="false" />
              <ns-kpi col="2" [label]="vm.i18n.t('calendar.endBalance')" [value]="vm.endBalance()" [accent]="money.net()" />
            </GridLayout>

            @if (vm.cal.initialLoading()) {
              <ActivityIndicator busy="true"></ActivityIndicator>
            }

            @if (vm.cal.data(); as c) {
              <StackLayout class="card">
                <Label [text]="f.date(vm.month().start, 'month')" class="card-title"></Label>
                <Label [text]="vm.i18n.t('calendar.clickDay')" class="muted small"></Label>
                <ns-calendar-grid [days]="c.days" [scheduled]="c.scheduled" (dayClick)="day($event)" />
              </StackLayout>

              <StackLayout class="card">
                <Label [text]="vm.i18n.t('calendar.runningBalance')" class="card-title"></Label>
                @if (vm.balanceOptions(); as o) {
                  <ns-chart [options]="o" [height]="200" />
                } @else {
                  <Label [text]="vm.i18n.t('calendar.noBalance')" class="muted"></Label>
                }
              </StackLayout>

              <StackLayout class="card">
                <Label [text]="vm.i18n.t('calendar.scheduled')" class="card-title"></Label>
                @for (s of c.scheduled; track s.kind + s.id + s.date) {
                  <GridLayout columns="auto, 60, *, auto" class="row-divider">
                    <Label col="0" text="●" [class]="s.kind === 'bill' ? 'cal-dot-bill' : 'cal-dot-recurrence'" marginRight="6"></Label>
                    <Label col="1" [text]="f.date(s.date, 'short')" class="muted small"></Label>
                    <Label col="2" [text]="s.name" textWrap="false"></Label>
                    <ns-money col="3" [value]="s.type === 'deposit' ? s.amount : -s.amount" [signed]="true" [tone]="s.type === 'deposit' ? 'income' : 'expense'" />
                  </GridLayout>
                } @empty {
                  <Label [text]="vm.i18n.t('calendar.noScheduled')" class="muted"></Label>
                }
              </StackLayout>
            }
          } @else {
            @if (vm.yearRes.initialLoading()) {
              <ActivityIndicator busy="true"></ActivityIndicator>
            }
            @if (vm.heatmapOptions(); as o) {
              <StackLayout class="card" marginTop="8">
                <Label [text]="vm.i18n.t('calendar.heatmapTitle', { year: vm.year() })" class="card-title"></Label>
                <Label [text]="vm.i18n.t('calendar.heatmapHint')" class="muted small" textWrap="true"></Label>
                <ns-chart [options]="o" [height]="820" (chartClick)="heatmapDay($any($event))" />
              </StackLayout>
            }
          }
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `,
})
export class Calendar {
  /** A phone shows the year heatmap vertically. */
  protected readonly vm = calendarViewModel({ compactHeatmap: () => true });
  protected readonly f = inject(FormatService);
  protected readonly money = money;
  private readonly drills = inject(DrillLauncher);

  protected readonly views = computed(() => [
    { value: 'month', label: this.vm.i18n.t('calendar.month') },
    { value: 'year', label: this.vm.i18n.t('calendar.year') },
  ]);

  private options(filter: Filter): readonly PickerOption[] {
    return filter === 'account' ? this.vm.accountOptions() : filter === 'category' ? this.vm.categoryOptions() : this.vm.tagOptions();
  }

  private current(filter: Filter): string {
    return filter === 'account' ? this.vm.account() : filter === 'category' ? this.vm.category() : this.vm.tag();
  }

  /** The name of the active filter's choice, for its chip. */
  protected nameOf(filter: Filter): string {
    const value = this.current(filter);
    return this.options(filter).find((o) => o.value === value)?.label ?? value;
  }

  protected async pick(filter: Filter): Promise<void> {
    const all = { value: '', label: this.vm.i18n.t(`calendar.all${filter === 'account' ? 'Accounts' : filter === 'category' ? 'Categories' : 'Tags'}`) };
    const picked = await pickOne(this.vm.i18n.t(`common.${filter}`), [all, ...this.options(filter)], this.vm.i18n.t('forms.cancel'));
    if (picked !== null) this.vm.setFilter(filter, picked);
  }

  protected day(date: string): void {
    this.vm.openDay(date);
    this.drills.show();
  }

  protected heatmapDay(click: ChartClick): void {
    this.vm.openHeatmapDay(click.dataIndex);
    this.drills.show();
  }
}
