import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucidePlus } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { budgetsViewModel } from '@spacefly/client/features/analysis/budgets.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Meter } from '../../shared/components/meter';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';

@Component({
  selector: 'sf-budgets',
  imports: [NgIcon, TranslocoPipe, HlmBadge, HlmButton, Chart, ChartCard, EmptyState, KpiCard, Meter, Money, PageHeader, ...FORMAT_PIPES],
  providers: [provideIcons({ lucidePencil, lucidePlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t('nav.budgets')" [description]="vm.i18n.t('budget.description')">
      <button hlmBtn size="sm" variant="outline" type="button" (click)="vm.editor.open('budget')">
        <ng-icon name="lucidePlus" aria-hidden="true" />{{ 'editor.entity.budget.new' | transloco }}
      </button>
    </sf-page-header>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <sf-kpi [label]="vm.i18n.t('budget.totalLimit')" [value]="vm.totals().limit" accent="var(--money-budget)" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('budget.spentInBudgets')" [value]="vm.r()?.available?.spentInBudgets ?? vm.totals().spent" accent="var(--money-expense)" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('budget.unbudgeted')" [value]="vm.r()?.unbudgeted ?? null" accent="var(--money-other)" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('budget.available')" [value]="vm.r()?.available?.amount ?? null" accent="var(--money-income)" [loading]="vm.res.initialLoading()" />
    </section>

    @if (vm.r(); as data) {
      @if (data.budgets.length) {
        <section class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          @for (b of data.budgets; track b.id) {
            <!-- The whole card selects the budget (stretched button); the pencil sits above it. -->
            <article
              class="relative flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary/50"
              [class.border-primary]="vm.selected()?.id === b.id"
              [class.border-border]="vm.selected()?.id !== b.id"
            >
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="flex-1 truncate text-left font-medium after:absolute after:inset-0 after:rounded-xl after:content-['']"
                  [attr.aria-pressed]="vm.selected()?.id === b.id"
                  (click)="vm.select(b.id)"
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

        @if (vm.selected(); as b) {
          <section class="grid gap-4 xl:grid-cols-2">
            <sf-chart-card [title]="vm.i18n.t('budget.history', { name: b.name })" [table]="vm.historyTable()" fileName="budget-history">
              <sf-chart [options]="vm.historyOpts()!" height="18rem" />
            </sf-chart-card>
            <sf-chart-card [title]="vm.i18n.t('budget.byCategory', { name: b.name })" [table]="vm.categoryTable()" fileName="budget-categories">
              @if (b.categories.length) {
                <sf-chart [options]="vm.categoryOpts()!" [height]="categoryHeight()" (chartClick)="vm.openCategory($event.dataIndex)" />
              } @else {
                <sf-empty [title]="vm.i18n.t('common.noData')" />
              }
            </sf-chart-card>
          </section>
        }
      } @else {
        <sf-empty [title]="vm.i18n.t('budget.none')" />
      }
    }
  `,
})
export class Budgets {
  protected readonly vm = budgetsViewModel();
  protected readonly categoryHeight = computed(() => `${Math.max(8, this.vm.categoryCount() * 2 + 2)}rem`);

  protected edit(event: Event, id: string): void {
    event.stopPropagation();
    this.vm.editor.open('budget', id);
  }
}
