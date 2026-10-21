# Web / mobile parity

Every screen has a view-model in `libs/client/src/features` when it exists on mobile. A row without a mobile route is **web-only for now**; adding it means writing the view-model (or reusing the existing one) and a screen in `apps/mobile/src/app/screens`. Update this table in the same change.

| Feature | Web route | Mobile route | View-model |
|---|---|---|---|
| Dashboard | `/` | `/` (tab) | `dashboard.vm.ts` |
| Transactions list | `/transactions` | `/` (tab) | `explorer.vm.ts` |
| Transaction detail | detail sheet over the list | `/transactions/:id` | `tx-detail.vm.ts`, `tx-view.vm.ts` |
| New / edit transaction | `/transactions/new`, `/transactions/:id/edit` | same paths | `transaction-form.vm.ts`, `account-picker.vm.ts` |
| Accounts | `/accounts` | `/` (tab) | `accounts.vm.ts` |
| Settings | `/settings` | `/` (tab) | `preferences.vm.ts`, `settings.vm.ts` |
| Login | `/login` | `/login` | `login.vm.ts` |
| Drill into a chart slice | sheet / explorer filters | `/drill` | `explorer.vm.ts` |
| Monthly, annual, flow, calendar, compare | `/reports/*` | web-only | – |
| Categories, tags, merchants, income sources | `/analysis/*` | same paths (from the More tab) | `ranking.vm.ts` |
| Budgets | `/analysis/budgets` | web-only | – |
| Account detail, net worth, savings, counterparties | `/accounts/*` | web-only | – |
| Subscriptions, recurring, goals, projection | `/planning/*` | web-only | – |
| Entity editors (category, tag, budget, account, goal…) | sheets | web-only | – |
| Exchange rates (add, replace, delete) | section of `/settings` | web-only (the server-side settings, excluded accounts and rates in use, are web-only too; the mobile Settings tab only holds device preferences) | `exchange-rates.vm.ts` |
| Reordering accounts, CSV export | web | web-only (needs a file picker / share sheet) | – |
| About | `/about` | web-only | – |
