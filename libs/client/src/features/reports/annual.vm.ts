import { computed, inject } from '@angular/core';
import { endOfMonth, type AnnualReport } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { incomeExpenseOption, matrixHeatmapOption, savingsRateOption } from '../../charts/builders';
import type { ChartTable } from '../../charts/chart-table';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { FiltersStore } from '../../state/filters.store';
import { TxDetailService } from '../../state/tx-detail.service';

/** Matrix cell index (the chart walks the grid category by category) → its month and category positions. */
export function matrixCell(index: number, months: number): { month: number; category: number } {
  return { month: index % months, category: Math.floor(index / months) };
}

export interface AnnualOptions {
  /** How many categories the month × category matrix shows (the web fits 15, a phone 10). */
  matrixLimit?: number;
}

/** The annual report of the year the period ends in: monthly income and expenses, savings rate, best and worst month, category matrix. */
export function annualViewModel(opts: AnnualOptions = {}) {
  const limit = opts.matrixLimit ?? 15;
  const i18n = inject(I18n);
  const f = inject(FormatService);
  const filters = inject(FiltersStore);
  const detail = inject(TxDetailService);
  const year = computed(() => Number(filters.period().end.slice(0, 4)));
  const res = reportResource<AnnualReport>('reports/annual', () => ({ year: year() }));
  const r = res.data;

  const rows = computed(() => {
    const report = r();
    return report ? report.months.map((month, i) => ({ month, income: report.income[i], expense: report.expense[i], net: report.income[i] - report.expense[i] })) : [];
  });

  const barOptions = computed(() => (rows().length ? incomeExpenseOption(f, i18n.t, rows()) : null));
  const rateOptions = computed(() => {
    const report = r();
    return report ? savingsRateOption(f, i18n.t, report.months, report.savingsRate) : null;
  });

  const shownCategories = computed(() => (r()?.categories ?? []).slice(0, limit));
  const matrixOptions = computed(() => {
    const report = r();
    return report && shownCategories().length ? matrixHeatmapOption(f, report.months, shownCategories().map((c) => ({ name: i18n.name(c.name, c.id), values: c.values }))) : null;
  });
  const matrixCount = computed(() => shownCategories().length);

  const monthTable = computed<ChartTable | null>(() =>
    rows().length
      ? {
          columns: [i18n.t('common.month'), i18n.t('common.income'), i18n.t('common.expenses'), i18n.t('common.net'), i18n.t('common.savingsRate')],
          rows: rows().map((m, i) => [
            f.date(m.month, 'month'),
            f.money(m.income),
            f.money(m.expense),
            f.money(m.net),
            r()!.savingsRate[i] === null ? '—' : f.pct(r()!.savingsRate[i]! / 100),
          ]),
          numeric: [1, 2, 3, 4],
        }
      : null,
  );

  const matrixTable = computed<ChartTable | null>(() => {
    const report = r();
    if (!report) return null;
    return {
      columns: [i18n.t('common.category'), ...report.months.map((m) => f.monthLabel(m, false)), i18n.t('common.total')],
      rows: report.categories.map((c) => [i18n.name(c.name, c.id), ...c.values.map((v) => (v ? f.compact(v, false) : '·')), f.money(c.total)]),
      numeric: Array.from({ length: 13 }, (_, i) => i + 1),
    };
  });

  function openMonthRange(title: string, m: string, extra: Record<string, string> = {}): void {
    detail.open(title, { start: `${m}-01`, end: endOfMonth(`${m}-01`), ...extra });
  }

  function openCell(monthIndex: number, categoryIndex: number): void {
    const report = r();
    const m = report?.months[monthIndex];
    const c = report?.categories[categoryIndex];
    if (m && c) openMonthRange(`${i18n.name(c.name, c.id)} · ${f.date(m, 'month')}`, m, { type: 'withdrawal', category: c.id ?? 'none' });
  }

  return {
    i18n,
    detail,
    year,
    res,
    r,
    barOptions,
    rateOptions,
    matrixOptions,
    matrixCount,
    monthTable,
    matrixTable,

    openMonth(index: number): void {
      const m = r()?.months[index];
      if (m) openMonthRange(f.date(m, 'month'), m);
    },

    /** A matrix click that reports `[month, category, value]` (the web chart). */
    openCell,

    /** A matrix click that only reports the cell's data index (the WebView chart). */
    openCellAt(index: number): void {
      const cell = matrixCell(index, r()?.months.length || 1);
      openCell(cell.month, cell.category);
    },
  };
}
