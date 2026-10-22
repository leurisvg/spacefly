# SpaceFly: working rules

SpaceFly is one repository with a web app, a server and three libraries. **The mobile app is being rebuilt in Flutter** (the NativeScript app was removed): until it lands, changes only need to work on the web, and `docs/parity.md` tracks which screens the mobile app will need.

## Architecture

```
apps/web      Angular 22 (Spartan/Tailwind UI)  ─▶ libs/client ─▶ libs/shared
apps/server   Hono BFF (Firefly III, auth, cache) ──────────────────▶ libs/shared
libs/i18n     es.json / en.json (one catalog)
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

## Checklist for a feature

1. DTO in `libs/shared` (if the API changes).
2. Server route plus a test in `apps/server/test`.
3. View-model in `libs/client/src/features/…` plus a spec.
4. Web component (`apps/web`).
5. A row in `docs/parity.md` (the mobile route stays pending until the Flutter app exists).
6. Text: keys in **both** `libs/i18n/src/es.json` and `en.json` (`keys.spec.ts` compares them).
7. `npm run verify`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` / `dev:mock` | Web + BFF (`dev:mock` also starts a fake Firefly) |
| `npm test` | Web + client + server tests (`test:web`, `test:client`, `test:server` for one) |
| `npm run typecheck` | web, client, server |
| `npm run lint` | angular-eslint over web, client and shared |
| `npm run check:deps` | Fails if there is more than one copy of `@angular/core` |
| `npm run verify` | check:deps + lint + typecheck + test + build |

## Gotchas

- **Path aliases live only in `tsconfig.base.json`** (`paths` are not merged through `extends`). Never add them to a project tsconfig.
- **Every new workspace needs a `COPY …/package.json` line in the Dockerfile**, or `npm ci` fails. The image installs only the web and server workspaces (`npm ci -w …`).
- Verification stacks use free ports. The user usually has `dev:mock` on 4200/3000/8081: check with `lsof`, use e.g. 4300/3100/8181, and kill only the PIDs you started.
- `.env.mock` has no secrets and is development-only.
