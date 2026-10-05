import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowUpDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideEllipsis,
  lucideExternalLink,
  lucideFileSpreadsheet,
  lucidePencil,
  lucidePlus,
  lucideSearch,
  lucideTrash2,
  lucideX,
} from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { explorerViewModel } from '@spacefly/client/features/transactions/explorer.vm';
import { EmptyState } from '../../shared/components/empty-state';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { Select } from '../../shared/components/select';
import { TransactionList } from '../../shared/components/transaction-list';

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
    RouterLink,
    HlmButton,
    HlmDropdownMenuImports,
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
  providers: [
    provideIcons({
      lucideSearch,
      lucideX,
      lucideFileSpreadsheet,
      lucideArrowUpDown,
      lucideChevronLeft,
      lucideChevronRight,
      lucideExternalLink,
      lucideEllipsis,
      lucidePencil,
      lucidePlus,
      lucideTrash2,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t('nav.explorer')" [description]="vm.i18n.t('explorer.description')">
      <a hlmBtn size="sm" routerLink="/transactions/new"><ng-icon name="lucidePlus" aria-hidden="true" />{{ 'editor.tx.new' | transloco }}</a>
      <button hlmBtn variant="outline" size="sm" (click)="exportCsv()" [disabled]="!vm.sorted().length || vm.privacy.hidden()" [attr.title]="vm.privacy.hidden() ? ('explorer.exportHidden' | transloco) : null">
        <ng-icon name="lucideFileSpreadsheet" />{{ 'explorer.export' | transloco }}
      </button>
    </sf-page-header>

    <div class="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <form class="flex gap-2" (ngSubmit)="vm.submitSearch()">
        <div class="relative flex-1">
          <ng-icon name="lucideSearch" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            hlmInput
            class="h-9 w-full pl-8 pr-8"
            name="q"
            [(ngModel)]="vm.draft"
            [placeholder]="vm.i18n.t('explorer.searchPlaceholder')"
            [attr.aria-label]="vm.i18n.t('explorer.search')"
          />
          @if (vm.draft()) {
            <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" (click)="vm.clearSearch()" [attr.aria-label]="vm.i18n.t('explorer.clear')">
              <ng-icon name="lucideX" />
            </button>
          }
        </div>
        <button hlmBtn size="sm" class="h-9" type="submit">{{ 'explorer.search' | transloco }}</button>
      </form>
      <div class="flex flex-wrap items-center gap-2">
        <label class="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" class="accent-[var(--primary)]" [checked]="vm.useFirefly()" (change)="vm.useFirefly.set($any($event.target).checked)" />
          <span [hlmTooltip]="vm.i18n.t('explorer.fireflySyntaxHint')">{{ 'explorer.fireflySyntax' | transloco }}</span>
        </label>
        @if (!vm.searching()) {
          <hlm-toggle-group type="single" variant="outline" size="sm" [value]="vm.type()" (valueChange)="vm.type.set($any($event) ?? '')">
            <button hlmToggleGroupItem value="withdrawal" class="text-xs">{{ 'txType.withdrawal' | transloco }}</button>
            <button hlmToggleGroupItem value="deposit" class="text-xs">{{ 'txType.deposit' | transloco }}</button>
            <button hlmToggleGroupItem value="transfer" class="text-xs">{{ 'txType.transfer' | transloco }}</button>
          </hlm-toggle-group>
          <sf-select class="w-44" [options]="vm.categoryOptions()" [placeholder]="vm.i18n.t('calendar.allCategories')" [label]="vm.i18n.t('common.category')" [(value)]="vm.category" />
          <sf-select class="w-40" [options]="vm.budgetOptions()" [placeholder]="vm.i18n.t('explorer.allBudgets')" [label]="vm.i18n.t('common.budget')" [(value)]="vm.budget" />
          <sf-select class="w-40" [options]="vm.accountOptions()" [placeholder]="vm.i18n.t('calendar.allAccounts')" [label]="vm.i18n.t('common.account')" [(value)]="vm.account" />
          <sf-select class="w-36" [options]="vm.tagOptions()" [placeholder]="vm.i18n.t('calendar.allTags')" [label]="vm.i18n.t('common.tag')" [(value)]="vm.tag" />
        }
      </div>
    </div>

    @if (!vm.searching() && vm.listData(); as d) {
      <div class="flex flex-wrap gap-x-6 gap-y-1 px-1 text-sm">
        <span><span class="eyebrow mr-2">{{ 'tx.count' | transloco }}</span><span class="num">{{ vm.sorted().length }}</span></span>
        <span><span class="eyebrow mr-2">{{ 'common.income' | transloco }}</span><sf-money [value]="d.totals.income" tone="income" /></span>
        <span><span class="eyebrow mr-2">{{ 'common.expenses' | transloco }}</span><sf-money [value]="-d.totals.expense" tone="expense" /></span>
      </div>
    }
    @if (vm.searching() && vm.searchData(); as s) {
      <div class="px-1 text-sm text-muted-foreground">{{ 'explorer.results' | transloco: { n: s.total } }}</div>
    }

    <section class="rounded-xl border border-border bg-card">
      @if (vm.loading() && !vm.pageRows().length) {
        <div class="flex flex-col gap-2 p-4">
          @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
            <div hlmSkeleton class="h-9 w-full"></div>
          }
        </div>
      } @else if (!vm.pageRows().length) {
        <sf-empty [title]="vm.i18n.t('tx.none')" />
      } @else {
        <!-- Cards on phones -->
        <div class="px-4 sm:hidden"><sf-transaction-list [rows]="vm.pageRows()" /></div>
        <!-- Data table from sm -->
        <div hlmTableContainer class="hidden sm:block">
          <table hlmTable class="text-sm">
            <thead hlmTHead>
              <tr hlmTr>
                @for (col of vm.columns; track col.key) {
                  <th hlmTh [class.text-right]="col.key === 'amount'">
                    @if (!vm.searching()) {
                      <button type="button" class="inline-flex items-center gap-1 hover:text-foreground" (click)="vm.sortBy(col.key)" [attr.aria-sort]="vm.sortKey() === col.key ? (vm.sortDir() === 1 ? 'ascending' : 'descending') : null">
                        {{ col.label | transloco }}<ng-icon name="lucideArrowUpDown" class="text-xs opacity-60" />
                      </button>
                    } @else {
                      {{ col.label | transloco }}
                    }
                  </th>
                }
                <th hlmTh>{{ 'common.account' | transloco }}</th>
                <th hlmTh class="w-8"><span class="sr-only">{{ 'editor.tx.actions' | transloco }}</span></th>
              </tr>
            </thead>
            <tbody hlmTBody>
              @for (tx of vm.pageRows(); track tx.id) {
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
                      [showOriginal]="true"
                      [tone]="tx.type === 'withdrawal' ? 'expense' : tx.type === 'deposit' ? 'income' : 'none'"
                      [original]="tx.rate === 1 ? null : { amount: (tx.type === 'withdrawal' ? -1 : 1) * tx.originalAmount, currency: tx.originalCurrency, rate: tx.rate }"
                    />
                  </td>
                  <td hlmTd class="max-w-[16rem] truncate text-xs text-muted-foreground">{{ tx.source.name }} → {{ tx.destination.name }}</td>
                  <td hlmTd>
                    <button hlmBtn variant="ghost" size="icon-sm" [hlmDropdownMenuTrigger]="rowMenu" align="end" [attr.aria-label]="'editor.tx.actions' | transloco">
                      <ng-icon name="lucideEllipsis" aria-hidden="true" />
                    </button>
                    <ng-template #rowMenu>
                      <hlm-dropdown-menu class="w-52">
                        @if (vm.editable(tx)) {
                          <a hlmDropdownMenuItem [routerLink]="['/transactions', tx.groupId, 'edit']"><ng-icon name="lucidePencil" aria-hidden="true" />{{ 'editor.tx.edit' | transloco }}</a>
                        } @else if (vm.fireflyEditLink(tx); as url) {
                          <a hlmDropdownMenuItem [href]="url" target="_blank" rel="noopener"><ng-icon name="lucidePencil" aria-hidden="true" />{{ 'editor.tx.editInFirefly' | transloco }}</a>
                        }
                        @if (vm.fireflyLink(tx); as url) {
                          <a hlmDropdownMenuItem [href]="url" target="_blank" rel="noopener"><ng-icon name="lucideExternalLink" aria-hidden="true" />{{ 'tx.openInFirefly' | transloco }}</a>
                        }
                        <hlm-dropdown-menu-separator />
                        <button hlmDropdownMenuItem class="text-destructive" (triggered)="vm.remove(tx)"><ng-icon name="lucideTrash2" aria-hidden="true" />{{ 'forms.delete' | transloco }}</button>
                      </hlm-dropdown-menu>
                    </ng-template>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <footer class="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>{{ 'explorer.page' | transloco: { page: vm.page(), pages: vm.totalPages() } }}</span>
          <div class="flex gap-1">
            <button hlmBtn variant="ghost" size="icon-sm" [disabled]="vm.page() <= 1" (click)="vm.page.set(vm.page() - 1)" [attr.aria-label]="'period.previous' | transloco"><ng-icon name="lucideChevronLeft" /></button>
            <button hlmBtn variant="ghost" size="icon-sm" [disabled]="vm.page() >= vm.totalPages()" (click)="vm.page.set(vm.page() + 1)" [attr.aria-label]="'period.next' | transloco"><ng-icon name="lucideChevronRight" /></button>
          </div>
        </footer>
      }
    </section>
  `,
})
export class Explorer {
  protected readonly vm = explorerViewModel();

  /** The file download is browser-only; the CSV text itself comes from the view-model. */
  protected exportCsv(): void {
    const csv = this.vm.csv();
    if (!csv) return;
    const blob = new Blob([csv.text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = csv.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
