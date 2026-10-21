import { Component, computed, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { ActionBarComponent } from '@nativescript/angular';
import { COMPARE_MODES, compareViewModel, isImprovement } from '@spacefly/client/features/reports/compare.vm';
import { FormatService } from '@spacefly/client/format/format.service';
import { ChartClick, ChartWebView } from '../ui/chart-webview';
import { DrillLauncher } from '../ui/drill-launcher';
import { EmptyState } from '../ui/empty-state';
import { Money } from '../ui/money';
import { pickOne } from '../ui/picker';
import { ScreenHeader } from '../ui/screen-header';
import { Segmented } from '../ui/segmented';

/** Compare period A (the period bar) with a period B, grouped by category, tag, budget, account or merchant. */
@Component({
  selector: 'ns-compare',
  imports: [ActionBarComponent, ChartWebView, EmptyState, Money, ScreenHeader, Segmented],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="vm.i18n.t('nav.compare')"></ActionBar>
    <ScrollView class="screen">
      <StackLayout>
        <ns-screen-header [error]="!!vm.res.error() && !vm.r()" />
        <StackLayout class="screen-pad">
          <ns-segmented [options]="modes()" [value]="vm.mode()" (valueChange)="vm.setMode($any($event))" />
          @if (vm.mode() === 'custom') {
            <GridLayout columns="auto, *, *" marginTop="4">
              <Label col="0" text="B:" class="muted" verticalAlignment="center" marginRight="6"></Label>
              <TextField col="1" class="field" hint="YYYY-MM-DD" [text]="vm.b().start" [accessibilityLabel]="vm.i18n.t('period.from')" (textChange)="vm.setB('bStart', $any($event).value)"></TextField>
              <TextField col="2" class="field" hint="YYYY-MM-DD" [text]="vm.b().end" [accessibilityLabel]="vm.i18n.t('period.to')" marginLeft="6" (textChange)="vm.setB('bEnd', $any($event).value)"></TextField>
            </GridLayout>
          }
          <WrapLayout marginTop="4">
            <Label [text]="vm.i18n.t('compare.groupBy') + ': ' + vm.i18n.t('compare.groups.' + vm.groupBy())" class="chip chip-on" (tap)="pickGroup()"></Label>
          </WrapLayout>
          <ns-segmented [options]="kinds()" [value]="vm.kind()" (valueChange)="vm.setKind($any($event))" />

          @if (vm.r(); as data) {
            <GridLayout columns="*, *" marginTop="8">
              <StackLayout col="0" class="card">
                <Label text="A" class="eyebrow"></Label>
                <Label [text]="f.date(data.a.start, 'short') + ' – ' + f.date(data.a.end, 'short')" class="muted small" textWrap="true"></Label>
                <ns-money [value]="data.a.income" tone="income" />
                <ns-money [value]="-data.a.expense" tone="expense" />
              </StackLayout>
              <StackLayout col="1" class="card">
                <Label text="B" class="eyebrow"></Label>
                <Label [text]="f.date(data.b.start, 'short') + ' – ' + f.date(data.b.end, 'short')" class="muted small" textWrap="true"></Label>
                <ns-money [value]="data.b.income" tone="income" />
                <ns-money [value]="-data.b.expense" tone="expense" />
              </StackLayout>
            </GridLayout>
          }

          @if (vm.res.initialLoading()) {
            <ActivityIndicator busy="true"></ActivityIndicator>
          }

          @if (vm.rows().length) {
            <StackLayout class="card">
              <Label [text]="vm.i18n.t('compare.deltaTitle')" class="card-title"></Label>
              <Label [text]="vm.i18n.t(vm.kind() === 'expense' ? 'compare.deltaHintExpense' : 'compare.deltaHintIncome')" class="muted small" textWrap="true"></Label>
              <ns-chart [options]="vm.divergingOpts()" [height]="chartHeight()" (chartClick)="bar($any($event))" />
            </StackLayout>
          } @else if (!vm.res.initialLoading()) {
            <ns-empty [title]="vm.i18n.t('common.noData')" />
          }

          @if (vm.trendOpts(); as o) {
            <StackLayout class="card">
              <Label [text]="vm.i18n.t('compare.trend')" class="card-title"></Label>
              <Label [text]="vm.i18n.t('dashboard.last12')" class="muted small"></Label>
              <ns-chart [options]="o" [height]="240" />
            </StackLayout>
          }

          @if (vm.rows().length) {
            <StackLayout class="card">
              @for (row of vm.rows(); track row.id ?? 'none'; let i = $index) {
                <GridLayout columns="*, auto" rows="auto, auto" class="row-divider" (tap)="open(i)">
                  <Label col="0" row="0" [text]="vm.name(row)" textWrap="false"></Label>
                  <Label col="0" row="1" [text]="'A ' + f.compact(row.a) + ' · B ' + f.compact(row.b)" class="muted small" textWrap="false"></Label>
                  <ns-money col="1" row="0" [value]="row.delta" [signed]="true" [tone]="row.delta === 0 ? 'none' : improved(row.delta) ? 'income' : 'expense'" />
                  <Label col="1" row="1" [text]="row.pct === null ? vm.i18n.t('monthly.new') : f.pct(row.pct, 1, true)" class="muted small" horizontalAlignment="right"></Label>
                </GridLayout>
              }
            </StackLayout>
          }
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `,
})
export class Compare {
  protected readonly vm = compareViewModel();
  protected readonly f = inject(FormatService);
  private readonly drills = inject(DrillLauncher);

  protected readonly modes = computed(() => COMPARE_MODES.map((m) => ({ value: m, label: this.vm.i18n.t(`compare.${m}`) })));
  protected readonly kinds = computed(() => [
    { value: 'expense', label: this.vm.i18n.t('common.expenses') },
    { value: 'income', label: this.vm.i18n.t('common.income') },
  ]);
  protected readonly chartHeight = computed(() => Math.max(200, this.vm.barCount() * 30 + 30));

  protected improved(delta: number): boolean {
    return isImprovement(delta, this.vm.kind());
  }

  protected async pickGroup(): Promise<void> {
    const picked = await pickOne(this.vm.i18n.t('compare.groupBy'), this.vm.groupOptions(), this.vm.i18n.t('forms.cancel'));
    if (picked !== null) this.vm.setGroupBy(picked);
  }

  protected bar(click: ChartClick): void {
    this.vm.openRow(click.dataIndex);
    this.drills.show();
  }

  protected open(index: number): void {
    this.vm.openRow(index, true);
    this.drills.show();
  }
}
