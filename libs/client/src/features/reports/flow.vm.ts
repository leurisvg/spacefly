import { computed, inject } from '@angular/core';
import type { SankeyNode, SankeyReport } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { SANKEY_COLORS } from '../../charts/builders';
import type { ChartTable } from '../../charts/chart-table';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { FiltersStore } from '../../state/filters.store';
import { TxDetailService } from '../../state/tx-detail.service';

export type FlowMode = 'budget' | 'tags';

/** Shares of income the "group small flows" control offers on a phone (the web has a slider over the same range). */
export const FLOW_THRESHOLDS = [0, 0.01, 0.02, 0.03, 0.05, 0.1] as const;

const LEGEND_ORDER = ['revenue', 'income_cat', 'hub', 'budget', 'tag', 'category', 'savings', 'deficit', 'other'] as const;

/** The display name of a Sankey node (synthetic nodes have an i18n key). */
export function nodeLabel(n: Pick<SankeyNode, 'label' | 'labelKey'>, t: (key: string) => string): string {
  return n.labelKey ? t(n.labelKey) : n.label;
}

/** Which node kinds are in the report, in legend order. */
export function legendKinds(nodes: readonly Pick<SankeyNode, 'kind'>[]): (typeof LEGEND_ORDER)[number][] {
  const kinds = new Set(nodes.map((n) => n.kind));
  return LEGEND_ORDER.filter((k) => kinds.has(k));
}

/** Money flow: income → budgets / categories / tags → savings, as a Sankey with its options kept in the URL / in memory. */
export function flowViewModel() {
  const i18n = inject(I18n);
  const f = inject(FormatService);
  const filters = inject(FiltersStore);
  const detail = inject(TxDetailService);

  const modeParam = filters.param('mode');
  const budgetsParam = filters.param('budgets');
  const incomeParam = filters.param('incomeCategories');
  const thresholdParam = filters.param('threshold');
  const mode = computed<FlowMode>(() => (modeParam() === 'tags' ? 'tags' : 'budget'));
  const budgets = computed(() => budgetsParam() !== '0');
  const incomeCategories = computed(() => incomeParam() !== '0');
  const threshold = computed(() => Number(thresholdParam() ?? 0) || 0);

  const res = reportResource<SankeyReport>('reports/sankey', () => ({
    mode: mode(),
    budgets: budgets() ? '1' : '0',
    incomeCategories: incomeCategories() ? '1' : '0',
    ...(thresholdParam() !== null ? { threshold: threshold() } : {}),
  }));
  const r = res.data;

  const label = (n: SankeyNode): string => nodeLabel(n, i18n.t);

  const legend = computed(() => legendKinds(r()?.nodes ?? []).map((k) => ({ key: k, color: SANKEY_COLORS[k](), label: i18n.t(`sankey.kinds.${k}`) })));

  const table = computed<ChartTable | null>(() => {
    const report = r();
    if (!report) return null;
    const byId = new Map(report.nodes.map((n) => [n.id, n]));
    return {
      columns: [i18n.t('flow.from'), i18n.t('flow.to'), i18n.t('common.amount'), i18n.t('flow.shareOfIncome')],
      rows: report.links.map((l) => [label(byId.get(l.source)!), label(byId.get(l.target)!), f.money(l.value), f.pct(report.totalIncome ? l.value / report.totalIncome : null)]),
      numeric: [2, 3],
    };
  });

  return {
    i18n,
    res,
    r,
    mode,
    budgets,
    incomeCategories,
    threshold,
    legend,
    table,
    label,

    set(key: string, value: string): void {
      filters.setParams({ [key]: value });
    },

    /** A Sankey click reports the node's id; edges and unknown ids are ignored. */
    openNodeById(id: string): void {
      const node = r()?.nodes.find((n) => n.id === id);
      if (node?.filter) detail.open(label(node), node.filter);
    },

    open(node: SankeyNode): void {
      detail.open(label(node), node.filter ?? {});
    },
  };
}
