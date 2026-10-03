import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { SankeyNode, SankeyReport } from '@shared';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { reportResource } from '../../core/api/report-resource';
import { FormatService } from '../../core/format/format.service';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { I18n } from '../../core/i18n/i18n';
import { FiltersStore } from '../../core/state/filters.store';
import { SANKEY_COLORS } from '../../shared/charts/builders';
import { ChartCard, type ChartTable } from '../../shared/charts/chart-card';
import { SankeyChart } from '../../shared/charts/sankey-chart';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { PageHeader } from '../../shared/components/page-header';
import { TxDetailService } from '../../shared/components/tx-detail.service';

@Component({
  selector: 'sf-flow',
  imports: [TranslocoPipe, HlmLabel, HlmSwitch, HlmToggleGroupImports, ChartCard, SankeyChart, EmptyState, KpiCard, PageHeader, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.flow')" [description]="i18n.t('flow.description')" />

    <!-- Filters: one row above the chart -->
    <div class="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-border bg-card px-4 py-3">
      <hlm-toggle-group type="single" variant="outline" size="sm" [value]="mode()" [nullable]="false" (valueChange)="$event && set('mode', $any($event))">
        <button hlmToggleGroupItem value="budget">{{ 'flow.byBudget' | transloco }}</button>
        <button hlmToggleGroupItem value="tags">{{ 'flow.byTags' | transloco }}</button>
      </hlm-toggle-group>
      @if (mode() === 'budget') {
        <label hlmLabel class="flex items-center gap-2 text-sm">
          <hlm-switch [checked]="budgets()" (checkedChange)="set('budgets', $event ? '1' : '0')" />
          {{ 'flow.showBudgets' | transloco }}
        </label>
      }
      <label hlmLabel class="flex items-center gap-2 text-sm">
        <hlm-switch [checked]="incomeCategories()" (checkedChange)="set('incomeCategories', $event ? '1' : '0')" />
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
          [value]="threshold()"
          (change)="set('threshold', $any($event.target).value)"
          [attr.aria-label]="'flow.groupSmall' | transloco"
        />
        <span class="num w-12 text-xs">{{ threshold() | pct: 1 : false : false }}</span>
      </label>
    </div>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <sf-kpi [label]="i18n.t('common.income')" [value]="r()?.totalIncome ?? null" accent="var(--money-income)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('common.expenses')" [value]="r()?.totalExpense ?? null" accent="var(--money-expense)" [loading]="res.initialLoading()" />
      <sf-kpi class="col-span-2 lg:col-span-1" [label]="i18n.t('sankey.' + (r()?.savingsLabel ?? 'savings'))" [value]="r()?.savings ?? null" accent="var(--money-savings)" [loading]="res.initialLoading()" />
    </section>

    <sf-chart-card [title]="i18n.t('flow.title')" [subtitle]="i18n.t('flow.hint')" [table]="table()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" skeletonHeight="32rem" fileName="money-flow">
      @if (r(); as report) {
        @if (report.links.length) {
          <sf-sankey-chart #chart [report]="report" (nodeClick)="open($event, chart)" />
          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-muted-foreground">
            @for (k of legend(); track k.key) {
              <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm" [style.background]="k.color"></span>{{ k.label }}</span>
            }
          </div>
        } @else {
          <sf-empty [title]="i18n.t('common.noData')" />
        }
      }
    </sf-chart-card>
  `,
})
export class Flow {
  protected readonly i18n = inject(I18n);
  private readonly f = inject(FormatService);
  private readonly filters = inject(FiltersStore);
  private readonly detail = inject(TxDetailService);

  private readonly modeParam = this.filters.param('mode');
  private readonly budgetsParam = this.filters.param('budgets');
  private readonly incomeParam = this.filters.param('incomeCategories');
  private readonly thresholdParam = this.filters.param('threshold');
  protected readonly mode = computed(() => (this.modeParam() === 'tags' ? 'tags' : 'budget'));
  protected readonly budgets = computed(() => this.budgetsParam() !== '0');
  protected readonly incomeCategories = computed(() => this.incomeParam() !== '0');
  protected readonly threshold = computed(() => Number(this.thresholdParam() ?? 0) || 0);

  protected readonly res = reportResource<SankeyReport>('reports/sankey', () => ({
    mode: this.mode(),
    budgets: this.budgets() ? '1' : '0',
    incomeCategories: this.incomeCategories() ? '1' : '0',
    ...(this.thresholdParam() !== null ? { threshold: this.threshold() } : {}),
  }));
  protected readonly r = this.res.data;

  protected readonly legend = computed(() => {
    const kinds = new Set(this.r()?.nodes.map((n) => n.kind) ?? []);
    return (['revenue', 'income_cat', 'hub', 'budget', 'tag', 'category', 'savings', 'deficit', 'other'] as const)
      .filter((k) => kinds.has(k))
      .map((k) => ({ key: k, color: SANKEY_COLORS[k](), label: this.i18n.t(`sankey.kinds.${k}`) }));
  });

  protected readonly table = computed<ChartTable | null>(() => {
    const r = this.r();
    if (!r) return null;
    const byId = new Map(r.nodes.map((n) => [n.id, n]));
    const name = (id: string) => {
      const n = byId.get(id)!;
      return n.labelKey ? this.i18n.t(n.labelKey) : n.label;
    };
    return {
      columns: [this.i18n.t('flow.from'), this.i18n.t('flow.to'), this.i18n.t('common.amount'), this.i18n.t('flow.shareOfIncome')],
      rows: r.links.map((l) => [name(l.source), name(l.target), this.f.money(l.value), this.f.pct(r.totalIncome ? l.value / r.totalIncome : null)]),
      numeric: [2, 3],
    };
  });

  protected set(key: string, value: string): void {
    this.filters.setParams({ [key]: value });
  }

  protected open(node: SankeyNode, chart: SankeyChart): void {
    this.detail.open(chart.label(node), node.filter ?? {});
  }
}
