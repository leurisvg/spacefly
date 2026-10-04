import { httpResource } from '@angular/common/http';
import { computed, inject, linkedSignal, signal } from '@angular/core';
import type { Report, SearchResponse, TxListResponse, TxRow } from '@spacefly/shared';
import { WriteApi } from '../../api/write-api';
import { I18n } from '../../i18n/i18n';
import { Confirm } from '../../platform/confirm';
import { Toast } from '../../platform/toast';
import { FiltersStore } from '../../state/filters.store';
import { MetaStore } from '../../state/meta.store';
import { PrivacyStore } from '../../state/privacy.store';

export type SortKey = 'date' | 'description' | 'amount' | 'category';
export const EXPLORER_PAGE_SIZE = 50;

/** Amount with the sign the ledger shows: expenses negative. */
export const signedAmount = (t: Pick<TxRow, 'type' | 'amount'>): number => (t.type === 'withdrawal' ? -t.amount : t.amount);

/** Sorted copy of `rows`. Ties on date fall back to the id so the order is stable. */
export function sortTransactions(rows: readonly TxRow[], key: SortKey, dir: 1 | -1): TxRow[] {
  return [...rows].sort((a, b) => {
    switch (key) {
      case 'amount':
        return (signedAmount(a) - signedAmount(b)) * dir;
      case 'description':
        return a.description.localeCompare(b.description) * dir;
      case 'category':
        return (a.category?.name ?? '').localeCompare(b.category?.name ?? '') * dir;
      default:
        return a.date.localeCompare(b.date) * dir || a.id.localeCompare(b.id) * dir;
    }
  });
}

/** Direction a column starts in the first time it is chosen: newest / largest first, text A→Z. */
export const defaultSortDir = (key: SortKey): 1 | -1 => (key === 'date' || key === 'amount' ? -1 : 1);

const csvCell = (v: unknown): string => {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV (with BOM, for spreadsheets) of `rows`: amounts in the display currency plus the original. */
export function buildTransactionsCsv(rows: readonly TxRow[], currency: string): string {
  const header = ['date', 'type', 'description', 'category', 'budget', 'tags', 'source', 'destination', `amount_${currency}`, 'original_amount', 'original_currency', 'rate'];
  const lines = rows.map((t) =>
    [
      t.date,
      t.type,
      t.description,
      t.category?.name ?? '',
      t.budget?.name ?? '',
      t.tags.join('|'),
      t.source.name,
      t.destination.name,
      signedAmount(t).toFixed(2),
      t.originalAmount.toFixed(2),
      t.originalCurrency,
      t.rate.toFixed(6),
    ]
      .map(csvCell)
      .join(','),
  );
  return `\uFEFF${[header.join(','), ...lines].join('\n')}`;
}

/** Only single-part expenses, income and transfers are edited in SpaceFly. */
export const isEditable = (tx: Pick<TxRow, 'splitCount' | 'type'>): boolean => tx.splitCount === 1 && ['withdrawal', 'deposit', 'transfer'].includes(tx.type);

/**
 * Transaction explorer: the period's ledger with filters, sort and pagination, or Firefly's own search
 * (`/v1/search/transactions`, full Firefly query syntax). Call it in an injection context.
 */
export function explorerViewModel() {
  const i18n = inject(I18n);
  const filters = inject(FiltersStore);
  const meta = inject(MetaStore);
  const privacy = inject(PrivacyStore);
  const writes = inject(WriteApi);
  const confirm = inject(Confirm);
  const toast = inject(Toast);

  /** What is typed in the search box; `query` only changes on submit. */
  const draft = signal('');
  const query = signal('');
  const useFirefly = signal(false);
  const type = signal('');
  const category = signal('');
  const budget = signal('');
  const account = signal('');
  const tag = signal('');
  const sortKey = signal<SortKey>('date');
  const sortDir = signal<1 | -1>(-1);
  /** Resets to page 1 whenever the inputs change. */
  const page = linkedSignal({
    source: () => [query(), useFirefly(), type(), category(), budget(), account(), tag(), filters.query()],
    computation: () => 1,
  });

  const searching = computed(() => useFirefly() && query().length > 0);

  const columns: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'common.date' },
    { key: 'description', label: 'explorer.descriptionCol' },
    { key: 'category', label: 'common.category' },
    { key: 'amount', label: 'common.amount' },
  ];

  const listRes = httpResource<Report<TxListResponse>>(() => {
    if (searching()) return undefined;
    const params: Record<string, string | number> = { ...filters.query() };
    const extra = { type: type(), category: category(), budget: budget(), account: account(), tag: tag(), q: query() };
    for (const [k, v] of Object.entries(extra)) if (v) params[k] = v;
    return { url: '/api/transactions', params };
  });
  const searchRes = httpResource<Report<SearchResponse>>(() =>
    searching() ? { url: '/api/search', params: { query: query(), page: page(), limit: EXPLORER_PAGE_SIZE, currency: filters.currency(), _r: filters.refreshTick() } } : undefined,
  );

  const listData = computed(() => (listRes.hasValue() ? listRes.value()?.data : undefined));
  const searchData = computed(() => (searchRes.hasValue() ? searchRes.value()?.data : undefined));
  const loading = computed(() => listRes.isLoading() || searchRes.isLoading());

  const sorted = computed<TxRow[]>(() => (searching() ? (searchData()?.rows ?? []) : sortTransactions(listData()?.rows ?? [], sortKey(), sortDir())));
  const totalPages = computed(() => (searching() ? (searchData()?.totalPages ?? 1) : Math.max(1, Math.ceil(sorted().length / EXPLORER_PAGE_SIZE))));
  const pageRows = computed(() => (searching() ? sorted() : sorted().slice((page() - 1) * EXPLORER_PAGE_SIZE, page() * EXPLORER_PAGE_SIZE)));

  const categoryOptions = computed(() => [
    { value: 'none', label: i18n.t('common.uncategorized') },
    ...(meta.lookups()?.categories ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]);
  const budgetOptions = computed(() => [
    { value: 'none', label: i18n.t('common.noBudget') },
    ...(meta.lookups()?.budgets ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]);
  const accountOptions = computed(() => (meta.lookups()?.accounts ?? []).map((a) => ({ value: a.id, label: a.name })));
  const tagOptions = computed(() => (meta.lookups()?.tags ?? []).map((t) => ({ value: t.name, label: t.name })));

  return {
    i18n,
    privacy,
    draft,
    query,
    useFirefly,
    type,
    category,
    budget,
    account,
    tag,
    sortKey,
    sortDir,
    page,
    searching,
    columns,
    listData,
    searchData,
    loading,
    sorted,
    totalPages,
    pageRows,
    categoryOptions,
    budgetOptions,
    accountOptions,
    tagOptions,
    editable: isEditable,

    submitSearch(): void {
      query.set(draft().trim());
    },

    clearSearch(): void {
      draft.set('');
      query.set('');
    },

    sortBy(key: SortKey): void {
      if (sortKey() === key) sortDir.set(sortDir() === 1 ? -1 : 1);
      else {
        sortKey.set(key);
        sortDir.set(defaultSortDir(key));
      }
    },

    fireflyLink: (tx: TxRow): string | null => meta.fireflyUrl(`/transactions/show/${tx.groupId}`),
    fireflyEditLink: (tx: TxRow): string | null => meta.fireflyUrl(`/transactions/edit/${tx.groupId}`),

    async remove(tx: TxRow): Promise<void> {
      const ok = await confirm.confirm({
        title: i18n.t('editor.tx.deleteTitle'),
        message: i18n.t(tx.splitCount > 1 ? 'editor.tx.deleteMessageSplits' : 'editor.tx.deleteMessage', { name: tx.description }),
        confirmLabel: i18n.t('forms.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await writes.deleteTransaction(tx.groupId); // refreshes the list on success
        toast.success(i18n.t('editor.tx.deleted'));
      } catch {
        toast.error(i18n.t('errors.generic'));
      }
    },

    /** CSV of everything currently listed (all pages), or `null` in privacy mode (the file would contain the real amounts). */
    csv(): { text: string; fileName: string } | null {
      if (privacy.hidden()) return null;
      const p = filters.period();
      return { text: buildTransactionsCsv(sorted(), filters.currency()), fileName: `spacefly-${p.start}_${p.end}.csv` };
    },
  };
}
