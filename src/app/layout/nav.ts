import {
  lucideArrowRightLeft,
  lucideBriefcase,
  lucideCalendarClock,
  lucideCalendarDays,
  lucideChartArea,
  lucideChartNoAxesCombined,
  lucideFileText,
  lucideFolderTree,
  lucideGitCompare,
  lucideInfo,
  lucideLandmark,
  lucideLayoutDashboard,
  lucidePiggyBank,
  lucideReceipt,
  lucideRepeat,
  lucideSearch,
  lucideSettings,
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

export function findNav(url: string): { section: NavSection; item: NavItem } | null {
  const path = url.split('?')[0].split('#')[0] || '/';
  for (const section of NAV) for (const item of section.items) if (item.path === path) return { section, item };
  return null;
}
