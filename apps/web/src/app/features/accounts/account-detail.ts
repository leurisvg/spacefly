import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideChevronLeft, lucideChevronRight, lucidePencil } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { accountDetailViewModel } from '@spacefly/client/features/accounts/account-detail.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { BreadcrumbLeaf } from '../../layout/breadcrumb-leaf';
import { DualMoney } from '../../shared/components/dual-money';
import { CalendarGrid } from '../../shared/components/calendar-grid';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';

/** One asset account: balance and flows per day, monthly trend, rankings and every record with its running balance. */
@Component({
  selector: 'sf-account-detail',
  imports: [NgIcon, RouterLink, TranslocoPipe, HlmBadge, HlmButton, HlmToggleGroupImports, CalendarGrid, Chart, ChartCard, DualMoney, EmptyState, KpiCard, Money, PageHeader, ...FORMAT_PIPES],
  providers: [provideIcons({ lucideArrowLeft, lucideChevronLeft, lucideChevronRight, lucidePencil })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <button hlmBtn variant="ghost" size="sm" type="button" class="-ml-2 self-start" (click)="vm.goBack()">
      <ng-icon name="lucideArrowLeft" aria-hidden="true" />{{ 'accounts.detail.back' | transloco }}
    </button>

    @if (vm.res.error() && !vm.res.loading()) {
      <sf-empty [error]="true" [title]="vm.i18n.t('accounts.detail.notFound')" [description]="vm.i18n.t('accounts.detail.notFoundHint')" />
    } @else {
      <sf-page-header [title]="vm.r()?.account?.name ?? '…'" [description]="vm.subtitle()">
        @if (vm.r(); as d) {
          <button hlmBtn size="sm" variant="outline" type="button" (click)="vm.editor.open('account', d.account.id)">
            <ng-icon name="lucidePencil" aria-hidden="true" />{{ 'editor.tx.edit' | transloco }}
          </button>
        }
      </sf-page-header>

      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <sf-kpi class="col-span-2 lg:col-span-1" [label]="vm.i18n.t('accounts.detail.closing')" [value]="vm.foreign() ? (vm.r()?.balanceOriginal ?? null) : (vm.r()?.closing ?? null)" [previous]="vm.foreign() ? (vm.r()?.openingOriginal ?? null) : (vm.r()?.opening ?? null)" [currency]="vm.own()" [note]="vm.approx(vm.r()?.closing)" [spark]="vm.r()?.months?.map(vm.balanceOf) ?? null" accent="var(--money-net)" [loading]="vm.res.initialLoading()" />
        <sf-kpi [label]="vm.i18n.t('common.income')" [value]="vm.foreign() ? (vm.r()?.totalsOriginal?.income ?? null) : (vm.r()?.totals?.income ?? null)" [currency]="vm.own()" [note]="vm.approx(vm.r()?.totals?.income)" accent="var(--money-income)" [loading]="vm.res.initialLoading()" />
        <sf-kpi [label]="vm.i18n.t('common.expenses')" [value]="vm.foreign() ? (vm.r()?.totalsOriginal?.expense ?? null) : (vm.r()?.totals?.expense ?? null)" [currency]="vm.own()" [note]="vm.approx(vm.r()?.totals?.expense)" accent="var(--money-expense)" [loading]="vm.res.initialLoading()" />
        <sf-kpi [label]="vm.i18n.t('accounts.detail.change')" [value]="vm.foreign() ? (vm.r()?.changeOriginal ?? null) : (vm.r()?.change?.abs ?? null)" [currency]="vm.own()" [note]="vm.approx(vm.r()?.change?.abs)" accent="var(--money-net)" [loading]="vm.res.initialLoading()" />
      </section>

      @if (vm.r(); as d) {
        @if (vm.stats(); as s) {
          <section class="rounded-xl border border-border bg-card p-4">
            <h2 class="card-title mb-3">{{ 'accounts.detail.stats' | transloco }}</h2>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:gap-x-6 md:grid-cols-4">
              <div>
                <dt class="eyebrow">{{ 'accounts.detail.opening' | transloco }}</dt>
                <dd class="mt-0.5"><sf-dual-money align="start" [original]="d.openingOriginal" [converted]="d.opening" [currency]="d.account.currency" /></dd>
              </div>
              <div>
                <dt class="eyebrow">{{ 'accounts.balanceOriginal' | transloco }}</dt>
                <dd class="mt-0.5"><sf-money [value]="d.balanceOriginal" [currency]="d.account.currency" /></dd>
              </div>
              @if (s.lowest; as low) {
                <div>
                  <dt class="eyebrow">{{ 'accounts.detail.lowest' | transloco }}</dt>
                  <dd class="mt-0.5 flex flex-wrap items-center"><sf-dual-money align="start" tone="auto" [original]="low.balanceOriginal" [converted]="low.balance" [currency]="d.account.currency" /><span class="mx-1.5 inline-block h-3 w-px bg-border align-middle" aria-hidden="true"></span><span class="text-xs text-muted-foreground">{{ low.date | fdate: 'short' }}</span></dd>
                </div>
              }
              @if (s.highest; as high) {
                <div>
                  <dt class="eyebrow">{{ 'accounts.detail.highest' | transloco }}</dt>
                  <dd class="mt-0.5 flex flex-wrap items-center"><sf-dual-money align="start" tone="auto" [original]="high.balanceOriginal" [converted]="high.balance" [currency]="d.account.currency" /><span class="mx-1.5 inline-block h-3 w-px bg-border align-middle" aria-hidden="true"></span><span class="text-xs text-muted-foreground">{{ high.date | fdate: 'short' }}</span></dd>
                </div>
              }
              <div>
                <dt class="eyebrow">{{ 'accounts.detail.avgDailyExpense' | transloco }}</dt>
                <dd class="mt-0.5"><sf-dual-money align="start" [original]="s.avgDailyExpenseOriginal" [converted]="s.avgDailyExpense" [currency]="d.account.currency" /></dd>
              </div>
              <div>
                <dt class="eyebrow">{{ 'accounts.detail.netTransfers' | transloco }}</dt>
                <dd class="mt-0.5"><sf-dual-money align="start" [signed]="true" [original]="d.totalsOriginal.transferIn - d.totalsOriginal.transferOut" [converted]="d.totals.transferIn - d.totals.transferOut" [currency]="d.account.currency" /></dd>
              </div>
              @if (s.biggestExpense; as tx) {
                <div class="min-w-0">
                  <dt class="eyebrow">{{ 'accounts.detail.biggestExpense' | transloco }}</dt>
                  <dd class="mt-0.5 flex min-w-0 items-center"><sf-dual-money class="shrink-0" align="start" tone="expense" [original]="-tx.amountOriginal" [converted]="-tx.amount" [currency]="d.account.currency" /><span class="mx-1.5 inline-block h-3 w-px bg-border align-middle" aria-hidden="true"></span><span class="truncate text-xs text-muted-foreground">{{ tx.description }}</span></dd>
                </div>
              }
              @if (s.biggestIncome; as tx) {
                <div class="min-w-0">
                  <dt class="eyebrow">{{ 'accounts.detail.biggestIncome' | transloco }}</dt>
                  <dd class="mt-0.5 flex min-w-0 items-center"><sf-dual-money class="shrink-0" align="start" tone="income" [original]="tx.amountOriginal" [converted]="tx.amount" [currency]="d.account.currency" /><span class="mx-1.5 inline-block h-3 w-px bg-border align-middle" aria-hidden="true"></span><span class="truncate text-xs text-muted-foreground">{{ tx.description }}</span></dd>
                </div>
              }
            </dl>
          </section>
        }
      }

      <sf-chart-card [title]="vm.i18n.t('accounts.detail.dailyBalance')" [subtitle]="vm.zoomHint()" [table]="vm.balanceTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="account-daily-balance">
        @if (vm.balanceOptions(); as o) {
          <sf-chart [options]="o" height="16rem" />
        }
      </sf-chart-card>

      <sf-chart-card [title]="vm.i18n.t('accounts.detail.dailyFlow')" [subtitle]="vm.i18n.t('calendar.clickDay')" [exportable]="false" [table]="vm.flowTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" skeletonHeight="18rem">
        <div class="flex flex-wrap justify-center gap-x-8 gap-y-5 px-2 pb-2 sm:justify-start">
          @for (m of vm.calendarMonths(); track m.month) {
            <section class="w-full max-w-[19rem]">
              <h3 class="mb-1.5 text-sm font-medium capitalize">{{ m.month | fdate: 'month' }}</h3>
              <sf-calendar-grid size="sm" [days]="m.days" [scale]="vm.calendarScale()" [currency]="vm.own()" (dayClick)="vm.openDay($event)" />
            </section>
          }
        </div>
      </sf-chart-card>

      <section class="grid gap-4 lg:grid-cols-2">
        <sf-chart-card [title]="vm.i18n.t('accounts.detail.monthly')" [table]="vm.monthlyTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="account-monthly">
          @if (vm.monthlyOptions(); as o) {
            <sf-chart [options]="o" height="16rem" />
          }
        </sf-chart-card>
        <sf-chart-card [title]="vm.i18n.t('accounts.detail.byWeekday')" [table]="vm.weekdayTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="account-weekday">
          @if (vm.weekdayOptions(); as o) {
            <sf-chart [options]="o" height="16rem" />
          }
        </sf-chart-card>
      </section>

      @if (vm.r(); as d) {
        <section class="grid gap-4 lg:grid-cols-2">
          @if (d.topCategories.length) {
            <sf-chart-card [title]="vm.i18n.t('accounts.detail.topCategories')" [table]="vm.rankTable(d.topCategories)" [loading]="vm.res.loading()" fileName="account-categories">
              <sf-chart [options]="vm.rankOptions(d.topCategories, 'expense')" height="15rem" />
            </sf-chart-card>
          }
          @if (d.topMerchants.length) {
            <sf-chart-card [title]="vm.i18n.t('accounts.detail.topMerchants')" [table]="vm.rankTable(d.topMerchants)" [loading]="vm.res.loading()" fileName="account-merchants">
              <sf-chart [options]="vm.rankOptions(d.topMerchants, 'expense')" height="15rem" />
            </sf-chart-card>
          }
          @if (d.topIncomeSources.length) {
            <sf-chart-card [title]="vm.i18n.t('accounts.detail.topIncomeSources')" [table]="vm.rankTable(d.topIncomeSources)" [loading]="vm.res.loading()" fileName="account-income-sources">
              <sf-chart [options]="vm.rankOptions(d.topIncomeSources, 'income')" height="15rem" />
            </sf-chart-card>
          }
        </section>
      }

      <section class="rounded-xl border border-border bg-card">
        <header class="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
          <h2 class="card-title">{{ 'accounts.detail.records' | transloco }}</h2>
          <hlm-toggle-group class="max-w-full overflow-x-auto" type="single" variant="outline" size="sm" [value]="vm.tab()" [nullable]="false" (valueChange)="$event && vm.filters.setParams({ tab: $any($event) })">
            @for (t of vm.tabs; track t.key) {
              <button hlmToggleGroupItem [value]="t.key" class="gap-1.5 text-xs">
                {{ t.label | transloco }}<span class="num text-muted-foreground">{{ vm.counts()[t.key] }}</span>
              </button>
            }
          </hlm-toggle-group>
        </header>

        <ul class="divide-y divide-border/60 px-4 py-1 lg:hidden">
          @for (tx of vm.pageRows(); track tx.id) {
            <li class="flex items-start gap-2 py-2.5">
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium">{{ tx.description }}</div>
                <div class="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span class="num">{{ tx.date | fdate: 'short' }} {{ tx.date.slice(0, 4) }}</span>
                  <span aria-hidden="true">·</span>
                  <span>{{ tx.category?.name || ('common.uncategorized' | transloco) }}</span>
                  <span aria-hidden="true">·</span>
                  <span class="truncate">{{ vm.counterparty(tx) }}</span>
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                  @if (vm.tab() === 'all') {
                    <span hlmBadge variant="outline" class="h-4 px-1.5 text-[10px]">{{ 'txType.' + tx.type | transloco }}</span>
                  }
                  @if (tx.budget) {
                    <span hlmBadge variant="secondary" class="h-4 px-1.5 text-[10px]">{{ tx.budget.name }}</span>
                  }
                  @for (t of tx.tags; track t) {
                    <span>#{{ t }}</span>
                  }
                </div>
              </div>
              <div class="flex shrink-0 flex-col items-end gap-0.5 text-sm">
                @if (vm.foreign()) {
                  <sf-dual-money [original]="tx.flowOriginal" [converted]="tx.flow" [currency]="vm.r()!.account.currency" [signed]="true" [tone]="vm.tone(tx)" />
                } @else {
                  <sf-money [value]="tx.flow" [signed]="true" [tone]="vm.tone(tx)" [original]="vm.original(tx)" />
                }
                @if (tx.balance !== null) {
                  <span class="text-[11px] text-muted-foreground">{{ 'accounts.detail.balanceAfter' | transloco }}: <sf-money [value]="vm.foreign() ? tx.balanceOriginal! : tx.balance" [currency]="vm.foreign() ? vm.r()!.account.currency : undefined" /></span>
                }
              </div>
              @if (vm.editable(tx)) {
                <a hlmBtn variant="ghost" size="icon-sm" class="-mr-2 shrink-0" [routerLink]="['/transactions', tx.groupId, 'edit']" [attr.aria-label]="'editor.tx.edit' | transloco">
                  <ng-icon name="lucidePencil" aria-hidden="true" />
                </a>
              }
            </li>
          } @empty {
            <li class="py-8 text-center text-sm text-muted-foreground">{{ 'tx.none' | transloco }}</li>
          }
        </ul>

        <div class="hidden overflow-x-auto px-4 py-2 lg:block">
          <table class="w-full min-w-[46rem] text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="eyebrow py-2 text-left">{{ 'common.date' | transloco }}</th>
                <th class="eyebrow py-2 text-left">{{ 'explorer.descriptionCol' | transloco }}</th>
                <th class="eyebrow py-2 text-left">{{ 'common.category' | transloco }}</th>
                <th class="eyebrow py-2 text-left">{{ 'accounts.detail.counterparty' | transloco }}</th>
                <th class="eyebrow py-2 text-right">{{ 'common.amount' | transloco }}</th>
                <th class="eyebrow py-2 text-right">{{ 'accounts.detail.balanceAfter' | transloco }}</th>
                <th class="w-8"><span class="sr-only">{{ 'editor.tx.actions' | transloco }}</span></th>
              </tr>
            </thead>
            <tbody>
              @for (tx of vm.pageRows(); track tx.id) {
                <tr class="border-b border-border/60">
                  <td class="num whitespace-nowrap py-2 text-xs text-muted-foreground">{{ tx.date | fdate: 'short' }} {{ tx.date.slice(0, 4) }}</td>
                  <td class="max-w-[20rem] py-2">
                    <div class="truncate font-medium">{{ tx.description }}</div>
                    <div class="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                      @if (vm.tab() === 'all') {
                        <span hlmBadge variant="outline" class="h-4 px-1.5 text-[10px]">{{ 'txType.' + tx.type | transloco }}</span>
                      }
                      @if (tx.budget) {
                        <span hlmBadge variant="secondary" class="h-4 px-1.5 text-[10px]">{{ tx.budget.name }}</span>
                      }
                      @for (t of tx.tags; track t) {
                        <span>#{{ t }}</span>
                      }
                    </div>
                  </td>
                  <td class="py-2 text-xs">{{ tx.category?.name || ('common.uncategorized' | transloco) }}</td>
                  <td class="max-w-[14rem] truncate py-2 text-xs text-muted-foreground">{{ vm.counterparty(tx) }}</td>
                  <td class="py-2 text-right">
                    @if (vm.foreign()) {
                      <sf-dual-money [original]="tx.flowOriginal" [converted]="tx.flow" [currency]="vm.r()!.account.currency" [signed]="true" [tone]="vm.tone(tx)" />
                    } @else {
                      <sf-money [value]="tx.flow" [signed]="true" [tone]="vm.tone(tx)" [original]="vm.original(tx)" />
                    }
                  </td>
                  <td class="py-2 text-right">
                    @if (tx.balance !== null) {
                      @if (vm.foreign()) {
                        <sf-dual-money [original]="tx.balanceOriginal!" [converted]="tx.balance" [currency]="vm.r()!.account.currency" />
                      } @else {
                        <sf-money [value]="tx.balance" class="text-xs text-muted-foreground" />
                      }
                    } @else {
                      <span class="text-xs text-muted-foreground">—</span>
                    }
                  </td>
                  <td class="py-2 text-right">
                    @if (vm.editable(tx)) {
                      <a hlmBtn variant="ghost" size="icon-sm" [routerLink]="['/transactions', tx.groupId, 'edit']" [attr.aria-label]="'editor.tx.edit' | transloco">
                        <ng-icon name="lucidePencil" aria-hidden="true" />
                      </a>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="py-8 text-center text-sm text-muted-foreground">{{ 'tx.none' | transloco }}</td></tr>
              }
            </tbody>
          </table>
        </div>

        <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>
            {{ 'accounts.detail.periodTotal' | transloco }}: <sf-money [value]="vm.rowsTotal()" [signed]="true" tone="auto" class="text-foreground" />
            · {{ 'explorer.page' | transloco: { page: vm.page(), pages: vm.totalPages() } }}
          </span>
          <div class="flex gap-1">
            <button hlmBtn variant="ghost" size="icon-sm" type="button" [disabled]="vm.page() <= 1" (click)="vm.page.set(vm.page() - 1)" [attr.aria-label]="'period.previous' | transloco"><ng-icon name="lucideChevronLeft" /></button>
            <button hlmBtn variant="ghost" size="icon-sm" type="button" [disabled]="vm.page() >= vm.totalPages()" (click)="vm.page.set(vm.page() + 1)" [attr.aria-label]="'period.next' | transloco"><ng-icon name="lucideChevronRight" /></button>
          </div>
        </footer>
      </section>
    }
  `,
})
export class AccountDetail {
  /** Bound from the `:id` route param. */
  readonly id = input.required<string>();

  protected readonly vm = accountDetailViewModel({ id: this.id });

  constructor() {
    inject(BreadcrumbLeaf).track(() => this.vm.r()?.account.name);
  }
}
