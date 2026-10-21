import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { flowViewModel } from '@spacefly/client/features/reports/flow.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { ChartCard } from '../../shared/charts/chart-card';
import { SankeyChart } from '../../shared/charts/sankey-chart';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { PageHeader } from '../../shared/components/page-header';

@Component({
  selector: 'sf-flow',
  imports: [TranslocoPipe, HlmLabel, HlmSwitch, HlmToggleGroupImports, ChartCard, SankeyChart, EmptyState, KpiCard, PageHeader, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t('nav.flow')" [description]="vm.i18n.t('flow.description')" />

    <!-- Filters: one row above the chart -->
    <div class="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-border bg-card px-4 py-3">
      <hlm-toggle-group type="single" variant="outline" size="sm" [value]="vm.mode()" [nullable]="false" (valueChange)="$event && vm.set('mode', $any($event))">
        <button hlmToggleGroupItem value="budget">{{ 'flow.byBudget' | transloco }}</button>
        <button hlmToggleGroupItem value="tags">{{ 'flow.byTags' | transloco }}</button>
      </hlm-toggle-group>
      @if (vm.mode() === 'budget') {
        <label hlmLabel class="flex items-center gap-2 text-sm">
          <hlm-switch [checked]="vm.budgets()" (checkedChange)="vm.set('budgets', $event ? '1' : '0')" />
          {{ 'flow.showBudgets' | transloco }}
        </label>
      }
      <label hlmLabel class="flex items-center gap-2 text-sm">
        <hlm-switch [checked]="vm.incomeCategories()" (checkedChange)="vm.set('incomeCategories', $event ? '1' : '0')" />
        {{ 'flow.showIncomeCategories' | transloco }}
      </label>
      <label class="flex items-center gap-2 text-sm">
        <span class="text-muted-foreground">{{ 'flow.groupSmall' | transloco }}</span>
        <input
          type="range"
          min="0"
          max="0.1"
          step="0.005"
          class="w-28 accent-[var(--primary)]"
          [value]="vm.threshold()"
          (change)="vm.set('threshold', $any($event.target).value)"
          [attr.aria-label]="'flow.groupSmall' | transloco"
        />
        <span class="num w-12 text-xs">{{ vm.threshold() | pct: 1 : false : false }}</span>
      </label>
    </div>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <sf-kpi [label]="vm.i18n.t('common.income')" [value]="vm.r()?.totalIncome ?? null" accent="var(--money-income)" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('common.expenses')" [value]="vm.r()?.totalExpense ?? null" accent="var(--money-expense)" [loading]="vm.res.initialLoading()" />
      <sf-kpi class="col-span-2 lg:col-span-1" [label]="vm.i18n.t('sankey.' + (vm.r()?.savingsLabel ?? 'savings'))" [value]="vm.r()?.savings ?? null" accent="var(--money-savings)" [loading]="vm.res.initialLoading()" />
    </section>

    <sf-chart-card [title]="vm.i18n.t('flow.title')" [subtitle]="vm.i18n.t('flow.hint')" [table]="vm.table()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" skeletonHeight="32rem" fileName="money-flow">
      @if (vm.r(); as report) {
        @if (report.links.length) {
          <sf-sankey-chart [report]="report" (nodeClick)="vm.open($event)" />
          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-muted-foreground">
            @for (k of vm.legend(); track k.key) {
              <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm" [style.background]="k.color"></span>{{ k.label }}</span>
            }
          </div>
        } @else {
          <sf-empty [title]="vm.i18n.t('common.noData')" />
        }
      }
    </sf-chart-card>
  `,
})
export class Flow {
  protected readonly vm = flowViewModel();
}
