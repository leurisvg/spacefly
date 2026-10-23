import { computed, DestroyRef, inject, linkedSignal, type Signal } from '@angular/core';
import type { AccountDay, AccountDetailReport, AccountTxRow, CalendarDay } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { categoryBarsOption, dailyBalanceOption, incomeExpenseOption, rankingBarsOption } from '../../charts/builders';
import type { ChartTable } from '../../charts/chart-table';
import { money } from '../../charts/series-colors';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { BackNavigation } from '../../platform/back-navigation';
import { EntityEditor } from '../../state/entity-editor.service';
import { FiltersStore } from '../../state/filters.store';
import { TxDetailService } from '../../state/tx-detail.service';
import { pageSlice, totalPages as pagesFor } from '../../ui-logic/pagination';

export const ACCOUNT_TABS = ['all', 'withdrawal', 'deposit', 'transfer'] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

/** The record tab asked for (`?tab=`), or "all". */
export function resolveAccountTab(param: string | null): AccountTab {
  return ACCOUNT_TABS.find((t) => t === param) ?? 'all';
}

/** How many records each tab holds. */
export function tabCounts(rows: readonly Pick<AccountTxRow, 'type'>[]): Record<AccountTab, number> {
  return {
    all: rows.length,
    withdrawal: rows.filter((x) => x.type === 'withdrawal').length,
    deposit: rows.filter((x) => x.type === 'deposit').length,
    transfer: rows.filter((x) => x.type === 'transfer').length,
  };
}

/** The records of a tab. */
export function rowsForTab<T extends Pick<AccountTxRow, 'type'>>(rows: readonly T[], tab: AccountTab): T[] {
  return tab === 'all' ? [...rows] : rows.filter((x) => x.type === tab);
}

export interface AccountExtreme {
  date: string;
  balance: number;
  balanceOriginal: number;
}

/** Lowest and highest balance of the period, the daily average spent, and the biggest expense and income record. */
export function accountStats(d: Pick<AccountDetailReport, 'days' | 'rows' | 'totals' | 'totalsOriginal'>) {
  const known = d.days.filter((x) => x.balance !== null);
  const extreme = (pick: (a: number, b: number) => boolean) =>
    known.reduce<AccountExtreme | null>((best, x) => (best === null || pick(x.balance!, best.balance) ? { date: x.date, balance: x.balance!, balanceOriginal: x.balanceOriginal! } : best), null);
  const biggest = (type: string) =>
    d.rows.filter((x) => x.type === type).reduce<(AccountTxRow & { amountOriginal: number }) | null>((best, x) => (best === null || x.amount > best.amount ? { ...x, amountOriginal: Math.abs(x.flowOriginal) } : best), null);
  const days = Math.max(1, known.length);
  return {
    lowest: extreme((a, b) => a < b),
    highest: extreme((a, b) => a > b),
    avgDailyExpense: d.totals.expense / days,
    avgDailyExpenseOriginal: d.totalsOriginal.expense / days,
    biggestExpense: biggest('withdrawal'),
    biggestIncome: biggest('deposit'),
  };
}

/** One calendar per month of the period. A foreign account is drawn in its own currency: bars, labels and tooltip. */
export function accountCalendarMonths(days: readonly AccountDay[], foreign: boolean): { month: string; days: CalendarDay[] }[] {
  const byMonth = new Map<string, CalendarDay[]>();
  for (const d of days) {
    const month = d.date.slice(0, 7);
    const day: CalendarDay = foreign
      ? { date: d.date, income: d.incomeOriginal, expense: d.expenseOriginal, count: d.count, balance: d.balanceOriginal }
      : { date: d.date, income: d.income, expense: d.expense, count: d.count, balance: d.balance };
    byMonth.set(month, [...(byMonth.get(month) ?? []), day]);
  }
  return [...byMonth].map(([month, list]) => ({ month, days: list }));
}

/** The value that fills a calendar cell: the largest flow of a day, so every month is on the same scale. */
export function accountCalendarScale(days: readonly AccountDay[], foreign: boolean): number {
  return Math.max(1, ...days.map((d) => (foreign ? Math.max(d.incomeOriginal, d.expenseOriginal) : Math.max(d.income, d.expense))));
}

/** The other side of the record: where the money came from or went to. */
export function counterpartyOf(tx: Pick<AccountTxRow, 'flow' | 'source' | 'destination'>): string {
  return (tx.flow > 0 ? tx.source : tx.destination).name;
}

export function txTone(tx: Pick<AccountTxRow, 'type'>): 'expense' | 'income' | 'none' {
  return tx.type === 'withdrawal' ? 'expense' : tx.type === 'deposit' ? 'income' : 'none';
}

/** Only single-part expenses, income and transfers are edited in SpaceFly. */
export function isEditableAccountTx(tx: Pick<AccountTxRow, 'splitCount' | 'type'>): boolean {
  return tx.splitCount === 1 && ['withdrawal', 'deposit', 'transfer'].includes(tx.type);
}

/** One asset account: balance and flows per day, monthly trend, rankings and every record with its running balance. */
export function accountDetailViewModel(opts: { id: Signal<string> }) {
  const i18n = inject(I18n);
  const filters = inject(FiltersStore);
  const editor = inject(EntityEditor);
  const f = inject(FormatService);
  const back = inject(BackNavigation);
  const detail = inject(TxDetailService);
  const { id } = opts;

  // Opens on the "last 30 days" preset; the range is handed back when leaving so no other screen inherits it.
  const release = filters.scopePreset('last30');
  inject(DestroyRef).onDestroy(release);

  const res = reportResource<AccountDetailReport>(() => `reports/accounts/${id()}`);
  const r = res.data;

  const tabParam = filters.param('tab');
  const tab = computed<AccountTab>(() => resolveAccountTab(tabParam()));
  const counts = computed(() => tabCounts(r()?.rows ?? []));
  const rows = computed(() => rowsForTab(r()?.rows ?? [], tab()));
  const rowsTotal = computed(() => rows().reduce((sum, x) => sum + x.flow, 0));
  /** Back to the first page when the tab, the account or the period changes. */
  const page = linkedSignal({ source: () => [tab(), id(), r()], computation: () => 1 });
  const totalPages = computed(() => pagesFor(rows().length));
  const pageRows = computed(() => pageSlice(rows(), page()));

  const subtitle = computed(() => {
    const a = r()?.account;
    if (!a) return null;
    return [a.role ? i18n.t(`accounts.roles.${a.role}`) : null, a.currency, a.iban, a.excluded ? i18n.t('accounts.excluded') : null].filter(Boolean).join(' · ');
  });

  const stats = computed(() => {
    const d = r();
    return d ? accountStats(d) : null;
  });

  /** The account keeps its money in a currency other than the one being displayed. */
  const foreign = computed(() => {
    const cur = r()?.account.currency;
    return !!cur && cur !== filters.currency();
  });
  /** Currency the charts are drawn in: the account's own, when it isn't the one being displayed. */
  const own = computed(() => (foreign() ? r()?.account.currency : undefined));

  const zoomHint = computed(() => ((r()?.days.length ?? 0) > 60 ? i18n.t('accounts.detail.zoomHint') : null));

  const balanceOptions = computed(() => {
    const d = r();
    return d?.days.length ? dailyBalanceOption(f, i18n.t('accounts.balance'), d.days, own()) : null;
  });
  const calendarMonths = computed(() => accountCalendarMonths(r()?.days ?? [], foreign()));
  const calendarScale = computed(() => accountCalendarScale(r()?.days ?? [], foreign()));

  const monthlyOptions = computed(() => {
    const d = r();
    return d
      ? incomeExpenseOption(f, i18n.t, d.months.map((m) => ({ ...m, net: m.income - m.expense, own: { income: m.incomeOriginal, expense: m.expenseOriginal } })), own())
      : null;
  });

  const weekdays = (): string[] => Array.from({ length: 7 }, (_, i) => f.date(`2024-01-0${i + 1}`, 'weekday'));
  const weekdayOptions = computed(() => {
    const d = r();
    if (!d) return null;
    const currency = own();
    return categoryBarsOption(f, weekdays(), d.byWeekday, money.expense(), i18n.t('common.expenses'), currency ? { currency, values: d.byWeekdayOriginal } : undefined);
  });

  /** "US$10.00 (≈ RD$600.00)" for a foreign account, the plain amount otherwise. */
  const moneyPair = (original: number | null, converted: number | null, signed = false): string => {
    const currency = own();
    if (!currency || original === null) return f.money(converted, undefined, { signed });
    return `${f.money(original, currency, { signed })} (≈ ${f.money(converted, undefined, { signed })})`;
  };

  const balanceTable = computed<ChartTable | null>(() => {
    const d = r();
    if (!d) return null;
    return {
      columns: [i18n.t('common.date'), i18n.t('accounts.balance')],
      rows: d.days.filter((x) => x.balance !== null).map((x) => [f.date(x.date, 'day'), moneyPair(x.balanceOriginal, x.balance)]),
      numeric: [1],
    };
  });
  const flowTable = computed<ChartTable | null>(() => {
    const d = r();
    if (!d) return null;
    return {
      columns: [i18n.t('common.date'), i18n.t('common.income'), i18n.t('common.expenses'), i18n.t('accounts.detail.transferIn'), i18n.t('accounts.detail.transferOut')],
      rows: d.days
        .filter((x) => x.count)
        .map((x) => [f.date(x.date, 'day'), moneyPair(x.incomeOriginal, x.income), moneyPair(x.expenseOriginal, x.expense), moneyPair(x.transferInOriginal, x.transferIn), moneyPair(x.transferOutOriginal, x.transferOut)]),
      numeric: [1, 2, 3, 4],
    };
  });
  const monthlyTable = computed<ChartTable | null>(() => {
    const d = r();
    if (!d) return null;
    return {
      columns: [i18n.t('common.month'), i18n.t('common.income'), i18n.t('common.expenses'), i18n.t('common.net'), i18n.t('accounts.detail.closingBalance')],
      rows: d.months.map((m) => [
        f.date(m.month, 'month'),
        moneyPair(m.incomeOriginal, m.income),
        moneyPair(m.expenseOriginal, m.expense),
        moneyPair(m.incomeOriginal - m.expenseOriginal, m.income - m.expense, true),
        moneyPair(m.balanceOriginal, m.balance),
      ]),
      numeric: [1, 2, 3, 4],
    };
  });
  const weekdayTable = computed<ChartTable | null>(() => {
    const d = r();
    if (!d) return null;
    const names = weekdays();
    return { columns: [i18n.t('common.date'), i18n.t('common.expenses')], rows: d.byWeekday.map((v, i) => [names[i], moneyPair(d.byWeekdayOriginal[i], v)]), numeric: [1] };
  });

  const named = (items: AccountDetailReport['topCategories']) => items.map((x) => ({ ...x, own: x.valueOriginal, name: x.name || i18n.t('common.uncategorized') }));

  return {
    i18n,
    filters,
    editor,
    id,
    res,
    r,
    tabs: [
      { key: 'all' as AccountTab, label: 'accounts.detail.tabs.all' },
      { key: 'withdrawal' as AccountTab, label: 'accounts.detail.tabs.expenses' },
      { key: 'deposit' as AccountTab, label: 'accounts.detail.tabs.income' },
      { key: 'transfer' as AccountTab, label: 'accounts.detail.tabs.transfers' },
    ],
    tab,
    counts,
    rows,
    rowsTotal,
    page,
    totalPages,
    pageRows,
    subtitle,
    stats,
    foreign,
    own,
    zoomHint,
    balanceOptions,
    calendarMonths,
    calendarScale,
    monthlyOptions,
    weekdayOptions,
    balanceTable,
    flowTable,
    monthlyTable,
    weekdayTable,

    setTab(next: AccountTab): void {
      filters.setParams({ tab: next });
    },

    /** "≈ RD$600.00" under a figure shown in the account's own currency; nothing when it is already in the display currency. */
    approx(converted: number | null | undefined): string | null {
      return foreign() && converted != null ? `≈ ${f.money(converted)}` : null;
    },

    balanceOf(m: { balance: number; balanceOriginal: number }): number {
      return foreign() ? m.balanceOriginal : m.balance;
    },

    rankOptions(items: AccountDetailReport['topCategories'], kind: 'expense' | 'income') {
      return rankingBarsOption(f, named(items), kind === 'income' ? money.income() : money.expense(), own());
    },

    rankTable(items: AccountDetailReport['topCategories']): ChartTable {
      return { columns: [i18n.t('common.account'), i18n.t('tx.count'), i18n.t('common.total')], rows: named(items).map((x) => [x.name, String(x.count), moneyPair(x.valueOriginal ?? null, x.value)]), numeric: [1, 2] };
    },

    counterparty: counterpartyOf,
    tone: txTone,

    original(tx: AccountTxRow) {
      if (tx.rate === 1) return null;
      return { amount: (tx.flow < 0 ? -1 : 1) * tx.originalAmount, currency: tx.originalCurrency, rate: tx.rate };
    },

    editable: isEditableAccountTx,

    openDay(date: string): void {
      detail.open(f.date(date, 'full'), { start: date, end: date, account: id() });
    },

    goBack(): void {
      back.back('/accounts');
    },
  };
}
