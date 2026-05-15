#!/bin/sh
set -e

# Ensure data directory exists (mounted volume)
mkdir -p /data

# Apply migrations if any exist; otherwise push schema (dev convenience)
if [ -d /app/prisma/migrations ] && [ "$(ls -A /app/prisma/migrations 2>/dev/null)" ]; then
  echo "[entrypoint] Running prisma migrate deploy"
  npx prisma migrate deploy
else
  echo "[entrypoint] No migrations found — running prisma db push"
  npx prisma db push --skip-generate
fi

exec "$@"
