import { computed, inject, linkedSignal, type Signal } from '@angular/core';
import type { CalendarDay, CounterpartyDetailReport, CounterpartyKind, RankedItem, TxRow } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { categoryBarsOption, rankingBarsOption } from '../../charts/builders';
import type { ChartTable } from '../../charts/chart-table';
import { money } from '../../charts/series-colors';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { BackNavigation } from '../../platform/back-navigation';
import { EntityEditor } from '../../state/entity-editor.service';
import { TxDetailService } from '../../state/tx-detail.service';
import { pageSlice, totalPages as pagesFor } from '../../ui-logic/pagination';

/** Totals of the last 12 months, the monthly average and the biggest record of the period. */
export function counterpartyStats(d: Pick<CounterpartyDetailReport, 'months' | 'rows'>): { total12: number; monthlyAverage: number; biggest: TxRow | null } {
  const total12 = d.months.reduce((sum, m) => sum + m.value, 0);
  return {
    total12,
    monthlyAverage: total12 / Math.max(1, d.months.length),
    biggest: d.rows.reduce<TxRow | null>((best, x) => (best === null || x.amount > best.amount ? x : best), null),
  };
}

/** One calendar per month of the period: what was paid (or received) on each day, as the expense (or income) of the day. */
export function counterpartyCalendarMonths(days: CounterpartyDetailReport['days'], kind: CounterpartyKind): { month: string; days: CalendarDay[] }[] {
  const income = kind === 'income';
  const byMonth = new Map<string, CalendarDay[]>();
  for (const d of days) {
    const month = d.date.slice(0, 7);
    const day: CalendarDay = { date: d.date, income: income ? d.value : 0, expense: income ? 0 : d.value, count: d.count, balance: null };
    byMonth.set(month, [...(byMonth.get(month) ?? []), day]);
  }
  return [...byMonth].map(([month, list]) => ({ month, days: list }));
}

/** The asset account on the other side: where an expense was paid from, or an income received. */
export function assetOf(tx: Pick<TxRow, 'source' | 'destination'>, kind: CounterpartyKind): string {
  return (kind === 'income' ? tx.destination : tx.source).name;
}

/** Only single-part expenses and income are edited in SpaceFly. */
export function isEditableTx(tx: Pick<TxRow, 'splitCount' | 'type'>): boolean {
  return tx.splitCount === 1 && ['withdrawal', 'deposit'].includes(tx.type);
}

/** One expense or revenue account over the selected period: totals, daily calendar, trend, breakdowns and every record. */
export function counterpartyDetailViewModel(opts: { kind: Signal<CounterpartyKind>; id: Signal<string> }) {
  const i18n = inject(I18n);
  const editor = inject(EntityEditor);
  const f = inject(FormatService);
  const back = inject(BackNavigation);
  const detail = inject(TxDetailService);
  const { kind, id } = opts;

  const res = reportResource<CounterpartyDetailReport>(() => `reports/counterparties/${id()}`, () => ({ kind: kind() }));
  const r = res.data;
  const accent = computed(() => (kind() === 'income' ? 'var(--money-income)' : 'var(--money-expense)'));
  const color = computed(() => (kind() === 'income' ? money.income() : money.expense()));
  /** Expenses read as negative amounts, income as positive. */
  const sign = computed(() => (kind() === 'income' ? 1 : -1));
  const share = computed(() => (r() ? r()!.totals.share * 100 : null));

  const subtitle = computed(() => {
    const a = r()?.account;
    return a ? [a.iban, a.active ? null : i18n.t('accounts.excluded')].filter(Boolean).join(' · ') || null : null;
  });

  const stats = computed(() => {
    const d = r();
    return d ? counterpartyStats(d) : null;
  });

  const calendarMonths = computed(() => counterpartyCalendarMonths(r()?.days ?? [], kind()));
  const calendarScale = computed(() => Math.max(1, ...(r()?.days ?? []).map((d) => d.value)));
  const calendarGridClass = computed(() => (calendarMonths().length > 1 ? 'lg:grid-cols-2 2xl:grid-cols-3' : 'max-w-2xl'));

  const dayTable = computed<ChartTable | null>(() => {
    const d = r();
    if (!d) return null;
    return {
      columns: [i18n.t('common.date'), i18n.t('ranking.count'), i18n.t('common.total')],
      rows: d.days.filter((x) => x.count).map((x) => [f.date(x.date, 'day'), String(x.count), f.money(x.value)]),
      numeric: [1, 2],
    };
  });

  const seriesName = computed(() => i18n.t(kind() === 'income' ? 'common.income' : 'common.expenses'));
  const monthlyOptions = computed(() => {
    const d = r();
    return d ? categoryBarsOption(f, d.months.map((m) => f.monthLabel(m.month)), d.months.map((m) => m.value), color(), seriesName()) : null;
  });
  const monthlyTable = computed<ChartTable | null>(() => {
    const d = r();
    return d
      ? { columns: [i18n.t('common.month'), i18n.t('ranking.count'), i18n.t('common.total')], rows: d.months.map((m) => [f.date(m.month, 'month'), String(m.count), f.money(m.value)]), numeric: [1, 2] }
      : null;
  });

  const weekdays = (): string[] => Array.from({ length: 7 }, (_, i) => f.date(`2024-01-0${i + 1}`, 'weekday'));
  const weekdayOptions = computed(() => {
    const d = r();
    return d ? categoryBarsOption(f, weekdays(), d.byWeekday, color(), seriesName()) : null;
  });
  const weekdayTable = computed<ChartTable | null>(() => {
    const d = r();
    if (!d) return null;
    const names = weekdays();
    return { columns: [i18n.t('common.date'), i18n.t('common.total')], rows: d.byWeekday.map((v, i) => [names[i], f.money(v)]), numeric: [1] };
  });

  const named = (items: RankedItem[]) => items.map((x) => ({ ...x, name: x.name || i18n.t('common.uncategorized') }));

  /** Back to the first page when the account or the period changes. */
  const page = linkedSignal({ source: () => [id(), r()], computation: () => 1 });
  const totalPages = computed(() => pagesFor(r()?.rows.length ?? 0));
  const pageRows = computed(() => pageSlice(r()?.rows ?? [], page()));

  return {
    i18n,
    editor,
    kind,
    id,
    res,
    r,
    accent,
    sign,
    share,
    subtitle,
    stats,
    calendarMonths,
    calendarScale,
    calendarGridClass,
    dayTable,
    monthlyOptions,
    monthlyTable,
    weekdayOptions,
    weekdayTable,
    page,
    totalPages,
    pageRows,

    rankOptions(items: RankedItem[]) {
      return rankingBarsOption(f, named(items), color());
    },

    rankTable(items: RankedItem[]): ChartTable {
      return { columns: [i18n.t('ranking.name'), i18n.t('ranking.count'), i18n.t('common.total')], rows: named(items).map((x) => [x.name, String(x.count), f.money(x.value)]), numeric: [1, 2] };
    },

    assetName(tx: TxRow): string {
      return assetOf(tx, kind());
    },

    editable: isEditableTx,

    openDay(date: string): void {
      detail.open(f.date(date, 'full'), { start: date, end: date, counterparty: id() });
    },

    goBack(): void {
      back.back(kind() === 'income' ? '/accounts/revenue' : '/accounts/expense');
    },
  };
}
