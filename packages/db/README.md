# @repo/db

Prisma schema and migrations for Evolvo v2.

## Local development

1. Start a PostgreSQL instance.
2. Set `DATABASE_URL` for `apps/api`.
3. Generate the Prisma client:
   - `pnpm --filter @repo/db generate`
4. Apply migrations:
   - `pnpm --filter @repo/db migrate:dev`

The API remains the only service allowed to import this package.
