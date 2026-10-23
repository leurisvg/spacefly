import { computed, inject } from '@angular/core';
import type { SavingsSeries } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { I18n } from '../../i18n/i18n';
import { FiltersStore } from '../../state/filters.store';

/** How many months the savings screen asks for until the user picks another length. */
export const SAVINGS_MONTHS = '12';

/** The sum of every account's balance, month by month. */
export function savingsTotals(series: Pick<SavingsSeries, 'months' | 'accounts'>): number[] {
  return series.months.map((_, i) => series.accounts.reduce((sum, a) => sum + (a.balances[i] ?? 0), 0));
}

/** Savings accounts: their balances over time, and the total of them all. */
export function savingsViewModel() {
  const i18n = inject(I18n);
  const filters = inject(FiltersStore);
  const monthsParam = filters.param('months');
  const months = computed(() => monthsParam() ?? SAVINGS_MONTHS);
  const res = reportResource<SavingsSeries>('reports/savings', () => ({ months: months() }));
  const totals = computed(() => {
    const s = res.data();
    return s ? savingsTotals(s) : null;
  });
  const total = computed(() => totals()?.at(-1) ?? null);
  const first = computed(() => totals()?.[0] ?? null);

  return {
    i18n,
    filters,
    months,
    res,
    totals,
    total,
    first,

    setMonths(n: number): void {
      filters.setParams({ months: n });
    },
  };
}
