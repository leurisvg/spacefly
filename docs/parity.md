# Web / mobile parity

**The mobile app is being rebuilt in Flutter, in phases.** The NativeScript app was removed; the "Mobile route" column is filled in as each screen is ported (an empty cell is not ported yet). The web routes and view-models below are the reference for what to port. Update this table in the same change as any new screen.

| Feature | Web route | Mobile route | View-model |
|---|---|---|---|
| Dashboard | `/` | `/` (tab: KPIs, income vs expenses, top categories, net worth, budgets, subscriptions, largest; the calendar and the links to the other reports are not ported yet) | `dashboard.vm.ts` |
| Transactions list | `/transactions` | `/transactions` (tab: search, filters, sort, 50 at a time, a button for a new transaction; CSV export and deleting from the list are not there) | `explorer.vm.ts` |
| Transaction detail | detail sheet over the list | `/transactions/:id` (with edit and delete) and `/drill` (the transactions behind a chart slice or a budget) | `tx-detail.vm.ts`, `tx-view.vm.ts` |
| New / edit transaction | `/transactions/new`, `/transactions/:id/edit` | same paths (the new form takes the same `?source=…&amount=…` pre-fill) | `transaction-form.vm.ts`, `account-picker.vm.ts` |
| Accounts | `/accounts` | `/accounts` (tab: balances, flow, balance history; no reordering or editing yet) | `accounts.vm.ts` |
| Settings | `/settings` | `/settings` (tab: theme, language, display currency, privacy, server and sign out, refresh data, open Firefly) | `preferences.vm.ts` |
| Login | `/login` | `/login`, plus `/server` for the server URL and Cloudflare Access credentials | `login.vm.ts` |
| Drill into a chart slice | sheet / explorer filters | | `explorer.vm.ts` |
| Monthly summary | `/reports/monthly` | | `monthly.vm.ts` |
| Annual report | `/reports/annual` | | `annual.vm.ts` |
| Money flow | `/reports/flow` | | `flow.vm.ts` |
| Calendar | `/reports/calendar` | | `calendar.vm.ts` |
| Compare | `/reports/compare` | | `compare.vm.ts` |
| Categories, tags, merchants, income sources | `/analysis/*` | | `ranking.vm.ts` |
| Budgets | `/analysis/budgets` | | `budgets.vm.ts` |
| Account detail, net worth, savings, counterparties | `/accounts/*` | | – |
| Subscriptions, recurring, goals, projection | `/planning/*` | | – |
| Entity editors (category, tag, budget, subscription, account, goal) | side sheet | | `entity-form.vm.ts` and one `*-form.vm.ts` per entity |
| Server settings (excluded accounts, balance window, Sankey threshold, rates in use) | section of `/settings` | `/settings/server` | `settings.vm.ts` |
| Exchange rates (add, replace, delete) | section of `/settings` | `/settings/exchange-rates` | `exchange-rates.vm.ts` |
| Reordering accounts, CSV export | web | | – |
| About | `/about` | | – |
