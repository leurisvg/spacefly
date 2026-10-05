# SpaceFly: working rules

SpaceFly is one repository with three apps and three libraries. **Every change must work on the web and on the mobile app**, or say in `docs/parity.md` why it is web-only.

## Architecture

```
apps/web      Angular 22 (Spartan/Tailwind UI)       ┐
apps/mobile   NativeScript + Angular (NS UI)         ├─▶ libs/client ─▶ libs/shared
apps/server   Hono BFF (Firefly III, auth, cache)    ┘──────────────────▶ libs/shared
libs/i18n     es.json / en.json (one catalog for both apps)
```

Dependencies only point left to right: apps → `libs/client` → `libs/shared`. The server depends on `libs/shared` alone. A library never imports an app. ESLint enforces this (`eslint.config.js`).

| Where | What goes there |
|---|---|
| `libs/shared/src` | DTOs and pure helpers. No Angular, no rxjs. The server uses it too. |
| `libs/client/src/platform` | Platform tokens (below). |
| `libs/client/src/{api,auth,format,i18n,state}` | Platform-agnostic services, stores, interceptors. |
| `libs/client/src/charts` | ECharts option builders, palette, portable (serializable) options. |
| `libs/client/src/ui-logic` | Pure presentation logic. Returns semantic *tones*, never Tailwind classes. |
| `libs/client/src/features/<f>/<f>.vm.ts` | View-models: `xxxViewModel()` runs in an injection context and returns signals and actions. Pure shaping helpers are exported and have specs. |
| `libs/client/testing` | Fakes for every token (`MemoryStorage`, `RecordingToast`, …). |
| `apps/web/src/app` | Components and templates. `platform/` implements the tokens for the browser. |
| `apps/mobile/src/app` | NativeScript screens (`screens/`), UI pieces (`ui/`), token implementations (`platform/`). |
| `apps/server/src` | Routes, Firefly client, reports. `test/` has the fake Firefly. |

A component is `vm = xxxViewModel()` plus a template. Logic that is not about drawing belongs in the view-model.

## Platform tokens

Abstract classes in `libs/client/src/platform` with **no default provider**: an app that forgets one fails at bootstrap.

| Token | Web (`apps/web/src/app/platform`) | Mobile (`apps/mobile/src/app/platform`) |
|---|---|---|
| `KeyValueStorage` | `localStorage` | `ApplicationSettings` |
| `API_BASE_URL` (+ `baseUrlInterceptor`, last in the chain) | `''` (same origin) | server URL from the settings / `--env.apiUrl` |
| `AuthPlatform` | `location.href` redirects, cookie session | PKCE + system browser + bearer token |
| `FilterParamsSource` | query string | in-memory signal |
| `Toast` | sonner | `ToastHost` |
| `Confirm` | `ConfirmService` (lazy, via `web-confirm.ts`) | `Dialogs.confirm/prompt` |
| `BackNavigation` | `web-back-navigation.ts` (router + `Location`) | `RouterExtensions` |
| `ThemeHost` | `web-theme-host.ts`: `data-theme` on `<html>` + `theme-color` meta | `ns-theme-host.ts`: `theme-<id>` class on the root view |
| `DEVICE_LANG` | `navigator.language` | `Device.language` |

Tests of `libs/client` get the web providers through `libs/client/testing/providers.ts`; web specs through `apps/web/src/testing/providers.ts`.

## Forbidden in `libs/client` and `libs/shared`

- Browser globals: `window`, `document`, `localStorage`, `sessionStorage`, `location`, `navigator`, `getComputedStyle`, `matchMedia`… Add or use a token.
- Imports of Spartan, ng-icons, CDK, `ngx-*`, `@angular/platform-browser`, `@nativescript/*`, or anything under `apps/`.
- `@Component`. Put it in an app and expose a view-model.
- In `libs/shared` also: any `@angular/*` or `rxjs` import.
- `apps/web` must not import `@nativescript/*`; `apps/mobile` must not import web-only libraries.

## Charts

- Builders live in `libs/client/src/charts/builders.ts` and return a plain ECharts option. Colors come from `charts/palette.ts`, never from `cssVar()` or the DOM.
- Every formatter function in an option must be wrapped with `tagged(spec, fn)` (compact, const, byIndex, byName…). The mobile app serializes the option with `toPortableOption()` into a WebView, and that throws on an untagged function. `portable.spec.ts` runs every builder, so a builder that breaks portability fails CI.
- Themes (`THEME_IDS`, `THEMES` in `palette.ts`) are data; `palette` reads the active one through getters, so a `computed()` that calls a builder follows the theme without changes. Each theme's tokens are duplicated in `apps/web/src/styles.css` (`:root[data-theme='<id>']`) and `apps/mobile/src/app.css` (`.theme-<id>`). `palette.spec.ts` fails when they drift. A new theme's data colors must pass the dataviz validator on its own surface.

## Checklist for a feature

1. DTO in `libs/shared` (if the API changes).
2. Server route plus a test in `apps/server/test`.
3. View-model in `libs/client/src/features/…` plus a spec.
4. Web component (`apps/web`).
5. Mobile screen (`apps/mobile`), **or** a row in `docs/parity.md` with the reason it is web-only.
6. Text: keys in **both** `libs/i18n/src/es.json` and `en.json` (`keys.spec.ts` compares them).
7. `npm run verify`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` / `dev:mock` | Web + BFF (`dev:mock` also starts a fake Firefly) |
| `npm run dev:mobile:android` / `dev:mobile:ios` | NativeScript app; pass the server with `-- --env.apiUrl=http://10.0.2.2:3100` |
| `npm test` | Web + client + server tests (`test:web`, `test:client`, `test:server` for one) |
| `npm run typecheck` | web, client, mobile, server |
| `npm run lint` | angular-eslint over web, client, shared and mobile |
| `npm run bundle:mobile` | AOT webpack build of the mobile app, no SDK needed (catches template errors) |
| `npm run check:deps` | Fails if there is more than one copy of `@angular/core` |
| `npm run verify` | check:deps + lint + typecheck + test + build + bundle:mobile |

## Gotchas

- **Path aliases live only in `tsconfig.base.json`** (`paths` are not merged through `extends`). Never add them to a project tsconfig.
- **Every new workspace needs a `COPY …/package.json` line in the Dockerfile**, or `npm ci` fails. The image installs only the web and server workspaces (`npm ci -w …`), never NativeScript.
- **Never put `@angular/*`, rxjs or Transloco in `apps/mobile/package.json`.** Angular is installed once, in the root. `apps/mobile/webpack.config.js` makes the root `node_modules` win resolution.
- NativeScript templates: elements are not self-closing (`<Label …></Label>`), event payloads need `$any($event)`, and selectors use the `ns` prefix (web uses `sf`).
- Verification stacks use free ports. The user usually has `dev:mock` on 4200/3000/8081: check with `lsof`, use e.g. 4300/3100/8181, and kill only the PIDs you started.
- `.env.mock` has no secrets and is development-only.
