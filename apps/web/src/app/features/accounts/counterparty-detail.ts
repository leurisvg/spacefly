import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideChevronLeft, lucideChevronRight, lucidePencil } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CalendarDay, CounterpartyDetailReport, CounterpartyKind, RankedItem, TxRow } from '@spacefly/shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { reportResource } from '@spacefly/client/api/report-resource';
import { FormatService } from '@spacefly/client/format/format.service';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { I18n } from '@spacefly/client/i18n/i18n';
import { BackNavigation } from '@spacefly/client/platform/back-navigation';
import { categoryBarsOption, rankingBarsOption } from '@spacefly/client/charts/builders';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import type { ChartTable } from '@spacefly/client/charts/chart-table';
import { money } from '@spacefly/client/charts/series-colors';
import { BreadcrumbLeaf } from '../../layout/breadcrumb-leaf';
import { CalendarGrid } from '../../shared/components/calendar-grid';
import { DualMoney } from '../../shared/components/dual-money';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { TxDetailService } from '@spacefly/client/state/tx-detail.service';
import { EntityEditor } from '@spacefly/client/state/entity-editor.service';

const PAGE_SIZE = 50;

/** One expense or revenue account over the selected period: totals, daily calendar, trend, breakdowns and every record. */
@Component({
  selector: 'sf-counterparty-detail',
  imports: [NgIcon, RouterLink, TranslocoPipe, HlmButton, CalendarGrid, Chart, ChartCard, DualMoney, EmptyState, KpiCard, Money, PageHeader, ...FORMAT_PIPES],
  providers: [provideIcons({ lucideArrowLeft, lucideChevronLeft, lucideChevronRight, lucidePencil })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <button hlmBtn variant="ghost" size="sm" type="button" class="-ml-2 self-start" (click)="goBack()">
      <ng-icon name="lucideArrowLeft" aria-hidden="true" />{{ 'accounts.detail.back' | transloco }}
    </button>

    @if (res.error() && !res.loading()) {
      <sf-empty [error]="true" [title]="i18n.t('accounts.detail.notFound')" [description]="i18n.t('accounts.counterparty.notFoundHint')" />
    } @else {
      <sf-page-header [title]="r()?.account?.name ?? '…'" [description]="subtitle()">
        @if (r(); as d) {
          <button hlmBtn size="sm" variant="outline" type="button" (click)="editor.open('account', d.account.id)">
            <ng-icon name="lucidePencil" aria-hidden="true" />{{ 'editor.tx.edit' | transloco }}
          </button>
        }
      </sf-page-header>

      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <sf-kpi [label]="i18n.t('common.total')" [value]="r()?.totals?.value ?? null" [previous]="r()?.totals?.previous || null" [upIsGood]="kind() === 'income'" [accent]="accent()" [loading]="res.initialLoading()" />
        <sf-kpi [label]="i18n.t('ranking.transactions')" format="compact" [value]="r()?.totals?.count ?? null" [accent]="accent()" [loading]="res.initialLoading()" />
        <sf-kpi [label]="i18n.t('ranking.avgTicket')" [value]="r()?.totals?.avg ?? null" [accent]="accent()" [loading]="res.initialLoading()" />
        <sf-kpi [label]="i18n.t('accounts.counterparty.share')" format="pct" [value]="share()" [accent]="accent()" [loading]="res.initialLoading()" />
      </section>

      @if (r(); as d) {
        @if (stats(); as s) {
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
                  <dd class="mt-0.5 truncate"><sf-money [value]="tx.amount" [tone]="kind() === 'income' ? 'income' : 'expense'" /> <span class="text-xs text-muted-foreground">{{ tx.description }}</span></dd>
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

      <sf-chart-card [title]="i18n.t('accounts.counterparty.calendar.' + kind())" [subtitle]="i18n.t('calendar.clickDay')" [exportable]="false" [table]="dayTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" skeletonHeight="28rem">
        <div class="grid gap-6 px-2 pb-2" [class]="calendarGridClass()">
          @for (m of calendarMonths(); track m.month) {
            <section>
              <h3 class="mb-2 text-sm font-medium capitalize">{{ m.month | fdate: 'month' }}</h3>
              <sf-calendar-grid [days]="m.days" [scale]="calendarScale()" (dayClick)="openDay($event)" />
            </section>
          }
        </div>
      </sf-chart-card>

      <section class="grid gap-4 lg:grid-cols-2">
        <sf-chart-card [title]="i18n.t('accounts.counterparty.monthly')" [table]="monthlyTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="counterparty-monthly">
          @if (monthlyOptions(); as o) {
            <sf-chart [options]="o" height="16rem" />
          }
        </sf-chart-card>
        <sf-chart-card [title]="i18n.t('accounts.counterparty.weekday.' + kind())" [table]="weekdayTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="counterparty-weekday">
          @if (weekdayOptions(); as o) {
            <sf-chart [options]="o" height="16rem" />
          }
        </sf-chart-card>
      </section>

      @if (r(); as d) {
        <section class="grid gap-4 lg:grid-cols-2">
          @if (d.topCategories.length) {
            <sf-chart-card [title]="i18n.t('accounts.counterparty.byCategory')" [table]="rankTable(d.topCategories)" [loading]="res.loading()" fileName="counterparty-categories">
              <sf-chart [options]="rankOptions(d.topCategories)" height="15rem" />
            </sf-chart-card>
          }
          @if (d.topAccounts.length) {
            <sf-chart-card [title]="i18n.t(kind() === 'income' ? 'accounts.counterparty.receivedIn' : 'accounts.counterparty.paidFrom')" [table]="rankTable(d.topAccounts)" [loading]="res.loading()" fileName="counterparty-accounts">
              <sf-chart [options]="rankOptions(d.topAccounts)" height="15rem" />
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
              @for (tx of pageRows(); track tx.id) {
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
                  <td class="max-w-[14rem] truncate py-2 text-xs text-muted-foreground">{{ assetName(tx) }}</td>
                  <td class="py-2 text-right">
                    <sf-dual-money [original]="sign() * tx.originalAmount" [converted]="sign() * tx.amount" [currency]="tx.originalCurrency" [signed]="true" [tone]="kind() === 'income' ? 'income' : 'expense'" />
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
                <tr><td colspan="6" class="py-8 text-center text-sm text-muted-foreground">{{ 'tx.none' | transloco }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <footer class="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>{{ 'explorer.page' | transloco: { page: page(), pages: totalPages() } }}</span>
          <div class="flex gap-1">
            <button hlmBtn variant="ghost" size="icon-sm" type="button" [disabled]="page() <= 1" (click)="page.set(page() - 1)" [attr.aria-label]="'period.previous' | transloco"><ng-icon name="lucideChevronLeft" /></button>
            <button hlmBtn variant="ghost" size="icon-sm" type="button" [disabled]="page() >= totalPages()" (click)="page.set(page() + 1)" [attr.aria-label]="'period.next' | transloco"><ng-icon name="lucideChevronRight" /></button>
          </div>
        </footer>
      </section>
    }
  `,
})
export class CounterpartyDetail {
  protected readonly i18n = inject(I18n);
  protected readonly editor = inject(EntityEditor);
  private readonly f = inject(FormatService);
  private readonly back = inject(BackNavigation);
  private readonly detail = inject(TxDetailService);

  /** Route data and param (withComponentInputBinding). */
  readonly kind = input<CounterpartyKind>('expense');
  readonly id = input.required<string>();

  constructor() {
    inject(BreadcrumbLeaf).track(() => this.r()?.account?.name);
  }

  protected readonly res = reportResource<CounterpartyDetailReport>(() => `reports/counterparties/${this.id()}`, () => ({ kind: this.kind() }));
  protected readonly r = this.res.data;
  protected readonly accent = computed(() => (this.kind() === 'income' ? 'var(--money-income)' : 'var(--money-expense)'));
  private readonly color = computed(() => (this.kind() === 'income' ? money.income() : money.expense()));
  /** Expenses read as negative amounts, income as positive. */
  protected readonly sign = computed(() => (this.kind() === 'income' ? 1 : -1));
  protected readonly share = computed(() => (this.r() ? this.r()!.totals.share * 100 : null));

  protected readonly subtitle = computed(() => {
    const a = this.r()?.account;
    return a ? [a.iban, a.active ? null : this.i18n.t('accounts.excluded')].filter(Boolean).join(' · ') || null : null;
  });

  protected readonly stats = computed(() => {
    const d = this.r();
    if (!d) return null;
    const total12 = d.months.reduce((sum, m) => sum + m.value, 0);
    return {
      total12,
      monthlyAverage: total12 / Math.max(1, d.months.length),
      biggest: d.rows.reduce<TxRow | null>((best, x) => (best === null || x.amount > best.amount ? x : best), null),
    };
  });

  /** One calendar per month of the period, all on the same scale. */
  protected readonly calendarMonths = computed(() => {
    const income = this.kind() === 'income';
    const byMonth = new Map<string, CalendarDay[]>();
    for (const d of this.r()?.days ?? []) {
      const month = d.date.slice(0, 7);
      const day: CalendarDay = { date: d.date, income: income ? d.value : 0, expense: income ? 0 : d.value, count: d.count, balance: null };
      byMonth.set(month, [...(byMonth.get(month) ?? []), day]);
    }
    return [...byMonth].map(([month, days]) => ({ month, days }));
  });
  protected readonly calendarScale = computed(() => Math.max(1, ...(this.r()?.days ?? []).map((d) => d.value)));
  protected readonly calendarGridClass = computed(() => (this.calendarMonths().length > 1 ? 'lg:grid-cols-2 2xl:grid-cols-3' : 'max-w-2xl'));

  protected readonly dayTable = computed<ChartTable | null>(() => {
    const d = this.r();
    if (!d) return null;
    return {
      columns: [this.i18n.t('common.date'), this.i18n.t('ranking.count'), this.i18n.t('common.total')],
      rows: d.days.filter((x) => x.count).map((x) => [this.f.date(x.date, 'day'), String(x.count), this.f.money(x.value)]),
      numeric: [1, 2],
    };
  });

  private readonly seriesName = computed(() => this.i18n.t(this.kind() === 'income' ? 'common.income' : 'common.expenses'));
  protected readonly monthlyOptions = computed(() => {
    const d = this.r();
    return d ? categoryBarsOption(this.f, d.months.map((m) => this.f.monthLabel(m.month)), d.months.map((m) => m.value), this.color(), this.seriesName()) : null;
  });
  protected readonly monthlyTable = computed<ChartTable | null>(() => {
    const d = this.r();
    return d
      ? { columns: [this.i18n.t('common.month'), this.i18n.t('ranking.count'), this.i18n.t('common.total')], rows: d.months.map((m) => [this.f.date(m.month, 'month'), String(m.count), this.f.money(m.value)]), numeric: [1, 2] }
      : null;
  });

  private weekdays(): string[] {
    return Array.from({ length: 7 }, (_, i) => this.f.date(`2024-01-0${i + 1}`, 'weekday'));
  }
  protected readonly weekdayOptions = computed(() => {
    const d = this.r();
    return d ? categoryBarsOption(this.f, this.weekdays(), d.byWeekday, this.color(), this.seriesName()) : null;
  });
  protected readonly weekdayTable = computed<ChartTable | null>(() => {
    const d = this.r();
    if (!d) return null;
    const names = this.weekdays();
    return { columns: [this.i18n.t('common.date'), this.i18n.t('common.total')], rows: d.byWeekday.map((v, i) => [names[i], this.f.money(v)]), numeric: [1] };
  });

  private named(items: RankedItem[]) {
    return items.map((x) => ({ ...x, name: x.name || this.i18n.t('common.uncategorized') }));
  }
  protected rankOptions(items: RankedItem[]) {
    return rankingBarsOption(this.f, this.named(items), this.color());
  }
  protected rankTable(items: RankedItem[]): ChartTable {
    return { columns: [this.i18n.t('ranking.name'), this.i18n.t('ranking.count'), this.i18n.t('common.total')], rows: this.named(items).map((x) => [x.name, String(x.count), this.f.money(x.value)]), numeric: [1, 2] };
  }

  /** Back to the first page when the account or the period changes. */
  protected readonly page = linkedSignal({ source: () => [this.id(), this.r()], computation: () => 1 });
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil((this.r()?.rows.length ?? 0) / PAGE_SIZE)));
  protected readonly pageRows = computed(() => (this.r()?.rows ?? []).slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE));

  /** The asset account on the other side: where an expense was paid from, or an income received. */
  protected assetName(tx: TxRow): string {
    return (this.kind() === 'income' ? tx.destination : tx.source).name;
  }

  /** Only single-part expenses and income are edited in SpaceFly. */
  protected editable(tx: TxRow): boolean {
    return tx.splitCount === 1 && ['withdrawal', 'deposit'].includes(tx.type);
  }

  protected openDay(date: string): void {
    this.detail.open(this.f.date(date, 'full'), { start: date, end: date, counterparty: this.id() });
  }

  protected goBack(): void {
    this.back.back(this.kind() === 'income' ? '/accounts/revenue' : '/accounts/expense');
  }
}
