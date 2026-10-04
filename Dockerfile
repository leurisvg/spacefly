# syntax=docker/dockerfile:1.7

# ── Build: Angular SPA + bundled Hono BFF ─────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app
# Every workspace manifest must be present before `npm ci`, or the lockfile and workspaces disagree.
# A new workspace under apps/ or libs/ needs its own COPY line here.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY libs/shared/package.json libs/shared/
COPY libs/i18n/package.json libs/i18n/
COPY libs/client/package.json libs/client/
COPY apps/mobile/package.json apps/mobile/
# apps/mobile (NativeScript) is not built here: install only the workspaces the web and the server need.
RUN npm ci --no-audit --no-fund --include-workspace-root \
    -w @spacefly/web -w @spacefly/server -w @spacefly/shared -w @spacefly/i18n -w @spacefly/client
COPY . .
RUN npm run build

# ── Runtime: only the build output (the server bundle includes its dependencies) ──
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    STATIC_DIR=/app/dist/SpaceFly/browser
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
RUN chmod -R a+rX /app/dist
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "--enable-source-maps", "dist/server/main.mjs"]
