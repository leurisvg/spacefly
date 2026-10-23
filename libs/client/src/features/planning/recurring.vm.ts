import { inject } from '@angular/core';
import type { RecurrenceRow, RecurrencesReport } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { I18n } from '../../i18n/i18n';

/** What a recurrence moves, with the sign the ledger shows: income positive, expenses negative, transfers as they are. */
export function recurrenceAmount(r: Pick<RecurrenceRow, 'type' | 'amount'>): number {
  return r.type === 'deposit' ? r.amount : r.type === 'withdrawal' ? -r.amount : r.amount;
}

export function recurrenceTone(type: string): 'income' | 'expense' | 'none' {
  return type === 'deposit' ? 'income' : type === 'withdrawal' ? 'expense' : 'none';
}

/** Firefly's recurring transactions: what repeats, how, and its next dates. */
export function recurrencesViewModel() {
  const i18n = inject(I18n);
  const res = reportResource<RecurrencesReport>('reports/recurrences', () => ({}), { global: false });
  return { i18n, res, r: res.data };
}
