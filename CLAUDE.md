# SpaceFly: working rules

SpaceFly is one repository with a web app, a Flutter mobile app, a server and three libraries. **The mobile app is being rebuilt in Flutter in phases** (the NativeScript app was removed): login, shell and settings exist; the rest is ported screen by screen. Flutter cannot use `libs/client`, so a change to view-model logic is made twice (TypeScript for the web, Dart for the mobile app); `docs/parity.md` tracks what exists on each side.

## Architecture

```
apps/web      Angular 22 (Spartan/Tailwind UI)  ─▶ libs/client ─▶ libs/shared
apps/server   Hono BFF (Firefly III, auth, cache) ──────────────────▶ libs/shared
apps/mobile   Flutter (Dart): talks to the BFF over HTTP, shares nothing at build time
libs/i18n     es.json / en.json (one catalog, also compiled into the Flutter app)
```

Dependencies only point left to right: apps → `libs/client` → `libs/shared`. The server depends on `libs/shared` alone. A library never imports an app. ESLint enforces this (`eslint.config.js`).

| Where | What goes there |
|---|---|
| `libs/shared/src` | DTOs and pure helpers. No Angular, no rxjs. The server uses it too. |
| `libs/client/src/platform` | Platform tokens (below). |
| `libs/client/src/{api,auth,format,i18n,state}` | Platform-agnostic services, stores, interceptors. |
| `libs/client/src/charts` | ECharts option builders and the palette. |
| `libs/client/src/ui-logic` | Pure presentation logic. Returns semantic *tones*, never Tailwind classes. |
| `libs/client/src/features/<f>/<f>.vm.ts` | View-models: `xxxViewModel()` runs in an injection context and returns signals and actions. Pure shaping helpers are exported and have specs. |
| `libs/client/testing` | Fakes for every token (`MemoryStorage`, `RecordingToast`, …). |
| `apps/web/src/app` | Components and templates. `platform/` implements the tokens for the browser. |
| `apps/server/src` | Routes, Firefly client, reports. `test/` has the fake Firefly. |

A component is `vm = xxxViewModel()` plus a template. Logic that is not about drawing belongs in the view-model.

## Platform tokens

Abstract classes in `libs/client/src/platform` with **no default provider**: an app that forgets one fails at bootstrap.

| Token | Web (`apps/web/src/app/platform`) |
|---|---|
| `KeyValueStorage` | `localStorage` |
| `API_BASE_URL` (+ `baseUrlInterceptor`, last in the chain) | `''` (same origin) |
| `AuthPlatform` | `location.href` redirects, cookie session |
| `FilterParamsSource` | query string |
| `Toast` | sonner |
| `Confirm` | `ConfirmService` (lazy, via `web-confirm.ts`) |
| `BackNavigation` | `web-back-navigation.ts` (router + `Location`) |
| `ThemeHost` | `web-theme-host.ts`: `data-theme` on `<html>` + `theme-color` meta |
| `DEVICE_LANG` | `navigator.language` |

Tests of `libs/client` get the web providers through `libs/client/testing/providers.ts`; web specs through `apps/web/src/testing/providers.ts`.

## Forbidden in `libs/client` and `libs/shared`

- Browser globals: `window`, `document`, `localStorage`, `sessionStorage`, `location`, `navigator`, `getComputedStyle`, `matchMedia`… Add or use a token.
- Imports of Spartan, ng-icons, CDK, `ngx-*`, `@angular/platform-browser`, `@nativescript/*`, or anything under `apps/`.
- `@Component`. Put it in an app and expose a view-model.
- In `libs/shared` also: any `@angular/*` or `rxjs` import.

## Charts

- Builders live in `libs/client/src/charts/builders.ts` and return a plain ECharts option. Colors come from `charts/palette.ts`, never from `cssVar()` or the DOM.
- Tooltips and labels whose text is known up front use the lookup helpers in `charts/formatters.ts` (`byIndex`, `byName`, `byKey`, `constant`).
- Themes (`THEME_IDS`, `THEMES` in `palette.ts`) are data; `palette` reads the active one through getters, so a `computed()` that calls a builder follows the theme without changes. Each theme's tokens are duplicated in `apps/web/src/styles.css` (`:root[data-theme='<id>']`) (`palette.spec.ts` fails when they drift). The Flutter app will generate its theme from `THEMES`. A new theme's data colors must pass the dataviz validator on its own surface.

## Mobile (Flutter)

`apps/mobile` is a Flutter app (Material 3, Riverpod, go_router, dio). It has no `package.json`, so the npm workspaces and the Dockerfile ignore it. The server stays the same: the app signs in through `/auth/mobile/login` (PKCE, `spacefly://auth/callback`) and then sends a bearer token.

```
lib/api        dio client (baseUrl, bearer + Cloudflare Access headers, 401 → sign out), resources.dart (`reportProvider`), write_api.dart (writes, `WriteError`), models.g.dart (generated)
lib/auth       PKCE, sign-in flow (flutter_web_auth_2)
lib/platform   Toast, Confirm, BackNavigation: what a view-model asks of the app (tests plug in recording fakes)
lib/storage    KeyValueStore (prefs), CredentialStore (secure storage), ServerConfig
lib/shared     ports of libs/shared helpers: dates (periods, presets), period_presets
lib/format     Formatter (port of FormatService, es-DO number separators) and its provider
lib/state      stores: preferences, filters (period, currency), privacy, meta/lookups, tx_detail request
lib/features   view-model ports, one folder per feature (`xxx_vm.dart`; `route_params.dart` puts the query of a link into the screens' state, the web's `filters.param`): dashboard, transactions (explorer, tx_detail, tx_view, actions), accounts (list, detail, net worth, savings, expense and revenue accounts), reports (calendar, monthly, annual, compare, flow), analysis (ranking, budgets), editor (transaction form, account picker, the generic entity form with its six specs), settings (server settings, exchange rates, refresh)
lib/ui_logic   pure presentation logic: delta/tone, budget meter, series colors, entity names, calendar cells, `TextTable` (the table of a chart and its CSV)
lib/ui         shared widgets: charts (fl_chart), `ui/charts/` (heatmap grid, diverging bars, ranking bars, Sankey, treemap, sunburst: drawn with a `CustomPainter` or widgets, their geometry is a pure function with a test), calendar grid, report page frame, KPI card, transaction tile, period bar, `ChartCard` (chart ⇄ table, share as CSV), form fields and pickers, common pieces
lib/theme      tokens.g.dart (generated), app_theme.dart (Material 3 ThemeData + SpaceflyColors extension)
lib/i18n       *.i18n.json + strings.g.dart (generated by slang)
lib/screens    one file per screen; router.dart has the routes and the sign-in guard. The tabs are Dashboard, Transactions, Accounts, More (`more_tab.dart`: an entry per screen that exists, grouped like the web sidebar) and Settings; report screens use the web paths (`/reports/monthly`…) and open over the tab bar
test           one test file per unit and per screen; support.dart has the fake HTTP adapter, a fixed clock and in-memory stores; fixtures.dart the sample answers
```

- **Generated, never edited by hand:** `lib/api/models.g.dart` (quicktype over `libs/shared/src/dto`), `lib/theme/tokens.g.dart` (`THEMES` in `palette.ts`) and `lib/i18n/*` (`libs/i18n/src/*.json`, slang with `double_braces` interpolation and `key_case: camel`, so `login.errors.cf_access` is `t.login.errors.cfAccess`). DTOs must not use intersections (`A & { … }`: quicktype keeps only one side); use `interface B extends A`. Run `npm run gen:mobile` after changing a DTO, a theme or a text; `check:mobile-gen` (part of `verify`) fails when they are stale.
- **Porting a view-model:** keep the name and the actions of the TypeScript `xxxViewModel()`: a Riverpod provider that returns the shaped data and the actions (`dashboardViewModelProvider`), over `reportProvider` for the request. Pure helpers (`monthRange`, `sortTransactions`, `groupTransactions`…) keep their names and are tested with the cases of the `*.spec.ts`; keep the two in step in later changes. Charts are drawn by fl_chart from the same shaped data instead of ECharts options.
- **Writes:** a view-model that writes goes through `writeApiProvider` (which refreshes every report and lookup on success) and tells the user through `toastProvider` / `confirmProvider` / `backNavigationProvider`. A view-model's actions that write a screen's own state (`StateProvider`s) take the notifiers when the provider is built: a closure must not call `ref` after a dependency changed and before the provider rebuilt. Providers that depend on a notifier (a `...ViewProvider`) must not be read from inside that notifier (Riverpod's circular-dependency check): build the view object directly there. A screen that shows one record must also watch `filtersProvider.select((f) => f.refreshTick)`, or it keeps showing the record as it was before a write.
- **Reading data in a test:** `fakeServer({'/api/reports/dashboard': report(dashboardJson())})` answers by path; keep autoDispose providers alive with `container.listen` before awaiting them.
- Colors come from `context.tokens` / the `ColorScheme`, never hard-coded. Text comes from `context.t`, never string literals.
- Configuration is `--dart-define=API_URL=…` (only pre-fills the server screen). Android allows cleartext only to `localhost` / `10.0.2.2` (`network_security_config.xml`); use HTTPS for anything else.
- The SDK is in `~/flutter` (Flutter 3.27, Dart 3.6): pub resolves package versions compatible with it, so do not bump packages past what that Dart accepts without upgrading Flutter.
- Android builds need `JAVA_HOME` (Android Studio's JBR 21) and `ANDROID_HOME` from `~/.zshrc`. Gradle 8.12, AGP 8.9.1 and compileSdk 36 are set in `android/` because the newest plugins require them.

## Checklist for a feature

1. DTO in `libs/shared` (if the API changes).
2. Server route plus a test in `apps/server/test`.
3. View-model in `libs/client/src/features/…` plus a spec.
4. Web component (`apps/web`).
5. Mobile: the Flutter screen and its view-model port with a test, **or** a row in `docs/parity.md` saying it is web-only (or not ported yet) and why.
6. Text: keys in **both** `libs/i18n/src/es.json` and `en.json` (`keys.spec.ts` compares them).
7. `npm run verify`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` / `dev:mock` | Web + BFF (`dev:mock` also starts a fake Firefly) |
| `npm test` | Web + client + server tests (`test:web`, `test:client`, `test:server` for one) |
| `npm run dev:mobile` | `flutter run` in `apps/mobile` (pass `-- --dart-define=API_URL=http://10.0.2.2:3100` for the emulator) |
| `npm run test:mobile` | `flutter analyze` + `flutter test` |
| `npm run gen:mobile` | Regenerates the Dart models, theme tokens and strings from the TS/JSON sources |
| `npm run check:mobile-gen` | Fails when the generated Dart files are out of date |
| `npm run build:mobile:android` | `flutter build apk` |
| `npm run typecheck` | web, client, server |
| `npm run lint` | angular-eslint over web, client and shared |
| `npm run check:deps` | Fails if there is more than one copy of `@angular/core` |
| `npm run verify` | check:deps + check:mobile-gen + lint + typecheck + test + test:mobile + build |

## Gotchas

- **Path aliases live only in `tsconfig.base.json`** (`paths` are not merged through `extends`). Never add them to a project tsconfig.
- **Every new workspace needs a `COPY …/package.json` line in the Dockerfile**, or `npm ci` fails. The image installs only the web and server workspaces (`npm ci -w …`).
- Verification stacks use free ports. The user usually has `dev:mock` on 4200/3000/8081: check with `lsof`, use e.g. 4300/3100/8181, and kill only the PIDs you started.
- `.env.mock` has no secrets and is development-only.
