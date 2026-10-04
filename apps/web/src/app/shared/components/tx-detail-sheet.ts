import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Money } from './money';
import { TransactionList } from './transaction-list';
import { txDetailViewModel } from '@spacefly/client/features/transactions/tx-detail.vm';

/** Right-hand sheet listing the transactions behind a clicked chart element / row, grouped by type and category. */
@Component({
  selector: 'sf-tx-detail-sheet',
  imports: [HlmSheetImports, HlmSkeleton, TranslocoPipe, Money, TransactionList, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-sheet side="right" [state]="vm.open() ? 'open' : 'closed'" (closed)="vm.detail.close()">
      <hlm-sheet-content *hlmSheetPortal="let ctx" class="w-full gap-0 p-0 sm:max-w-xl">
        <hlm-sheet-header class="border-b border-border px-5 pb-4 pt-5">
          <h2 hlmSheetTitle class="pr-8 text-base">{{ vm.req()?.title }}</h2>
          <p hlmSheetDescription class="text-xs">
            {{ vm.req()?.subtitle ?? '' }} {{ vm.range().start | fdate: 'short' }} – {{ vm.range().end | fdate: 'long' }}
          </p>
          @if (vm.data(); as d) {
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
          @if (vm.req()?.breakdown; as rows) {
            <section class="mb-4 rounded-lg border border-border/70">
              <h3 class="eyebrow px-3 pt-2.5">{{ 'tx.breakdown' | transloco }}</h3>
              <ul class="p-1.5">
                @for (r of rows; track r.id ?? 'none') {
                  <li>
                    <button type="button" class="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left text-sm hover:bg-muted" (click)="vm.drill(r)">
                      <span class="flex-1 truncate">{{ r.name }}</span>
                      <sf-money [value]="r.value" />
                    </button>
                  </li>
                }
              </ul>
            </section>
          }
          @if (vm.res.isLoading() && !vm.data()) {
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <div hlmSkeleton class="my-3 h-10 w-full"></div>
            }
          } @else {
            @for (g of vm.groups(); track g.key) {
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
  protected readonly vm = txDetailViewModel();
  private readonly router = inject(Router);

  constructor() {
    // Going to another page (an edit form, say) leaves the sheet behind; changing only the query string doesn't.
    this.router.events
      .pipe(
        filter((e): e is NavigationStart => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        if (e.url.split('?')[0] !== this.router.url.split('?')[0]) this.vm.detail.close();
      });
  }
}
