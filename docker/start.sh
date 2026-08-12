#!/bin/sh

# 🚀 Starting Documenso...
printf "🚀 Starting Documenso...\n\n"

# 🔐 Check certificate configuration
printf "🔐 Checking certificate configuration...\n"

CERT_PATH="${NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH:-/opt/documenso/cert.p12}"

if [ -f "$CERT_PATH" ] && [ -r "$CERT_PATH" ]; then
    printf "✅ Certificate file found and readable - document signing is ready!\n"
else
    printf "⚠️ Certificate not found or not readable\n"
    printf "💡 Tip: Documenso will still start, but document signing will be unavailable\n"
    printf "🔧 Check: http://localhost:3000/api/certificate-status for detailed status\n"
fi

printf "\n📚 Useful Links:\n"
printf "📖 Documentation: https://docs.documenso.com\n"
printf "🐳 Self-hosting guide: https://docs.documenso.com/developers/self-hosting\n"
printf "🔐 Certificate setup: https://docs.documenso.com/developers/self-hosting/signing-certificate\n"
printf "🏥 Health check: http://localhost:3000/api/health\n"
printf "📊 Certificate status: http://localhost:3000/api/certificate-status\n"
printf "👥 Community: https://github.com/documenso/documenso\n\n"

printf "🗄️  Running database migrations...\n"
npx prisma migrate deploy --schema ../../packages/prisma/schema.prisma

printf "🌟 Starting Documenso server...\n"
# MODIFIED for BizRethink (overlay 033): --import loads Sentry
# instrumentation BEFORE main.js is evaluated, ensuring Sentry can hook
# Node's HTTP/exception handlers before other modules load them. Init
# is a no-op unless NEXT_PRIVATE_SENTRY_DSN is set, so this is harmless
# on fresh installs without Sentry configured.
#
# NODE_ENV=production (overlay 033 amend, 2026-08-12): upstream's `npm run start`
# set this via cross-env; when overlay 033 replaced that invocation with a raw
# `node --import`, it was dropped. Without it, Node resolves react-router's
# `development` export condition and serves the DEV build in production — every
# 404 logs a ~10-line stack trace, amplifying scanner noise ~10x. Guarded by
# packages/bizrethink/regression-tests/docker-start-node-env.test.ts.
NODE_ENV=production HOSTNAME=0.0.0.0 node --import ./build/server/instrument.mjs build/server/main.js
