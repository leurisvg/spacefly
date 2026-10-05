import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideChevronLeft, lucideChevronRight, lucidePencil } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { type AccountDetailReport, type AccountTxRow, type CalendarDay } from '@spacefly/shared';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { reportResource } from '@spacefly/client/api/report-resource';
import { FormatService } from '@spacefly/client/format/format.service';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { I18n } from '@spacefly/client/i18n/i18n';
import { BackNavigation } from '@spacefly/client/platform/back-navigation';
import { FiltersStore } from '@spacefly/client/state/filters.store';
import { categoryBarsOption, dailyBalanceOption, incomeExpenseOption, rankingBarsOption } from '@spacefly/client/charts/builders';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import type { ChartTable } from '@spacefly/client/charts/chart-table';
import { money } from '@spacefly/client/charts/series-colors';
import { BreadcrumbLeaf } from '../../layout/breadcrumb-leaf';
import { DualMoney } from '../../shared/components/dual-money';
import { CalendarGrid } from '../../shared/components/calendar-grid';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { TxDetailService } from '@spacefly/client/state/tx-detail.service';
import { EntityEditor } from '@spacefly/client/state/entity-editor.service';

const PAGE_SIZE = 50;
const TABS = ['all', 'withdrawal', 'deposit', 'transfer'] as const;
type Tab = (typeof TABS)[number];

/** One asset account: balance and flows per day, monthly trend, rankings and every record with its running balance. */
@Component({
  selector: 'sf-account-detail',
  imports: [NgIcon, RouterLink, TranslocoPipe, HlmBadge, HlmButton, HlmToggleGroupImports, CalendarGrid, Chart, ChartCard, DualMoney, EmptyState, KpiCard, Money, PageHeader, ...FORMAT_PIPES],
  providers: [provideIcons({ lucideArrowLeft, lucideChevronLeft, lucideChevronRight, lucidePencil })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <button hlmBtn variant="ghost" size="sm" type="button" class="-ml-2 self-start" (click)="goBack()">
      <ng-icon name="lucideArrowLeft" aria-hidden="true" />{{ 'accounts.detail.back' | transloco }}
    </button>

    @if (res.error() && !res.loading()) {
      <sf-empty [error]="true" [title]="i18n.t('accounts.detail.notFound')" [description]="i18n.t('accounts.detail.notFoundHint')" />
    } @else {
      <sf-page-header [title]="r()?.account?.name ?? '…'" [description]="subtitle()">
        @if (r(); as d) {
          <button hlmBtn size="sm" variant="outline" type="button" (click)="editor.open('account', d.account.id)">
            <ng-icon name="lucidePencil" aria-hidden="true" />{{ 'editor.tx.edit' | transloco }}
          </button>
        }
      </sf-page-header>

      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <sf-kpi class="col-span-2 lg:col-span-1" [label]="i18n.t('accounts.detail.closing')" [value]="foreign() ? (r()?.balanceOriginal ?? null) : (r()?.closing ?? null)" [previous]="foreign() ? (r()?.openingOriginal ?? null) : (r()?.opening ?? null)" [currency]="own()" [note]="approx(r()?.closing)" [spark]="r()?.months?.map(balanceOf) ?? null" accent="var(--money-net)" [loading]="res.initialLoading()" />
        <sf-kpi [label]="i18n.t('common.income')" [value]="foreign() ? (r()?.totalsOriginal?.income ?? null) : (r()?.totals?.income ?? null)" [currency]="own()" [note]="approx(r()?.totals?.income)" accent="var(--money-income)" [loading]="res.initialLoading()" />
        <sf-kpi [label]="i18n.t('common.expenses')" [value]="foreign() ? (r()?.totalsOriginal?.expense ?? null) : (r()?.totals?.expense ?? null)" [currency]="own()" [note]="approx(r()?.totals?.expense)" accent="var(--money-expense)" [loading]="res.initialLoading()" />
        <sf-kpi [label]="i18n.t('accounts.detail.change')" [value]="foreign() ? (r()?.changeOriginal ?? null) : (r()?.change?.abs ?? null)" [currency]="own()" [note]="approx(r()?.change?.abs)" accent="var(--money-net)" [loading]="res.initialLoading()" />
      </section>

      @if (r(); as d) {
        @if (stats(); as s) {
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

      <sf-chart-card [title]="i18n.t('accounts.detail.dailyBalance')" [subtitle]="zoomHint()" [table]="balanceTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="account-daily-balance">
        @if (balanceOptions(); as o) {
          <sf-chart [options]="o" height="16rem" />
        }
      </sf-chart-card>

      <sf-chart-card [title]="i18n.t('accounts.detail.dailyFlow')" [subtitle]="i18n.t('calendar.clickDay')" [exportable]="false" [table]="flowTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" skeletonHeight="18rem">
        <div class="flex flex-wrap justify-center gap-x-8 gap-y-5 px-2 pb-2 sm:justify-start">
          @for (m of calendarMonths(); track m.month) {
            <section class="w-full max-w-[19rem]">
              <h3 class="mb-1.5 text-sm font-medium capitalize">{{ m.month | fdate: 'month' }}</h3>
              <sf-calendar-grid size="sm" [days]="m.days" [scale]="calendarScale()" [currency]="own()" (dayClick)="openDay($event)" />
            </section>
          }
        </div>
      </sf-chart-card>

      <section class="grid gap-4 lg:grid-cols-2">
        <sf-chart-card [title]="i18n.t('accounts.detail.monthly')" [table]="monthlyTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="account-monthly">
          @if (monthlyOptions(); as o) {
            <sf-chart [options]="o" height="16rem" />
          }
        </sf-chart-card>
        <sf-chart-card [title]="i18n.t('accounts.detail.byWeekday')" [table]="weekdayTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="account-weekday">
          @if (weekdayOptions(); as o) {
            <sf-chart [options]="o" height="16rem" />
          }
        </sf-chart-card>
      </section>

      @if (r(); as d) {
        <section class="grid gap-4 lg:grid-cols-2">
          @if (d.topCategories.length) {
            <sf-chart-card [title]="i18n.t('accounts.detail.topCategories')" [table]="rankTable(d.topCategories)" [loading]="res.loading()" fileName="account-categories">
              <sf-chart [options]="rankOptions(d.topCategories, 'expense')" height="15rem" />
            </sf-chart-card>
          }
          @if (d.topMerchants.length) {
            <sf-chart-card [title]="i18n.t('accounts.detail.topMerchants')" [table]="rankTable(d.topMerchants)" [loading]="res.loading()" fileName="account-merchants">
              <sf-chart [options]="rankOptions(d.topMerchants, 'expense')" height="15rem" />
            </sf-chart-card>
          }
          @if (d.topIncomeSources.length) {
            <sf-chart-card [title]="i18n.t('accounts.detail.topIncomeSources')" [table]="rankTable(d.topIncomeSources)" [loading]="res.loading()" fileName="account-income-sources">
              <sf-chart [options]="rankOptions(d.topIncomeSources, 'income')" height="15rem" />
            </sf-chart-card>
          }
        </section>
      }

      <section class="rounded-xl border border-border bg-card">
        <header class="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
          <h2 class="card-title">{{ 'accounts.detail.records' | transloco }}</h2>
          <hlm-toggle-group class="max-w-full overflow-x-auto" type="single" variant="outline" size="sm" [value]="tab()" [nullable]="false" (valueChange)="$event && filters.setParams({ tab: $any($event) })">
            @for (t of tabs; track t.key) {
              <button hlmToggleGroupItem [value]="t.key" class="gap-1.5 text-xs">
                {{ t.label | transloco }}<span class="num text-muted-foreground">{{ counts()[t.key] }}</span>
              </button>
            }
          </hlm-toggle-group>
        </header>

        <ul class="divide-y divide-border/60 px-4 py-1 lg:hidden">
          @for (tx of pageRows(); track tx.id) {
            <li class="flex items-start gap-2 py-2.5">
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium">{{ tx.description }}</div>
                <div class="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span class="num">{{ tx.date | fdate: 'short' }} {{ tx.date.slice(0, 4) }}</span>
                  <span aria-hidden="true">·</span>
                  <span>{{ tx.category?.name || ('common.uncategorized' | transloco) }}</span>
                  <span aria-hidden="true">·</span>
                  <span class="truncate">{{ counterparty(tx) }}</span>
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                  @if (tab() === 'all') {
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
                @if (foreign()) {
                  <sf-dual-money [original]="tx.flowOriginal" [converted]="tx.flow" [currency]="r()!.account.currency" [signed]="true" [tone]="tone(tx)" />
                } @else {
                  <sf-money [value]="tx.flow" [signed]="true" [tone]="tone(tx)" [original]="original(tx)" />
                }
                @if (tx.balance !== null) {
                  <span class="text-[11px] text-muted-foreground">{{ 'accounts.detail.balanceAfter' | transloco }}: <sf-money [value]="foreign() ? tx.balanceOriginal! : tx.balance" [currency]="foreign() ? r()!.account.currency : undefined" /></span>
                }
              </div>
              @if (editable(tx)) {
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
              @for (tx of pageRows(); track tx.id) {
                <tr class="border-b border-border/60">
                  <td class="num whitespace-nowrap py-2 text-xs text-muted-foreground">{{ tx.date | fdate: 'short' }} {{ tx.date.slice(0, 4) }}</td>
                  <td class="max-w-[20rem] py-2">
                    <div class="truncate font-medium">{{ tx.description }}</div>
                    <div class="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                      @if (tab() === 'all') {
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
                  <td class="max-w-[14rem] truncate py-2 text-xs text-muted-foreground">{{ counterparty(tx) }}</td>
                  <td class="py-2 text-right">
                    @if (foreign()) {
                      <sf-dual-money [original]="tx.flowOriginal" [converted]="tx.flow" [currency]="r()!.account.currency" [signed]="true" [tone]="tone(tx)" />
                    } @else {
                      <sf-money [value]="tx.flow" [signed]="true" [tone]="tone(tx)" [original]="original(tx)" />
                    }
                  </td>
                  <td class="py-2 text-right">
                    @if (tx.balance !== null) {
                      @if (foreign()) {
                        <sf-dual-money [original]="tx.balanceOriginal!" [converted]="tx.balance" [currency]="r()!.account.currency" />
                      } @else {
                        <sf-money [value]="tx.balance" class="text-xs text-muted-foreground" />
                      }
                    } @else {
                      <span class="text-xs text-muted-foreground">—</span>
                    }
                  </td>
                  <td class="py-2 text-right">
                    @if (editable(tx)) {
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
            {{ 'accounts.detail.periodTotal' | transloco }}: <sf-money [value]="rowsTotal()" [signed]="true" tone="auto" class="text-foreground" />
            · {{ 'explorer.page' | transloco: { page: page(), pages: totalPages() } }}
          </span>
          <div class="flex gap-1">
            <button hlmBtn variant="ghost" size="icon-sm" type="button" [disabled]="page() <= 1" (click)="page.set(page() - 1)" [attr.aria-label]="'period.previous' | transloco"><ng-icon name="lucideChevronLeft" /></button>
            <button hlmBtn variant="ghost" size="icon-sm" type="button" [disabled]="page() >= totalPages()" (click)="page.set(page() + 1)" [attr.aria-label]="'period.next' | transloco"><ng-icon name="lucideChevronRight" /></button>
          </div>
        </footer>
      </section>
    }
  `,
})
export class AccountDetail {
  protected readonly i18n = inject(I18n);
  protected readonly filters = inject(FiltersStore);
  protected readonly editor = inject(EntityEditor);
  private readonly f = inject(FormatService);
  private readonly back = inject(BackNavigation);
  private readonly detail = inject(TxDetailService);

  /** Bound from the `:id` route param. */
  readonly id = input.required<string>();

  constructor() {
    // Opens on the "last 30 days" preset; the range is handed back when leaving so no other screen inherits it.
    inject(BreadcrumbLeaf).track(() => this.r()?.account.name);
    const release = this.filters.scopePreset('last30');
    inject(DestroyRef).onDestroy(release);
  }

  protected readonly res = reportResource<AccountDetailReport>(() => `reports/accounts/${this.id()}`);
  protected readonly r = this.res.data;

  protected readonly tabs = [
    { key: 'all' as Tab, label: 'accounts.detail.tabs.all' },
    { key: 'withdrawal' as Tab, label: 'accounts.detail.tabs.expenses' },
    { key: 'deposit' as Tab, label: 'accounts.detail.tabs.income' },
    { key: 'transfer' as Tab, label: 'accounts.detail.tabs.transfers' },
  ];
  private readonly tabParam = this.filters.param('tab');
  protected readonly tab = computed<Tab>(() => TABS.find((t) => t === this.tabParam()) ?? 'all');

  protected readonly counts = computed(() => {
    const rows = this.r()?.rows ?? [];
    return { all: rows.length, withdrawal: rows.filter((x) => x.type === 'withdrawal').length, deposit: rows.filter((x) => x.type === 'deposit').length, transfer: rows.filter((x) => x.type === 'transfer').length };
  });
  protected readonly rows = computed(() => {
    const rows = this.r()?.rows ?? [];
    return this.tab() === 'all' ? rows : rows.filter((x) => x.type === this.tab());
  });
  protected readonly rowsTotal = computed(() => this.rows().reduce((sum, x) => sum + x.flow, 0));
  /** Back to the first page when the tab, the account or the period changes. */
  protected readonly page = linkedSignal({ source: () => [this.tab(), this.id(), this.r()], computation: () => 1 });
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.rows().length / PAGE_SIZE)));
  protected readonly pageRows = computed(() => this.rows().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE));

  protected readonly subtitle = computed(() => {
    const a = this.r()?.account;
    if (!a) return null;
    return [a.role ? this.i18n.t(`accounts.roles.${a.role}`) : null, a.currency, a.iban, a.excluded ? this.i18n.t('accounts.excluded') : null].filter(Boolean).join(' · ');
  });

  protected readonly stats = computed(() => {
    const d = this.r();
    if (!d) return null;
    const known = d.days.filter((x) => x.balance !== null);
    const extreme = (pick: (a: number, b: number) => boolean) =>
      known.reduce<{ date: string; balance: number; balanceOriginal: number } | null>(
        (best, x) => (best === null || pick(x.balance!, best.balance) ? { date: x.date, balance: x.balance!, balanceOriginal: x.balanceOriginal! } : best),
        null,
      );
    const biggest = (type: string) =>
      d.rows
        .filter((x) => x.type === type)
        .reduce<(AccountTxRow & { amountOriginal: number }) | null>((best, x) => (best === null || x.amount > best.amount ? { ...x, amountOriginal: Math.abs(x.flowOriginal) } : best), null);
    const days = Math.max(1, known.length);
    return {
      lowest: extreme((a, b) => a < b),
      highest: extreme((a, b) => a > b),
      avgDailyExpense: d.totals.expense / days,
      avgDailyExpenseOriginal: d.totalsOriginal.expense / days,
      biggestExpense: biggest('withdrawal'),
      biggestIncome: biggest('deposit'),
    };
  });

  /** The account keeps its money in a currency other than the one being displayed. */
  protected readonly foreign = computed(() => {
    const cur = this.r()?.account.currency;
    return !!cur && cur !== this.filters.currency();
  });
  /** Currency the charts are drawn in: the account's own, when it isn't the one being displayed. */
  protected readonly own = computed(() => (this.foreign() ? this.r()?.account.currency : undefined));
  /** "≈ RD$600.00" under a figure shown in the account's own currency; nothing when it is already in the display currency. */
  protected approx(converted: number | null | undefined): string | null {
    return this.foreign() && converted != null ? `≈ ${this.f.money(converted)}` : null;
  }

  protected readonly zoomHint = computed(() => ((this.r()?.days.length ?? 0) > 60 ? this.i18n.t('accounts.detail.zoomHint') : null));

  protected readonly balanceOptions = computed(() => {
    const d = this.r();
    return d?.days.length ? dailyBalanceOption(this.f, this.i18n.t('accounts.balance'), d.days, this.own()) : null;
  });
  /** One calendar per month of the period, all on the same scale. */
  protected readonly calendarMonths = computed(() => {
    const byMonth = new Map<string, CalendarDay[]>();
    const foreign = this.foreign();
    for (const d of this.r()?.days ?? []) {
      const month = d.date.slice(0, 7);
      // A foreign account is drawn in its own currency: bars, labels and tooltip.
      const day: CalendarDay = foreign
        ? { date: d.date, income: d.incomeOriginal, expense: d.expenseOriginal, count: d.count, balance: d.balanceOriginal }
        : { date: d.date, income: d.income, expense: d.expense, count: d.count, balance: d.balance };
      byMonth.set(month, [...(byMonth.get(month) ?? []), day]);
    }
    return [...byMonth].map(([month, days]) => ({ month, days }));
  });
  protected readonly calendarScale = computed(() =>
    Math.max(1, ...(this.r()?.days ?? []).map((d) => (this.foreign() ? Math.max(d.incomeOriginal, d.expenseOriginal) : Math.max(d.income, d.expense)))),
  );

  protected readonly monthlyOptions = computed(() => {
    const d = this.r();
    return d
      ? incomeExpenseOption(
          this.f,
          this.i18n.t,
          d.months.map((m) => ({ ...m, net: m.income - m.expense, own: { income: m.incomeOriginal, expense: m.expenseOriginal } })),
          this.own(),
        )
      : null;
  });
  protected readonly weekdayOptions = computed(() => {
    const d = this.r();
    if (!d) return null;
    const own = this.own();
    return categoryBarsOption(this.f, this.weekdays(), d.byWeekday, money.expense(), this.i18n.t('common.expenses'), own ? { currency: own, values: d.byWeekdayOriginal } : undefined);
  });

  private weekdays(): string[] {
    return Array.from({ length: 7 }, (_, i) => this.f.date(`2024-01-0${i + 1}`, 'weekday'));
  }

  protected readonly balanceTable = computed<ChartTable | null>(() => {
    const d = this.r();
    if (!d) return null;
    return {
      columns: [this.i18n.t('common.date'), this.i18n.t('accounts.balance')],
      rows: d.days.filter((x) => x.balance !== null).map((x) => [this.f.date(x.date, 'day'), this.moneyPair(x.balanceOriginal, x.balance)]),
      numeric: [1],
    };
  });
  protected readonly flowTable = computed<ChartTable | null>(() => {
    const d = this.r();
    if (!d) return null;
    return {
      columns: [this.i18n.t('common.date'), this.i18n.t('common.income'), this.i18n.t('common.expenses'), this.i18n.t('accounts.detail.transferIn'), this.i18n.t('accounts.detail.transferOut')],
      rows: d.days
        .filter((x) => x.count)
        .map((x) => [
          this.f.date(x.date, 'day'),
          this.moneyPair(x.incomeOriginal, x.income),
          this.moneyPair(x.expenseOriginal, x.expense),
          this.moneyPair(x.transferInOriginal, x.transferIn),
          this.moneyPair(x.transferOutOriginal, x.transferOut),
        ]),
      numeric: [1, 2, 3, 4],
    };
  });
  protected readonly monthlyTable = computed<ChartTable | null>(() => {
    const d = this.r();
    if (!d) return null;
    return {
      columns: [this.i18n.t('common.month'), this.i18n.t('common.income'), this.i18n.t('common.expenses'), this.i18n.t('common.net'), this.i18n.t('accounts.detail.closingBalance')],
      rows: d.months.map((m) => [
        this.f.date(m.month, 'month'),
        this.moneyPair(m.incomeOriginal, m.income),
        this.moneyPair(m.expenseOriginal, m.expense),
        this.moneyPair(m.incomeOriginal - m.expenseOriginal, m.income - m.expense, true),
        this.moneyPair(m.balanceOriginal, m.balance),
      ]),
      numeric: [1, 2, 3, 4],
    };
  });
  protected readonly weekdayTable = computed<ChartTable | null>(() => {
    const d = this.r();
    if (!d) return null;
    const names = this.weekdays();
    return { columns: [this.i18n.t('common.date'), this.i18n.t('common.expenses')], rows: d.byWeekday.map((v, i) => [names[i], this.moneyPair(d.byWeekdayOriginal[i], v)]), numeric: [1] };
  });

  /** "US$10.00 (≈ RD$600.00)" for a foreign account, the plain amount otherwise. */
  private moneyPair(original: number | null, converted: number | null, signed = false): string {
    const own = this.own();
    if (!own || original === null) return this.f.money(converted, undefined, { signed });
    return `${this.f.money(original, own, { signed })} (≈ ${this.f.money(converted, undefined, { signed })})`;
  }

  protected balanceOf = (m: { balance: number; balanceOriginal: number }) => (this.foreign() ? m.balanceOriginal : m.balance);

  private named(items: AccountDetailReport['topCategories']) {
    return items.map((x) => ({ ...x, own: x.valueOriginal, name: x.name || this.i18n.t('common.uncategorized') }));
  }
  protected rankOptions(items: AccountDetailReport['topCategories'], kind: 'expense' | 'income') {
    return rankingBarsOption(this.f, this.named(items), kind === 'income' ? money.income() : money.expense(), this.own());
  }
  protected rankTable(items: AccountDetailReport['topCategories']): ChartTable {
    return { columns: [this.i18n.t('common.account'), this.i18n.t('tx.count'), this.i18n.t('common.total')], rows: this.named(items).map((x) => [x.name, String(x.count), this.moneyPair(x.valueOriginal ?? null, x.value)]), numeric: [1, 2] };
  }

  /** The other side of the record: where the money came from or went to. */
  protected counterparty(tx: AccountTxRow): string {
    return (tx.flow > 0 ? tx.source : tx.destination).name;
  }

  protected tone(tx: AccountTxRow): 'expense' | 'income' | 'none' {
    return tx.type === 'withdrawal' ? 'expense' : tx.type === 'deposit' ? 'income' : 'none';
  }

  protected original(tx: AccountTxRow) {
    if (tx.rate === 1) return null;
    return { amount: (tx.flow < 0 ? -1 : 1) * tx.originalAmount, currency: tx.originalCurrency, rate: tx.rate };
  }

  /** Only single-part expenses, income and transfers are edited in SpaceFly. */
  protected editable(tx: AccountTxRow): boolean {
    return tx.splitCount === 1 && ['withdrawal', 'deposit', 'transfer'].includes(tx.type);
  }

  protected openDay(date: string): void {
    this.detail.open(this.f.date(date, 'full'), { start: date, end: date, account: this.id() });
  }

  protected goBack(): void {
    this.back.back('/accounts');
  }
}
