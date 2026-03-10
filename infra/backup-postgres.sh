#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
compose_file="$script_dir/docker-compose.yml"
env_file="$script_dir/.env"
backup_dir="${BACKUP_DIR:-$script_dir/backups}"
timestamp=$(date -u +%Y%m%dT%H%M%SZ)

if [[ ! -f "$env_file" ]]; then
  echo "Missing $env_file. Copy infra/.env.example to infra/.env and fill in production values." >&2
  exit 1
fi

mkdir -p "$backup_dir"

set -a
source "$env_file"
set +a

output_file="$backup_dir/postgres-$timestamp.sql.gz"

docker compose \
  --env-file "$env_file" \
  -f "$compose_file" \
  exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$output_file"

echo "Wrote backup to $output_file"
