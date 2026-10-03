# SpaceFly

Dashboards, reportes y análisis de tus finanzas personales sobre **Firefly III**.

SpaceFly nace como la evolución de [firefly-iii-email-summary](https://github.com/yemzikk/firefly-iii-email-summary). Toma todo lo que ofrece ese reporte mensual por email (KPIs, categorías con comparación contra el mes anterior, presupuestos, diagrama de flujo de dinero, calendario diario, actividad por cuenta, top de gastos, ahorros y resumen financiero) y lo convierte en una app web interactiva con varias pantallas, cualquier periodo de tiempo y drill-down hasta la transacción.

> **Alcance actual:** solo lectura y visualización. SpaceFly nunca modifica datos en Firefly III.

---

## Decisiones técnicas

| Tema | Decisión |
|---|---|
| Frontend | Angular 22 (standalone, signals, zoneless), Tailwind CSS v4, [spartan/ui](https://spartan.ng) v1 (helm/brain), iconos lucide |
| Gráficos | Apache ECharts vía `ngx-echarts` (imports con tree-shaking) |
| Backend | BFF en Node ([Hono](https://hono.dev)) dentro del mismo repo e imagen Docker. El token de Firefly nunca llega al navegador |
| Autenticación | "Iniciar sesión con Firefly" (OAuth2 Authorization Code + PKCE contra Firefly III), con la sesión en una cookie `httpOnly`, y además validación del JWT de **Cloudflare Access** |
| Monedas | Moneda primaria **DOP**. Se usan los montos `pc_*` / `primary_currency_*` de Firefly y las tasas mensuales guardadas en Firefly (`/v1/exchange-rates`) para mostrar en USD. Si falta una tasa, se usa open.er-api.com |
| Firefly III | Versión mínima 6.6 (se detecta vía `/v1/about`) |
| Idioma | Español + inglés, con cambio en caliente (Transloco). Formatos `es-DO` / `en-US` |
| Tema | Solo oscuro, totalmente responsive |
| Deploy | Docker Compose, en la misma red interna que Firefly III |

---

## Arquitectura

```
Navegador ──(Cloudflare Zero Trust)──► SpaceFly (contenedor Node)
                                        ├─ /            → Angular SPA (estático)
                                        ├─ /auth/*      → OAuth con Firefly, sesión
                                        └─ /api/*       → endpoints de reportes (solo GET)
                                              │  token del usuario (guardado en el servidor)
                                              ▼
                                        Firefly III /api/v1 (red interna Docker)
```

### Principios del BFF

1. **Solo lectura**: el cliente de Firefly solo puede hacer `GET`.
2. **Motor de ledger**: en lugar de hacer N requests por categoría, descarga una sola vez todas las transacciones del periodo (`/v1/transactions?type=all`, paginado) y las aplana en *splits* normalizados: fecha, tipo, monto, `pc_amount`, moneda, monto extranjero, categoría, presupuesto, tags, bill, origen y destino. Todos los agregados se calculan a partir de ese conjunto.
3. **Caché por mes** (LRU en memoria + SQLite): los meses cerrados se guardan con TTL largo y el mes actual con TTL corto. Un botón "Refrescar" invalida la caché.
4. **Monedas**: todo se consolida en DOP. Para mostrar en USD se usa la tasa vigente en la fecha de cada transacción. Cada monto conserva `{original, currency, rate}` para mostrar el desglose.
5. **Contratos tipados compartidos** (`shared/`): los mismos DTOs se usan en el server y en Angular.

### Seguridad

- **OAuth con Firefly**: se crea un cliente confidencial en Firefly (*Perfil → OAuth → Clientes*) con redirect `https://<app>/auth/callback`. El BFF guarda los tokens cifrados (AES-GCM) en SQLite y al navegador solo le entrega una cookie `httpOnly; Secure; SameSite=Lax`. Los tokens se refrescan automáticamente.
- **Cloudflare Access**: un middleware verifica el header `Cf-Access-Jwt-Assertion` (firma, `aud` y email permitido). Se puede desactivar en desarrollo con `CF_ACCESS_ENABLED=false`.
- Headers de seguridad (CSP y similares) y rate limit en `/auth`.

---

## Estructura del proyecto

```
SpaceFly/
├─ package.json                 # scripts: dev (web + server), build, test
├─ angular.json                 # + proxy.conf.json para /api y /auth en dev
├─ .postcssrc.json              # @tailwindcss/postcss
├─ components.json              # config de spartan CLI
├─ Dockerfile                   # multi-stage: build web + build server → node:24-alpine
├─ docker-compose.example.yml
├─ .env.example
├─ shared/                      # tipos/DTOs compartidos (sin dependencias)
│  ├─ dto/  (period.ts, money.ts, ledger.ts, reports/*.ts)
│  └─ index.ts
├─ server/
│  ├─ src/
│  │  ├─ main.ts                # Hono: sirve dist/ y monta rutas
│  │  ├─ config.ts              # env validado con zod
│  │  ├─ auth/                  # oauth.routes, session.store, cf-access.middleware, crypto
│  │  ├─ firefly/               # firefly.client (solo GET, paginación, refresh), tipos
│  │  ├─ core/                  # ledger.service, currency.service, cache, period
│  │  ├─ reports/               # un archivo por reporte (lógica pura, testeable)
│  │  ├─ routes/api.routes.ts   # /api/reports/*, /api/meta, /api/transactions
│  │  └─ db/sqlite.ts           # node:sqlite — sesiones, caché, tasas fallback
│  └─ test/fixtures/            # respuestas reales anonimizadas de Firefly
├─ public/i18n/{es,en}.json
└─ src/
   ├─ styles.css                # tailwind + tema spartan (dark) + tokens de charts
   └─ app/
      ├─ core/                  # auth, filters.store (periodo/moneda ↔ URL), api, pipes de formato
      ├─ layout/                # shell, sidebar colapsable, topbar, sheet móvil
      ├─ shared/
      │  ├─ charts/             # tema echarts, sankey, calendar, trend, bars, donut, treemap, sparkline
      │  └─ components/         # kpi-card, money-cell, delta-badge, period-picker, tx-detail-sheet…
      ├─ features/              # una carpeta por pantalla
      └─ libs/ui/               # componentes helm de spartan (generados por CLI)
```

---

## Navegación

Sidebar con secciones colapsables: en móvil se abre como *Sheet* y en escritorio se puede contraer a solo iconos. La barra superior tiene **selector de periodo** (mes, trimestre, año, YTD o rango libre, con ◀ ▶), **moneda** (RD$ / US$), **idioma**, refrescar y menú de usuario.

| Sección | Pantallas |
|---|---|
| **General** | Dashboard |
| **Reportes** | Resumen mensual · Reporte anual · Flujo de dinero · Calendario · Comparaciones |
| **Análisis** | Categorías · Tags · Presupuestos · Comercios · Fuentes de ingreso |
| **Cuentas** | Cuentas de activo · Patrimonio neto · Ahorros |
| **Planificación** | Suscripciones · Recurrentes · Metas (piggy banks) · Proyección de flujo |
| **Transacciones** | Explorador |
| **Sistema** | Ajustes · Acerca de |

---

## Pantallas

Comportamiento común a todas: los filtros viven en la URL, cada monto muestra en un tooltip el original, la moneda y la tasa, hay skeletons y estados vacíos, y un clic en cualquier gráfico o fila abre el **detalle de transacciones** en un panel lateral.

1. **Dashboard**: KPIs (ingresos, gastos, neto, tasa de ahorro, patrimonio) con sparkline y delta contra el periodo anterior. Ingresos vs gastos de los últimos 12 meses. Tendencia del patrimonio. Top categorías. Progreso de presupuestos. Próximas suscripciones. Mini calendario. Gastos más grandes.
2. **Resumen mensual** (paridad con el email summary): highlights, categorías con comparación contra el mes anterior, presupuestos con semáforo (80% y 100%), Sankey, calendario, top 5 de gastos, actividad por cuenta con detalle expandible, ahorros de 6 meses y resumen del mes, YTD y patrimonio.
3. **Flujo de dinero**: Sankey interactivo de 5 niveles (fuente → categoría de ingreso → total → presupuesto → categoría de gasto + ahorro). Hover resalta la ruta completa, clic en un nodo muestra sus transacciones, niveles activables, modo por tags, agrupación "Otros" con umbral ajustable, % del ingreso total y layout vertical en móvil.
4. **Calendario**: grid mensual con barras de ingreso y gasto por día. Clic en un día abre todas sus transacciones. Incluye línea de saldo acumulado, marcadores de suscripciones y recurrentes futuras, filtros por cuenta, categoría o tag, y vista anual tipo heatmap.
5. **Comparaciones**: periodo A vs B (mes vs mes anterior, mes vs mismo mes del año anterior, año vs año o rangos libres), agrupado por categoría, tag, presupuesto, cuenta o comercio. Barras divergentes, Δ y Δ%, y tendencia rolling de 12 meses.
6. **Reporte anual**: heatmap de mes × categoría, totales por mes, mejor y peor mes, promedios y tasa de ahorro.
7. **Categorías / Tags**: ranking, treemap/sunburst, tendencia y drill-down.
8. **Presupuestos**: límite vs gastado, histórico de cumplimiento, proyección de fin de mes según el ritmo de gasto y desglose presupuesto → categoría.
9. **Comercios / Fuentes de ingreso**: ranking, frecuencia, ticket promedio y tendencia.
10. **Cuentas / Patrimonio / Ahorros**: saldos (DOP y USD originales), evolución por cuenta, patrimonio apilado y cuentas excluidas configurables.
11. **Suscripciones**: costo mensual y anual equivalente, próximas fechas, pagadas vs pendientes y variación de monto.
12. **Recurrentes y proyección**: próximas ocurrencias y proyección de flujo de caja a 30, 60 y 90 días.
13. **Metas**: progreso de cada piggy bank y fecha estimada de cumplimiento según el ritmo de aportes.
14. **Explorador de transacciones**: tabla con búsqueda (sintaxis de Firefly), filtros, orden, paginación, export CSV y enlace a Firefly.

---

## Diseño visual

- Siempre en tema oscuro, con la paleta del tema dark del email summary (`#0a0e1a`, `#111827`, acento índigo, verde para ingresos y rojo para gastos) mapeada a las variables CSS de spartan.
- Tipografías **Inter** y **JetBrains Mono** (montos), auto-alojadas.
- Tema de ECharts derivado de las mismas variables CSS y colores semánticos consistentes en toda la app (ingresos, gastos, ahorro, presupuestos).
- Responsive: 1 columna en móvil, 2 en tablet y 3–4 en escritorio. Las tablas se convierten en tarjetas en móvil.

---

## Endpoints de Firefly III utilizados (solo GET)

`/v1/about`, `/v1/about/user`, `/v1/preferences`, `/v1/currencies`, `/v1/exchange-rates`, `/v1/transactions`, `/v1/search/transactions`, `/v1/accounts`, `/v1/categories`, `/v1/tags`, `/v1/budgets` (+ `/limits`), `/v1/available-budgets`, `/v1/bills`, `/v1/recurrences`, `/v1/piggy-banks`, `/v1/summary/basic`, `/v1/chart/account/overview`, `/v1/chart/balance/balance`, `/v1/insight/*`.

---

## Roadmap

- [x] **Fase 0 — Fundaciones**: Tailwind v4, spartan/ui (CLI + tema), lucide, ngx-echarts, Transloco, fuentes, BFF Hono, proxy de desarrollo, ESLint, Dockerfile y compose de ejemplo.
- [x] **Fase 1 — BFF y datos**: config, OAuth con Firefly, sesión cifrada, Cloudflare Access, cliente de Firefly, ledger, monedas, caché y tests con fixtures.
- [x] **Fase 2 — Shell de UI**: layout, sidebar, topbar, store de filtros ↔ URL, period picker, toggle de moneda, i18n, login/guard, pipes de dinero y tema de charts.
- [x] **Fase 3 — MVP (paridad con el email summary)**: Resumen mensual, Flujo de dinero y Calendario, con el panel de detalle de transacciones.
- [x] **Fase 4 — Expansión analítica**: Dashboard, Comparaciones, Reporte anual, Categorías, Tags, Presupuestos, Comercios/Fuentes, Cuentas, Patrimonio y Ahorros.
- [x] **Fase 5 — Planificación**: Suscripciones, Recurrentes, Proyección de flujo y Metas.
- [x] **Fase 6 — Explorador y pulido**: explorador de transacciones, exports CSV/PNG, Ajustes, rendimiento (`@defer`, bundle budgets) y accesibilidad.

**Pendiente**: validar contra una instancia real de Firefly III (nombres de campos `pc_*` / `primary_currency_*` e `insight`, versiones 6.6.2 y 6.7.6, paridad con `monthly-report.py`) y revisar el responsive a 375 / 768 / 1440 px en un navegador. Ver [Capturar fixtures reales](#capturar-fixtures-reales).

---

## Configuración

Variables de entorno (`.env`):

```env
APP_URL=https://spacefly.tu-dominio.com
PORT=3000
FIREFLY_INTERNAL_URL=http://firefly:8080          # red Docker
FIREFLY_PUBLIC_URL=https://firefly.tu-dominio.com # redirect OAuth del navegador
FIREFLY_OAUTH_CLIENT_ID=
FIREFLY_OAUTH_CLIENT_SECRET=
SESSION_SECRET=                                    # 32+ bytes aleatorios
SESSION_TTL_DAYS=30                                # duración de la sesión
CF_ACCESS_ENABLED=true
CF_ACCESS_TEAM_DOMAIN=tu-team.cloudflareaccess.com
CF_ACCESS_AUD=
CF_ACCESS_ALLOWED_EMAILS=tu-correo@ejemplo.com
DISPLAY_CURRENCIES=DOP,USD                         # monedas del selector (la primaria siempre se incluye)
FX_FALLBACK_PROVIDER=open.er-api                   # open.er-api | none
CACHE_TTL_CURRENT_MONTH=300
DATA_DIR=/data                                     # volumen para SQLite
```

### Crear el cliente OAuth en Firefly III

1. En Firefly III ve a **Opciones → Perfil → OAuth → Crear nuevo cliente**.
2. Redirect URL: `https://spacefly.tu-dominio.com/auth/callback`. Deja el cliente como **confidencial**.
3. Copia el *Client ID* y el *Secret* a `FIREFLY_OAUTH_CLIENT_ID` y `FIREFLY_OAUTH_CLIENT_SECRET`.

---

## Desarrollo

```bash
npm install
npm run dev          # Angular (http://localhost:4200) + BFF con proxy de /api y /auth
npm run dev:mock     # igual, pero contra un Firefly simulado (sin necesitar tu instancia)
npm test             # Vitest: web (Angular) + server
npm run lint         # angular-eslint (excluye src/libs/ui, generado por spartan)
npm run build        # build de producción (web + server)
```

En local usa `CF_ACCESS_ENABLED=false`.

### Modo mock

`npm run dev:mock` levanta tres procesos: `mock:firefly` (API de Firefly simulada en `:8081` con ~14 meses de datos sintéticos y deterministas), el BFF con `.env.mock` (que omite OAuth con un token de desarrollo) y `ng serve`. Sirve para recorrer todas las pantallas sin datos reales. `.env.mock` no contiene secretos y no debe usarse en producción. Si ya tienes algo escuchando en `4200`, `3000` o `8081`, el arranque falla con `EADDRINUSE`.

### Capturar fixtures reales

Con un token de acceso personal de Firefly (*Perfil → OAuth → Tokens de acceso personal*):

```bash
FIREFLY_INTERNAL_URL=https://firefly.tu-dominio.com DEV_FIREFLY_TOKEN=… \
  npm run fixtures:capture -- 2026-09
```

Guarda las respuestas anonimizadas (nombres seudónimos y montos multiplicados por un factor aleatorio, así que las proporciones se conservan) en `server/test/fixtures/captured/<mes>/`, que está en `.gitignore`. Úsalas para ajustar tipos y reportes a lo que devuelve tu versión de Firefly.

## Deploy

```bash
docker compose up -d --build
```

El servicio `spacefly` se une a la red Docker de Firefly III y monta un volumen en `/data` para SQLite. El acceso público pasa por Cloudflare Zero Trust.

## Verificación

- **Unit tests**: los reportes del server se prueban con fixtures. En el Sankey lo que entra debe ser igual a lo que sale más el ahorro, la suma del calendario debe dar los gastos del mes y la conversión DOP↔USD debe usar la tasa de la fecha de cada transacción.
- **Paridad**: comparar `monthly-report.py --preview` con SpaceFly para el mismo mes (KPIs, categorías, presupuestos, Sankey y totales diarios).
- **Responsive**: revisar en 375px, 768px y 1440px.
- **Seguridad**: una request sin el JWT de Cloudflare debe recibir 403, y el token de Firefly nunca debe aparecer en el navegador.
