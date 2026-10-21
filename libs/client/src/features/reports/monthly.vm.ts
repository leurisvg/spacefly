import { computed, inject, signal } from '@angular/core';
import type { CalendarReport, CategoryRow, MonthlyReport, SankeyNode, SankeyReport } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { TxDetailService } from '../../state/tx-detail.service';

/** How a category compares with the previous period. A zero baseline is "new" (no meaningful percentage). */
export interface CategoryChange {
  isNew: boolean;
  /** Current minus previous total. */
  delta: number;
  /** |delta| relative to the previous total; 0 when new. */
  ratio: number;
  up: boolean;
}

export function categoryChange(c: Pick<CategoryRow, 'previous'> & { total: { value: number } }): CategoryChange {
  const delta = c.total.value - c.previous;
  return { isNew: c.previous === 0, delta, ratio: c.previous === 0 ? 0 : Math.abs(delta / c.previous), up: delta > 0 };
}

/** A category's total as a percentage of the largest one, for the little bar under its name. */
export function relativeWidth(total: number, maxAbs: number): number {
  return (Math.abs(total) / maxAbs) * 100;
}

export interface MonthlyOptions {
  /** Fetch the Sankey report (the web page draws it; the phone links to the Flow screen instead). */
  sankey?: boolean;
  /** Fetch the daily calendar report. */
  calendar?: boolean;
}

/** The email report, interactive: same sections, same order, any period. */
export function monthlyViewModel(opts: MonthlyOptions = {}) {
  const i18n = inject(I18n);
  const detail = inject(TxDetailService);
  const f = inject(FormatService);
  const res = reportResource<MonthlyReport>('reports/monthly');
  const sankey = reportResource<SankeyReport>('reports/sankey', () => (opts.sankey ? {} : null));
  const calendar = reportResource<CalendarReport>('reports/calendar', () => (opts.calendar ? {} : null));
  const d = res.data;
  const expanded = signal(new Set<string>());

  const maxAbs = computed(() => Math.max(1, ...(d()?.categories ?? []).map((c) => Math.abs(c.total.value))));

  return {
    i18n,
    detail,
    hidden: f.hidden,
    res,
    sankey,
    calendar,
    d,
    expanded,

    relative: (c: CategoryRow): number => relativeWidth(c.total.value, maxAbs()),
    change: categoryChange,

    toggleAsset(id: string): void {
      const next = new Set(expanded());
      if (next.has(id)) next.delete(id);
      else next.add(id);
      expanded.set(next);
    },

    openCategory(c: CategoryRow): void {
      detail.open(i18n.name(c.name, c.id), { category: c.id ?? 'none' });
    },

    openBudget(b: { id: string; name: string }): void {
      detail.open(b.name, { type: 'withdrawal', budget: b.id });
    },

    openNode(n: SankeyNode): void {
      detail.open(n.labelKey ? i18n.t(n.labelKey) : n.label, n.filter ?? {});
    },

    openDay(date: string): void {
      detail.open(f.date(date, 'full'), { start: date, end: date });
    },
  };
}
