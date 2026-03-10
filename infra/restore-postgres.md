# PostgreSQL Restore

## Prerequisites

- The production stack is available on the target server.
- `infra/.env` contains the correct production database credentials.
- You have a compressed SQL backup produced by `infra/backup-postgres.sh`.

## Restore steps

0. Load the production environment values into your shell.

```bash
set -a
source infra/.env
set +a
```

1. Stop the API so it cannot write while the restore is running.

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml stop api
```

2. Copy the backup file to the server if needed.

3. Drop and recreate the public schema inside the running database.

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
```

4. Restore the backup.

```bash
gzip -dc /path/to/postgres-backup.sql.gz | \
  docker compose --env-file infra/.env -f infra/docker-compose.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

5. Start the API again.

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml start api
```

6. Verify health.

```bash
curl -f https://$API_DOMAIN/$API_PREFIX/health
curl -f https://$WEB_DOMAIN/health
```

## Notes

- The API container runs `pnpm --filter @repo/db migrate:deploy` on startup, so schema migrations are reapplied automatically when the API starts.
- Restoring over an existing production database is destructive. Validate that you are targeting the correct environment before running the schema reset.