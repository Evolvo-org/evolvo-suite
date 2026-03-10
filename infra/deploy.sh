#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
compose_file="$script_dir/docker-compose.yml"
env_file="$script_dir/.env"

if [[ ! -f "$env_file" ]]; then
  echo "Missing $env_file. Copy infra/.env.example to infra/.env and fill in production values." >&2
  exit 1
fi

docker compose \
  --env-file "$env_file" \
  -f "$compose_file" \
  up -d --build --remove-orphans "$@"

docker compose \
  --env-file "$env_file" \
  -f "$compose_file" \
  ps
