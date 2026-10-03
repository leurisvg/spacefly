# SpaceFly

Dashboards, reports and analytics for your personal finances on top of **Firefly III**.

SpaceFly is the evolution of [firefly-iii-email-summary](https://github.com/yemzikk/firefly-iii-email-summary). It takes everything that monthly email report offers (KPIs, categories compared with the previous month, budgets, money-flow diagram, daily calendar, per-account activity, top expenses, savings and financial summary) and turns it into an interactive web app with multiple screens, any time period and drill-down to the individual transaction.

> **Current scope:** read-only visualization. SpaceFly never modifies data in Firefly III.

---

## Table of contents

- [Technical decisions](#technical-decisions)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Navigation](#navigation)
- [Screens](#screens)
- [Privacy mode](#privacy-mode)
- [Visual design](#visual-design)
- [Firefly III endpoints used](#firefly-iii-endpoints-used-get-only)
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
                                      └─ /api/*       → report endpoints (GET only)
                                            │  user token (stored server-side)
                                            ▼
                                      Firefly III /api/v1 (internal Docker network)
```

### BFF principles

1. **Read-only**: the Firefly client can only issue `GET` requests.
2. **Ledger engine**: instead of making N requests per category, it downloads all transactions of the period once (`/v1/transactions?type=all`, paginated) and flattens them into normalized *splits*: date, type, amount, `pc_amount`, currency, foreign amount, category, budget, tags, bill, source and destination. Every aggregate is computed from that set.
3. **Per-month cache** (in-memory LRU + SQLite): closed months are stored with a long TTL and the current month with a short TTL. A "Refresh" button invalidates the cache.
4. **Currencies**: everything is consolidated in DOP. To display USD, the rate in effect on each transaction's date is used. Every amount keeps `{original, currency, rate}` so the breakdown can be shown.
5. **Shared typed contracts** (`shared/`): the same DTOs are used by the server and by Angular.

### Security

- **OAuth with Firefly**: a confidential client is created in Firefly (*Profile → OAuth → Clients*) with redirect `https://<app>/auth/callback`. The BFF stores the tokens encrypted (AES-GCM) in SQLite and only hands the browser an `httpOnly; Secure; SameSite=Lax` cookie. Tokens are refreshed automatically.
- **Cloudflare Access**: a middleware verifies the `Cf-Access-Jwt-Assertion` header (signature, `aud` and allowed email). It can be disabled in development with `CF_ACCESS_ENABLED=false`.
- Security headers (CSP and similar) and a rate limit on `/auth`.

---

## Project structure

```
SpaceFly/
├─ package.json                 # scripts: dev (web + server), build, test
├─ angular.json                 # + proxy.conf.json for /api and /auth in dev
├─ .postcssrc.json              # @tailwindcss/postcss
├─ components.json              # spartan CLI config
├─ Dockerfile                   # multi-stage: build web + build server → node:24-alpine
├─ docker-compose.example.yml
├─ .env.example
├─ shared/                      # shared types/DTOs (no dependencies)
│  ├─ dto/  (period.ts, money.ts, ledger.ts, reports/*.ts)
│  └─ index.ts
├─ server/
│  ├─ src/
│  │  ├─ main.ts                # Hono: serves dist/ and mounts routes
│  │  ├─ config.ts              # env validated with zod
│  │  ├─ auth/                  # oauth.routes, session.store, cf-access.middleware, crypto
│  │  ├─ firefly/               # firefly.client (GET only, pagination, refresh), types
│  │  ├─ core/                  # ledger.service, currency.service, cache, period
│  │  ├─ reports/               # one file per report (pure, testable logic)
│  │  ├─ routes/api.routes.ts   # /api/reports/*, /api/meta, /api/transactions
│  │  └─ db/sqlite.ts           # node:sqlite — sessions, cache, fallback rates
│  └─ test/fixtures/            # anonymized real Firefly responses
├─ public/i18n/{es,en}.json
└─ src/
   ├─ styles.css                # tailwind + spartan theme (dark) + chart tokens
   └─ app/
      ├─ core/                  # auth, filters.store (period/currency ↔ URL), api, format pipes
      ├─ layout/                # shell, collapsible sidebar, topbar, mobile sheet
      ├─ shared/
      │  ├─ charts/             # echarts theme, sankey, calendar, trend, bars, donut, treemap, sparkline
      │  └─ components/         # kpi-card, money-cell, delta-badge, period-picker, tx-detail-sheet…
      ├─ features/              # one folder per screen
      └─ libs/ui/               # spartan helm components (generated by the CLI)
```

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
| **Transactions** | Explorer |
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
14. **Transaction explorer**: table with search (Firefly syntax), filters, sorting, pagination, CSV export and a link to Firefly.

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

## Firefly III endpoints used (GET only)

`/v1/about`, `/v1/about/user`, `/v1/preferences`, `/v1/currencies`, `/v1/exchange-rates`, `/v1/transactions`, `/v1/search/transactions`, `/v1/accounts`, `/v1/categories`, `/v1/tags`, `/v1/budgets` (+ `/limits`), `/v1/available-budgets`, `/v1/bills`, `/v1/recurrences`, `/v1/piggy-banks`, `/v1/summary/basic`, `/v1/chart/account/overview`, `/v1/chart/balance/balance`, `/v1/insight/*`.

---

## Roadmap

- [x] **Phase 0 — Foundations**: Tailwind v4, spartan/ui (CLI + theme), lucide, ngx-echarts, Transloco, fonts, Hono BFF, dev proxy, ESLint, Dockerfile and example compose.
- [x] **Phase 1 — BFF and data**: config, OAuth with Firefly, encrypted session, Cloudflare Access, Firefly client, ledger, currencies, cache and tests with fixtures.
- [x] **Phase 2 — UI shell**: layout, sidebar, topbar, filters ↔ URL store, period picker, currency toggle, i18n, login/guard, money pipes and chart theme.
- [x] **Phase 3 — MVP (parity with the email summary)**: Monthly summary, Money flow and Calendar, with the transaction detail panel.
- [x] **Phase 4 — Analytics expansion**: Dashboard, Comparisons, Annual report, Categories, Tags, Budgets, Merchants/Sources, Accounts, Net worth and Savings.
- [x] **Phase 5 — Planning**: Subscriptions, Recurring, Cash-flow projection and Goals.
- [x] **Phase 6 — Explorer and polish**: transaction explorer, CSV/PNG exports, Settings, performance (`@defer`, bundle budgets) and accessibility.

**Pending**: validate against a real Firefly III instance (field names `pc_*` / `primary_currency_*` and `insight`, versions 6.6.2 and 6.7.6, parity with `monthly-report.py`) and review the responsive layout at 375 / 768 / 1440 px in a browser. See [Capturing real fixtures](#capturing-real-fixtures).

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
DISPLAY_CURRENCIES=DOP,USD                         # currencies in the selector (the primary one is always included)
FX_FALLBACK_PROVIDER=open.er-api                   # open.er-api | none
CACHE_TTL_CURRENT_MONTH=300
DATA_DIR=/data                                     # volume for SQLite
```

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
npm run lint         # angular-eslint (excludes src/libs/ui, generated by spartan)
npm run build        # production build (web + server)
```

Use `CF_ACCESS_ENABLED=false` locally.

### Mock mode

`npm run dev:mock` starts three processes: `mock:firefly` (a simulated Firefly API on `:8081` with ~14 months of synthetic, deterministic data), the BFF with `.env.mock` (which skips OAuth using a development token) and `ng serve`. It lets you walk through every screen without real data. `.env.mock` contains no secrets and must not be used in production. If something is already listening on `4200`, `3000` or `8081`, startup fails with `EADDRINUSE`.

### Capturing real fixtures

With a Firefly personal access token (*Profile → OAuth → Personal Access Tokens*):

```bash
FIREFLY_INTERNAL_URL=https://firefly.your-domain.com DEV_FIREFLY_TOKEN=… \
  npm run fixtures:capture -- 2026-09
```

It stores the anonymized responses (pseudonymous names and amounts multiplied by a random factor, so proportions are preserved) in `server/test/fixtures/captured/<month>/`, which is in `.gitignore`. Use them to adjust types and reports to what your Firefly version returns.

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
cd spacefly
git fetch && git log --oneline HEAD..origin/main    # review what changes
git pull
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
