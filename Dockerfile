# Build once, deploy anywhere.
#
# The point of this image is that it is NOT built per environment. `VITE_*`
# values are inlined by the bundler, so anything that differs between
# deployments comes from `config.js`, which the entrypoint rewrites at boot.
# See docs/env-and-runtime-config.md.

FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

# Copy only what affects dependency resolution first, so a source-only change
# does not invalidate the install layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json                 apps/web/
COPY packages/core/package.json            packages/core/
COPY packages/design/package.json          packages/design/
COPY packages/interfaces/package.json      packages/interfaces/
COPY e2e/package.json                      e2e/

# `--frozen-lockfile` so a drifted lockfile fails the build instead of being
# silently resolved to something else.
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @template/web build

FROM nginx:alpine AS runtime

COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx.conf      /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh   /docker-entrypoint.d/40-app-config.sh
RUN chmod +x /docker-entrypoint.d/40-app-config.sh

EXPOSE 80
