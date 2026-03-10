# Infrastructure

This directory contains the self-hosted deployment stack for Evolvo.

## Files

- `docker-compose.yml` - production stack for Caddy, web, API, and PostgreSQL
- `Caddyfile` - TLS termination and reverse proxy rules
- `.env.example` - production environment template
- `deploy.sh` - rebuild and restart the stack
- `backup-postgres.sh` - create a compressed PostgreSQL backup
- `restore-postgres.md` - restore procedure for PostgreSQL backups

## First deployment

1. Copy `.env.example` to `.env` and fill in real production values.
2. Point DNS for `WEB_DOMAIN` and `API_DOMAIN` at the target server.
3. Run `./infra/deploy.sh`.
4. Verify:
   - `https://<WEB_DOMAIN>/health`
   - `https://<API_DOMAIN>/<API_PREFIX>/health`

## Notes

- The API container runs Prisma deploy migrations on startup.
- The web build bakes in `NEXT_PUBLIC_API_BASE_URL`, so rebuild the web image if that value changes.
- The local runtime remains outside this stack and should point at the hosted API URL.
