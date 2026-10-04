import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucidePlus } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import type { BudgetDetail, BudgetsReport } from '@spacefly/shared';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { reportResource } from '@spacefly/client/api/report-resource';
import { FormatService } from '@spacefly/client/format/format.service';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { I18n } from '@spacefly/client/i18n/i18n';
import { FiltersStore } from '@spacefly/client/state/filters.store';
import { rankingBarsOption } from '@spacefly/client/charts/builders';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import type { ChartTable } from '@spacefly/client/charts/chart-table';
import { tooltipRow, tooltipTitle } from '@spacefly/client/charts/chart-theme';
import { money } from '@spacefly/client/charts/series-colors';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Meter } from '../../shared/components/meter';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { TxDetailService } from '@spacefly/client/state/tx-detail.service';
import { EntityEditor } from '@spacefly/client/state/entity-editor.service';

@Component({
  selector: 'sf-budgets',
  imports: [NgIcon, TranslocoPipe, HlmBadge, HlmButton, Chart, ChartCard, EmptyState, KpiCard, Meter, Money, PageHeader, ...FORMAT_PIPES],
  providers: [provideIcons({ lucidePencil, lucidePlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.budgets')" [description]="i18n.t('budget.description')">
      <button hlmBtn size="sm" variant="outline" type="button" (click)="editor.open('budget')">
        <ng-icon name="lucidePlus" aria-hidden="true" />{{ 'editor.entity.budget.new' | transloco }}
      </button>
    </sf-page-header>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <sf-kpi [label]="i18n.t('budget.totalLimit')" [value]="totals().limit" accent="var(--money-budget)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('budget.spentInBudgets')" [value]="r()?.available?.spentInBudgets ?? totals().spent" accent="var(--money-expense)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('budget.unbudgeted')" [value]="r()?.unbudgeted ?? null" accent="var(--money-other)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('budget.available')" [value]="r()?.available?.amount ?? null" accent="var(--money-income)" [loading]="res.initialLoading()" />
    </section>

    @if (r(); as data) {
      @if (data.budgets.length) {
        <section class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          @for (b of data.budgets; track b.id) {
            <!-- The whole card selects the budget (stretched button); the pencil sits above it. -->
            <article
              class="relative flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary/50"
              [class.border-primary]="selected()?.id === b.id"
              [class.border-border]="selected()?.id !== b.id"
            >
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="flex-1 truncate text-left font-medium after:absolute after:inset-0 after:rounded-xl after:content-['']"
                  [attr.aria-pressed]="selected()?.id === b.id"
                  (click)="filters.setParams({ budget: b.id })"
                >
                  {{ b.name }}
                </button>
                @if (b.autoBudget.type) {
                  <span hlmBadge variant="outline" class="text-[10px]">{{ 'budget.auto.' + b.autoBudget.type | transloco }}</span>
                }
                <button
                  hlmBtn
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  class="relative z-10"
                  [attr.aria-label]="('editor.tx.edit' | transloco) + ': ' + b.name"
                  (click)="edit($event, b.id)"
                >
                  <ng-icon name="lucidePencil" aria-hidden="true" />
                </button>
              </div>
              <sf-meter [ratio]="b.pct" [marker]="data.elapsedRatio > 0 && data.elapsedRatio < 1 ? data.elapsedRatio : null" />
              <div class="grid grid-cols-3 gap-2 text-xs">
                <div><div class="text-muted-foreground">{{ 'budget.limit' | transloco }}</div><sf-money [value]="b.limit" /></div>
                <div><div class="text-muted-foreground">{{ 'budget.spent' | transloco }}</div><sf-money [value]="b.spent" /></div>
                <div><div class="text-muted-foreground">{{ 'budget.remaining' | transloco }}</div><sf-money [value]="b.remaining" tone="auto" /></div>
              </div>
              @if (b.projected !== null) {
                <p class="text-xs text-muted-foreground">
                  {{ 'budget.projection' | transloco }}
                  <span class="num font-medium" [class.text-negative]="b.limit > 0 && b.projected > b.limit" [class.text-foreground]="!(b.limit > 0 && b.projected > b.limit)">{{ b.projected | money }}</span>
                  @if (b.limit > 0 && b.projected > b.limit) {
                    · {{ 'budget.overBy' | transloco: { amount: (b.projected - b.limit | money) } }}
                  }
                </p>
              }
            </article>
          }
        </section>

        @if (selected(); as b) {
          <section class="grid gap-4 xl:grid-cols-2">
            <sf-chart-card [title]="i18n.t('budget.history', { name: b.name })" [table]="historyTable()" fileName="budget-history">
              <sf-chart [options]="historyOpts()!" height="18rem" />
            </sf-chart-card>
            <sf-chart-card [title]="i18n.t('budget.byCategory', { name: b.name })" [table]="categoryTable()" fileName="budget-categories">
              @if (b.categories.length) {
                <sf-chart [options]="categoryOpts()!" [height]="categoryHeight()" (chartClick)="openCategory($event.dataIndex)" />
              } @else {
                <sf-empty [title]="i18n.t('common.noData')" />
              }
            </sf-chart-card>
          </section>
        }
      } @else {
        <sf-empty [title]="i18n.t('budget.none')" />
      }
    }
  `,
})
export class Budgets {
  protected readonly i18n = inject(I18n);
  protected readonly filters = inject(FiltersStore);
  private readonly f = inject(FormatService);
  private readonly detail = inject(TxDetailService);
  protected readonly editor = inject(EntityEditor);
  protected readonly res = reportResource<BudgetsReport>('reports/budgets');
  protected readonly r = this.res.data;
  private readonly budgetParam = this.filters.param('budget');

  protected readonly totals = computed(() => {
    const b = this.r()?.budgets ?? [];
    return { limit: b.reduce((s, x) => s + x.limit, 0), spent: b.reduce((s, x) => s + x.spent, 0) };
  });

  protected readonly selected = computed<BudgetDetail | null>(() => {
    const list = this.r()?.budgets ?? [];
    return list.find((b) => b.id === this.budgetParam()) ?? list[0] ?? null;
  });

  protected readonly historyOpts = computed(() => {
    const b = this.selected();
    if (!b) return null;
    const h = b.history;
    const spentName = this.i18n.t('budget.spent');
    const limitName = this.i18n.t('budget.limit');
    return {
      grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
      legend: { top: 0, left: 0, data: [spentName, limitName] },
      tooltip: {
        trigger: 'axis',
        formatter: (p: { dataIndex: number }[]) => {
          const x = h[p[0].dataIndex];
          return (
            tooltipTitle(this.f.date(x.month, 'month')) +
            tooltipRow(money.expense(), spentName, this.f.money(x.spent)) +
            tooltipRow(money.ink2(), limitName, this.f.money(x.limit)) +
            (x.limit ? tooltipRow(money.ink2(), '%', this.f.pct(x.spent / x.limit, 0)) : '')
          );
        },
      },
      xAxis: { type: 'category', data: h.map((x) => this.f.monthLabel(x.month)) },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => this.f.compact(v) }, splitNumber: 4 },
      series: [
        {
          name: spentName,
          type: 'bar',
          data: h.map((x) => ({ value: x.spent, itemStyle: { color: x.limit && x.spent > x.limit ? money.expense() : money.budget() } })),
        },
        { name: limitName, type: 'line', step: 'middle', data: h.map((x) => x.limit), showSymbol: false, lineStyle: { color: money.ink2(), width: 2 }, itemStyle: { color: money.ink2() } },
      ],
    };
  });

  protected readonly historyTable = computed<ChartTable | null>(() => {
    const b = this.selected();
    return b
      ? {
          columns: [this.i18n.t('common.month'), this.i18n.t('budget.limit'), this.i18n.t('budget.spent'), '%'],
          rows: b.history.map((x) => [this.f.date(x.month, 'month'), this.f.money(x.limit), this.f.money(x.spent), x.limit ? this.f.pct(x.spent / x.limit, 0) : '—']),
          numeric: [1, 2, 3],
        }
      : null;
  });

  private readonly categoryRows = computed(() => (this.selected()?.categories ?? []).map((c) => ({ id: c.id, name: this.i18n.name(c.name, c.id), value: c.value })));
  protected readonly categoryOpts = computed(() => rankingBarsOption(this.f, this.categoryRows(), money.expense()));
  protected readonly categoryHeight = computed(() => `${Math.max(8, Math.min(this.categoryRows().length, 12) * 2 + 2)}rem`);
  protected readonly categoryTable = computed<ChartTable | null>(() =>
    this.categoryRows().length
      ? { columns: [this.i18n.t('common.category'), this.i18n.t('common.amount')], rows: this.categoryRows().map((c) => [c.name, this.f.money(c.value)]), numeric: [1] }
      : null,
  );

  protected edit(event: Event, id: string): void {
    event.stopPropagation();
    this.editor.open('budget', id);
  }

  protected openCategory(index: number): void {
    const b = this.selected();
    const c = this.categoryRows().slice(0, 12).reverse()[index];
    if (b && c) this.detail.open(`${b.name} · ${c.name}`, { type: 'withdrawal', budget: b.id, category: c.id ?? 'none' });
  }
}
