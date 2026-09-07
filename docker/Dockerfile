# syntax=docker/dockerfile:1.6
###########################
#     BASE CONTAINER      #
###########################
FROM node:24-alpine3.23 AS base

RUN apk add --no-cache openssl
RUN apk add --no-cache font-freefont

# MODIFIED for BizRethink overlay 019: enable corepack so the build uses
# the npm version declared in package.json#packageManager (currently
# npm@11.11.0). Without this, the base image's npm 10.9.7 ships, and npm
# 10 vs 11 dedupe/overrides differences flip 24 typecheck errors in the
# apps/remix editor-field-*-form.tsx files. See overlays/019 for details.
RUN corepack enable npm


###########################
#    BUILDER CONTAINER    #
###########################
FROM base AS builder

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
RUN apk add --no-cache jq
WORKDIR /app

COPY . .

# Install the exact turbo version resolved in the lockfile, without installing
# the rest of the dependency tree (prune must run before any npm ci).
RUN TURBO_VERSION="$(jq -r '.packages["node_modules/turbo"].version' package-lock.json)" \
    && npm install -g "turbo@${TURBO_VERSION}"

# Outputs to the /out folder
# source: https://turbo.build/repo/docs/reference/command-line-reference/prune#--docker
RUN turbo prune --scope=@documenso/remix --docker

###########################
#   INSTALLER CONTAINER   #
###########################
FROM base AS installer

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
RUN apk add --no-cache jq
# Required for node_modules/aws-crt
RUN apk add --no-cache make cmake g++ openssl bash

WORKDIR /app

# Disable husky from installing hooks
ENV HUSKY=0
ENV DOCKER_OUTPUT=1
ENV NEXT_TELEMETRY_DISABLED=1

# Encryption keys
ARG NEXT_PRIVATE_ENCRYPTION_KEY="CAFEBABE"
ENV NEXT_PRIVATE_ENCRYPTION_KEY="$NEXT_PRIVATE_ENCRYPTION_KEY"

ARG NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY="DEADBEEF"
ENV NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY="$NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY"

# Sub-path the app is served under (e.g. "/ESign"). Empty = root.
# Baked into the client bundle by Vite/React Router at build time; also
# required at runtime for SSR so window.__ENV__ exposes it to the client.
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH="$NEXT_PUBLIC_BASE_PATH"

# Telemetry credentials (optional, baked into image at build time)
ARG NEXT_PRIVATE_TELEMETRY_KEY=""
ENV NEXT_PRIVATE_TELEMETRY_KEY="$NEXT_PRIVATE_TELEMETRY_KEY"

ARG NEXT_PRIVATE_TELEMETRY_HOST=""
ENV NEXT_PRIVATE_TELEMETRY_HOST="$NEXT_PRIVATE_TELEMETRY_HOST"


# Uncomment and use build args to enable remote caching
# ARG TURBO_TEAM
# ENV TURBO_TEAM=$TURBO_TEAM
# ARG TURBO_TOKEN
# ENV TURBO_TOKEN=$TURBO_TOKEN

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json

COPY --from=builder /app/lingui.config.ts ./lingui.config.ts
COPY --from=builder /app/patches ./patches

# MODIFIED for BizRethink overlay 020: BuildKit cache mount on the npm cache
# directory. Reuses tarballs across rebuilds, cutting ~60-90s off repeat
# Coolify deploys when only application code changes (no lockfile churn).
# sharing=locked prevents concurrent build corruption. See overlays/020.
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci

# Then copy all the source code (as it changes more often)
COPY --from=builder /app/out/full/ .
# Finally copy the turbo.json file so that we can run turbo commands
COPY turbo.json turbo.json

# MODIFIED for BizRethink: raise Node heap during build (default 1GB is too small
# for monorepo tsc + react-router build), but CAP IT BELOW UPSTREAM'S 8192.
#
# Upstream raised this to 8192 in #3332. We deliberately do not follow: the
# Coolify host that builds this image has 8GB of RAM TOTAL, so permitting V8 to
# grow its heap to 8GB leaves nothing for the OS and reintroduces the silent
# build OOM that a 4GB VPS used to produce (buildx terminations do not reliably
# reach dmesg, so it presents as a generic build failure). Build peaks at ~4GB.
#
# If the Docker build ever dies on heap exhaustion, raise this incrementally --
# do not jump to 8192 on an 8GB box. See overlays/003.
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npx turbo run build --filter=@documenso/remix...

###########################
#     RUNNER CONTAINER    #
###########################
FROM base AS runner

ENV HUSKY=0
ENV DOCKER_OUTPUT=1

# Telemetry credentials (baked into image at build time, can be disabled at runtime)
ARG NEXT_PRIVATE_TELEMETRY_KEY=""
ENV NEXT_PRIVATE_TELEMETRY_KEY="$NEXT_PRIVATE_TELEMETRY_KEY"

ARG NEXT_PRIVATE_TELEMETRY_HOST=""
ENV NEXT_PRIVATE_TELEMETRY_HOST="$NEXT_PRIVATE_TELEMETRY_HOST"

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

USER nodejs

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/out/json/ .
# Copy the tailwind config files across
COPY --from=builder --chown=nodejs:nodejs /app/out/full/packages/tailwind-config ./packages/tailwind-config
# Copy the patches across
COPY --from=builder --chown=nodejs:nodejs /app/patches ./patches

RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Strip build-time residue that ships as production dependencies but is never
# executed at runtime.
RUN rm -rf \
    node_modules/react-email/dist/cli \
    node_modules/esbuild \
    node_modules/@esbuild \
    node_modules/.bin/esbuild \
    node_modules/.bin/email

# Automatically leverage output traces to reduce image size
# https://nodejs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nodejs:nodejs /app/apps/remix/build ./apps/remix/build
COPY --from=installer --chown=nodejs:nodejs /app/apps/remix/public ./apps/remix/public

# Copy the prisma binary, schema and migrations
COPY --from=installer --chown=nodejs:nodejs /app/packages/prisma/schema.prisma ./packages/prisma/schema.prisma
COPY --from=installer --chown=nodejs:nodejs /app/packages/prisma/migrations ./packages/prisma/migrations

# BIZRETHINK overlay 070: ship the vendored statutes.
#
# packages/bizrethink/mca/sources/ holds the primary text every MCA disclosure
# spec was transcribed from. `verifyProvenance` re-reads those files on every
# run and re-hashes them: a verification date means "these bytes have not moved
# since we checked", and without the bytes it means nothing.
#
# The runner stage copies only the built app, so the sources were absent from
# the image. /admin/mca would report SOURCE MISSING for all eleven states in
# production while being green locally -- the page telling the truth about a
# gap it had itself created.
#
# 764K of text. Kept out of the build stages deliberately: nothing compiles
# them, they are read at request time.
COPY --from=installer --chown=nodejs:nodejs /app/packages/bizrethink/mca/sources ./packages/bizrethink/mca/sources

# Generate the prisma client again, this time only targeting the client generator
RUN npx prisma generate --schema ./packages/prisma/schema.prisma --generator client \
    && npm cache clean --force


# Get the start script from docker/
COPY --chown=nodejs:nodejs ./docker/start.sh /app/apps/remix/start.sh

WORKDIR /app/apps/remix

# MODIFIED for BizRethink overlay 031: container-level health check.
# Hits /api/health which probes DB connectivity + cert status. Returns
# 500 if DB unreachable; 200 otherwise (cert missing is "warning",
# acceptable on fresh installs). Targets 127.0.0.1 explicitly because
# busybox wget on Alpine can prefer IPv6 from 'localhost' but the
# Node server binds 0.0.0.0 (IPv4 only). 60s start period covers
# prisma migrate deploy + Remix boot. See overlays/031 for details.
HEALTHCHECK --start-period=60s --interval=30s --timeout=10s --retries=3 \
  CMD wget --spider --quiet http://127.0.0.1:3000/api/health || exit 1

CMD ["sh", "start.sh"]
