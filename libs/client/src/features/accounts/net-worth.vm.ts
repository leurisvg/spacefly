import { computed, inject } from '@angular/core';
import type { NetWorthReport } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { linesOption } from '../../charts/builders';
import type { ChartTable } from '../../charts/chart-table';
import { money, SeriesColors } from '../../charts/series-colors';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { FiltersStore } from '../../state/filters.store';

/** How many months the net worth chart asks for until the user picks another length. */
export const NET_WORTH_MONTHS = '24';

/** The accounts that were ever positive, with their negative balances clamped to zero: liabilities are not stacked. */
export function stackedAccounts(report: Pick<NetWorthReport, 'byAccount'>): { id: string; name: string; balances: number[] }[] {
  return report.byAccount.filter((a) => a.balances.some((b) => b > 0)).map((a) => ({ ...a, balances: a.balances.map((b) => Math.max(b, 0)) }));
}

/** Net worth over time: the total, and the accounts it is made of. */
export function netWorthViewModel() {
  const i18n = inject(I18n);
  const filters = inject(FiltersStore);
  const f = inject(FormatService);
  const colors = inject(SeriesColors);
  const monthsParam = filters.param('months');
  const months = computed(() => monthsParam() ?? NET_WORTH_MONTHS);
  const res = reportResource<NetWorthReport>('reports/net-worth', () => ({ months: months() }));
  const r = res.data;
  const first = computed(() => r()?.total[0] ?? null);

  const totalOpts = computed(() => {
    const report = r();
    return report ? linesOption(f, report.months, [{ id: 'nw', name: i18n.t('common.netWorth'), values: report.total, color: money.revenue(), area: true }]) : null;
  });

  const stackOpts = computed(() => {
    const report = r();
    if (!report?.byAccount.length) return null;
    return linesOption(f, report.months, stackedAccounts(report).map((a) => ({ id: a.id, name: a.name, values: a.balances, color: colors.color('account', a.id) })), { stack: true });
  });

  const table = computed<ChartTable | null>(() => {
    const report = r();
    if (!report) return null;
    return {
      columns: [i18n.t('common.account'), ...report.months.map((m) => f.monthLabel(m))],
      rows: [...report.byAccount.map((a) => [a.name, ...a.balances.map((b) => f.compact(b))]), [i18n.t('common.total'), ...report.total.map((v) => f.compact(v))]],
      numeric: report.months.map((_, i) => i + 1),
    };
  });

  return {
    i18n,
    filters,
    months,
    res,
    r,
    first,
    totalOpts,
    stackOpts,
    table,

    setMonths(n: number): void {
      filters.setParams({ months: n });
    },
  };
}
