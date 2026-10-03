import { describe, expect, it } from 'vitest';
import type { SankeyReport } from '@shared';
import { isExpense, isIncome, type ReportContext, type Split } from '../src/core/ledger';
import type { FfBudget, FfBudgetLimit, FfResource } from '../src/firefly/firefly.types';
import { buildCalendar } from '../src/reports/calendar.report';
import { buildAnnual, buildCompare } from '../src/reports/compare.report';
import { buildCategories, buildBudgets as buildBudgetRows, buildAssetActivity } from '../src/reports/monthly.report';
import { buildProjection } from '../src/reports/planning.report';
import { buildRanking, keyFns } from '../src/reports/ranking.report';
import { buildSankey } from '../src/reports/sankey.report';
import { AUG, augSplits, ctxFor, SEP, sepSplits } from './helpers';

const budgets = ['Hogar', 'Ocio', 'Viajes'].map((name, i) => ({
  type: 'budgets',
  id: String(i + 1),
  attributes: { name, active: true } as FfBudget,
})) as FfResource<FfBudget>[];

const limits = [
  ['1', '15000', 'DOP'],
  ['2', '5000', 'DOP'],
  ['3', '100', 'USD'],
].map(([budget_id, amount, currency_code]) => ({
  type: 'budget_limits',
  id: budget_id,
  attributes: { budget_id, amount, currency_code, start: '2026-09-01T00:00:00-04:00', end: '2026-09-30T23:59:59-04:00' } as FfBudgetLimit,
})) as FfResource<FfBudgetLimit>[];

function flows(r: SankeyReport) {
  const sum = (pred: (l: SankeyReport['links'][number]) => boolean) => r.links.filter(pred).reduce((s, l) => s + l.value, 0);
  return {
    intoHub: sum((l) => l.target === 'hub'),
    outOfHub: sum((l) => l.source === 'hub'),
    node: (id: string) => r.nodes.find((n) => n.id === id),
  };
}

/**
 * TypeScript port of monthly-report.py's Sankey construction (lines 868–1072), used as the
 * parity reference: category totals = earned + spent, expense categories are those with a
 * negative total, budget → category links from budget transactions, and the hub → category
 * fallback only for categories not reached via any budget.
 */
function scriptSankey(ctx: ReportContext, splits: Split[], budgetNames: string[]) {
  const nodes = new Map<string, number>();
  const add = (id: string, v: number) => nodes.set(id, (nodes.get(id) ?? 0) + v);
  const deposits = splits.filter(isIncome);
  const revToCat = new Map<string, Map<string, number>>();
  for (const s of deposits) {
    const m = revToCat.get(s.sourceName) ?? new Map<string, number>();
    m.set(s.categoryName ?? '', (m.get(s.categoryName ?? '') ?? 0) + ctx.value(s));
    revToCat.set(s.sourceName, m);
  }
  const catTotals = new Map<string, number>();
  for (const s of splits) {
    if (!s.categoryName || !(isIncome(s) || isExpense(s))) continue; // script iterates Firefly categories only
    catTotals.set(s.categoryName, (catTotals.get(s.categoryName) ?? 0) + (isIncome(s) ? 1 : -1) * ctx.value(s));
  }
  const expenseCats = [...catTotals].filter(([, v]) => v < 0);
  const budgetSpent = new Map<string, number>();
  const budgetCat = new Map<string, Map<string, number>>();
  for (const s of splits.filter((x) => isExpense(x) && x.budgetName)) {
    budgetSpent.set(s.budgetName!, (budgetSpent.get(s.budgetName!) ?? 0) + ctx.value(s));
    const m = budgetCat.get(s.budgetName!) ?? new Map<string, number>();
    m.set(s.categoryName ?? 'Uncategorized', (m.get(s.categoryName ?? 'Uncategorized') ?? 0) + ctx.value(s));
    budgetCat.set(s.budgetName!, m);
  }
  const earned = ctx.sum(deposits);
  const spent = ctx.sum(splits.filter(isExpense));
  const net = earned - spent;
  for (const cats of revToCat.values()) for (const [cat, v] of cats) add(`income_cat:${cat}`, v);
  add('hub', earned);
  for (const [b, v] of budgetSpent) add(`budget:${b}`, v);
  const reached = new Set<string>();
  for (const cats of budgetCat.values())
    for (const [cat, v] of cats)
      if (expenseCats.some(([n]) => n === cat)) {
        add(`category:${cat}`, v);
        reached.add(cat);
      }
  for (const [cat, total] of expenseCats) if (!reached.has(cat)) add(`category:${cat}`, -total);
  const savingsLabel = budgetNames.some((n) => n.toLowerCase() === 'savings') ? 'Net Savings' : 'Savings';
  if (net > 0) add(`savings:${savingsLabel}`, net);
  return nodes;
}

describe('sankey', () => {
  it('balances: income (+deficit) = expenses + savings', () => {
    for (const currency of ['DOP', 'USD']) {
      const ctx = ctxFor(SEP, currency);
      const r = buildSankey(ctx, sepSplits(), ['Hogar', 'Ocio']);
      const f = flows(r);
      expect(f.intoHub).toBeCloseTo(r.totalIncome, 1);
      expect(f.outOfHub).toBeCloseTo(r.totalExpense + r.savings, 1);
      expect(r.totalIncome - r.totalExpense).toBeCloseTo(r.savings, 1);
    }
  });

  it('builds the 5 levels of the email with its node kinds and totals', () => {
    const r = buildSankey(ctxFor(SEP), sepSplits(), ['Hogar', 'Ocio']);
    const f = flows(r);
    expect(r.totalIncome).toBe(150500);
    expect(r.totalExpense).toBeCloseTo(21425.39, 2);
    expect(f.node('revenue:10')?.value).toBe(120000);
    expect(f.node('income_cat:1')?.value).toBe(120000);
    expect(f.node('hub')?.value).toBe(150500);
    expect(f.node('budget:1')?.value).toBe(12000);
    expect(f.node('category:2')?.value).toBe(12700); // 8500 via Hogar + 4200 straight from the hub
    expect(f.node('category:none')?.value).toBe(1200);
    expect(f.node('savings')?.value).toBeCloseTo(129074.61, 2);
    expect(f.node('savings')?.labelKey).toBe('sankey.savings');
  });

  it('matches the script node values when every category is fully (un)budgeted', () => {
    // Remove the cases where the script is known to drop money (partial budgets, uncategorized).
    const partial = ['Compra rápida', 'Cena', 'Almuerzo'];
    const splits = sepSplits().filter((s) => !partial.includes(s.description) && s.categoryId);
    const ctx = ctxFor(SEP);
    const ours = buildSankey(ctx, splits, ['Hogar', 'Ocio']);
    const ref = scriptSankey(ctx, splits, ['Hogar', 'Ocio']);
    const byLabel = (id: string) => ours.nodes.find((n) => n.id === id)!;
    const names: Record<string, string> = { Comida: '2', Servicios: '3', Entretenimiento: '4', Salario: '1' };
    for (const [key, value] of ref) {
      const [kind, name] = key.split(':') as [string, string | undefined];
      const node =
        kind === 'hub'
          ? byLabel('hub')
          : kind === 'savings'
            ? byLabel('savings')
            : kind === 'budget'
              ? ours.nodes.find((n) => n.kind === 'budget' && n.label === name)!
              : byLabel(`${kind}:${names[name!]}`);
      expect(node, key).toBeDefined();
      expect(node.value, key).toBeCloseTo(value, 2);
    }
  });

  it('renames the surplus node when a budget is already called Savings', () => {
    const r = buildSankey(ctxFor(SEP), sepSplits(), ['savings']);
    expect(r.savingsLabel).toBe('netSavings');
    expect(r.nodes.find((n) => n.id === 'savings')?.labelKey).toBe('sankey.netSavings');
  });

  it('adds a deficit node when expenses exceed income', () => {
    const r = buildSankey(ctxFor(SEP), sepSplits().filter(isExpense), []);
    const f = flows(r);
    expect(f.node('deficit')?.value).toBeCloseTo(21425.39, 2);
    expect(f.intoHub).toBeCloseTo(f.outOfHub, 2);
  });

  it('supports toggling levels, tag mode and "Others" grouping', () => {
    const ctx = ctxFor(SEP);
    const flat = buildSankey(ctx, sepSplits(), [], { showBudgets: false, showIncomeCategories: false });
    expect(flat.nodes.some((n) => n.kind === 'budget' || n.kind === 'income_cat')).toBe(false);
    const tags = buildSankey(ctx, sepSplits(), [], { mode: 'tags' });
    expect(tags.nodes.find((n) => n.id === 'tag:hogar')?.value).toBe(8500);
    expect(flows(tags).outOfHub).toBeCloseTo(tags.totalExpense + tags.savings, 1);
    const grouped = buildSankey(ctx, sepSplits(), [], { threshold: 0.025 });
    expect(grouped.nodes.find((n) => n.id === 'other:category')).toBeDefined();
    expect(flows(grouped).outOfHub).toBeCloseTo(grouped.totalExpense + grouped.savings, 1);
  });
});

describe('calendar', () => {
  it('daily sums add up to the period totals and build a running balance', () => {
    const ctx = ctxFor(SEP);
    const splits = sepSplits().filter((s) => s.type !== 'transfer');
    const r = buildCalendar(ctx, splits, 100000, []);
    expect(r.days).toHaveLength(30);
    const expense = r.days.reduce((s, d) => s + d.expense, 0);
    expect(expense).toBeCloseTo(21425.39, 2);
    expect(r.totals.expense).toBeCloseTo(ctx.sum(splits.filter(isExpense)), 2);
    expect(r.days[0].income).toBe(120000);
    expect(r.days.at(-1)!.balance).toBeCloseTo(100000 + 150500 - 21425.39, 2);
    expect(r.maxValue).toBe(120000);
  });
});

describe('monthly report pieces', () => {
  it('sorts categories by |total|, groups zeros and computes MoM like the email', () => {
    const ctx = ctxFor(SEP);
    const cats = [
      { id: '1', name: 'Salario' },
      { id: '2', name: 'Comida' },
      { id: '3', name: 'Servicios' },
      { id: '4', name: 'Entretenimiento' },
      { id: '5', name: 'Transporte' },
    ];
    const r = buildCategories({ ctx, splits: sepSplits(), previousSplits: augSplits(), categories: cats });
    expect(r.categories.map((c) => c.name)).toEqual(['Salario', '', 'Comida', 'Entretenimiento', 'Servicios']);
    expect(r.zeroCategories).toEqual(['Transporte']);
    const comida = r.categories.find((c) => c.id === '2')!;
    expect(comida.total.value).toBe(-12700);
    expect(comida.previous).toBe(-9000);
    const fun = r.categories.find((c) => c.id === '4')!;
    expect(fun.total.value).toBeCloseTo(-4025.39, 2);
    expect(fun.total.parts).toEqual([
      { original: -975.39, currency: 'DOP', rate: 1 },
      { original: -50, currency: 'USD', rate: 61 },
    ]);
  });

  it('computes budgets with limits, converted limits and grouped zero budgets', () => {
    const ctx = ctxFor(SEP);
    const r = buildBudgetRows(ctx, sepSplits(), budgets, limits);
    expect(r.budgets.map((b) => [b.name, b.limit.value, b.spent.value, b.remaining])).toEqual([
      ['Hogar', 15000, 12000, 3000],
      ['Ocio', 5000, 975.39, 4024.61],
    ]);
    expect(r.budgets[0].pct).toBeCloseTo(0.8, 6);
    expect(r.zeroBudgets).toEqual({ names: ['Viajes'], limit: 6100 });
  });

  it('aggregates activity per asset account with top transactions', () => {
    const rows = buildAssetActivity(ctxFor(SEP), sepSplits());
    const banco = rows.find((r) => r.name === 'Banco Popular')!;
    expect(banco).toMatchObject({ income: 120000, expense: 13200, net: 106800 });
    expect(banco.topExpenses[0].description).toBe('Compra quincenal');
  });
});

describe('analysis reports', () => {
  it('ranks merchants with count, average and previous period', () => {
    const ctx = ctxFor(SEP);
    const r = buildRanking(ctx, 'expense', sepSplits(), augSplits(), [...augSplits(), ...sepSplits()], ['2026-08', '2026-09'], keyFns.counterparty);
    const superm = r.items.find((i) => i.name === 'Supermercado Nacional')!;
    expect(superm).toMatchObject({ value: 12700, count: 2, avg: 6350, previous: 9000 });
    expect(r.trend.find((t) => t.name === 'Supermercado Nacional')!.points).toEqual([
      { month: '2026-08', value: 9000 },
      { month: '2026-09', value: 12700 },
    ]);
  });

  it('compares two periods by category', () => {
    const ctx = ctxFor(SEP);
    const r = buildCompare(ctx, 'category', 'expense', { period: SEP, splits: sepSplits() }, { period: AUG, splits: augSplits() }, [], []);
    const comida = r.rows.find((x) => x.id === '2')!;
    expect(comida).toMatchObject({ a: 12700, b: 9000, delta: 3700 });
    expect(comida.pct).toBeCloseTo(3700 / 9000, 6);
    expect(r.a.income).toBe(150500);
  });

  it('builds the annual matrix and best/worst month', () => {
    const ctx = ctxFor({ start: '2026-01-01', end: '2026-12-31' });
    const r = buildAnnual(ctx, 2026, [...augSplits(), ...sepSplits()], '2026-09');
    expect(r.income[8]).toBe(150500);
    expect(r.expense[7]).toBe(14300);
    expect(r.best?.month).toBe('2026-09');
    expect(r.savingsRate[9]).toBeNull();
    expect(r.categories[0].name).toBe('Comida');
  });

  it('projects cash flow from recurrences and bills without double counting', () => {
    const ctx = ctxFor(SEP);
    const r = buildProjection(ctx, 1000, 60, [], []);
    expect(r.days.at(-1)!.balance).toBe(1000);
    expect(r.horizons.map((h) => h.days)).toEqual([30, 60]);
  });
});
