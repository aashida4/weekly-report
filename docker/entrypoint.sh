#!/bin/sh
set -e

# Ensure data directory exists (mounted volume)
mkdir -p /data

# Invoke the Prisma CLI directly via node so __dirname resolves to
# node_modules/prisma/build (where the WASM assets live), rather than
# going through .bin/prisma which the Dockerfile copies as a plain file.
PRISMA="node /app/node_modules/prisma/build/index.js"

if [ -d /app/prisma/migrations ] && [ "$(ls -A /app/prisma/migrations 2>/dev/null)" ]; then
  echo "[entrypoint] Running prisma migrate deploy"
  $PRISMA migrate deploy
else
  echo "[entrypoint] No migrations found — running prisma db push"
  $PRISMA db push --skip-generate
fi

exec "$@"
