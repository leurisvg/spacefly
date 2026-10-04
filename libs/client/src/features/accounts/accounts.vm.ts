import { HttpClient } from '@angular/common/http';
import { computed, inject, linkedSignal, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { AccountsReport } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { linesOption } from '../../charts/builders';
import type { ChartTable } from '../../charts/chart-table';
import { SeriesColors } from '../../charts/series-colors';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { Toast } from '../../platform/toast';
import { EntityEditor } from '../../state/entity-editor.service';
import { FiltersStore } from '../../state/filters.store';

/** `order` with `id` moved one place up (-1) or down (1); unchanged at the ends or for an unknown id. */
export function moveId(order: readonly string[], id: string, delta: -1 | 1): string[] {
  const next = [...order];
  const from = next.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= next.length) return next;
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** `order` after dropping `id` on `targetId`: dragging down lands after the target, dragging up before it. */
export function dropId(order: readonly string[], id: string, targetId: string): string[] {
  if (id === targetId) return [...order];
  const from = order.indexOf(id);
  const rest = order.filter((x) => x !== id);
  rest.splice(rest.indexOf(targetId) + (from < order.indexOf(targetId) ? 1 : 0), 0, id);
  return rest;
}

/** Asset accounts: balances, flow, a user-defined order and the balance history chart. */
export function accountsViewModel() {
  const i18n = inject(I18n);
  const filters = inject(FiltersStore);
  const colors = inject(SeriesColors);
  const editor = inject(EntityEditor);
  const f = inject(FormatService);
  const http = inject(HttpClient);
  const toast = inject(Toast);

  const monthsParam = filters.param('months');
  const months = computed(() => monthsParam() ?? '12');
  const res = reportResource<AccountsReport>('reports/accounts', () => ({ months: months() }));
  const r = res.data;
  const reordering = signal(false);
  const dragging = signal<string | null>(null);
  /** Account ids as displayed: the server's order, then whatever the user moves. */
  const order = linkedSignal<string[]>(() => r()?.accounts.map((a) => a.id) ?? []);
  const rows = computed(() => {
    const byId = new Map((r()?.accounts ?? []).map((a) => [a.id, a]));
    return order().flatMap((id) => byId.get(id) ?? []);
  });
  const income = computed(() => r()?.accounts.reduce((s, a) => s + a.income, 0) ?? null);
  const expense = computed(() => r()?.accounts.reduce((s, a) => s + a.expense, 0) ?? null);

  async function save(next: string[]): Promise<void> {
    order.set(next);
    try {
      await firstValueFrom(http.put('/api/settings/account-order', { order: next }));
    } catch {
      toast.error(i18n.t('errors.generic'));
    }
  }

  /** Balance series in the same order as the table. */
  const history = computed(() => {
    const rank = new Map(order().map((id, i) => [id, i]));
    return [...(r()?.history ?? [])].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
  });

  const options = computed(() => {
    const report = r();
    if (!report?.history.length) return null;
    return linesOption(f, report.months, history().map((h) => ({ id: h.id, name: h.name, values: h.balances, color: colors.color('account', h.id) })));
  });

  const table = computed<ChartTable | null>(() => {
    const report = r();
    if (!report) return null;
    return {
      columns: [i18n.t('common.account'), ...report.months.map((m) => f.monthLabel(m))],
      rows: history().map((h) => [h.name, ...h.balances.map((b) => f.compact(b))]),
      numeric: report.months.map((_, i) => i + 1),
    };
  });

  return {
    i18n,
    filters,
    colors,
    editor,
    months,
    res,
    r,
    reordering,
    dragging,
    rows,
    income,
    expense,
    options,
    table,

    move(id: string, delta: -1 | 1): void {
      const next = moveId(order(), id, delta);
      if (next.some((x, i) => x !== order()[i])) void save(next);
    },

    dropOn(targetId: string): void {
      const id = dragging();
      dragging.set(null);
      if (id && id !== targetId) void save(dropId(order(), id, targetId));
    },

    /** Back to the default order (largest balance first). */
    async reset(): Promise<void> {
      try {
        await firstValueFrom(http.put('/api/settings/account-order', { order: [] }));
        res.reload();
      } catch {
        toast.error(i18n.t('errors.generic'));
      }
    },

    /** Opens the account editor. */
    edit(id: string): void {
      editor.open('account', id);
    },
  };
}
