import type { SankeyLink, SankeyNode, SankeyNodeKind, SankeyOptions, SankeyReport } from '@shared';
import { isExpense, isIncome, round, type ReportContext, type Split } from '../core/ledger';

export const DEFAULT_SANKEY_OPTIONS: SankeyOptions = {
  mode: 'budget',
  showBudgets: true,
  showIncomeCategories: true,
  threshold: 0,
};

const NONE = 'none';

/**
 * Builds the 5-level money-flow diagram of the email report:
 *   revenue account → income category → Total Income → budget → expense category (+ Savings)
 *
 * Differences from the script, all of which keep totals balanced:
 * - flows use gross withdrawals, so a category partially covered by budgets gets its
 *   unbudgeted remainder straight from the hub (the script dropped it);
 * - uncategorized spending appears as its own node;
 * - a "Deficit" source feeds the hub when expenses exceed income.
 */
export function buildSankey(
  ctx: ReportContext,
  splits: Split[],
  budgetNames: string[],
  options: Partial<SankeyOptions> = {},
): SankeyReport {
  const opt = { ...DEFAULT_SANKEY_OPTIONS, ...options };
  const g = new Graph();
  const income = splits.filter(isIncome);
  const expense = splits.filter(isExpense);
  const totalIncome = round(ctx.sum(income));
  const totalExpense = round(ctx.sum(expense));
  const net = round(totalIncome - totalExpense);

  g.node('hub', '', 'hub', undefined, 'sankey.totalIncome');

  // Income side: revenue → income category → hub
  for (const s of income) {
    const v = ctx.value(s);
    const rev = `revenue:${s.sourceId}`;
    g.node(rev, s.sourceName, 'revenue', { type: 'deposit', counterparty: s.sourceId });
    if (opt.showIncomeCategories) {
      const catId = s.categoryId ?? NONE;
      const cat = `income_cat:${catId}`;
      g.node(cat, s.categoryName ?? '', 'income_cat', { type: 'deposit', category: catId }, s.categoryId ? undefined : 'common.uncategorized');
      g.link(rev, cat, v);
      g.link(cat, 'hub', v);
    } else {
      g.link(rev, 'hub', v);
    }
  }

  // Expense side
  for (const s of expense) {
    const v = ctx.value(s);
    const catId = s.categoryId ?? NONE;
    const cat = `category:${catId}`;
    g.node(cat, s.categoryName ?? '', 'category', { type: 'withdrawal', category: catId }, s.categoryId ? undefined : 'common.uncategorized');

    if (opt.mode === 'tags') {
      const tags = s.tags.length ? s.tags : [null];
      const share = v / tags.length;
      for (const tag of tags) {
        const id = `tag:${tag ?? NONE}`;
        g.node(id, tag ?? '', 'tag', { type: 'withdrawal', tag: tag ?? NONE }, tag ? undefined : 'common.untagged');
        g.link('hub', id, share);
        g.link(id, cat, share);
      }
    } else if (opt.showBudgets && s.budgetId) {
      const b = `budget:${s.budgetId}`;
      g.node(b, s.budgetName ?? '', 'budget', { type: 'withdrawal', budget: s.budgetId });
      g.link('hub', b, v);
      g.link(b, cat, v);
    } else {
      g.link('hub', cat, v);
    }
  }

  const savingsLabel = budgetNames.some((n) => n.trim().toLowerCase() === 'savings') ? 'netSavings' : 'savings';
  if (net > 0) {
    g.node('savings', '', 'savings', undefined, savingsLabel === 'savings' ? 'sankey.savings' : 'sankey.netSavings');
    g.link('hub', 'savings', net);
  } else if (net < 0) {
    g.node('deficit', '', 'deficit', undefined, 'sankey.deficit');
    g.link('deficit', 'hub', -net);
  }

  if (opt.threshold > 0) {
    const base = totalIncome || totalExpense;
    g.groupSmall('category', base * opt.threshold, 'other:category', 'sankey.othersExpense');
    g.groupSmall('revenue', base * opt.threshold, 'other:revenue', 'sankey.othersIncome');
    if (opt.mode === 'tags') g.groupSmall('tag', base * opt.threshold, 'other:tag', 'sankey.othersTags');
  }

  const { nodes, links } = g.build();
  return { nodes, links, totalIncome, totalExpense, savings: Math.max(net, 0), savingsLabel };
}

class Graph {
  private readonly nodes = new Map<string, SankeyNode>();
  private readonly links = new Map<string, SankeyLink>();

  node(id: string, label: string, kind: SankeyNodeKind, filter?: Record<string, string>, labelKey?: string): void {
    if (this.nodes.has(id)) return;
    const n: SankeyNode = { id, label, kind, value: 0 };
    if (filter) n.filter = filter;
    if (labelKey) n.labelKey = labelKey;
    this.nodes.set(id, n);
  }

  link(source: string, target: string, value: number): void {
    if (value <= 0) return;
    const key = `${source}→${target}`;
    const l = this.links.get(key);
    if (l) l.value += value;
    else this.links.set(key, { source, target, value });
  }

  /** Merges nodes of a kind whose throughput is below `min` into a single "Others" node. */
  groupSmall(kind: SankeyNodeKind, min: number, otherId: string, labelKey: string): void {
    const throughput = this.throughput();
    const small = [...this.nodes.values()].filter((n) => n.kind === kind && (throughput.get(n.id) ?? 0) < min);
    if (small.length < 2) return;
    const ids = new Set(small.map((n) => n.id));
    this.node(otherId, '', 'other', undefined, labelKey);
    const old = [...this.links.values()];
    this.links.clear();
    for (const l of old) {
      this.link(ids.has(l.source) ? otherId : l.source, ids.has(l.target) ? otherId : l.target, l.value);
    }
    for (const id of ids) this.nodes.delete(id);
  }

  private throughput(): Map<string, number> {
    const inflow = new Map<string, number>();
    const outflow = new Map<string, number>();
    for (const l of this.links.values()) {
      outflow.set(l.source, (outflow.get(l.source) ?? 0) + l.value);
      inflow.set(l.target, (inflow.get(l.target) ?? 0) + l.value);
    }
    const out = new Map<string, number>();
    for (const id of this.nodes.keys()) out.set(id, Math.max(inflow.get(id) ?? 0, outflow.get(id) ?? 0));
    return out;
  }

  build(): { nodes: SankeyNode[]; links: SankeyLink[] } {
    const throughput = this.throughput();
    const links = [...this.links.values()].map((l) => ({ ...l, value: round(l.value) })).filter((l) => l.value > 0);
    const used = new Set(links.flatMap((l) => [l.source, l.target]));
    const order: SankeyNodeKind[] = ['deficit', 'revenue', 'income_cat', 'hub', 'budget', 'tag', 'category', 'other', 'savings'];
    const nodes = [...this.nodes.values()]
      .filter((n) => used.has(n.id))
      .map((n) => ({ ...n, value: round(throughput.get(n.id) ?? 0) }))
      .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || b.value - a.value);
    return { nodes, links };
  }
}
