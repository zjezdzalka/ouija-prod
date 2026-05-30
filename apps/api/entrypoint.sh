#!/bin/sh
set -e

echo "Running database migration (prisma db push)..."
npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss

echo "Starting server..."
exec node dist/server.js
