import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideChevronLeft, lucideChevronRight, lucidePencil } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CounterpartyKind } from '@spacefly/shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { counterpartyDetailViewModel } from '@spacefly/client/features/accounts/counterparty-detail.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { BreadcrumbLeaf } from '../../layout/breadcrumb-leaf';
import { CalendarGrid } from '../../shared/components/calendar-grid';
import { DualMoney } from '../../shared/components/dual-money';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';

/** One expense or revenue account over the selected period: totals, daily calendar, trend, breakdowns and every record. */
@Component({
  selector: 'sf-counterparty-detail',
  imports: [NgIcon, RouterLink, TranslocoPipe, HlmButton, CalendarGrid, Chart, ChartCard, DualMoney, EmptyState, KpiCard, Money, PageHeader, ...FORMAT_PIPES],
  providers: [provideIcons({ lucideArrowLeft, lucideChevronLeft, lucideChevronRight, lucidePencil })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <button hlmBtn variant="ghost" size="sm" type="button" class="-ml-2 self-start" (click)="vm.goBack()">
      <ng-icon name="lucideArrowLeft" aria-hidden="true" />{{ 'accounts.detail.back' | transloco }}
    </button>

    @if (vm.res.error() && !vm.res.loading()) {
      <sf-empty [error]="true" [title]="vm.i18n.t('accounts.detail.notFound')" [description]="vm.i18n.t('accounts.counterparty.notFoundHint')" />
    } @else {
      <sf-page-header [title]="vm.r()?.account?.name ?? '…'" [description]="vm.subtitle()">
        @if (vm.r(); as d) {
          <button hlmBtn size="sm" variant="outline" type="button" (click)="vm.editor.open('account', d.account.id)">
            <ng-icon name="lucidePencil" aria-hidden="true" />{{ 'editor.tx.edit' | transloco }}
          </button>
        }
      </sf-page-header>

      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <sf-kpi [label]="vm.i18n.t('common.total')" [value]="vm.r()?.totals?.value ?? null" [previous]="vm.r()?.totals?.previous || null" [upIsGood]="vm.kind() === 'income'" [accent]="vm.accent()" [loading]="vm.res.initialLoading()" />
        <sf-kpi [label]="vm.i18n.t('ranking.transactions')" format="compact" [value]="vm.r()?.totals?.count ?? null" [accent]="vm.accent()" [loading]="vm.res.initialLoading()" />
        <sf-kpi [label]="vm.i18n.t('ranking.avgTicket')" [value]="vm.r()?.totals?.avg ?? null" [accent]="vm.accent()" [loading]="vm.res.initialLoading()" />
        <sf-kpi [label]="vm.i18n.t('accounts.counterparty.share')" format="pct" [value]="vm.share()" [accent]="vm.accent()" [loading]="vm.res.initialLoading()" />
      </section>

      @if (vm.r(); as d) {
        @if (vm.stats(); as s) {
          <section class="rounded-xl border border-border bg-card p-4">
            <h2 class="card-title mb-3">{{ 'accounts.detail.stats' | transloco }}</h2>
            <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
              <div>
                <dt class="eyebrow">{{ 'accounts.counterparty.monthlyAverage' | transloco }}</dt>
                <dd class="mt-0.5"><sf-money [value]="s.monthlyAverage" /></dd>
              </div>
              <div>
                <dt class="eyebrow">{{ 'accounts.counterparty.total12' | transloco }}</dt>
                <dd class="mt-0.5"><sf-money [value]="s.total12" /></dd>
              </div>
              @if (s.biggest; as tx) {
                <div class="min-w-0">
                  <dt class="eyebrow">{{ 'accounts.counterparty.biggest' | transloco }}</dt>
                  <dd class="mt-0.5 truncate"><sf-money [value]="tx.amount" [tone]="vm.kind() === 'income' ? 'income' : 'expense'" /> <span class="text-xs text-muted-foreground">{{ tx.description }}</span></dd>
                </div>
              }
              @if (d.rows[0]; as last) {
                <div>
                  <dt class="eyebrow">{{ 'accounts.counterparty.lastTransaction' | transloco }}</dt>
                  <dd class="mt-0.5">{{ last.date | fdate: 'long' }}</dd>
                </div>
              }
            </dl>
          </section>
        }
      }

      <sf-chart-card [title]="vm.i18n.t('accounts.counterparty.calendar.' + vm.kind())" [subtitle]="vm.i18n.t('calendar.clickDay')" [exportable]="false" [table]="vm.dayTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" skeletonHeight="28rem">
        <div class="grid gap-6 px-2 pb-2" [class]="vm.calendarGridClass()">
          @for (m of vm.calendarMonths(); track m.month) {
            <section>
              <h3 class="mb-2 text-sm font-medium capitalize">{{ m.month | fdate: 'month' }}</h3>
              <sf-calendar-grid [days]="m.days" [scale]="vm.calendarScale()" (dayClick)="vm.openDay($event)" />
            </section>
          }
        </div>
      </sf-chart-card>

      <section class="grid gap-4 lg:grid-cols-2">
        <sf-chart-card [title]="vm.i18n.t('accounts.counterparty.monthly')" [table]="vm.monthlyTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="counterparty-monthly">
          @if (vm.monthlyOptions(); as o) {
            <sf-chart [options]="o" height="16rem" />
          }
        </sf-chart-card>
        <sf-chart-card [title]="vm.i18n.t('accounts.counterparty.weekday.' + vm.kind())" [table]="vm.weekdayTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="counterparty-weekday">
          @if (vm.weekdayOptions(); as o) {
            <sf-chart [options]="o" height="16rem" />
          }
        </sf-chart-card>
      </section>

      @if (vm.r(); as d) {
        <section class="grid gap-4 lg:grid-cols-2">
          @if (d.topCategories.length) {
            <sf-chart-card [title]="vm.i18n.t('accounts.counterparty.byCategory')" [table]="vm.rankTable(d.topCategories)" [loading]="vm.res.loading()" fileName="counterparty-categories">
              <sf-chart [options]="vm.rankOptions(d.topCategories)" height="15rem" />
            </sf-chart-card>
          }
          @if (d.topAccounts.length) {
            <sf-chart-card [title]="vm.i18n.t(vm.kind() === 'income' ? 'accounts.counterparty.receivedIn' : 'accounts.counterparty.paidFrom')" [table]="vm.rankTable(d.topAccounts)" [loading]="vm.res.loading()" fileName="counterparty-accounts">
              <sf-chart [options]="vm.rankOptions(d.topAccounts)" height="15rem" />
            </sf-chart-card>
          }
        </section>
      }

      <section class="rounded-xl border border-border bg-card">
        <header class="px-4 pt-4"><h2 class="card-title">{{ 'accounts.detail.records' | transloco }}</h2></header>
        <div class="overflow-x-auto px-4 py-2">
          <table class="w-full min-w-[40rem] text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="eyebrow py-2 text-left">{{ 'common.date' | transloco }}</th>
                <th class="eyebrow py-2 text-left">{{ 'explorer.descriptionCol' | transloco }}</th>
                <th class="eyebrow py-2 text-left">{{ 'common.category' | transloco }}</th>
                <th class="eyebrow py-2 text-left">{{ 'accounts.counterparty.fromAccount' | transloco }}</th>
                <th class="eyebrow py-2 text-right">{{ 'common.amount' | transloco }}</th>
                <th class="w-8"><span class="sr-only">{{ 'editor.tx.actions' | transloco }}</span></th>
              </tr>
            </thead>
            <tbody>
              @for (tx of vm.pageRows(); track tx.id) {
                <tr class="border-b border-border/60">
                  <td class="num whitespace-nowrap py-2 text-xs text-muted-foreground">{{ tx.date | fdate: 'short' }} {{ tx.date.slice(0, 4) }}</td>
                  <td class="max-w-[20rem] py-2">
                    <div class="truncate font-medium">{{ tx.description }}</div>
                    @if (tx.tags.length || tx.budget) {
                      <div class="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                        @if (tx.budget) {
                          <span>{{ tx.budget.name }}</span>
                        }
                        @for (t of tx.tags; track t) {
                          <span>#{{ t }}</span>
                        }
                      </div>
                    }
                  </td>
                  <td class="py-2 text-xs">{{ tx.category?.name || ('common.uncategorized' | transloco) }}</td>
                  <td class="max-w-[14rem] truncate py-2 text-xs text-muted-foreground">{{ vm.assetName(tx) }}</td>
                  <td class="py-2 text-right">
                    <sf-dual-money [original]="vm.sign() * tx.originalAmount" [converted]="vm.sign() * tx.amount" [currency]="tx.originalCurrency" [signed]="true" [tone]="vm.kind() === 'income' ? 'income' : 'expense'" />
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
                <tr><td colspan="6" class="py-8 text-center text-sm text-muted-foreground">{{ 'tx.none' | transloco }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <footer class="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>{{ 'explorer.page' | transloco: { page: vm.page(), pages: vm.totalPages() } }}</span>
          <div class="flex gap-1">
            <button hlmBtn variant="ghost" size="icon-sm" type="button" [disabled]="vm.page() <= 1" (click)="vm.page.set(vm.page() - 1)" [attr.aria-label]="'period.previous' | transloco"><ng-icon name="lucideChevronLeft" /></button>
            <button hlmBtn variant="ghost" size="icon-sm" type="button" [disabled]="vm.page() >= vm.totalPages()" (click)="vm.page.set(vm.page() + 1)" [attr.aria-label]="'period.next' | transloco"><ng-icon name="lucideChevronRight" /></button>
          </div>
        </footer>
      </section>
    }
  `,
})
export class CounterpartyDetail {
  /** Route data and param (withComponentInputBinding). */
  readonly kind = input<CounterpartyKind>('expense');
  readonly id = input.required<string>();

  protected readonly vm = counterpartyDetailViewModel({ kind: this.kind, id: this.id });

  constructor() {
    inject(BreadcrumbLeaf).track(() => this.vm.r()?.account?.name);
  }
}
