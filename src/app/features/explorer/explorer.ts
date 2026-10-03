import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowUpDown, lucideChevronLeft, lucideChevronRight, lucideExternalLink, lucideFileSpreadsheet, lucideSearch, lucideX } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Report, SearchResponse, TxListResponse, TxRow } from '@shared';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { FormatService } from '../../core/format/format.service';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { I18n } from '../../core/i18n/i18n';
import { FiltersStore } from '../../core/state/filters.store';
import { MetaStore } from '../../core/state/meta.store';
import { EmptyState } from '../../shared/components/empty-state';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { Select } from '../../shared/components/select';
import { TransactionList } from '../../shared/components/transaction-list';

type SortKey = 'date' | 'description' | 'amount' | 'category';
const PAGE_SIZE = 50;

/**
 * Transaction explorer: the period's ledger with filters, sort, pagination and CSV export,
 * or Firefly's own search (`/v1/search/transactions`, full Firefly query syntax).
 */
@Component({
  selector: 'sf-explorer',
  imports: [
    FormsModule,
    NgIcon,
    TranslocoPipe,
    HlmBadge,
    HlmButton,
    HlmInput,
    HlmSkeleton,
    HlmTableImports,
    HlmToggleGroupImports,
    HlmTooltip,
    EmptyState,
    Money,
    PageHeader,
    Select,
    TransactionList,
    ...FORMAT_PIPES,
  ],
  providers: [provideIcons({ lucideSearch, lucideX, lucideFileSpreadsheet, lucideArrowUpDown, lucideChevronLeft, lucideChevronRight, lucideExternalLink })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.explorer')" [description]="i18n.t('explorer.description')">
      <button hlmBtn variant="outline" size="sm" (click)="exportCsv()" [disabled]="!sorted().length">
        <ng-icon name="lucideFileSpreadsheet" />{{ 'explorer.export' | transloco }}
      </button>
    </sf-page-header>

    <div class="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <form class="flex gap-2" (ngSubmit)="submitSearch()">
        <div class="relative flex-1">
          <ng-icon name="lucideSearch" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            hlmInput
            class="h-9 w-full pl-8 pr-8"
            name="q"
            [(ngModel)]="draft"
            [placeholder]="i18n.t('explorer.searchPlaceholder')"
            [attr.aria-label]="i18n.t('explorer.search')"
          />
          @if (draft) {
            <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" (click)="clearSearch()" [attr.aria-label]="i18n.t('explorer.clear')">
              <ng-icon name="lucideX" />
            </button>
          }
        </div>
        <button hlmBtn size="sm" class="h-9" type="submit">{{ 'explorer.search' | transloco }}</button>
      </form>
      <div class="flex flex-wrap items-center gap-2">
        <label class="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" class="accent-[var(--primary)]" [checked]="useFirefly()" (change)="useFirefly.set($any($event.target).checked)" />
          <span [hlmTooltip]="i18n.t('explorer.fireflySyntaxHint')">{{ 'explorer.fireflySyntax' | transloco }}</span>
        </label>
        @if (!searching()) {
          <hlm-toggle-group type="single" variant="outline" size="sm" [value]="type()" (valueChange)="type.set($any($event) ?? '')">
            <button hlmToggleGroupItem value="withdrawal" class="text-xs">{{ 'txType.withdrawal' | transloco }}</button>
            <button hlmToggleGroupItem value="deposit" class="text-xs">{{ 'txType.deposit' | transloco }}</button>
            <button hlmToggleGroupItem value="transfer" class="text-xs">{{ 'txType.transfer' | transloco }}</button>
          </hlm-toggle-group>
          <sf-select class="w-44" [options]="categoryOptions()" [placeholder]="i18n.t('calendar.allCategories')" [label]="i18n.t('common.category')" [(value)]="category" />
          <sf-select class="w-40" [options]="budgetOptions()" [placeholder]="i18n.t('explorer.allBudgets')" [label]="i18n.t('common.budget')" [(value)]="budget" />
          <sf-select class="w-40" [options]="accountOptions()" [placeholder]="i18n.t('calendar.allAccounts')" [label]="i18n.t('common.account')" [(value)]="account" />
          <sf-select class="w-36" [options]="tagOptions()" [placeholder]="i18n.t('calendar.allTags')" [label]="i18n.t('common.tag')" [(value)]="tag" />
        }
      </div>
    </div>

    @if (!searching() && listData(); as d) {
      <div class="flex flex-wrap gap-x-6 gap-y-1 px-1 text-sm">
        <span><span class="eyebrow mr-2">{{ 'tx.count' | transloco }}</span><span class="num">{{ sorted().length }}</span></span>
        <span><span class="eyebrow mr-2">{{ 'common.income' | transloco }}</span><sf-money [value]="d.totals.income" tone="income" /></span>
        <span><span class="eyebrow mr-2">{{ 'common.expenses' | transloco }}</span><sf-money [value]="-d.totals.expense" tone="expense" /></span>
      </div>
    }
    @if (searching() && searchData(); as s) {
      <div class="px-1 text-sm text-muted-foreground">{{ 'explorer.results' | transloco: { n: s.total } }}</div>
    }

    <section class="rounded-xl border border-border bg-card">
      @if (loading() && !pageRows().length) {
        <div class="flex flex-col gap-2 p-4">
          @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
            <div hlmSkeleton class="h-9 w-full"></div>
          }
        </div>
      } @else if (!pageRows().length) {
        <sf-empty [title]="i18n.t('tx.none')" />
      } @else {
        <!-- Cards on phones -->
        <div class="px-4 sm:hidden"><sf-transaction-list [rows]="pageRows()" /></div>
        <!-- Data table from sm -->
        <div hlmTableContainer class="hidden sm:block">
          <table hlmTable class="text-sm">
            <thead hlmTHead>
              <tr hlmTr>
                @for (col of columns; track col.key) {
                  <th hlmTh [class.text-right]="col.key === 'amount'">
                    @if (!searching()) {
                      <button type="button" class="inline-flex items-center gap-1 hover:text-foreground" (click)="sortBy(col.key)" [attr.aria-sort]="sortKey() === col.key ? (sortDir() === 1 ? 'ascending' : 'descending') : null">
                        {{ col.label | transloco }}<ng-icon name="lucideArrowUpDown" class="text-xs opacity-60" />
                      </button>
                    } @else {
                      {{ col.label | transloco }}
                    }
                  </th>
                }
                <th hlmTh>{{ 'common.account' | transloco }}</th>
                <th hlmTh class="w-8"><span class="sr-only">Firefly</span></th>
              </tr>
            </thead>
            <tbody hlmTBody>
              @for (tx of pageRows(); track tx.id) {
                <tr hlmTr>
                  <td hlmTd class="num whitespace-nowrap text-xs text-muted-foreground">{{ tx.date | fdate: 'short' }} {{ tx.date.slice(0, 4) }}</td>
                  <td hlmTd class="max-w-[22rem]">
                    <div class="truncate font-medium">{{ tx.description }}</div>
                    <div class="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                      @if (tx.budget) {
                        <span hlmBadge variant="secondary" class="h-4 px-1.5 text-[10px]">{{ tx.budget.name }}</span>
                      }
                      @for (t of tx.tags; track t) {
                        <span>#{{ t }}</span>
                      }
                    </div>
                  </td>
                  <td hlmTd class="text-xs">{{ tx.category?.name || ('common.uncategorized' | transloco) }}</td>
                  <td hlmTd class="text-right">
                    <sf-money
                      [value]="tx.type === 'withdrawal' ? -tx.amount : tx.amount"
                      [signed]="tx.type !== 'transfer'"
                      [tone]="tx.type === 'withdrawal' ? 'expense' : tx.type === 'deposit' ? 'income' : 'none'"
                      [original]="tx.rate === 1 ? null : { amount: (tx.type === 'withdrawal' ? -1 : 1) * tx.originalAmount, currency: tx.originalCurrency, rate: tx.rate }"
                    />
                  </td>
                  <td hlmTd class="max-w-[16rem] truncate text-xs text-muted-foreground">{{ tx.source.name }} → {{ tx.destination.name }}</td>
                  <td hlmTd>
                    @if (fireflyLink(tx); as url) {
                      <a [href]="url" target="_blank" rel="noopener" class="text-muted-foreground hover:text-foreground" [attr.aria-label]="'tx.openInFirefly' | transloco">
                        <ng-icon name="lucideExternalLink" />
                      </a>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <footer class="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>{{ 'explorer.page' | transloco: { page: page(), pages: totalPages() } }}</span>
          <div class="flex gap-1">
            <button hlmBtn variant="ghost" size="icon-sm" [disabled]="page() <= 1" (click)="page.set(page() - 1)" [attr.aria-label]="'period.previous' | transloco"><ng-icon name="lucideChevronLeft" /></button>
            <button hlmBtn variant="ghost" size="icon-sm" [disabled]="page() >= totalPages()" (click)="page.set(page() + 1)" [attr.aria-label]="'period.next' | transloco"><ng-icon name="lucideChevronRight" /></button>
          </div>
        </footer>
      }
    </section>
  `,
})
export class Explorer {
  protected readonly i18n = inject(I18n);
  private readonly f = inject(FormatService);
  private readonly filters = inject(FiltersStore);
  private readonly meta = inject(MetaStore);

  protected draft = '';
  protected readonly query = signal('');
  protected readonly useFirefly = signal(false);
  protected readonly type = signal('');
  protected readonly category = signal('');
  protected readonly budget = signal('');
  protected readonly account = signal('');
  protected readonly tag = signal('');
  protected readonly sortKey = signal<SortKey>('date');
  protected readonly sortDir = signal<1 | -1>(-1);
  /** Resets to page 1 whenever the inputs change. */
  protected readonly page = linkedSignal({
    source: () => [this.query(), this.useFirefly(), this.type(), this.category(), this.budget(), this.account(), this.tag(), this.filters.query()],
    computation: () => 1,
  });

  protected readonly searching = computed(() => this.useFirefly() && this.query().length > 0);

  protected readonly columns: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'common.date' },
    { key: 'description', label: 'explorer.descriptionCol' },
    { key: 'category', label: 'common.category' },
    { key: 'amount', label: 'common.amount' },
  ];

  private readonly listRes = httpResource<Report<TxListResponse>>(() => {
    if (this.searching()) return undefined;
    const params: Record<string, string | number> = { ...this.filters.query() };
    const extra = { type: this.type(), category: this.category(), budget: this.budget(), account: this.account(), tag: this.tag(), q: this.query() };
    for (const [k, v] of Object.entries(extra)) if (v) params[k] = v;
    return { url: '/api/transactions', params };
  });
  private readonly searchRes = httpResource<Report<SearchResponse>>(() =>
    this.searching()
      ? { url: '/api/search', params: { query: this.query(), page: this.page(), limit: PAGE_SIZE, currency: this.filters.currency(), _r: this.filters.refreshTick() } }
      : undefined,
  );

  protected readonly listData = computed(() => (this.listRes.hasValue() ? this.listRes.value()?.data : undefined));
  protected readonly searchData = computed(() => (this.searchRes.hasValue() ? this.searchRes.value()?.data : undefined));
  protected readonly loading = computed(() => this.listRes.isLoading() || this.searchRes.isLoading());

  protected readonly sorted = computed<TxRow[]>(() => {
    if (this.searching()) return this.searchData()?.rows ?? [];
    const rows = [...(this.listData()?.rows ?? [])];
    const dir = this.sortDir();
    const key = this.sortKey();
    const signed = (t: TxRow) => (t.type === 'withdrawal' ? -t.amount : t.amount);
    rows.sort((a, b) => {
      switch (key) {
        case 'amount':
          return (signed(a) - signed(b)) * dir;
        case 'description':
          return a.description.localeCompare(b.description) * dir;
        case 'category':
          return (a.category?.name ?? '').localeCompare(b.category?.name ?? '') * dir;
        default:
          return a.date.localeCompare(b.date) * dir || a.id.localeCompare(b.id) * dir;
      }
    });
    return rows;
  });

  protected readonly totalPages = computed(() =>
    this.searching() ? (this.searchData()?.totalPages ?? 1) : Math.max(1, Math.ceil(this.sorted().length / PAGE_SIZE)),
  );
  protected readonly pageRows = computed(() =>
    this.searching() ? this.sorted() : this.sorted().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE),
  );

  protected readonly categoryOptions = computed(() => [
    { value: 'none', label: this.i18n.t('common.uncategorized') },
    ...(this.meta.lookups()?.categories ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]);
  protected readonly budgetOptions = computed(() => [
    { value: 'none', label: this.i18n.t('common.noBudget') },
    ...(this.meta.lookups()?.budgets ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]);
  protected readonly accountOptions = computed(() => (this.meta.lookups()?.accounts ?? []).map((a) => ({ value: a.id, label: a.name })));
  protected readonly tagOptions = computed(() => (this.meta.lookups()?.tags ?? []).map((t) => ({ value: t.name, label: t.name })));

  protected submitSearch(): void {
    this.query.set(this.draft.trim());
  }

  protected clearSearch(): void {
    this.draft = '';
    this.query.set('');
  }

  protected sortBy(key: SortKey): void {
    if (this.sortKey() === key) this.sortDir.set(this.sortDir() === 1 ? -1 : 1);
    else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'date' || key === 'amount' ? -1 : 1);
    }
  }

  protected fireflyLink(tx: TxRow): string | null {
    return this.meta.fireflyUrl(`/transactions/show/${tx.groupId}`);
  }

  /** CSV of everything currently listed (all pages), amounts in the display currency + original. */
  protected exportCsv(): void {
    const cur = this.filters.currency();
    const header = ['date', 'type', 'description', 'category', 'budget', 'tags', 'source', 'destination', `amount_${cur}`, 'original_amount', 'original_currency', 'rate'];
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = this.sorted().map((t) =>
      [
        t.date,
        t.type,
        t.description,
        t.category?.name ?? '',
        t.budget?.name ?? '',
        t.tags.join('|'),
        t.source.name,
        t.destination.name,
        (t.type === 'withdrawal' ? -t.amount : t.amount).toFixed(2),
        t.originalAmount.toFixed(2),
        t.originalCurrency,
        t.rate.toFixed(6),
      ]
        .map(esc)
        .join(','),
    );
    const blob = new Blob([`﻿${[header.join(','), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const p = this.filters.period();
    a.download = `spacefly-${p.start}_${p.end}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
