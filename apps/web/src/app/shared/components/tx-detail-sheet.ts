import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Report, TxListResponse, TxRow } from '@spacefly/shared';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { FiltersStore } from '@spacefly/client/state/filters.store';
import { Money } from './money';
import { TransactionList } from './transaction-list';
import { TxDetailService, type BreakdownRow } from '@spacefly/client/state/tx-detail.service';

interface Group {
  key: string;
  type: string;
  category: string | null;
  total: number;
  rows: TxRow[];
}

/** Right-hand sheet listing the transactions behind a clicked chart element / row, grouped by type and category. */
@Component({
  selector: 'sf-tx-detail-sheet',
  imports: [HlmSheetImports, HlmSkeleton, TranslocoPipe, Money, TransactionList, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-sheet side="right" [state]="open() ? 'open' : 'closed'" (closed)="detail.close()">
      <hlm-sheet-content *hlmSheetPortal="let ctx" class="w-full gap-0 p-0 sm:max-w-xl">
        <hlm-sheet-header class="border-b border-border px-5 pb-4 pt-5">
          <h2 hlmSheetTitle class="pr-8 text-base">{{ req()?.title }}</h2>
          <p hlmSheetDescription class="text-xs">
            {{ req()?.subtitle ?? '' }} {{ range().start | fdate: 'short' }} – {{ range().end | fdate: 'long' }}
          </p>
          @if (data(); as d) {
            <div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              @if (d.totals.income) {
                <div><span class="eyebrow mr-2">{{ 'common.income' | transloco }}</span><sf-money [value]="d.totals.income" tone="income" /></div>
              }
              @if (d.totals.expense) {
                <div><span class="eyebrow mr-2">{{ 'common.expenses' | transloco }}</span><sf-money [value]="-d.totals.expense" tone="expense" /></div>
              }
              <div class="text-muted-foreground"><span class="eyebrow mr-2">{{ 'tx.count' | transloco }}</span>{{ d.rows.length }}</div>
            </div>
          }
        </hlm-sheet-header>
        <div class="flex-1 overflow-y-auto px-5 py-3">
          @if (req()?.breakdown; as rows) {
            <section class="mb-4 rounded-lg border border-border/70">
              <h3 class="eyebrow px-3 pt-2.5">{{ 'tx.breakdown' | transloco }}</h3>
              <ul class="p-1.5">
                @for (r of rows; track r.id ?? 'none') {
                  <li>
                    <button type="button" class="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left text-sm hover:bg-muted" (click)="drill(r)">
                      <span class="flex-1 truncate">{{ r.name }}</span>
                      <sf-money [value]="r.value" />
                    </button>
                  </li>
                }
              </ul>
            </section>
          }
          @if (res.isLoading() && !data()) {
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <div hlmSkeleton class="my-3 h-10 w-full"></div>
            }
          } @else {
            @for (g of groups(); track g.key) {
              <section class="mb-4">
                <header class="sticky top-0 z-10 flex items-center justify-between bg-popover py-1.5">
                  <span class="eyebrow">{{ 'txType.' + g.type | transloco }} · {{ g.category || ('common.uncategorized' | transloco) }}</span>
                  <sf-money class="text-xs" [value]="g.total" />
                </header>
                <sf-transaction-list [rows]="g.rows" [showCategory]="false" />
              </section>
            } @empty {
              <p class="py-10 text-center text-sm text-muted-foreground">{{ 'tx.none' | transloco }}</p>
            }
          }
        </div>
      </hlm-sheet-content>
    </hlm-sheet>
  `,
})
export class TxDetailSheet {
  protected readonly detail = inject(TxDetailService);
  private readonly filters = inject(FiltersStore);
  private readonly router = inject(Router);
  protected readonly req = this.detail.request;

  constructor() {
    // Going to another page (an edit form, say) leaves the sheet behind; changing only the query string doesn't.
    this.router.events
      .pipe(
        filter((e): e is NavigationStart => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        if (e.url.split('?')[0] !== this.router.url.split('?')[0]) this.detail.close();
      });
  }
  protected readonly open = computed(() => this.req() !== null);
  protected readonly range = computed(() => ({
    start: this.req()?.filter.start ?? this.filters.period().start,
    end: this.req()?.filter.end ?? this.filters.period().end,
  }));

  protected readonly res = httpResource<Report<TxListResponse>>(() => {
    const r = this.req();
    if (!r) return undefined;
    const params: Record<string, string | number> = { currency: this.filters.currency(), _r: this.filters.refreshTick(), ...this.range() };
    for (const [k, v] of Object.entries(r.filter)) if (v !== undefined && v !== null && v !== '') params[k] = String(v);
    return { url: '/api/transactions', params };
  });
  protected readonly data = computed(() => (this.res.hasValue() ? this.res.value()?.data : undefined));

  /** Narrows a grouped request down to one of its members, keeping the same period and type. */
  protected drill(row: BreakdownRow): void {
    const { type, start, end } = this.req()?.filter ?? {};
    this.detail.open(row.name, { category: row.id ?? 'none', ...(type && { type }), ...(start && { start }), ...(end && { end }) });
  }

  protected readonly groups = computed<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const tx of this.data()?.rows ?? []) {
      const key = `${tx.type}|${tx.category?.id ?? ''}`;
      const g = map.get(key) ?? { key, type: tx.type, category: tx.category?.name ?? null, total: 0, rows: [] };
      g.total += tx.type === 'withdrawal' ? -tx.amount : tx.amount;
      g.rows.push(tx);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  });
}
