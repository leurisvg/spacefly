import { computed, inject } from '@angular/core';
import { isIsoDate, previousPeriod, samePeriodLastYear, type CompareReport, type CompareRow, type GroupBy, type Period } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { divergingOption, incomeExpenseOption } from '../../charts/builders';
import type { ChartTable } from '../../charts/chart-table';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { FiltersStore } from '../../state/filters.store';
import { TxDetailService } from '../../state/tx-detail.service';

export type CompareMode = 'previous' | 'yoy' | 'custom';
export const COMPARE_MODES: readonly CompareMode[] = ['previous', 'yoy', 'custom'];
export const COMPARE_GROUPS: readonly GroupBy[] = ['category', 'tag', 'budget', 'account', 'counterparty'];

/** Period B for a comparison mode: the one before A, the same period a year earlier, or the custom dates (falling back to "before A"). */
export function resolvePeriodB(mode: CompareMode, a: Period, bStart: string | null, bEnd: string | null): Period {
  if (mode === 'yoy') return samePeriodLastYear(a);
  if (mode === 'custom' && isIsoDate(bStart) && isIsoDate(bEnd)) return { start: bStart, end: bEnd };
  return previousPeriod(a);
}

/** Which way a change is good: spending less or earning more. */
export const isImprovement = (delta: number, kind: 'expense' | 'income'): boolean => delta !== 0 && (delta > 0) !== (kind === 'expense');

/** Compares period A (the global period) with a period B by category, tag, budget, account or merchant. */
export function compareViewModel() {
  const i18n = inject(I18n);
  const filters = inject(FiltersStore);
  const f = inject(FormatService);
  const detail = inject(TxDetailService);

  const cmp = filters.param('cmp');
  const groupParam = filters.param('groupBy');
  const kindParam = filters.param('kind');
  const bStartParam = filters.param('bStart');
  const bEndParam = filters.param('bEnd');

  const mode = computed<CompareMode>(() => (COMPARE_MODES.includes(cmp() as CompareMode) ? (cmp() as CompareMode) : 'previous'));
  const groupBy = computed<GroupBy>(() => (groupParam() as GroupBy) || 'category');
  const kind = computed<'expense' | 'income'>(() => (kindParam() === 'income' ? 'income' : 'expense'));
  const a = computed(() => filters.period());
  const b = computed(() => resolvePeriodB(mode(), a(), bStartParam(), bEndParam()));

  const res = reportResource<CompareReport>(
    'reports/compare',
    () => ({ aStart: a().start, aEnd: a().end, bStart: b().start, bEnd: b().end, groupBy: groupBy(), kind: kind() }),
    { global: false },
  );
  const r = res.data;
  const rows = computed(() => (r()?.rows ?? []).filter((x) => x.a !== 0 || x.b !== 0));

  const groupOptions = computed(() => COMPARE_GROUPS.map((g) => ({ value: g, label: i18n.t(`compare.groups.${g}`) })));

  const name = (row: CompareRow): string => i18n.name(row.name, row.id, groupBy() === 'tag' ? 'common.untagged' : groupBy() === 'budget' ? 'common.noBudget' : 'common.uncategorized');

  const divergingOpts = computed(() => divergingOption(f, rows().map((row) => ({ name: name(row), delta: row.delta })), kind() === 'expense'));
  /** How many bars the delta chart draws (it caps at 15). */
  const barCount = computed(() => Math.min(rows().length, 15));
  const trendOpts = computed(() => {
    const t = r()?.trend;
    return t ? incomeExpenseOption(f, i18n.t, t.map((m) => ({ ...m, net: m.income - m.expense }))) : null;
  });

  const table = computed<ChartTable | null>(() =>
    rows().length
      ? {
          columns: [i18n.t(`compare.groups.${groupBy()}`), 'A', 'B', 'Δ', 'Δ%'],
          rows: rows().map((row) => [name(row), f.money(row.a), f.money(row.b), f.money(row.delta, undefined, { signed: true }), f.pct(row.pct, 1, true)]),
          numeric: [1, 2, 3, 4],
        }
      : null,
  );

  return {
    i18n,
    filters,
    mode,
    groupBy,
    kind,
    a,
    b,
    res,
    r,
    rows,
    groupOptions,
    divergingOpts,
    barCount,
    trendOpts,
    table,
    name,

    setMode(next: CompareMode): void {
      filters.setParams({ cmp: next });
    },

    setGroupBy(next: string): void {
      filters.setParams({ groupBy: next });
    },

    setKind(next: 'expense' | 'income'): void {
      filters.setParams({ kind: next });
    },

    /** Sets one end of a custom period B; the other end defaults to what B currently is. */
    setB(key: 'bStart' | 'bEnd', value: string): void {
      if (!isIsoDate(value)) return;
      filters.setParams({
        [key]: value,
        ...(key === 'bStart' && !bEndParam() ? { bEnd: b().end } : {}),
        ...(key === 'bEnd' && !bStartParam() ? { bStart: b().start } : {}),
      });
    },

    /** Chart index is reversed (the top item is drawn last); table index is direct. */
    openRow(index: number, fromTable = false): void {
      const list = fromTable ? rows() : rows().slice(0, 15).reverse();
      const row = list[index];
      if (!row) return;
      detail.open(name(row), { type: kind() === 'expense' ? 'withdrawal' : 'deposit', [groupBy()]: row.id ?? 'none' });
    },
  };
}
