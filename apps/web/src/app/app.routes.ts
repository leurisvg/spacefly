import type { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { Shell } from './layout/shell';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
      {
        path: 'reports',
        children: [
          { path: 'monthly', loadComponent: () => import('./features/monthly/monthly').then((m) => m.Monthly) },
          { path: 'annual', loadComponent: () => import('./features/annual/annual').then((m) => m.Annual) },
          { path: 'flow', loadComponent: () => import('./features/flow/flow').then((m) => m.Flow) },
          { path: 'calendar', loadComponent: () => import('./features/calendar/calendar').then((m) => m.CalendarPage) },
          { path: 'compare', loadComponent: () => import('./features/compare/compare').then((m) => m.Compare) },
        ],
      },
      {
        path: 'analysis',
        children: [
          { path: 'categories', loadComponent: () => import('./features/ranking/ranking').then((m) => m.Ranking), data: { by: 'category', kind: 'expense', key: 'categories' } },
          { path: 'tags', loadComponent: () => import('./features/ranking/ranking').then((m) => m.Ranking), data: { by: 'tag', kind: 'expense', key: 'tags' } },
          { path: 'merchants', loadComponent: () => import('./features/ranking/ranking').then((m) => m.Ranking), data: { by: 'counterparty', kind: 'expense', key: 'merchants', fixedKind: true } },
          { path: 'income-sources', loadComponent: () => import('./features/ranking/ranking').then((m) => m.Ranking), data: { by: 'counterparty', kind: 'income', key: 'incomeSources', fixedKind: true } },
          { path: 'budgets', loadComponent: () => import('./features/budgets/budgets').then((m) => m.Budgets) },
        ],
      },
      { path: 'accounts', loadComponent: () => import('./features/accounts/accounts').then((m) => m.Accounts) },
      { path: 'accounts/net-worth', loadComponent: () => import('./features/accounts/net-worth').then((m) => m.NetWorth) },
      { path: 'accounts/savings', loadComponent: () => import('./features/accounts/savings').then((m) => m.Savings) },
      { path: 'accounts/expense', loadComponent: () => import('./features/accounts/counterparties').then((m) => m.Counterparties), data: { kind: 'expense' } },
      { path: 'accounts/revenue', loadComponent: () => import('./features/accounts/counterparties').then((m) => m.Counterparties), data: { kind: 'income' } },
      { path: 'accounts/expense/:id', loadComponent: () => import('./features/accounts/counterparty-detail').then((m) => m.CounterpartyDetail), data: { kind: 'expense' } },
      { path: 'accounts/revenue/:id', loadComponent: () => import('./features/accounts/counterparty-detail').then((m) => m.CounterpartyDetail), data: { kind: 'income' } },
      { path: 'accounts/:id', loadComponent: () => import('./features/accounts/account-detail').then((m) => m.AccountDetail) },
      {
        path: 'planning',
        children: [
          { path: 'bills', loadComponent: () => import('./features/planning/bills').then((m) => m.Bills) },
          { path: 'recurring', loadComponent: () => import('./features/planning/recurring').then((m) => m.Recurring) },
          { path: 'goals', loadComponent: () => import('./features/planning/goals').then((m) => m.Goals) },
          { path: 'projection', loadComponent: () => import('./features/planning/projection').then((m) => m.Projection) },
        ],
      },
      { path: 'transactions', loadComponent: () => import('./features/explorer/explorer').then((m) => m.Explorer) },
      { path: 'transactions/new', loadComponent: () => import('./features/editor/transaction-form').then((m) => m.TransactionForm) },
      { path: 'transactions/:id/edit', loadComponent: () => import('./features/editor/transaction-form').then((m) => m.TransactionForm) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings').then((m) => m.Settings) },
      { path: 'about', loadComponent: () => import('./features/settings/about').then((m) => m.About) },
    ],
  },
  { path: '**', redirectTo: '' },
];
