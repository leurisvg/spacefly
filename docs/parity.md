# Web / mobile parity

**The mobile app is being rebuilt in Flutter, in phases.** The NativeScript app was removed; the "Mobile route" column is filled in as each screen is ported (an empty cell is not ported yet). The web routes and view-models below are the reference for what to port. Update this table in the same change as any new screen.

| Feature | Web route | Mobile route | View-model |
|---|---|---|---|
| Dashboard | `/` | `/` (tab: KPIs, income vs expenses, top categories, net worth, budgets, subscriptions, calendar, largest; "View all" links only where the screen exists: calendar) | `dashboard.vm.ts` |
| Transactions list | `/transactions` | `/transactions` (tab: search, filters, sort, 50 at a time, a button for a new transaction; CSV export and deleting from the list are not there) | `explorer.vm.ts` |
| Transaction detail | detail sheet over the list | `/transactions/:id` (with edit and delete) and a bottom sheet (the transactions behind a chart slice, a calendar day or a budget) | `tx-detail.vm.ts`, `tx-view.vm.ts` |
| New / edit transaction | `/transactions/new`, `/transactions/:id/edit` | same paths (the new form takes the same `?source=…&amount=…` pre-fill) | `transaction-form.vm.ts`, `account-picker.vm.ts` |
| Accounts | `/accounts` | `/accounts` (tab: balances, flow, balance history; no reordering or editing yet) | `accounts.vm.ts` |
| Settings | `/settings` | `/settings` (tab: theme, language, display currency, privacy, server and sign out, refresh data, open Firefly) | `preferences.vm.ts` |
| Login | `/login` | `/login`, plus `/server` for the server URL and Cloudflare Access credentials | `login.vm.ts` |
| Drill into a chart slice | sheet / explorer filters | bottom sheet (`showDrillSheet`) | `explorer.vm.ts` |
| Monthly summary | `/reports/monthly` | `/reports/monthly` (from the More tab: KPIs, categories with change, daily cash flow, budgets, top 5, account activity, savings, overview; the Sankey is a link to Flow, with that screen) | `monthly.vm.ts` |
| Annual report | `/reports/annual` | `/reports/annual` (averages, best and worst month, income and expenses, savings rate, category × month matrix that scrolls sideways) | `annual.vm.ts` |
| Money flow | `/reports/flow` | `/reports/flow` (from the More tab and the monthly summary: vertical Sankey drawn natively that scrolls sideways when a layer is crowded, mode / budgets / income categories / small-flow threshold, legend, every link listed; tapping a node or a link opens its transactions) | `flow.vm.ts` |
| Calendar | `/reports/calendar` | `/reports/calendar` (month grid with account / category / tag filters, running balance, scheduled items; year heatmap drawn vertically) | `calendar.vm.ts` |
| Compare | `/reports/compare` | `/reports/compare` (previous / last year / custom B with a native range picker, grouping, kind, diverging bars, trend, table) | `compare.vm.ts` |
| Categories, tags, merchants, income sources | `/analysis/*` | `/analysis/categories`, `/analysis/tags`, `/analysis/merchants`, `/analysis/income-sources` (side switch, bars / treemap / budget sunburst, 12-month trend, list with change; creating and editing entities waits for the editors) | `ranking.vm.ts` |
| Budgets | `/analysis/budgets` | `/analysis/budgets` (totals, a card per budget with the expected-pace tick and projection, history and categories of the picked one; creating and editing waits for the editors) | `budgets.vm.ts` |
| Account detail, net worth, savings, counterparties | `/accounts/*` | | – |
| Subscriptions, recurring, goals, projection | `/planning/*` | | – |
| Entity editors (category, tag, budget, subscription, account, goal) | side sheet | | `entity-form.vm.ts` and one `*-form.vm.ts` per entity |
| Server settings (excluded accounts, balance window, Sankey threshold, rates in use) | section of `/settings` | `/settings/server` | `settings.vm.ts` |
| Exchange rates (add, replace, delete) | section of `/settings` | `/settings/exchange-rates` | `exchange-rates.vm.ts` |
| Reordering accounts, CSV export | web | | – |
| About | `/about` | | – |
