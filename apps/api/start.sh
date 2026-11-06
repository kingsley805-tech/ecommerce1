#!/usr/bin/env sh
set -e
npx prisma migrate deploy --schema prisma/schema.prisma
npx tsx apps/api/src/index.ts
