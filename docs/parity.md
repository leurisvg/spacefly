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
| Monthly summary | `/reports/monthly` | same path (from the More tab; the Sankey is a link to Flow and the savings multiples are web-only) | `monthly.vm.ts` |
| Annual report | `/reports/annual` | same path (the matrix shows 10 categories instead of 15) | `annual.vm.ts` |
| Money flow | `/reports/flow` | same path (vertical Sankey; the small-flow threshold is a list of presets, not a slider) | `flow.vm.ts` |
| Calendar | `/reports/calendar` | same path (native month grid, year heatmap vertical) | `calendar.vm.ts` |
| Compare | `/reports/compare` | same path (period B dates are typed as YYYY-MM-DD) | `compare.vm.ts` |
| Categories, tags, merchants, income sources | `/analysis/*` | same paths (from the More tab) | `ranking.vm.ts` |
| Budgets | `/analysis/budgets` | same path (from the More tab) | `budgets.vm.ts` |
| Account detail, net worth, savings, counterparties | `/accounts/*` | web-only | – |
| Subscriptions, recurring, goals, projection | `/planning/*` | web-only | – |
| Entity editors (category, tag, budget, account, goal…) | sheets | web-only | – |
| Server settings (excluded accounts, balance window, Sankey threshold, rates in use) | section of `/settings` | cards in the Settings tab | `settings.vm.ts` |
| Exchange rates (add, replace, delete) | section of `/settings` | card in the Settings tab (the date is typed as YYYY-MM-DD) | `exchange-rates.vm.ts` |
| Reordering accounts, CSV export | web | web-only (needs a file picker / share sheet) | – |
| About | `/about` | web-only | – |
