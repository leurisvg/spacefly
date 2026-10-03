import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CalendarReport, CategoryRow, MonthlyReport, SankeyNode, SankeyReport } from '@shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { reportResource } from '../../core/api/report-resource';
import { FormatService } from '../../core/format/format.service';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { I18n } from '../../core/i18n/i18n';
import { SankeyChart } from '../../shared/charts/sankey-chart';
import { SavingsMultiples } from '../../shared/charts/savings-multiples';
import { CalendarGrid } from '../../shared/components/calendar-grid';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Meter } from '../../shared/components/meter';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { TransactionList } from '../../shared/components/transaction-list';
import { TxDetailService } from '../../shared/components/tx-detail.service';
import { Section } from '../../shared/components/section';

/** The email report, interactive: same sections, same order, any period. */
@Component({
  selector: 'sf-monthly',
  imports: [
    RouterLink,
    NgIcon,
    TranslocoPipe,
    HlmButton,
    KpiCard,
    Meter,
    Money,
    PageHeader,
    Section,
    EmptyState,
    SankeyChart,
    CalendarGrid,
    SavingsMultiples,
    TransactionList,
    ...FORMAT_PIPES,
  ],
  providers: [provideIcons({ lucideChevronRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.monthly')" [description]="i18n.t('monthly.description')" />
    @if (res.error() && !d()) {
      <sf-empty [error]="true" [title]="i18n.t('errors.load')" />
    }

    <!-- Highlights -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <sf-kpi [label]="i18n.t('monthly.earned')" [value]="d()?.kpis?.earned ?? null" accent="var(--money-income)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('monthly.spent')" [value]="d()?.kpis?.spent ?? null" accent="var(--money-expense)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('monthly.netChange')" [value]="d()?.kpis?.net ?? null" accent="var(--money-net)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('common.savingsRate')" format="pct" [value]="d()?.kpis?.savingsRate ?? null" accent="var(--money-savings)" [loading]="res.initialLoading()" />
    </section>

    <!-- Category summary -->
    <sf-section [title]="i18n.t('monthly.categories')" [loading]="res.initialLoading()">
      @if (d(); as data) {
        <div class="overflow-x-auto">
          <table class="w-full min-w-[34rem] text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="eyebrow py-2 text-left">{{ 'common.category' | transloco }}</th>
                <th class="eyebrow py-2 text-right">{{ 'common.total' | transloco }}</th>
                <th class="eyebrow py-2 text-right">{{ 'monthly.vsPrevious' | transloco: { month: (data.previousPeriod.start | fdate: 'month') } }}</th>
              </tr>
            </thead>
            <tbody>
              @for (c of data.categories; track c.id) {
                <tr class="cursor-pointer border-b border-border/60 hover:bg-muted/40" (click)="openCategory(c)">
                  <td class="py-2 pr-3">
                    <div class="font-medium">{{ i18n.name(c.name, c.id) }}</div>
                    <div class="mt-1 h-[3px] rounded-full bg-primary/35" [style.width.%]="relative(c)"></div>
                  </td>
                  <td class="py-2 text-right"><sf-money [value]="c.total.value" [parts]="c.total.parts" tone="auto" [signed]="true" /></td>
                  <td class="py-2 pl-3 text-right text-xs">
                    @if (c.previous === 0) {
                      <span class="text-muted-foreground">—</span><br /><span class="text-positive">{{ 'monthly.new' | transloco }}</span>
                    } @else {
                      <sf-money [value]="c.previous" tone="auto" class="text-muted-foreground" /><br />
                      <span [class]="hidden() ? 'text-muted-foreground' : c.total.value - c.previous > 0 ? 'text-positive' : 'text-negative'" class="num">
                        {{ c.total.value - c.previous | money: null : true }}
                        {{ hidden() ? '' : c.total.value - c.previous > 0 ? '↑' : '↓' }}{{ abs((c.total.value - c.previous) / c.previous) | pct: 1 }}
                      </span>
                    }
                  </td>
                </tr>
              }
              @if (data.zeroCategories.length) {
                <tr>
                  <td colspan="2" class="py-2 text-xs italic text-muted-foreground">{{ data.zeroCategories.join(', ') }}</td>
                  <td class="py-2 text-right text-xs italic text-muted-foreground num">{{ 0 | money }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </sf-section>

    <!-- Money flow + daily cash flow -->
    <section class="grid gap-4 xl:grid-cols-5">
      <sf-section class="xl:col-span-3" [title]="i18n.t('monthly.moneyFlow')" [loading]="sankey.initialLoading()">
        <a section-actions hlmBtn variant="link" size="xs" routerLink="/reports/flow" queryParamsHandling="preserve">{{ 'monthly.openInteractive' | transloco }}</a>
        @if (sankey.data(); as s) {
          @if (s.links.length) {
            <sf-sankey-chart [report]="s" (nodeClick)="openNode($event)" />
          } @else {
            <sf-empty [title]="i18n.t('common.noData')" />
          }
        }
      </sf-section>
      <sf-section class="xl:col-span-2" [title]="i18n.t('monthly.dailyCashFlow')" [loading]="calendar.initialLoading()">
        @if (calendar.data(); as c) {
          <sf-calendar-grid [days]="c.days" [scheduled]="c.scheduled" (dayClick)="openDay($event)" />
        }
      </sf-section>
    </section>

    <!-- Budgets -->
    <sf-section [title]="i18n.t('monthly.budgets')" [loading]="res.initialLoading()">
      @if (d(); as data) {
        @if (data.budgets.length || data.zeroBudgets.names.length) {
          <div class="overflow-x-auto">
            <table class="w-full min-w-[34rem] text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th class="eyebrow py-2 text-left">{{ 'common.budget' | transloco }}</th>
                  <th class="eyebrow py-2 text-right">{{ 'budget.limit' | transloco }}</th>
                  <th class="eyebrow py-2 text-right">{{ 'budget.spent' | transloco }}</th>
                  <th class="eyebrow py-2 text-right">{{ 'budget.remaining' | transloco }}</th>
                </tr>
              </thead>
              <tbody>
                @for (b of data.budgets; track b.id) {
                  <tr class="cursor-pointer border-b border-border/60 hover:bg-muted/40" (click)="detail.open(b.name, { type: 'withdrawal', budget: b.id })">
                    <td class="py-2 pr-4">
                      <div class="font-medium">{{ b.name }}</div>
                      @if (b.pct !== null) {
                        <sf-meter class="mt-1.5 max-w-xs" [ratio]="b.pct" />
                      }
                    </td>
                    <td class="py-2 text-right align-top"><sf-money [value]="b.limit.value" [parts]="b.limit.parts" /></td>
                    <td class="py-2 text-right align-top"><sf-money [value]="b.spent.value" [parts]="b.spent.parts" tone="expense" /></td>
                    <td class="py-2 text-right align-top"><sf-money [value]="b.remaining" tone="auto" /></td>
                  </tr>
                }
                @if (data.zeroBudgets.names.length) {
                  <tr class="text-xs italic text-muted-foreground">
                    <td class="py-2">{{ data.zeroBudgets.names.join(', ') }}</td>
                    <td class="py-2 text-right num">{{ data.zeroBudgets.limit | money }}</td>
                    <td class="py-2 text-right num">{{ 0 | money }}</td>
                    <td class="py-2 text-right num">{{ data.zeroBudgets.limit | money }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <sf-empty [title]="i18n.t('budget.none')" />
        }
      }
    </sf-section>

    <section class="grid gap-4 xl:grid-cols-2">
      <!-- Top 5 -->
      <sf-section [title]="i18n.t('monthly.top5')" [loading]="res.initialLoading()">
        <sf-transaction-list [rows]="d()?.topExpenses ?? []" />
      </sf-section>

      <!-- Asset account activity -->
      <sf-section [title]="i18n.t('monthly.assetActivity')" [loading]="res.initialLoading()">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[30rem] text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="eyebrow py-2 text-left">{{ 'common.account' | transloco }}</th>
                <th class="eyebrow py-2 text-right">{{ 'common.income' | transloco }}</th>
                <th class="eyebrow py-2 text-right">{{ 'common.expenses' | transloco }}</th>
                <th class="eyebrow py-2 text-right">{{ 'common.net' | transloco }}</th>
              </tr>
            </thead>
            <tbody>
              @for (a of d()?.assets ?? []; track a.id) {
                <tr class="cursor-pointer border-b border-border/60 hover:bg-muted/40" (click)="toggleAsset(a.id)" [attr.aria-expanded]="expanded().has(a.id)">
                  <td class="py-2">
                    <span class="inline-flex items-center gap-1">
                      <ng-icon name="lucideChevronRight" class="text-muted-foreground transition-transform" [class.rotate-90]="expanded().has(a.id)" />
                      {{ a.name }}
                    </span>
                  </td>
                  <td class="py-2 text-right"><sf-money [value]="a.income" tone="income" [signed]="true" /></td>
                  <td class="py-2 text-right"><sf-money [value]="-a.expense" tone="expense" [signed]="true" /></td>
                  <td class="py-2 text-right"><sf-money [value]="a.net" tone="auto" /></td>
                </tr>
                @if (expanded().has(a.id)) {
                  <tr class="border-b border-border/60 bg-background/40">
                    <td colspan="4" class="px-3 py-2">
                      @if (a.topIncome.length) {
                        <div class="eyebrow mt-1">{{ 'monthly.topIncome' | transloco }}</div>
                        <sf-transaction-list [rows]="a.topIncome" />
                      }
                      @if (a.topExpenses.length) {
                        <div class="eyebrow mt-2">{{ 'monthly.topExpenses' | transloco }}</div>
                        <sf-transaction-list [rows]="a.topExpenses" />
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </sf-section>
    </section>

    <!-- Savings accounts -->
    <sf-section [title]="i18n.t('monthly.savings', { n: d()?.savings?.months?.length ?? 6 })" [loading]="res.initialLoading()">
      @if (d()?.savings; as s) {
        @if (s.accounts.length) {
          <sf-savings-multiples [series]="s" />
        } @else {
          <sf-empty [title]="i18n.t('common.noData')" />
        }
      }
    </sf-section>

    <!-- Financial overview -->
    <sf-section [title]="i18n.t('monthly.overview')" [loading]="res.initialLoading()">
      @if (d()?.overview; as o) {
        <div class="grid gap-4 lg:grid-cols-2">
          @for (block of [{ key: 'monthly.thisPeriod', v: o.month }, { key: 'monthly.ytd', v: o.ytd }]; track block.key) {
            <div>
              <div class="eyebrow mb-2">{{ block.key | transloco }}</div>
              <div class="grid grid-cols-3 gap-2">
                <div class="rounded-lg border-l-4 border-income bg-muted/40 p-3">
                  <div class="eyebrow">{{ 'monthly.earned' | transloco }}</div>
                  <sf-money class="mt-1 block text-base font-semibold" [value]="block.v.earned.value" [parts]="block.v.earned.parts" />
                </div>
                <div class="rounded-lg border-l-4 border-expense bg-muted/40 p-3">
                  <div class="eyebrow">{{ 'monthly.spent' | transloco }}</div>
                  <sf-money class="mt-1 block text-base font-semibold" [value]="block.v.spent.value" [parts]="block.v.spent.parts" />
                </div>
                <div class="rounded-lg border-l-4 bg-muted/40 p-3" [class.border-income]="block.v.net.value >= 0" [class.border-expense]="block.v.net.value < 0">
                  <div class="eyebrow">{{ 'common.net' | transloco }}</div>
                  <sf-money class="mt-1 block text-base font-semibold" [value]="block.v.net.value" [parts]="block.v.net.parts" />
                </div>
              </div>
            </div>
          }
        </div>
        <div class="mt-4 rounded-lg border-l-4 bg-muted/40 p-4" [class.border-income]="o.netWorth.value >= 0" [class.border-expense]="o.netWorth.value < 0">
          <div class="eyebrow">{{ 'monthly.currentNetWorth' | transloco }}</div>
          <sf-money class="mt-1 block text-2xl font-semibold" [value]="o.netWorth.value" tone="auto" />
        </div>
      }
    </sf-section>
  `,
})
export class Monthly {
  protected readonly i18n = inject(I18n);
  protected readonly detail = inject(TxDetailService);
  private readonly f = inject(FormatService);
  protected readonly hidden = this.f.hidden;
  protected readonly res = reportResource<MonthlyReport>('reports/monthly');
  protected readonly sankey = reportResource<SankeyReport>('reports/sankey');
  protected readonly calendar = reportResource<CalendarReport>('reports/calendar');
  protected readonly d = this.res.data;
  protected readonly expanded = signal(new Set<string>());
  protected readonly abs = Math.abs;

  private readonly maxAbs = computed(() => Math.max(1, ...(this.d()?.categories ?? []).map((c) => Math.abs(c.total.value))));

  protected relative(c: CategoryRow): number {
    return (Math.abs(c.total.value) / this.maxAbs()) * 100;
  }

  protected toggleAsset(id: string): void {
    const next = new Set(this.expanded());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.expanded.set(next);
  }

  protected openCategory(c: CategoryRow): void {
    this.detail.open(this.i18n.name(c.name, c.id), { category: c.id ?? 'none' });
  }

  protected openNode(n: SankeyNode): void {
    this.detail.open(n.labelKey ? this.i18n.t(n.labelKey) : n.label, n.filter ?? {});
  }

  protected openDay(date: string): void {
    this.detail.open(this.f.date(date, 'full'), { start: date, end: date });
  }
}
