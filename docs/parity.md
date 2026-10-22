# Web / mobile parity

**Pending: Flutter app.** The NativeScript app was removed and the mobile app is being rebuilt in Flutter, so the "Mobile route" column is empty on purpose. It gets filled in as each screen is ported. The web routes and view-models below are the reference for what to port. Update this table in the same change as any new screen.

| Feature | Web route | Mobile route | View-model |
|---|---|---|---|
| Dashboard | `/` | | `dashboard.vm.ts` |
| Transactions list | `/transactions` | | `explorer.vm.ts` |
| Transaction detail | detail sheet over the list | | `tx-detail.vm.ts`, `tx-view.vm.ts` |
| New / edit transaction | `/transactions/new`, `/transactions/:id/edit` | | `transaction-form.vm.ts`, `account-picker.vm.ts` |
| Accounts | `/accounts` | | `accounts.vm.ts` |
| Settings | `/settings` | | `preferences.vm.ts`, `settings.vm.ts` |
| Login | `/login` | | `login.vm.ts` |
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
| Server settings (excluded accounts, balance window, Sankey threshold, rates in use) | section of `/settings` | | `settings.vm.ts` |
| Exchange rates (add, replace, delete) | section of `/settings` | | `exchange-rates.vm.ts` |
| Reordering accounts, CSV export | web | | – |
| About | `/about` | | – |
