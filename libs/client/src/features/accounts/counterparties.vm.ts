import { computed, inject, signal, type Signal } from '@angular/core';
import type { CounterpartiesReport, CounterpartyItem, CounterpartyKind } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { categoryBarsOption, rankingBarsOption } from '../../charts/builders';
import type { ChartTable } from '../../charts/chart-table';
import { money } from '../../charts/series-colors';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { EntityEditor } from '../../state/entity-editor.service';

/** How many accounts the ranking draws. */
export const COUNTERPARTY_TOP = 12;

/** Accounts that moved money in this or the previous period, or all of them on request. */
export function shownCounterparties(items: readonly CounterpartyItem[], showEmpty: boolean): CounterpartyItem[] {
  return showEmpty ? [...items] : items.filter((i) => i.value > 0 || i.previous > 0);
}

/** The accounts that moved money in the period, biggest first, as many as the ranking draws. */
export function topCounterparties(items: readonly CounterpartyItem[]): CounterpartyItem[] {
  return items.filter((i) => i.value > 0).slice(0, COUNTERPARTY_TOP);
}

/** Where the detail of an expense (`expense`) or revenue (`revenue`) account lives. */
export function counterpartyPath(kind: CounterpartyKind, id: string): string[] {
  return ['/accounts', kind === 'income' ? 'revenue' : 'expense', id];
}

/** Expense accounts (where money goes) or revenue accounts (where it comes from): their ranking, monthly trend and list. */
export function counterpartiesViewModel(opts: { kind: Signal<CounterpartyKind> }) {
  const i18n = inject(I18n);
  const f = inject(FormatService);
  const editor = inject(EntityEditor);
  const { kind } = opts;

  const showEmpty = signal(false);
  const res = reportResource<CounterpartiesReport>('reports/counterparties', () => ({ kind: kind() }));
  const r = res.data;
  const accent = computed(() => (kind() === 'income' ? 'var(--money-income)' : 'var(--money-expense)'));
  const color = computed(() => (kind() === 'income' ? money.income() : money.expense()));

  const items = computed(() => r()?.items ?? []);
  const active = computed(() => (r() ? items().filter((i) => i.count > 0).length : null));
  const avgTicket = computed(() => (r()?.count ? r()!.total / r()!.count : null));
  const shown = computed(() => shownCounterparties(items(), showEmpty()));
  const top = computed(() => topCounterparties(items()));

  const rankOptions = computed(() => (top().length ? rankingBarsOption(f, top(), color()) : null));
  const rankHeight = computed(() => `${Math.max(10, top().length * 2 + 2)}rem`);
  const rankTable = computed<ChartTable | null>(() =>
    top().length
      ? {
          columns: [i18n.t('ranking.name'), i18n.t('common.total'), i18n.t('ranking.share'), i18n.t('ranking.count')],
          rows: top().map((i) => [i.name, f.money(i.value), f.pct(i.share), String(i.count)]),
          numeric: [1, 2, 3],
        }
      : null,
  );

  const monthlyOptions = computed(() => {
    const report = r();
    return report ? categoryBarsOption(f, report.months.map((m) => f.monthLabel(m)), report.monthly, color(), i18n.t(kind() === 'income' ? 'common.income' : 'common.expenses')) : null;
  });
  const monthlyTable = computed<ChartTable | null>(() => {
    const report = r();
    return report ? { columns: [i18n.t('common.month'), i18n.t('common.total')], rows: report.months.map((m, i) => [f.date(m, 'month'), f.money(report.monthly[i])]), numeric: [1] } : null;
  });

  return {
    i18n,
    editor,
    kind,
    showEmpty,
    res,
    r,
    accent,
    items,
    active,
    avgTicket,
    shown,
    top,
    rankOptions,
    rankHeight,
    rankTable,
    monthlyOptions,
    monthlyTable,

    path(id: string): string[] {
      return counterpartyPath(kind(), id);
    },

    /** The account behind a bar of the ranking. The bars are drawn bottom-up, so the clicked index counts from the end of the top list. */
    itemAtBar(index: number): CounterpartyItem | undefined {
      return top().slice(0, COUNTERPARTY_TOP).reverse()[index];
    },

    /** Opens the editor to create an account of this kind. */
    create(): void {
      editor.open('account', null, { accountType: kind() === 'income' ? 'revenue' : 'expense' });
    },

    edit(id: string): void {
      editor.open('account', id);
    },
  };
}
