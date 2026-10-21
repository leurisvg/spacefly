import { computed, inject } from '@angular/core';
import { endOfMonth, isFullMonth, startOfMonth, type CalendarReport, type YearHeatmapReport } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { runningBalanceOption, yearHeatmapOption } from '../../charts/builders';
import type { ChartTable } from '../../charts/chart-table';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { FiltersStore } from '../../state/filters.store';
import { MetaStore } from '../../state/meta.store';
import { TxDetailService } from '../../state/tx-detail.service';

export type CalendarView = 'month' | 'year';

/** The calendar is month-based: a period that isn't a whole month shows the month its end date falls in. */
export function calendarMonth(period: { start: string; end: string }): { start: string; end: string } {
  return isFullMonth(period) ? period : { start: startOfMonth(period.end), end: endOfMonth(period.end) };
}

export interface CalendarOptions {
  /** Lay the year heatmap out vertically (phones). Read each time the option is built. */
  compactHeatmap?: () => boolean;
}

/** Calendar: a month of daily cash flow with running balance and scheduled items, or the year as a spending heatmap. */
export function calendarViewModel(opts: CalendarOptions = {}) {
  const i18n = inject(I18n);
  const filters = inject(FiltersStore);
  const f = inject(FormatService);
  const meta = inject(MetaStore);
  const detail = inject(TxDetailService);

  const viewParam = filters.param('view');
  const view = computed<CalendarView>(() => (viewParam() === 'year' ? 'year' : 'month'));
  const account = computed(() => filters.param('account')() ?? '');
  const category = computed(() => filters.param('category')() ?? '');
  const tag = computed(() => filters.param('tag')() ?? '');
  const month = computed(() => calendarMonth(filters.period()));
  const year = computed(() => Number(filters.period().end.slice(0, 4)));

  const cal = reportResource<CalendarReport>('reports/calendar', () =>
    view() !== 'month'
      ? null
      : {
          ...month(),
          ...(account() ? { account: account() } : {}),
          ...(category() ? { category: category() } : {}),
          ...(tag() ? { tag: tag() } : {}),
        },
  );
  const yearRes = reportResource<YearHeatmapReport>('reports/calendar/year', () => (view() === 'year' ? { year: year() } : null));

  const accountOptions = computed(() => (meta.lookups()?.accounts ?? []).map((a) => ({ value: a.id, label: a.name })));
  const categoryOptions = computed(() => [{ value: 'none', label: i18n.t('common.uncategorized') }, ...(meta.lookups()?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))]);
  const tagOptions = computed(() => (meta.lookups()?.tags ?? []).map((t) => ({ value: t.name, label: t.name })));

  const endBalance = computed(() => {
    const days = cal.data()?.days.filter((d) => d.balance !== null) ?? [];
    return days.length ? days[days.length - 1].balance : null;
  });

  const balanceOptions = computed(() => {
    const days = cal.data()?.days;
    return days?.some((d) => d.balance !== null) ? runningBalanceOption(f, i18n.t('calendar.balance'), days) : null;
  });

  const dayTable = computed<ChartTable | null>(() => {
    const days = cal.data()?.days;
    if (!days) return null;
    return {
      columns: [i18n.t('common.date'), i18n.t('common.income'), i18n.t('common.expenses'), i18n.t('calendar.balance')],
      rows: days.filter((d) => d.income || d.expense).map((d) => [f.date(d.date, 'day'), f.money(d.income), f.money(d.expense), f.money(d.balance)]),
      numeric: [1, 2, 3],
    };
  });

  const heatmapOptions = computed(() => {
    const y = yearRes.data();
    return y ? yearHeatmapOption(f, i18n.t, y.year, y.days, y.max, opts.compactHeatmap?.() ?? false) : null;
  });

  const yearTable = computed<ChartTable | null>(() => {
    const y = yearRes.data();
    if (!y) return null;
    const byMonth = new Map<string, number>();
    for (const d of y.days) byMonth.set(d.date.slice(0, 7), (byMonth.get(d.date.slice(0, 7)) ?? 0) + d.expense);
    return {
      columns: [i18n.t('common.month'), i18n.t('common.expenses')],
      rows: [...byMonth].map(([m, v]) => [f.date(m, 'month'), f.money(v)]),
      numeric: [1],
    };
  });

  return {
    i18n,
    filters,
    detail,
    view,
    account,
    category,
    tag,
    month,
    year,
    cal,
    yearRes,
    accountOptions,
    categoryOptions,
    tagOptions,
    endBalance,
    balanceOptions,
    dayTable,
    heatmapOptions,
    yearTable,

    setView(next: CalendarView): void {
      filters.setParams({ view: next });
    },

    /** Sets one of the `account` / `category` / `tag` filters; an empty value clears it. */
    setFilter(name: 'account' | 'category' | 'tag', value: string): void {
      filters.setParams({ [name]: value || null });
    },

    /** The transactions of a day, within the calendar's account / category / tag filters. */
    openDay(date: string): void {
      const filter: Record<string, string> = { start: date, end: date };
      if (account()) filter['account'] = account();
      if (category()) filter['category'] = category();
      if (tag()) filter['tag'] = tag();
      detail.open(f.date(date, 'full'), filter);
    },

    /** A year heatmap click reports the cell's data index; the cells are the days in order. */
    openHeatmapDay(index: number): void {
      const d = yearRes.data()?.days[index];
      if (d) this.openDay(d.date);
    },
  };
}
