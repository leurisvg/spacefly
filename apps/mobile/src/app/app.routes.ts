import type { Routes } from '@angular/router';
import { authGuard } from '@spacefly/client/auth/auth.guard';

const authed = [authGuard];

export const routes: Routes = [
  { path: '', loadComponent: () => import('./screens/home').then((m) => m.Home), canActivate: authed },
  { path: 'login', loadComponent: () => import('./screens/login').then((m) => m.Login) },
  { path: 'drill', loadComponent: () => import('./screens/drill').then((m) => m.Drill), canActivate: authed },
  { path: 'transactions/new', loadComponent: () => import('./screens/transaction-form').then((m) => m.TransactionFormScreen), canActivate: authed },
  { path: 'transactions/:id', loadComponent: () => import('./screens/transaction-view').then((m) => m.TransactionView), canActivate: authed },
  { path: 'transactions/:id/edit', loadComponent: () => import('./screens/transaction-form').then((m) => m.TransactionFormScreen), canActivate: authed },
  { path: 'analysis/categories', loadComponent: () => import('./screens/ranking').then((m) => m.Ranking), canActivate: authed, data: { by: 'category', kind: 'expense', key: 'categories' } },
  { path: 'analysis/tags', loadComponent: () => import('./screens/ranking').then((m) => m.Ranking), canActivate: authed, data: { by: 'tag', kind: 'expense', key: 'tags' } },
  { path: 'analysis/merchants', loadComponent: () => import('./screens/ranking').then((m) => m.Ranking), canActivate: authed, data: { by: 'counterparty', kind: 'expense', key: 'merchants', fixedKind: true } },
  { path: 'analysis/income-sources', loadComponent: () => import('./screens/ranking').then((m) => m.Ranking), canActivate: authed, data: { by: 'counterparty', kind: 'income', key: 'incomeSources', fixedKind: true } },
  { path: '**', redirectTo: '' },
];
