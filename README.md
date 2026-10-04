# SpaceFly

Dashboards, reports and analytics for your personal finances on top of **Firefly III**.

SpaceFly is the evolution of [firefly-iii-email-summary](https://github.com/yemzikk/firefly-iii-email-summary). It takes everything that monthly email report offers (KPIs, categories compared with the previous month, budgets, money-flow diagram, daily calendar, per-account activity, top expenses, savings and financial summary) and turns it into an interactive web app with multiple screens, any time period and drill-down to the individual transaction.

> **Current scope:** reports and analytics, plus recording and maintaining your data: create, edit and delete transactions (the type is deduced from the accounts), categories, tags, accounts, budgets, subscriptions and goals. Firefly III stays the source of truth: your rules and webhooks always run.

---

## Table of contents

- [Technical decisions](#technical-decisions)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Navigation](#navigation)
- [Screens](#screens)
- [Privacy mode](#privacy-mode)
- [Visual design](#visual-design)
- [Creating and editing data](#creating-and-editing-data)
- [Firefly III endpoints used](#firefly-iii-endpoints-used)
- [Roadmap](#roadmap)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)
- [Verification](#verification)

---

## Technical decisions

| Topic | Decision |
|---|---|
| Frontend | Angular 22 (standalone, signals, zoneless), Tailwind CSS v4, [spartan/ui](https://spartan.ng) v1 (helm/brain), lucide icons |
| Charts | Apache ECharts via `ngx-echarts` (tree-shaken imports) |
| Backend | Node BFF ([Hono](https://hono.dev)) inside the same repo and Docker image. The Firefly token never reaches the browser |
| Authentication | "Sign in with Firefly" (OAuth2 Authorization Code + PKCE against Firefly III), with the session stored in an `httpOnly` cookie, plus **Cloudflare Access** JWT validation |
| Currencies | Primary currency **DOP**. Uses Firefly's `pc_*` / `primary_currency_*` amounts and the monthly exchange rates stored in Firefly (`/v1/exchange-rates`) to display USD. If a rate is missing, open.er-api.com is used |
| Firefly III | Minimum version 6.6 (detected via `/v1/about`) |
| Language | Spanish + English with hot switching (Transloco). `es-DO` / `en-US` formats |
| Theme | Dark only, fully responsive |
| Deploy | Docker Compose, on a Docker network shared with Firefly III |

---

## Architecture

```
Browser ──(Cloudflare Zero Trust)──► SpaceFly (Node container)
                                      ├─ /            → Angular SPA (static)
                                      ├─ /auth/*      → OAuth with Firefly, session
                                      └─ /api/*       → reports (GET) and writes (POST/PUT/DELETE, CSRF-guarded)
                                            │  user token (stored server-side)
                                            ▼
                                      Firefly III /api/v1 (internal Docker network)
```

### BFF principles

1. **One client, explicit writes**: the Firefly client exposes a reader (`get`/`list`/`page`) and a writer (`post`/`put`/`delete`). Reports only receive the reader. A write is never retried after a timeout or a network error (it could create a duplicate); only a `401` is retried, with the same body and a refreshed token.
2. **Ledger engine**: instead of making N requests per category, it downloads all transactions of the period once (`/v1/transactions?type=all`, paginated) and flattens them into normalized *splits*: date, type, amount, `pc_amount`, currency, foreign amount, category, budget, tags, bill, source and destination. Every aggregate is computed from that set.
3. **Per-month cache** (in-memory LRU + SQLite): closed months are stored with a long TTL and the current month with a short TTL. A "Refresh" button invalidates the cache. After a transaction write only the months it touched are dropped (plus balances, budgets, subscriptions, goals, categories and tags); closed months that were not touched stay cached. A fetch that started before a write can never store its stale result.
4. **Currencies**: everything is consolidated in DOP. To display USD, the rate in effect on each transaction's date is used. Every amount keeps `{original, currency, rate}` so the breakdown can be shown.
5. **Shared typed contracts** (`libs/shared/`): the same DTOs are used by the server and by Angular.

### Security

- **OAuth with Firefly**: a confidential client is created in Firefly (*Profile → OAuth → Clients*) with redirect `https://<app>/auth/callback`. The BFF stores the tokens encrypted (AES-GCM) in SQLite and only hands the browser an `httpOnly; Secure; SameSite=Lax` cookie. Tokens are refreshed automatically.
- **Cloudflare Access**: a middleware verifies the `Cf-Access-Jwt-Assertion` header (signature, `aud` and allowed email). It can be disabled in development with `CF_ACCESS_ENABLED=false`.
- **Writes are CSRF-protected.** `SameSite=Lax` does not stop requests between sibling subdomains (`firefly.` → `spacefly.` are the same site), so every `POST`/`PUT`/`DELETE` on `/api/*` and `/auth/logout` must carry the `X-SpaceFly: 1` header, an `Origin` equal to `APP_URL` (when the browser sends one), `Sec-Fetch-Site: same-origin` (when sent) and a JSON body (`415` otherwise). Bodies are capped at 64 KB and writes are rate limited. Because of this check, open SpaceFly at exactly the address in `APP_URL`.
- Security headers (CSP and similar) and a rate limit on `/auth`.

---

## Project structure

```
SpaceFly/                         # npm workspaces: apps/*, libs/*
├─ package.json                 # scripts + all Angular/rxjs/echarts deps (a single Angular copy)
├─ angular.json                 # project SpaceFly (apps/web)
├─ tsconfig.base.json           # compilerOptions + ALL path aliases (@spacefly/shared, @spartan-ng/helm/*)
├─ tsconfig.json                # solution file (references)
├─ components.json              # spartan CLI config
├─ Dockerfile                   # multi-stage: build web + build server → node:24-alpine
├─ docker-compose.example.yml
├─ .env.example
├─ scripts/                     # check-single-angular.mjs
├─ libs/
│  ├─ shared/src/               # shared types/DTOs and pure utils (no Angular, no rxjs)
│  │  ├─ dto/  (period.ts, money.ts, ledger.ts, write.ts, reports/*.ts)
│  │  ├─ utils/ (dates.ts, tx-type.ts, amount.ts)   # type inference matrix, amount parsing
│  │  └─ index.ts
│  └─ i18n/src/{es,en}.json     # catalogs; served by the web build under /i18n/{lang}.json
└─ apps/
   ├─ server/
   │  ├─ src/
   │  │  ├─ main.ts                # Hono: serves dist/ and mounts routes
   │  │  ├─ config.ts              # env validated with zod
   │  │  ├─ auth/                  # oauth.routes, session.store, cf-access.middleware, write-guard (CSRF), crypto
   │  │  ├─ firefly/               # firefly.client (reader + writer, pagination, refresh), types
   │  │  ├─ core/                  # ledger.service, currency.service, cache, firefly-payloads (write mappers), period
   │  │  ├─ reports/               # one file per report (pure, testable logic)
   │  │  ├─ routes/                # api.routes (reports, meta, reads), write.routes + entity.routes (create/edit/delete), write.schemas, errors
   │  │  └─ db/sqlite.ts           # node:sqlite — sessions, cache, fallback rates
   │  └─ test/fixtures/            # synthetic Firefly responses; fake-firefly also accepts writes (tests and `dev:mock`)
   └─ web/
      ├─ public/                   # favicon etc.
      ├─ proxy.conf.mjs            # /api and /auth → BFF (port via API_PORT, default 3000)
      ├─ .postcssrc.json           # @tailwindcss/postcss
      └─ src/
         ├─ styles.css             # tailwind + spartan theme (dark) + chart tokens
         └─ app/
            ├─ core/               # auth, filters.store (period/currency ↔ URL), api, format pipes
            ├─ layout/             # shell, collapsible sidebar, topbar, mobile sheet
            ├─ shared/
            │  ├─ charts/          # echarts theme, sankey, calendar, trend, bars, donut, treemap, sparkline
            │  ├─ components/      # kpi-card, money-cell, delta-badge, period-picker, tx-detail-sheet…
            │  └─ forms/           # form-field, money-input, combobox, account-picker, tx-type-badge, tag-input, date-input, form-footer, confirm
            ├─ features/editor/    # transaction form, entity editors (category, tag, budget, subscription, account, goal)
            ├─ features/           # one folder per screen
            └─ libs/ui/            # spartan helm components (generated by the CLI)
```

Dependencies stay in the root `package.json` (Angular is installed once, hoisted); each workspace only has a minimal manifest. Adding a workspace requires a matching `COPY …/package.json` line in the Dockerfile.

---

## Navigation

Collapsible sidebar sections: on mobile it opens as a *Sheet*, and on desktop it can be collapsed to icons only. The top bar has a **period selector** (month, quarter, year, YTD or free range, with ◀ ▶), **currency** (RD$ / US$), **language**, refresh and the user menu.

| Section | Screens |
|---|---|
| **General** | Dashboard |
| **Reports** | Monthly summary · Annual report · Money flow · Calendar · Comparisons |
| **Analysis** | Categories · Tags · Budgets · Merchants · Income sources |
| **Accounts** | Asset accounts · Net worth · Savings |
| **Planning** | Subscriptions · Recurring · Goals (piggy banks) · Cash-flow projection |
| **Transactions** | Explorer · New / edit transaction |
| **System** | Settings · About |

---

## Screens

Common behavior across all screens: filters live in the URL, every amount shows its original value, currency and rate in a tooltip, there are skeletons and empty states, and clicking any chart or row opens the **transaction detail** in a side panel.

1. **Dashboard**: KPIs (income, expenses, net, savings rate, net worth) with sparkline and delta against the previous period. Income vs expenses for the last 12 months. Net worth trend. Top categories. Budget progress. Upcoming subscriptions. Mini calendar. Largest expenses.
2. **Monthly summary** (parity with the email summary): highlights, categories compared with the previous month, budgets with traffic-light status (80% and 100%), Sankey, calendar, top 5 expenses, per-account activity with expandable detail, 6-month savings and month summary, YTD and net worth.
3. **Money flow**: interactive 5-level Sankey (source → income category → total → budget → expense category + savings). Hover highlights the full path, clicking a node shows its transactions, togglable levels, tag mode, "Other" grouping with an adjustable threshold, % of total income and a vertical layout on mobile.
4. **Calendar**: monthly grid with income and expense bars per day. Clicking a day opens all its transactions. Includes a running-balance line, markers for upcoming subscriptions and recurring items, filters by account, category or tag, and a yearly heatmap view.
5. **Comparisons**: period A vs B (month vs previous month, month vs same month last year, year vs year or free ranges), grouped by category, tag, budget, account or merchant. Diverging bars, Δ and Δ%, and a rolling 12-month trend.
6. **Annual report**: month × category heatmap, totals per month, best and worst month, averages and savings rate.
7. **Categories / Tags**: ranking, treemap/sunburst, trend and drill-down.
8. **Budgets**: limit vs spent, compliance history, end-of-month projection based on spending pace and a budget → category breakdown.
9. **Merchants / Income sources**: ranking, frequency, average ticket and trend.
10. **Accounts / Net worth / Savings**: balances (original DOP and USD), evolution per account, stacked net worth and configurable excluded accounts.
11. **Subscriptions**: monthly cost and annual equivalent, upcoming dates, paid vs pending and amount variation.
12. **Recurring and projection**: upcoming occurrences and cash-flow projection at 30, 60 and 90 days.
13. **Goals**: progress of each piggy bank and estimated completion date based on contribution pace.
14. **Transaction explorer**: table with search (Firefly syntax), filters, sorting, pagination, CSV export, a link to Firefly and, per row, edit / delete.

---

## Creating and editing data

The **+ New** button in the top bar creates a transaction, category, tag, budget, subscription, account or goal; the pencil next to a row or card edits it, and every editor can delete (always with a confirmation).

- **Transactions** (`/transactions/new`, `/transactions/:id/edit`). You never pick the type: it is deduced from the source and destination accounts and shown live as you choose them (asset → asset is a transfer; asset → expense, cash or liability is an expense; revenue, cash or liability → asset is income; any other pair is flagged as invalid). A name typed in the destination becomes a new expense account, and in the source a new income source. The amount is in the currency of the account on the amount side; a transfer between currencies asks for the received amount, and expenses/income can carry an amount in another currency. Only **single-part** transactions are edited here; one with several parts (or an opening balance, reconciliation…) shows a notice with an *Edit in Firefly* link, so no part is ever deleted by accident.
- **After saving**, two switches (remembered in the browser) give three modes: go back to where you came from (or the explorer if you opened the page directly), stay with an empty form (today's date and your default account), or stay keeping the data. When editing, staying reloads the transaction from Firefly because your rules may have changed fields.
- **Rules and webhooks always run**: SpaceFly sends `apply_rules` and `fire_webhooks` as `true` on every transaction create and update.
- **Accounts**: the kind (asset, liability, expense, income) is chosen when creating and cannot change later; the fields follow the kind (role, credit-card payment day, interest and debt data, opening balance…). Deleting an account deletes its transactions in Firefly, so the confirmation shows how many and asks you to type the account's name.
- **Goals**: each goal lists its accounts with the amount set aside in each; "Add / Remove" adjusts one account, and saving always sends the complete list (Firefly replaces a goal's accounts with it).
- **Errors from Firefly** (`422`) are shown under the field that caused them.

---

## Privacy mode

The eye button in the top bar hides **all amounts and percentages** in the app: KPIs, tables, tooltips, axes and chart labels, the calendar, the Sankey, the transaction detail and currency conversions. Every amount is shown as `0` (for example `RD$0.00`) and every percentage as `0%`, so you can share your screen or work with someone looking over your shoulder. The preference is stored in the browser and stays active after a reload.

- **Also hidden** is anything that would give those figures away: the arrow and color of the variations, the state and fill of the budget gauges and the progress bars of the goals.
- **Not hidden:** dates, exchange rates, counts and the configuration controls (for example the Sankey threshold).
- Charts keep their shape (the relative height of the bars or the width of the Sankey), but no real number appears.
- While it is active, the explorer's CSV export is disabled, because the file would contain the real amounts.
- It is a visual protection in the browser: the data still reaches the client from the API, so it does not replace access control.

---

## Visual design

- Always dark theme, using the dark palette of the email summary (`#0a0e1a`, `#111827`, indigo accent, green for income and red for expenses) mapped to spartan's CSS variables.
- **Inter** and **JetBrains Mono** (amounts) typefaces, self-hosted.
- ECharts theme derived from the same CSS variables, with semantic colors kept consistent across the app (income, expenses, savings, budgets).
- Responsive: 1 column on mobile, 2 on tablet and 3–4 on desktop. Tables turn into cards on mobile.

---

## Firefly III endpoints used

Reads: `/v1/about`, `/v1/about/user`, `/v1/preferences`, `/v1/currencies`, `/v1/exchange-rates`, `/v1/transactions`, `/v1/search/transactions`, `/v1/accounts`, `/v1/categories`, `/v1/tags`, `/v1/budgets` (+ `/limits`), `/v1/available-budgets`, `/v1/bills`, `/v1/recurrences`, `/v1/piggy-banks`, `/v1/summary/basic`, `/v1/chart/account/overview`, `/v1/chart/balance/balance`, `/v1/insight/*`.

Writes: `POST/PUT/DELETE /v1/transactions`, `/v1/categories`, `/v1/tags`, `/v1/accounts`, `/v1/budgets`, `/v1/bills` and `/v1/piggy-banks`, plus the matching single-record `GET`s (including `/v1/accounts/{id}/transactions` to count what deleting an account removes).

---

## Roadmap

- [x] **Phase 0 — Foundations**: Tailwind v4, spartan/ui (CLI + theme), lucide, ngx-echarts, Transloco, fonts, Hono BFF, dev proxy, ESLint, Dockerfile and example compose.
- [x] **Phase 1 — BFF and data**: config, OAuth with Firefly, encrypted session, Cloudflare Access, Firefly client, ledger, currencies, cache and tests with fixtures.
- [x] **Phase 2 — UI shell**: layout, sidebar, topbar, filters ↔ URL store, period picker, currency toggle, i18n, login/guard, money pipes and chart theme.
- [x] **Phase 3 — MVP (parity with the email summary)**: Monthly summary, Money flow and Calendar, with the transaction detail panel.
- [x] **Phase 4 — Analytics expansion**: Dashboard, Comparisons, Annual report, Categories, Tags, Budgets, Merchants/Sources, Accounts, Net worth and Savings.
- [x] **Phase 5 — Planning**: Subscriptions, Recurring, Cash-flow projection and Goals.
- [x] **Phase 6 — Explorer and polish**: transaction explorer, CSV/PNG exports, Settings, performance (`@defer`, bundle budgets) and accessibility.

- [x] **Phase 7 — Write support**: create, edit and delete transactions (type deduced from the accounts), categories, tags, accounts, budgets, subscriptions and goals; CSRF guard, targeted cache invalidation and form components built on Angular signal forms.

**Pending**: validate against a real Firefly III instance (field names `pc_*` / `primary_currency_*` and `insight`, versions 6.6.2 and 6.7.6, parity with `monthly-report.py`) and the write paths (see [Verification](#verification)) and review the responsive layout at 375 / 768 / 1440 px in a browser. See [Capturing real fixtures](#capturing-real-fixtures).

---

## Configuration

Environment variables (`.env`):

```env
APP_URL=https://spacefly.your-domain.com
PORT=3000
FIREFLY_INTERNAL_URL=http://firefly:8080           # Docker network, container name of Firefly
FIREFLY_PUBLIC_URL=https://firefly.your-domain.com # browser OAuth redirect
FIREFLY_OAUTH_CLIENT_ID=
FIREFLY_OAUTH_CLIENT_SECRET=
SESSION_SECRET=                                    # 32+ random bytes
SESSION_TTL_DAYS=30                                # session lifetime
CF_ACCESS_ENABLED=true
CF_ACCESS_TEAM_DOMAIN=your-team.cloudflareaccess.com
CF_ACCESS_AUD=
CF_ACCESS_ALLOWED_EMAILS=you@example.com
CF_ACCESS_SERVICE_TOKEN_IDS=                       # mobile app: client id(s) of its Access service token (optional)
MOBILE_REDIRECT_URIS=                              # mobile app: e.g. spacefly://auth/callback; empty disables /auth/mobile/*
DISPLAY_CURRENCIES=DOP,USD                         # currencies in the selector (the primary one is always included)
FX_FALLBACK_PROVIDER=open.er-api                   # open.er-api | none
CACHE_TTL_CURRENT_MONTH=300
DATA_DIR=/data                                     # volume for SQLite
```

### Mobile app access

The mobile app signs in through the same Firefly OAuth flow, in the system browser (`ASWebAuthenticationSession` / Chrome Custom Tabs), and then keeps a **bearer token** instead of a cookie:

1. The app opens `GET /auth/mobile/login?redirect_uri=…&code_challenge=…&state=…` (PKCE S256). SpaceFly checks `redirect_uri` against `MOBILE_REDIRECT_URIS` (exact, case-sensitive match) and runs the usual Firefly authorization (Firefly still redirects to `${APP_URL}/auth/callback`, so the Firefly OAuth client does not change).
2. After the callback SpaceFly redirects to `redirect_uri?code=…&state=…` (errors come back the same way, as `error=…`). The code is one-time, expires in 60 s and is useless without the app's PKCE verifier.
3. The app calls `POST /auth/mobile/token {code, code_verifier}` (JSON, with `X-SpaceFly: 1`) and gets `{token, expiresAt, email}`. From then on it sends `Authorization: Bearer <token>` (it takes precedence over the cookie). `POST /auth/logout` with the bearer ends the session.

With `DEV_FIREFLY_TOKEN` (development only) step 1 hands the code over directly. If `MOBILE_REDIRECT_URIS` is empty the mobile endpoints answer 404.

**Behind Cloudflare Access** the app cannot show Access' interactive login for API calls, so it authenticates with a **service token**:

1. Zero Trust → **Access → Service Auth → Service Tokens → Create Service Token**. Copy the **Client ID** and the **Client Secret** (shown once).
2. On the SpaceFly application add a policy with action **Service Auth** that includes that token. Put it above or next to the email policy: Access evaluates *Allow* / *Service Auth* policies independently, and a request that satisfies any of them gets in.
3. Set `CF_ACCESS_SERVICE_TOKEN_IDS=<Client ID>` in `.env` and restart. SpaceFly accepts an Access JWT without an email only when its `common_name` is one of those ids, and only on `/api/*`, `/auth/mobile/token` and `/auth/logout`. Pages and the browser OAuth routes still require a person.
4. Type the Client ID and Secret in the app's **Settings** (they are kept in the device's secure storage and sent as `CF-Access-Client-Id` / `CF-Access-Client-Secret`; they are never compiled into the build). The interactive part of the login (`/auth/mobile/login`) runs in the system browser, where Access shows its normal email login.

### Creating the OAuth client in Firefly III

1. In Firefly III go to **Options → Profile → OAuth → Create new client**.
2. Redirect URL: `https://spacefly.your-domain.com/auth/callback`. Leave the client as **confidential**.
3. Copy the *Client ID* and the *Secret* into `FIREFLY_OAUTH_CLIENT_ID` and `FIREFLY_OAUTH_CLIENT_SECRET`. Firefly shows the secret only once, so store it in your password manager right away.

---

## Development

```bash
npm install
npm run dev          # Angular (http://localhost:4200) + BFF with /api and /auth proxy
npm run dev:mock     # same, but against a simulated Firefly (no real instance needed)
npm test             # Vitest: web (Angular) + server
npm run lint         # angular-eslint (excludes apps/web/src/libs/ui, generated by spartan)
npm run build        # production build (web + server)
```

Use `CF_ACCESS_ENABLED=false` locally.

### Mock mode

`npm run dev:mock` starts three processes: `mock:firefly` (a simulated Firefly API on `:8081` with ~14 months of synthetic, deterministic data that also accepts writes, kept in memory until it restarts), the BFF with `.env.mock` (which skips OAuth using a development token) and `ng serve`. It lets you walk through every screen without real data. `.env.mock` contains no secrets and must not be used in production. If something is already listening on `4200`, `3000` or `8081`, startup fails with `EADDRINUSE`. To run a second stack on other ports: `MOCK_PORT=8181 npm run mock:firefly`, `PORT=3100 FIREFLY_INTERNAL_URL=http://localhost:8181 FIREFLY_PUBLIC_URL=http://localhost:8181 APP_URL=http://localhost:4300 DATA_DIR=./data/mock-verify npm run dev:server:mock` and `API_PORT=3100 npx ng serve --port 4300`.

### Capturing real fixtures

With a Firefly personal access token (*Profile → OAuth → Personal Access Tokens*):

```bash
FIREFLY_INTERNAL_URL=https://firefly.your-domain.com DEV_FIREFLY_TOKEN=… \
  npm run fixtures:capture -- 2026-09
```

It stores the anonymized responses (pseudonymous names and amounts multiplied by a random factor, so proportions are preserved) in `apps/server/test/fixtures/captured/<month>/`, which is in `.gitignore`. Use them to adjust types and reports to what your Firefly version returns.

---

## Deployment

SpaceFly ships as a single Docker image (Angular SPA + Node BFF). The setup below is hardened by default: no published ports, a read-only root filesystem, no Linux capabilities, secrets in a `chmod 600` file and public access only through Cloudflare Access.

**Do the steps in this order.** The Cloudflare Access application must exist *before* the hostname is published, so the app is never reachable without protection.

### Prerequisites

- Docker Engine with Compose v2 on the host.
- A running Firefly III **≥ 6.6** whose container name you know, reachable from the browser at a public URL (it is used for the OAuth redirect).
- A Cloudflare account with Zero Trust, your domain on Cloudflare and a tunnel (`cloudflared`) already routing to your reverse proxy. A reverse proxy such as Nginx Proxy Manager, Traefik or Caddy is assumed; if you have none, see the note in step 5.

### 1. Create the Cloudflare Access application

1. In Zero Trust go to **Access → Applications → Add an application → Self-hosted**.
2. Domain: `spacefly.your-domain.com`. Policy: **Allow**, with an email allow-list (only the people who should see your finances).
3. Save, then open the application and copy its **Application Audience (AUD) Tag**. It goes in `CF_ACCESS_AUD`.
4. Find your team domain (`<team>.cloudflareaccess.com`) under **Settings → General settings**, or take it from the URL an already-protected app redirects to. Verify it before using it:

   ```bash
   curl -s https://<team>.cloudflareaccess.com/cdn-cgi/access/certs | head -c 200
   ```

   A JSON document with `keys` means the value is correct. Use it without `https://` and without a trailing slash.

> **Wildcard routes:** if your tunnel has a wildcard ingress rule (`*.your-domain.com`), any hostname with a DNS record reaches your reverse proxy. What keeps SpaceFly private is that the Access app exists and that you create the reverse-proxy host only afterwards.

### 2. Create the OAuth client in Firefly III

Follow [Creating the OAuth client in Firefly III](#creating-the-oauth-client-in-firefly-iii). The redirect URL must be exactly `https://spacefly.your-domain.com/auth/callback`, with no trailing slash, and the client must be **confidential**. Store the Client ID and Secret in your password manager.

### 3. Give SpaceFly a private network to Firefly

SpaceFly calls Firefly's API server-to-server (including the OAuth token exchange), so both containers must share a Docker network. Prefer a **dedicated network** shared only by these two containers. That avoids putting SpaceFly on the network that also holds Firefly's database, and avoids exposing Firefly's container to everything else on your proxy network.

```bash
docker network create firefly-link
docker network connect firefly-link <firefly-app-container>
```

`docker network connect` takes effect immediately without recreating the container, but it is **lost the next time that container is recreated**. Make it permanent in Firefly's own `docker-compose.yml`:

```yaml
services:
  <firefly-app-service>:
    networks:
      - default
      - firefly-link

networks:
  firefly-link:
    external: true
```

Confirm the container is attached and note its exact name (you need it for `FIREFLY_INTERNAL_URL`):

```bash
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' <firefly-app-container>
```

### 4. Clone the repository and create `.env`

Clone with a normal `umask` (`022`). With a restrictive umask such as `077`, the source files end up unreadable inside the image (see [Troubleshooting](#troubleshooting)).

```bash
umask 022
git clone https://github.com/leurisvg/spacefly.git
cd spacefly
```

Generate the session secret and store it in your password manager:

```bash
openssl rand -base64 48
```

Create `.env` readable only by you, from the template, and fill it in (see [Configuration](#configuration)):

```bash
cp .env.example .env
chmod 600 .env
nano .env
ls -l .env      # must show -rw-------
```

Required values for production:

| Variable | Value |
|---|---|
| `APP_URL` | Public URL, `https://spacefly.your-domain.com` |
| `FIREFLY_INTERNAL_URL` | `http://<firefly-app-container>:8080` (container name on `firefly-link`) |
| `FIREFLY_PUBLIC_URL` | The public URL you open Firefly with in the browser |
| `FIREFLY_OAUTH_CLIENT_ID` / `FIREFLY_OAUTH_CLIENT_SECRET` | From step 2 |
| `SESSION_SECRET` | The generated secret |
| `CF_ACCESS_ENABLED` | `true` |
| `CF_ACCESS_TEAM_DOMAIN` / `CF_ACCESS_AUD` | From step 1 |
| `CF_ACCESS_ALLOWED_EMAILS` | The same emails as the Access policy |

Never set `DEV_FIREFLY_TOKEN` in production. Keep `CF_ACCESS_ENABLED=true`: it is a second layer, so even if someone reached the reverse proxy without going through Cloudflare, the app would answer 403.

`.env` is excluded from the image by `.dockerignore`, so it never enters the build context. Changes to `.env` only apply after recreating the container (`docker compose up -d`); `docker compose restart` is not enough.

### 5. Create `docker-compose.yml`

```yaml
services:
  spacefly:
    build: .
    image: spacefly:local
    container_name: spacefly
    restart: unless-stopped
    env_file: .env
    environment:
      NODE_ENV: production
      DATA_DIR: /data
    volumes:
      - spacefly-data:/data
    networks:
      - proxy          # reverse proxy reaches SpaceFly by container name
      - firefly-link   # SpaceFly reaches Firefly III
    # Hardening
    read_only: true
    tmpfs:
      - /tmp:size=64m,noexec,nosuid
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    mem_limit: 512m
    pids_limit: 200
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  spacefly-data:

networks:
  proxy:
    external: true       # the network your reverse proxy uses
  firefly-link:
    external: true
```

Both networks must be listed under the service **and** declared at the bottom. Declaring a network without attaching it to the service has no effect.

Notes:

- No `ports:` are published: nothing is exposed on the host and the app is reachable only from containers on `proxy`. If you do not use a reverse proxy container, remove the `proxy` network and publish the port on loopback only (`ports: ["127.0.0.1:3000:3000"]`), then point your tunnel at `http://127.0.0.1:3000`.
- The image runs as the unprivileged `node` user (UID 1000). A named volume works out of the box. If you prefer a bind mount (`./data:/data`), the directory must be owned by UID 1000 and be `chmod 700`.
- The `/data` volume holds SQLite: encrypted OAuth tokens, sessions and the cache.

### 6. Build, start and verify internally

```bash
docker compose build
docker compose up -d
docker ps --filter name=spacefly       # Up (healthy) after ~30 s
docker compose logs --tail=50 spacefly
```

Then run these checks **from inside the container**, before publishing anything:

```bash
# 1. Health: {"ok":true}
docker compose exec spacefly wget -qO- http://127.0.0.1:3000/healthz

# 2. Cloudflare Access validation is active: must fail with 403
docker compose exec spacefly wget -S -qO- http://127.0.0.1:3000/api/meta

# 3. SpaceFly can reach Firefly: must answer 400 (it rejects the fake grant, which is expected)
docker compose exec spacefly wget -S -qO- --post-data='grant_type=x' \
  --header='Accept: application/json' http://<firefly-app-container>:8080/oauth/token
```

If check 2 returns `200`, **stop**: Access validation is not active. Review `CF_ACCESS_ENABLED`, `CF_ACCESS_AUD` and `CF_ACCESS_TEAM_DOMAIN`. If check 3 says `bad address`, SpaceFly and Firefly do not share a network (see [Troubleshooting](#troubleshooting)).

### 7. Publish through your reverse proxy and tunnel

Only now, with the Access application already in place:

1. **Reverse proxy host:** `spacefly.your-domain.com` → `http` → `spacefly` → port `3000`. Enable "Block common exploits", leave WebSockets off, use the same SSL setup as your other hosts, and do **not** add a CSP header there. The app sends its own security headers and duplicating them can break the frontend.
2. **DNS / tunnel:** route the hostname to your tunnel.

   ```bash
   cloudflared tunnel route dns <tunnel-name-or-uuid> spacefly.your-domain.com
   ```

   If your tunnel already has a wildcard ingress rule, no extra rule is needed. Otherwise add `hostname: spacefly.your-domain.com` before the catch-all `http_status:404`, then run `cloudflared tunnel ingress validate` and restart `cloudflared`. You can check which rule matches with `cloudflared tunnel ingress rule https://spacefly.your-domain.com`.

### 8. End-to-end verification

In a private browser window:

1. `https://spacefly.your-domain.com` must show the **Cloudflare Access login first**. If you see SpaceFly without passing through Access, take the reverse-proxy host offline and review the Access application.
2. After authenticating, click "Sign in with Firefly", authorize the client and confirm you land on the dashboard.
3. In DevTools → Application → Cookies, the session cookie must be `HttpOnly`, `Secure` and `SameSite=Lax`.
4. In the Network tab, no request may contain the Firefly token.
5. Without an Access session, this must **not** return `200` (expect `302` or `403`):

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://spacefly.your-domain.com/api/meta
   ```

### Updating

```bash
cd docker/spacefly
git -C src pull
docker compose build && docker compose up -d
docker image prune -f
```

The image is built locally from your checkout, so it only changes when you pull and rebuild. Review the incoming commits first, as you would for any code that runs next to your financial data.

### Rolling back

```bash
git log --oneline -5
git checkout <previous-commit>
docker compose build && docker compose up -d
# when done: git checkout main
```

### Backups

Include the `/data` volume in your backups (for a named volume, for example `docker run --rm -v spacefly_spacefly-data:/data -v "$PWD":/backup alpine tar czf /backup/spacefly-data.tgz -C /data .`). It holds the encrypted tokens and the cache. Losing it is not critical: you only have to sign in again. Without `SESSION_SECRET` the stored tokens cannot be decrypted, so keep that secret in your password manager.

### Rotating the OAuth client

1. Create a new confidential client in Firefly with the same redirect URL and store its credentials in your password manager.
2. Update `FIREFLY_OAUTH_CLIENT_ID` and `FIREFLY_OAUTH_CLIENT_SECRET` in `.env`, keeping `chmod 600`.
3. Recreate the container: `docker compose up -d --force-recreate`.
4. Delete the old client in Firefly (**Options → Profile → OAuth**). An unused but valid credential is a liability.
5. Existing sessions hold tokens issued to the old client and can no longer refresh. Users are sent back to the login screen. If one gets stuck, stop the stack and delete the SQLite files in the data volume (sessions and cache only; they regenerate).

### Security checklist

- [ ] Cloudflare Access application exists for the hostname, with an email allow-list.
- [ ] `CF_ACCESS_ENABLED=true`, and `/api/meta` without a JWT returns 403.
- [ ] `.env` is `chmod 600` and no secret is committed or pasted into logs or chats.
- [ ] No published ports (or loopback only).
- [ ] SpaceFly shares a network only with the reverse proxy and Firefly's app container, never with Firefly's database.
- [ ] No `DEV_FIREFLY_TOKEN` in production.
- [ ] Old OAuth clients deleted.
- [ ] Firefly itself pinned to an explicit version tag rather than `:latest`.

### Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Container restarts in a loop | Read `docker compose logs --tail=60 spacefly`. The app validates `.env` on startup with zod and names the offending variable. |
| `[auth] token exchange failed: fetch failed` | SpaceFly cannot connect to Firefly: it is not on the network you set in `FIREFLY_INTERNAL_URL`. A real credential error would read `oauth/token 401: …` instead. See the next row. |
| `wget: bad address '<firefly-container>'` | The two containers share no Docker network. Check both sides: `docker network inspect firefly-link --format '{{range .Containers}}{{.Name}} {{end}}'` must list SpaceFly and Firefly. If Firefly is missing, re-run `docker network connect` and make it permanent in its compose file. If SpaceFly is missing, the `networks:` list of the `spacefly` service lacks `firefly-link` (declaring it at the bottom is not enough). Then `docker compose up -d --force-recreate`. |
| `EACCES: permission denied, open '…/i18n/es.json'` in the logs and a blank page | Source files were cloned with a restrictive `umask` (for example `077`) and ended up unreadable in the image. Run `umask 022 && chmod -R u=rwX,go=rX .` in the checkout (this does not touch `.env`; keep that one at `600`), then rebuild. `/healthz` stays green because it does not read static files. |
| `403` for you after signing in through Access | `CF_ACCESS_ALLOWED_EMAILS` does not match the email of the Access policy, or `CF_ACCESS_AUD` belongs to a different Access application. |
| `invalid_client` or an OAuth redirect error on login | Wrong `FIREFLY_OAUTH_CLIENT_*`, the redirect URL is not exactly `https://<app>/auth/callback`, the client is not **confidential**, or `FIREFLY_PUBLIC_URL` is not the public URL you use for Firefly. |
| Changed `.env` but nothing happens | Compose only reads `env_file` when it recreates the container. Use `docker compose up -d`, not `restart`. |
| Read-only filesystem error at startup | The app wrote outside `/data`. Check the log for the path, and that the data volume is writable by UID 1000. |

---

## Verification

- **Unit tests**: the server reports are tested with fixtures. In the Sankey, what comes in must equal what goes out plus savings, the calendar sum must equal the month's expenses and the DOP↔USD conversion must use the rate of each transaction's date.
- **Parity**: compare `monthly-report.py --preview` with SpaceFly for the same month (KPIs, categories, budgets, Sankey and daily totals).
- **Responsive**: review at 375px, 768px and 1440px.
- **Security**: a request without the Cloudflare JWT must receive 403, and the Firefly token must never appear in the browser.
- **Writes**: the server tests cover the whole create/edit/delete flow against the fake Firefly (type deduction, explicit `apply_rules` / `fire_webhooks`, the 409 that protects multi-part transactions, 422 field mapping, CSRF `403`/`415`, `413` and cache invalidation).
- **Against a real Firefly 6.6** (a test user, one rule and one webhook pointing at a request catcher), check once:
  - that `apply_rules` and `fire_webhooks` fire rules and webhooks on create *and* edit;
  - that the OAuth token issued with `scope ''` is allowed to write;
  - which spelling Firefly accepts for liabilities (`liability` or `liabilities`) and whether a liability's opening amount goes in `opening_balance` / `opening_balance_date` (as SpaceFly sends it) or in `liability_amount` / `liability_start_date`;
  - that a PUT clears fields sent empty and accepts a change of type;
  - the currency of transfers and amounts in another currency;
  - the goal accounts payload (`accounts: [{ account_id, current_amount }]`) and that changes generate goal events;
  - the automatic-budget field names (`auto_budget_type`, `auto_budget_amount`, `auto_budget_period`, `auto_budget_currency_code`) and whether subscriptions are linked with `bill_id` or `subscription_id`.
