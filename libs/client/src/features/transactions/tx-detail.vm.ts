import { httpResource } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import type { Report, TxListResponse, TxRow } from '@spacefly/shared';
import { FiltersStore } from '../../state/filters.store';
import { TxDetailService, type BreakdownRow } from '../../state/tx-detail.service';
import { signedAmount } from './explorer.vm';

export interface TxGroup {
  key: string;
  type: string;
  category: string | null;
  /** Signed: expenses count negative. */
  total: number;
  rows: TxRow[];
}

/** Groups by type and category, biggest absolute total first. */
export function groupTransactions(rows: readonly TxRow[]): TxGroup[] {
  const map = new Map<string, TxGroup>();
  for (const tx of rows) {
    const key = `${tx.type}|${tx.category?.id ?? ''}`;
    const g = map.get(key) ?? { key, type: tx.type, category: tx.category?.name ?? null, total: 0, rows: [] };
    g.total += signedAmount(tx);
    g.rows.push(tx);
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

/** The transactions behind a clicked chart element or row (`TxDetailService.request`), grouped. */
export function txDetailViewModel() {
  const detail = inject(TxDetailService);
  const filters = inject(FiltersStore);
  const req = detail.request;

  const open = computed(() => req() !== null);
  const range = computed(() => ({
    start: req()?.filter.start ?? filters.period().start,
    end: req()?.filter.end ?? filters.period().end,
  }));

  const res = httpResource<Report<TxListResponse>>(() => {
    const r = req();
    if (!r) return undefined;
    const params: Record<string, string | number> = { currency: filters.currency(), _r: filters.refreshTick(), ...range() };
    for (const [k, v] of Object.entries(r.filter)) if (v !== undefined && v !== null && v !== '') params[k] = String(v);
    return { url: '/api/transactions', params };
  });
  const data = computed(() => (res.hasValue() ? res.value()?.data : undefined));
  const groups = computed(() => groupTransactions(data()?.rows ?? []));

  return {
    detail,
    req,
    open,
    range,
    res,
    data,
    groups,

    /** Narrows a grouped request down to one of its members, keeping the same period and type. */
    drill(row: BreakdownRow): void {
      const { type, start, end } = req()?.filter ?? {};
      detail.open(row.name, { category: row.id ?? 'none', ...(type && { type }), ...(start && { start }), ...(end && { end }) });
    },
  };
}
