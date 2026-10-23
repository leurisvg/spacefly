import { computed, inject } from '@angular/core';
import type { ProjectionEvent, ProjectionReport } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import type { ChartTable } from '../../charts/chart-table';
import { tooltipRow, tooltipTitle } from '../../charts/chart-theme';
import { palette } from '../../charts/palette';
import { money } from '../../charts/series-colors';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { FiltersStore } from '../../state/filters.store';

/** How far ahead the projection can look (days). */
export const PROJECTION_DAYS = ['30', '60', '90', '180'] as const;

/** The horizon asked for (`?days=`), or 90. */
export function resolveProjectionDays(param: string | null): string {
  return PROJECTION_DAYS.find((d) => d === param) ?? '90';
}

/** What happens on a day of the projection. */
export function eventsOn(events: readonly ProjectionEvent[], date: string): ProjectionEvent[] {
  return events.filter((e) => e.date === date);
}

/** Cash-flow projection: today's balance carried forward with the subscriptions and recurring transactions that are due. */
export function projectionViewModel() {
  const i18n = inject(I18n);
  const filters = inject(FiltersStore);
  const f = inject(FormatService);
  const daysParam = filters.param('days');
  const days = computed(() => resolveProjectionDays(daysParam()));
  const res = reportResource<ProjectionReport>('reports/projection', () => ({ days: days() }), { global: false });
  const r = res.data;

  const lowestLabel = computed(() => {
    const l = r()?.lowest;
    return l ? i18n.t('projection.lowest', { amount: f.money(l.balance), date: f.date(l.date, 'long') }) : '';
  });

  const options = computed(() => {
    const report = r();
    if (!report) return null;
    const color = money.net();
    return {
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (p: { dataIndex: number }[]) => {
          const d = report.days[p[0].dataIndex];
          return (
            tooltipTitle(f.date(d.date, 'full')) +
            tooltipRow(color, i18n.t('calendar.balance'), f.money(d.balance)) +
            eventsOn(report.events, d.date)
              .map((e) => tooltipRow(e.amount < 0 ? money.expense() : money.income(), e.name, f.money(e.amount, undefined, { signed: true })))
              .join('')
          );
        },
      },
      xAxis: { type: 'category', data: report.days.map((d) => f.date(d.date, 'short')), boundaryGap: false },
      yAxis: { type: 'value', scale: true, axisLabel: { formatter: (v: number) => f.compact(v) }, splitNumber: 4 },
      series: [
        {
          type: 'line',
          step: 'end',
          data: report.days.map((d) => d.balance),
          showSymbol: false,
          lineStyle: { color, width: 2 },
          itemStyle: { color },
          areaStyle: { color, opacity: 0.1 },
          markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: palette.chartAxis, type: 'solid' }, data: [{ yAxis: 0 }] },
        },
      ],
    };
  });

  const table = computed<ChartTable | null>(() => {
    const report = r();
    return report
      ? {
          columns: [i18n.t('common.date'), i18n.t('projection.inflow'), i18n.t('projection.outflow'), i18n.t('calendar.balance')],
          rows: report.days.filter((d) => d.inflow || d.outflow).map((d) => [f.date(d.date, 'day'), f.money(d.inflow), f.money(d.outflow), f.money(d.balance)]),
          numeric: [1, 2, 3],
        }
      : null;
  });

  return {
    i18n,
    days,
    res,
    r,
    lowestLabel,
    options,
    table,

    setDays(next: string): void {
      filters.setParams({ days: next });
    },
  };
}
