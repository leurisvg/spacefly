import {
  lucideArrowRightLeft,
  lucideBriefcase,
  lucideCalendarClock,
  lucideCalendarDays,
  lucideChartArea,
  lucideChartNoAxesCombined,
  lucideFileText,
  lucideFolderTree,
  lucideHandCoins,
  lucideGitCompare,
  lucideInfo,
  lucideLandmark,
  lucideLayoutDashboard,
  lucidePiggyBank,
  lucideReceipt,
  lucideRepeat,
  lucideSearch,
  lucideSettings,
  lucideShoppingCart,
  lucideStore,
  lucideTags,
  lucideTarget,
  lucideTrendingUp,
  lucideWallet,
  lucideWorkflow,
  lucideCalendarRange,
} from '@ng-icons/lucide';

export interface NavItem {
  key: string;
  path: string;
  icon: string;
}

export interface NavSection {
  key: string;
  items: NavItem[];
}

export const NAV_ICONS = {
  lucideLayoutDashboard,
  lucideFileText,
  lucideCalendarRange,
  lucideWorkflow,
  lucideCalendarDays,
  lucideGitCompare,
  lucideFolderTree,
  lucideTags,
  lucideTarget,
  lucideStore,
  lucideBriefcase,
  lucideWallet,
  lucideLandmark,
  lucidePiggyBank,
  lucideReceipt,
  lucideRepeat,
  lucideCalendarClock,
  lucideChartArea,
  lucideSearch,
  lucideSettings,
  lucideInfo,
  lucideTrendingUp,
  lucideChartNoAxesCombined,
  lucideArrowRightLeft,
  lucideShoppingCart,
  lucideHandCoins,
};

/** Sidebar structure; `key` is both the i18n key (nav.<key>) and the breadcrumb label. */
export const NAV: NavSection[] = [
  { key: 'general', items: [{ key: 'dashboard', path: '/', icon: 'lucideLayoutDashboard' }] },
  {
    key: 'reports',
    items: [
      { key: 'monthly', path: '/reports/monthly', icon: 'lucideFileText' },
      { key: 'annual', path: '/reports/annual', icon: 'lucideCalendarRange' },
      { key: 'flow', path: '/reports/flow', icon: 'lucideWorkflow' },
      { key: 'calendar', path: '/reports/calendar', icon: 'lucideCalendarDays' },
      { key: 'compare', path: '/reports/compare', icon: 'lucideGitCompare' },
    ],
  },
  {
    key: 'analysis',
    items: [
      { key: 'categories', path: '/analysis/categories', icon: 'lucideFolderTree' },
      { key: 'tags', path: '/analysis/tags', icon: 'lucideTags' },
      { key: 'budgets', path: '/analysis/budgets', icon: 'lucideTarget' },
      { key: 'merchants', path: '/analysis/merchants', icon: 'lucideStore' },
      { key: 'incomeSources', path: '/analysis/income-sources', icon: 'lucideBriefcase' },
    ],
  },
  {
    key: 'accounts',
    items: [
      { key: 'assetAccounts', path: '/accounts', icon: 'lucideWallet' },
      { key: 'expenseAccounts', path: '/accounts/expense', icon: 'lucideShoppingCart' },
      { key: 'revenueAccounts', path: '/accounts/revenue', icon: 'lucideHandCoins' },
      { key: 'netWorth', path: '/accounts/net-worth', icon: 'lucideLandmark' },
      { key: 'savings', path: '/accounts/savings', icon: 'lucidePiggyBank' },
    ],
  },
  {
    key: 'planning',
    items: [
      { key: 'bills', path: '/planning/bills', icon: 'lucideReceipt' },
      { key: 'recurring', path: '/planning/recurring', icon: 'lucideRepeat' },
      { key: 'goals', path: '/planning/goals', icon: 'lucideTarget' },
      { key: 'projection', path: '/planning/projection', icon: 'lucideChartArea' },
    ],
  },
  { key: 'transactions', items: [{ key: 'explorer', path: '/transactions', icon: 'lucideSearch' }] },
  {
    key: 'system',
    items: [
      { key: 'settings', path: '/settings', icon: 'lucideSettings' },
      { key: 'about', path: '/about', icon: 'lucideInfo' },
    ],
  },
];

/**
 * Screens that aren't in the sidebar but still belong to a section. Breadcrumb: section › parent (a sidebar item,
 * as a link) › the record's name. `key` (`nav.<key>`) is the fallback while the name loads; `named` pages hand their
 * record's name to `BreadcrumbLeaf`.
 */
export interface ExtraCrumb {
  pattern: RegExp;
  section: string;
  /** Path of the sidebar item this screen hangs from. */
  parent: string;
  key: string;
  /** The page supplies the record's name (see `BreadcrumbLeaf`). */
  named?: true;
  /** Not an editor: the period picker stays visible. */
  editor?: false;
}

export const EXTRA_CRUMBS: ExtraCrumb[] = [
  { pattern: /^\/transactions\/new$/, section: 'transactions', parent: '/transactions', key: 'newTransaction' },
  { pattern: /^\/transactions\/[^/]+\/edit$/, section: 'transactions', parent: '/transactions', key: 'editTransaction', named: true },
  { pattern: /^\/accounts\/[^/]+$/, section: 'accounts', parent: '/accounts', key: 'accountDetail', named: true, editor: false },
  { pattern: /^\/accounts\/expense\/[^/]+$/, section: 'accounts', parent: '/accounts/expense', key: 'accountDetail', named: true, editor: false },
  { pattern: /^\/accounts\/revenue\/[^/]+$/, section: 'accounts', parent: '/accounts/revenue', key: 'accountDetail', named: true, editor: false },
];

/** Pages built around a single record rather than a period: the period picker is hidden there. */
export function isEditorRoute(url: string): boolean {
  const path = url.split('?')[0].split('#')[0];
  return EXTRA_CRUMBS.some((c) => c.editor !== false && c.pattern.test(path));
}

export interface Crumb {
  section: NavSection;
  /** The sidebar item a detail screen hangs from; null on the sidebar screens themselves. */
  parent: NavItem | null;
  item: NavItem;
  /** The page shows its record's name instead of `item`'s label once it knows it. */
  named: boolean;
}

export function findNav(url: string): Crumb | null {
  const path = url.split('?')[0].split('#')[0] || '/';
  for (const section of NAV) for (const item of section.items) if (item.path === path) return { section, parent: null, item, named: false };
  const extra = EXTRA_CRUMBS.find((c) => c.pattern.test(path));
  if (!extra) return null;
  const section = NAV.find((s) => s.key === extra.section)!;
  const parent = section.items.find((i) => i.path === extra.parent) ?? null;
  return { section, parent, item: { key: extra.key, path, icon: '' }, named: !!extra.named };
}
