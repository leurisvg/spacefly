import { computed, inject } from '@angular/core';
import type { DashboardReport } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { donutOption, incomeExpenseOption, linesOption, type Slice } from '../../charts/builders';
import type { ChartTable } from '../../charts/chart-table';
import { money, SeriesColors } from '../../charts/series-colors';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { FiltersStore } from '../../state/filters.store';
import { TxDetailService } from '../../state/tx-detail.service';

/** First and last day (`YYYY-MM-DD`) of a `YYYY-MM` month. */
export function monthRange(month: string): { start: string; end: string } {
  const end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
  return { start: `${month}-01`, end };
}

type TopCategory = DashboardReport['topCategories'][number];

/** Donut slices of the top categories: one color per category for the whole session, "others" in gray. */
export function categorySlices(top: readonly TopCategory[], i18n: Pick<I18n, 'name'>, colors: Pick<SeriesColors, 'color'>): Slice[] {
  return top.map((c) => ({
    id: c.id,
    name: i18n.name(c.name, c.id),
    value: c.value,
    color: c.id === '__others__' ? money.other() : colors.color('category', c.id),
  }));
}

/** The dashboard: KPIs, income vs expenses, top categories, net worth, calendar, budgets, upcoming and largest. */
export function dashboardViewModel() {
  const i18n = inject(I18n);
  const detail = inject(TxDetailService);
  const f = inject(FormatService);
  const filters = inject(FiltersStore);
  const colors = inject(SeriesColors);
  const res = reportResource<DashboardReport>('reports/dashboard');
  const data = res.data;

  const calendarMonth = computed(() => filters.period().end.slice(0, 7));

  const incomeOptions = computed(() => {
    const months = data()?.months;
    return months ? incomeExpenseOption(f, i18n.t, months) : null;
  });

  const monthsTable = computed<ChartTable | null>(() => {
    const months = data()?.months;
    if (!months) return null;
    return {
      columns: [i18n.t('common.month'), i18n.t('common.income'), i18n.t('common.expenses'), i18n.t('common.net')],
      rows: months.map((m) => [f.date(m.month, 'month'), f.money(m.income), f.money(m.expense), f.money(m.net)]),
      numeric: [1, 2, 3],
    };
  });

  const slices = computed(() => categorySlices(data()?.topCategories ?? [], i18n, colors));

  const donut = computed(() => {
    const s = slices();
    return s.length ? donutOption(f, s, i18n.t('common.expenses'), s.reduce((a, b) => a + b.value, 0)) : null;
  });

  const catTable = computed<ChartTable | null>(() =>
    slices().length ? { columns: [i18n.t('common.category'), i18n.t('common.amount')], rows: slices().map((s) => [s.name, f.money(s.value)]), numeric: [1] } : null,
  );

  const nwOptions = computed(() => {
    const nw = data()?.netWorth;
    if (!nw?.length) return null;
    return linesOption(f, nw.map((n) => n.month), [{ id: 'nw', name: i18n.t('common.netWorth'), values: nw.map((n) => n.value), color: money.revenue(), area: true }]);
  });

  const nwTable = computed<ChartTable | null>(() => {
    const nw = data()?.netWorth;
    return nw ? { columns: [i18n.t('common.month'), i18n.t('common.netWorth')], rows: nw.map((n) => [f.date(n.month, 'month'), f.money(n.value)]), numeric: [1] } : null;
  });

  return {
    i18n,
    detail,
    res,
    data,
    calendarMonth,
    incomeOptions,
    monthsTable,
    slices,
    donut,
    catTable,
    nwOptions,
    nwTable,

    openMonth(index: number): void {
      const m = data()?.months[index];
      if (m) detail.open(f.date(m.month, 'month'), monthRange(m.month));
    },

    openCategory(index: number): void {
      const s = slices()[index];
      if (!s) return;
      if (s.id === '__others__') {
        const children = data()?.topCategories[index]?.children ?? [];
        if (children.length) {
          detail.openCategories(
            s.name,
            children.map((c) => ({ id: c.id, name: i18n.name(c.name, c.id), value: c.value })),
            { type: 'withdrawal' },
          );
        }
        return;
      }
      detail.open(s.name, { type: 'withdrawal', category: s.id ?? 'none' });
    },

    openDay(date: string): void {
      detail.open(f.date(date, 'full'), { start: date, end: date });
    },
  };
}
