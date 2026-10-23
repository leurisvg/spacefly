import { computed, inject } from '@angular/core';
import { addDays, addMonths, todayIso, type BillRow, type BillsReport } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { rankingBarsOption } from '../../charts/builders';
import type { ChartTable } from '../../charts/chart-table';
import { money } from '../../charts/series-colors';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { EntityEditor } from '../../state/entity-editor.service';
import { FiltersStore } from '../../state/filters.store';
import { TxDetailService } from '../../state/tx-detail.service';

/** How many subscriptions the cost ranking draws. */
export const BILLS_RANKED = 12;

/** The tone of a subscription's status: paid is good, pending needs attention, the rest is quiet. */
export type BillTone = 'good' | 'warning' | 'muted';

export function billStatusTone(status: BillRow['status']): BillTone {
  return status === 'paid' ? 'good' : status === 'pending' ? 'warning' : 'muted';
}

/** The active subscriptions that cost something per year, the most expensive first. */
export function rankedBills(bills: readonly BillRow[]): BillRow[] {
  return bills.filter((b) => b.active && b.yearlyEquivalent > 0).sort((a, b) => b.yearlyEquivalent - a.yearlyEquivalent);
}

/** The last 12 months up to `end`: the range a yearly estimate is checked against. */
export function lastTwelveMonths(end: string): { start: string; end: string } {
  return { start: addDays(addMonths(end, -12), 1), end };
}

/** Subscriptions: what they cost per month and year, which are paid this period, and the cost ranking. */
export function billsViewModel() {
  const i18n = inject(I18n);
  const detail = inject(TxDetailService);
  const editor = inject(EntityEditor);
  const f = inject(FormatService);
  const filters = inject(FiltersStore);
  const res = reportResource<BillsReport>('reports/bills');
  const r = res.data;

  const active = computed(() => rankedBills(r()?.bills ?? []));
  const rankingOpts = computed(() => rankingBarsOption(f, active().map((b) => ({ name: b.name, value: b.yearlyEquivalent })), money.expense()));
  const rankingHeight = computed(() => `${Math.max(8, Math.min(active().length, BILLS_RANKED) * 2 + 2)}rem`);
  const table = computed<ChartTable>(() => ({
    columns: [i18n.t('bills.name'), i18n.t('bills.monthlyEq'), i18n.t('bills.yearly')],
    rows: active().map((b) => [b.name, f.money(b.monthlyEquivalent), f.money(b.yearlyEquivalent)]),
    numeric: [1, 2],
  }));

  return {
    i18n,
    editor,
    res,
    r,
    active,
    rankingOpts,
    rankingHeight,
    table,

    /** The transactions paid to a subscription in the period. */
    open(b: Pick<BillRow, 'id' | 'name'>): void {
      detail.open(b.name, { bill: b.id });
    },

    /**
     * A bar of the ranking. The bars are drawn bottom-up and the builder keeps only the top 12, so the clicked index counts from the end
     * of that slice. The bar is a yearly estimate, so it opens on the last 12 months and lets the sheet switch to the global period.
     */
    openBar(index: number): void {
      const bill = active().slice(0, BILLS_RANKED).reverse()[index];
      if (bill) this.openYear(bill);
    },

    /** The transactions of a subscription over the last 12 months, switchable to the selected period. */
    openYear(bill: Pick<BillRow, 'id' | 'name'>): void {
      const year = { label: i18n.t('bills.last12Months'), ...lastTwelveMonths(todayIso()) };
      const { start, end } = filters.period();
      const period = { label: i18n.t('bills.selectedPeriod'), start, end };
      detail.open(bill.name, { bill: bill.id, start: year.start, end: year.end }, undefined, [year, period]);
    },

    create(): void {
      editor.open('bill');
    },

    edit(id: string): void {
      editor.open('bill', id);
    },
  };
}
