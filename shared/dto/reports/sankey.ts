export type SankeyNodeKind = 'revenue' | 'income_cat' | 'hub' | 'budget' | 'category' | 'savings' | 'tag' | 'other' | 'deficit';

export interface SankeyNode {
  id: string;
  label: string;
  /** i18n key for synthetic nodes (hub, savings, uncategorized, others…); the UI prefers it over `label`. */
  labelKey?: string;
  kind: SankeyNodeKind;
  value: number;
  /** Filter to open the transactions behind this node. */
  filter?: Record<string, string>;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyReport {
  nodes: SankeyNode[];
  links: SankeyLink[];
  totalIncome: number;
  totalExpense: number;
  savings: number;
  /** Label used for the surplus node: 'Savings', or 'Net Savings' when a budget is already called Savings. */
  savingsLabel: 'savings' | 'netSavings';
}

export interface SankeyOptions {
  mode: 'budget' | 'tags';
  showBudgets: boolean;
  showIncomeCategories: boolean;
  /** Flows smaller than this share of total income are grouped into "Others" (0 disables). */
  threshold: number;
}
