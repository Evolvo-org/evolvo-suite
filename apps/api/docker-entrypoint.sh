#!/usr/bin/env sh
set -eu

pnpm --filter @repo/db migrate:deploy

exec node apps/api/dist/src/main.js