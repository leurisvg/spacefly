import { Component, computed, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { FLOW_THRESHOLDS, flowViewModel } from '@spacefly/client/features/reports/flow.vm';
import { sankeyOption } from '@spacefly/client/charts/builders';
import { money } from '@spacefly/client/charts/series-colors';
import { FormatService } from '@spacefly/client/format/format.service';
import { ChartClick, ChartWebView } from '../ui/chart-webview';
import { DrillLauncher } from '../ui/drill-launcher';
import { EmptyState } from '../ui/empty-state';
import { KpiCard } from '../ui/kpi-card';
import { pickOne } from '../ui/picker';
import { ScreenHeader } from '../ui/screen-header';
import { Segmented } from '../ui/segmented';

/** Money flow: the vertical Sankey of income → budgets / tags / categories → savings, with the same options as the web. */
@Component({
  selector: 'ns-flow',
  imports: [ChartWebView, EmptyState, KpiCard, ScreenHeader, Segmented],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="vm.i18n.t('nav.flow')"></ActionBar>
    <ScrollView class="screen">
      <StackLayout>
        <ns-screen-header [error]="!!vm.res.error() && !vm.r()" />
        <StackLayout class="screen-pad">
          <ns-segmented [options]="modes()" [value]="vm.mode()" (valueChange)="vm.set('mode', $event)" />
          <WrapLayout marginTop="4">
            @if (vm.mode() === 'budget') {
              <Label [text]="vm.i18n.t('flow.showBudgets')" class="chip" [class.chip-on]="vm.budgets()" (tap)="vm.set('budgets', vm.budgets() ? '0' : '1')"></Label>
            }
            <Label [text]="vm.i18n.t('flow.showIncomeCategories')" class="chip" [class.chip-on]="vm.incomeCategories()" (tap)="vm.set('incomeCategories', vm.incomeCategories() ? '0' : '1')"></Label>
            <Label [text]="vm.i18n.t('flow.groupSmall') + ': ' + f.pct(vm.threshold(), 1, false, { mask: false })" class="chip" (tap)="pickThreshold()"></Label>
          </WrapLayout>

          <GridLayout columns="*, *, *" marginTop="8">
            <ns-kpi col="0" [label]="vm.i18n.t('common.income')" [value]="vm.r()?.totalIncome ?? null" [accent]="money.income()" />
            <ns-kpi col="1" [label]="vm.i18n.t('common.expenses')" [value]="vm.r()?.totalExpense ?? null" [accent]="money.expense()" [upIsGood]="false" />
            <ns-kpi col="2" [label]="vm.i18n.t('sankey.' + (vm.r()?.savingsLabel ?? 'savings'))" [value]="vm.r()?.savings ?? null" [accent]="money.savings()" />
          </GridLayout>

          @if (vm.res.initialLoading()) {
            <ActivityIndicator busy="true"></ActivityIndicator>
          }

          @if (vm.r(); as report) {
            @if (report.links.length) {
              <StackLayout class="card">
                <Label [text]="vm.i18n.t('flow.title')" class="card-title"></Label>
                <Label [text]="vm.i18n.t('flow.hint')" class="muted small" textWrap="true"></Label>
                <ns-chart [options]="options()!" [height]="chartHeight()" (chartClick)="node($any($event))" />
                <WrapLayout marginTop="6">
                  @for (k of vm.legend(); track k.key) {
                    <Label [text]="'● ' + k.label" [style.color]="k.color" class="small" marginRight="10"></Label>
                  }
                </WrapLayout>
              </StackLayout>
            } @else if (!vm.res.initialLoading()) {
              <ns-empty [title]="vm.i18n.t('common.noData')" />
            }
          }
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `,
})
export class Flow {
  protected readonly vm = flowViewModel();
  protected readonly f = inject(FormatService);
  protected readonly money = money;
  private readonly drills = inject(DrillLauncher);

  protected readonly modes = computed(() => [
    { value: 'budget', label: this.vm.i18n.t('flow.byBudget') },
    { value: 'tags', label: this.vm.i18n.t('flow.byTags') },
  ]);

  protected readonly options = computed(() => {
    const report = this.vm.r();
    return report?.links.length ? sankeyOption(this.f, report, this.vm.label, true) : null;
  });

  protected readonly chartHeight = computed(() => Math.max(420, (this.vm.r()?.nodes.length ?? 0) * 26));

  protected async pickThreshold(): Promise<void> {
    const options = FLOW_THRESHOLDS.map((t) => ({ value: String(t), label: this.f.pct(t, 1, false, { mask: false }) }));
    const picked = await pickOne(this.vm.i18n.t('flow.groupSmall'), options, this.vm.i18n.t('forms.cancel'));
    if (picked !== null) this.vm.set('threshold', picked);
  }

  protected node(click: ChartClick): void {
    this.vm.openNodeById(click.name);
    this.drills.show();
  }
}
