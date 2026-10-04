/**
 * Design tokens used by charts, copied from apps/web/src/styles.css (the app is dark-only). Charts
 * can't read CSS custom properties on mobile (and ECharts needs concrete colors anyway), so both apps
 * draw from this file; `palette.spec.ts` fails if it drifts from the stylesheets.
 */
export const PALETTE_VARS = {
  '--font-sans': "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  '--font-mono': "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  '--background': '#0a0e1a',
  '--chart-surface': '#111827',
  '--chart-ink': '#e2e8f0',
  '--chart-ink-2': '#94a3b8',
  '--chart-muted': '#64748b',
  '--chart-grid': '#1e293b',
  '--chart-axis': '#334155',
  '--money-income': '#199e70',
  '--money-expense': '#e66767',
  '--money-net': '#3987e5',
  '--money-savings': '#008300',
  '--money-budget': '#3987e5',
  '--money-revenue': '#9085e9',
  '--money-hub': '#64748b',
  '--money-deficit': '#d95926',
  '--money-other': '#475569',
  '--series-1': '#3987e5',
  '--series-2': '#d95926',
  '--series-3': '#199e70',
  '--series-4': '#c98500',
  '--series-5': '#d55181',
  '--series-6': '#008300',
  '--series-7': '#9085e9',
  '--series-8': '#e66767',
} as const;

const v = PALETTE_VARS;

export const palette = {
  fontSans: v['--font-sans'],
  fontMono: v['--font-mono'],
  background: v['--background'],
  chartSurface: v['--chart-surface'],
  chartInk: v['--chart-ink'],
  chartInk2: v['--chart-ink-2'],
  chartMuted: v['--chart-muted'],
  chartGrid: v['--chart-grid'],
  chartAxis: v['--chart-axis'],
  moneyIncome: v['--money-income'],
  moneyExpense: v['--money-expense'],
  moneyNet: v['--money-net'],
  moneySavings: v['--money-savings'],
  moneyBudget: v['--money-budget'],
  moneyRevenue: v['--money-revenue'],
  moneyHub: v['--money-hub'],
  moneyDeficit: v['--money-deficit'],
  moneyOther: v['--money-other'],
  /** Categorical slots, in assignment order. */
  series: [v['--series-1'], v['--series-2'], v['--series-3'], v['--series-4'], v['--series-5'], v['--series-6'], v['--series-7'], v['--series-8']],
} as const;
