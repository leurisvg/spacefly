import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { RouterLink } from '@angular/router';
import { lucideArrowRightLeft, lucideExternalLink, lucidePencil } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import type { TxRow } from '@spacefly/shared';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { MetaStore } from '../../core/state/meta.store';
import { Money } from './money';

/** Transactions as a responsive list (cards on mobile, aligned columns from `sm`). */
@Component({
  selector: 'sf-transaction-list',
  imports: [NgIcon, RouterLink, TranslocoPipe, HlmBadge, Money, ...FORMAT_PIPES],
  providers: [provideIcons({ lucideExternalLink, lucideArrowRightLeft, lucidePencil })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ul class="divide-y divide-border/70" role="list">
      @for (tx of rows(); track tx.id) {
        <li class="group flex items-start gap-3 py-2.5">
          <div class="w-12 shrink-0 pt-0.5 text-xs text-muted-foreground num">{{ tx.date | fdate: 'short' }}</div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="truncate text-sm font-medium">{{ tx.description }}</span>
              @if (editable(tx)) {
                <a
                  [routerLink]="['/transactions', tx.groupId, 'edit']"
                  class="text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                  [attr.aria-label]="'editor.tx.edit' | transloco"
                >
                  <ng-icon name="lucidePencil" class="text-xs" />
                </a>
              } @else if (fireflyEditUrl(tx); as url) {
                <a
                  [href]="url"
                  target="_blank"
                  rel="noopener"
                  class="text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                  [attr.aria-label]="'editor.tx.editInFirefly' | transloco"
                >
                  <ng-icon name="lucidePencil" class="text-xs" />
                </a>
              }
              @if (fireflyUrl(tx); as url) {
                <a
                  [href]="url"
                  target="_blank"
                  rel="noopener"
                  class="text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                  [attr.aria-label]="'tx.openInFirefly' | transloco"
                >
                  <ng-icon name="lucideExternalLink" class="text-xs" />
                </a>
              }
            </div>
            <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span class="truncate">{{ tx.source.name }} → {{ tx.destination.name }}</span>
              @if (showCategory()) {
                <span hlmBadge variant="outline" class="h-4 px-1.5 text-[10px]">{{ tx.category?.name || ('common.uncategorized' | transloco) }}</span>
              }
              @if (tx.budget) {
                <span hlmBadge variant="secondary" class="h-4 px-1.5 text-[10px]">{{ tx.budget.name }}</span>
              }
              @for (tag of tx.tags; track tag) {
                <span class="text-[10px]">#{{ tag }}</span>
              }
            </div>
          </div>
          <div class="shrink-0 text-right text-sm">
            @if (tx.type === 'transfer') {
              <span class="inline-flex items-center gap-1 text-muted-foreground">
                <ng-icon name="lucideArrowRightLeft" class="text-xs" />
                <sf-money [value]="tx.amount" [original]="original(tx)" />
              </span>
            } @else {
              <sf-money
                [value]="tx.type === 'withdrawal' ? -tx.amount : tx.amount"
                [signed]="true"
                [tone]="tx.type === 'withdrawal' ? 'expense' : 'income'"
                [original]="original(tx)"
              />
            }
          </div>
        </li>
      } @empty {
        <li class="py-8 text-center text-sm text-muted-foreground">{{ 'tx.none' | transloco }}</li>
      }
    </ul>
  `,
})
export class TransactionList {
  private readonly meta = inject(MetaStore);
  readonly rows = input.required<TxRow[]>();
  readonly showCategory = input(true);
  protected fireflyUrl(tx: TxRow): string | null {
    return this.meta.fireflyUrl(`/transactions/show/${tx.groupId}`);
  }

  /** Only single-part expenses, income and transfers are edited in SpaceFly. */
  protected editable(tx: TxRow): boolean {
    return tx.splitCount === 1 && ['withdrawal', 'deposit', 'transfer'].includes(tx.type);
  }

  protected fireflyEditUrl(tx: TxRow): string | null {
    return this.meta.fireflyUrl(`/transactions/edit/${tx.groupId}`);
  }

  protected original(tx: TxRow) {
    if (tx.rate === 1) return null;
    const sign = tx.type === 'withdrawal' ? -1 : 1;
    return { amount: sign * tx.originalAmount, currency: tx.originalCurrency, rate: tx.rate };
  }
}
