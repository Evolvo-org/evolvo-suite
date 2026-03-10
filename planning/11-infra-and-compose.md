# Evolvo v2 Infrastructure and Docker Compose Plan

## Purpose

This document defines the production hosting and deployment plan for Evolvo v2 on a self-hosted server using Docker.

The goal is to run the hosted parts of the system on a single self-managed server, with HTTPS, reverse proxying, container isolation, persistent storage, and a clean deployment path.

## Deployment model

Evolvo v2 has three major runtime surfaces:

- `apps/web` -> hosted on the self-hosted server
- `apps/api` -> hosted on the self-hosted server
- `apps/runtime` -> runs locally on the operator machine and is **not** deployed on the server

## Public domains

Using `domain.com` as the example:

- website: `https://domain.com`
- api: `https://api.domain.com`

## Core principle

The self-hosted server is responsible for hosting the public control plane and the primary database.

That means:

- the web app is hosted publicly
- the API is hosted publicly
- PostgreSQL is hosted privately on the same server
- reverse proxy and TLS are hosted publicly
- the local runtime worker is not hosted publicly
- the server must keep durable state for database and certificates
- internal services must not be exposed publicly unless explicitly required

---

# Infrastructure goals

## Primary goals

- deploy with Docker
- terminate TLS with Caddy
- expose `domain.com` and `api.domain.com`
- run PostgreSQL on the same server
- isolate services with Docker networking
- keep deployment reproducible
- support controlled updates
- support health checks, restart policies, and persistence
- support future scaling without redesigning the app architecture

## Secondary goals

- keep the initial setup simple
- minimise operational complexity
- avoid coupling the hosted server to local runtime execution
- keep secrets out of image builds
- support future supporting services such as Redis if needed

---

# Recommended server topology

## Public-facing services

These services should run on the server and be reachable through Caddy:

- `caddy`
- `web`
- `api`

## Internal-only services

These services should run on the server but **must not** be publicly exposed:

- `postgres`
- `redis` if used later for cache, rate limiting, websocket adapter, or queue support

## Not hosted on the server

The following remain local to the operator machine:

- `apps/runtime`
- local git execution
- worktree management
- local agent execution
- release workspace execution

Those components connect outbound to `https://api.domain.com`.

---

# Recommended production architecture

## Hosted on the self-hosted server

- Caddy
- Web container
- API container
- PostgreSQL container
- optional Redis container

## Hosted elsewhere

- Stripe
- external email provider if introduced later
- optional external object storage later if needed

## Running on the operator machine

- Evolvo runtime daemon

This preserves the design principle that the API is the hosted control plane, while the runtime remains a separate local execution worker.

---

# DNS requirements

Create the following DNS records:

- `A domain.com -> <server-ip>`
- `A api.domain.com -> <server-ip>`

If using IPv6, also add:

- `AAAA domain.com -> <server-ipv6>`
- `AAAA api.domain.com -> <server-ipv6>`

Caddy will use these to serve the correct hosts and obtain certificates automatically.

---

# Network design

## Docker networks

Use at least two Docker networks:

### `public`
Used by:
- `caddy`

### `internal`
Used by:
- `caddy`
- `web`
- `api`
- `postgres`
- `redis` if present

## Rules

- only Caddy binds ports on the host
- web and api are reachable from Caddy over the internal network
- postgres must not bind a public port
- redis must not bind a public port
- internal services should communicate by Docker service name

Example internal URLs:

- web: `http://web:3000`
- api: `http://api:3001`
- postgres: `postgresql://postgres:5432/...`
- redis: `redis://redis:6379`

---

# Reverse proxy and TLS

## Caddy responsibilities

Caddy should handle:

- automatic HTTPS
- HTTP to HTTPS redirects
- reverse proxy to web and api containers
- compression
- request logging
- basic hardening headers

## Routing

### `domain.com`
Route all traffic to the Next.js web container.

### `api.domain.com`
Route all traffic to the NestJS API container.

## Example routing intent

- `https://domain.com/*` -> `web:3000`
- `https://api.domain.com/*` -> `api:3001`

---

# Container layout

## `caddy`
Responsibilities:
- TLS termination
- reverse proxy
- access logs
- optional security headers

## `web`
Responsibilities:
- serve Next.js production app
- render operator interface
- call the API over the public API URL

## `api`
Responsibilities:
- serve NestJS API
- connect to PostgreSQL
- expose websocket connections if applicable
- expose health endpoints
- coordinate hosted state

## `postgres`
Responsibilities:
- primary relational database
- persistent durable state for Evolvo v2
- private internal-only service

## `redis` (optional)
Responsibilities:
- cache
- websocket adapter later if needed
- rate limiting support
- future queue/light async support

---

# Database strategy

## Production database decision

PostgreSQL will run on the same self-hosted server in Docker.

This means:

- the API connects to Postgres over the internal Docker network
- Postgres data must use a persistent Docker volume or mounted disk path
- backup and restore procedures are mandatory
- Postgres must never be exposed publicly by default

## Postgres requirements

- version pinned explicitly
- internal-only network access
- persistent storage
- health checks
- restart policy
- backup routine
- restore documentation
- disk monitoring

## Postgres connectivity example

The API should use an internal connection string such as:

`postgresql://evolvo:<password>@postgres:5432/evolvo`

---

# Environment model

## Shared production environment variables

These should be injected at runtime, not baked into images.

### Web
- `NODE_ENV=production`
- `PORT=3000`
- `NEXT_PUBLIC_APP_URL=https://domain.com`
- `NEXT_PUBLIC_API_URL=https://api.domain.com`

### API
- `NODE_ENV=production`
- `PORT=3001`
- `DATABASE_URL=postgresql://evolvo:${POSTGRES_PASSWORD}@postgres:5432/evolvo`
- `CORS_ORIGIN=https://domain.com`
- `APP_URL=https://domain.com`
- `API_URL=https://api.domain.com`
- `JWT_SECRET=...`
- `STRIPE_SECRET_KEY=...`
- `STRIPE_WEBHOOK_SECRET=...`
- `REDIS_URL=redis://redis:6379` if Redis is enabled

### Postgres
- `POSTGRES_DB=evolvo`
- `POSTGRES_USER=evolvo`
- `POSTGRES_PASSWORD=...`

### Caddy
Usually no environment variables are needed beyond optional email or config substitutions.

---

# Volume strategy

## Persistent volumes

Use volumes for:

- Caddy data
- Caddy config
- PostgreSQL data
- optional Redis data
- optional local file storage if the API stores artifacts on disk

## Recommendations

### Caddy
Persist:
- certificates
- ACME account state

### PostgreSQL
Persist:
- full database data directory

### API
Do not rely on local disk for critical state unless specifically planned.
Prefer the database for metadata and durable state.

---

# Health and restart strategy

## Health endpoints

The following endpoints should exist:

### Web
- `/health` or equivalent lightweight readiness endpoint

### API
- `/health`

### Postgres
Use `pg_isready`

### Redis
Use `redis-cli ping` if present

## Compose restart policy

All production containers should use:
- `restart: unless-stopped`

## Healthcheck requirement

Add Docker health checks for:
- web
- api
- postgres
- redis if used

Caddy does not strictly require one, but one may be added if desired.

---

# Build and deployment strategy

## Preferred image strategy

Use container images for:
- web
- api

Use official images for:
- caddy
- postgres
- redis

## Initial practical deployment approach

For early production:

1. pull latest code on the server
2. build web and api images via Docker Compose
3. run database migrations
4. restart affected services
5. verify health

## Better later approach

Later, move to:
- CI builds versioned images
- registry push
- server pulls tagged images
- compose restart with immutable tags

---

# Docker Compose responsibilities

The compose setup should:

- define all services
- define networks
- define volumes
- define restart policies
- define health checks
- provide one command to bring the stack up
- provide one command to rebuild and restart it
- ensure postgres starts before the API is considered ready

---

# Suggested repository layout for infra

Recommended structure:

- `infra/docker-compose.yml`
- `infra/docker-compose.prod.yml` if overrides are needed later
- `infra/Caddyfile`
- `infra/.env.example`
- `infra/deploy.sh`
- `infra/backup-postgres.sh`
- `infra/restore-postgres.md`

---

# Example Docker Compose design

This is a planning example of the intended stack shape.

```yaml
version: "3.9"

services:
  caddy:
    image: caddy:2
    container_name: evolvo-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - caddy_data:/data
      - caddy_config:/config
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    depends_on:
      - web
      - api
    networks:
      - public
      - internal

  web:
    build:
      context: ..
      dockerfile: apps/web/Dockerfile
    container_name: evolvo-web
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      NEXT_PUBLIC_APP_URL: https://domain.com
      NEXT_PUBLIC_API_URL: https://api.domain.com
    expose:
      - "3000"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 5
    networks:
      - internal

  api:
    build:
      context: ..
      dockerfile: apps/api/Dockerfile
    container_name: evolvo-api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://evolvo:${POSTGRES_PASSWORD}@postgres:5432/evolvo
      CORS_ORIGIN: https://domain.com
      APP_URL: https://domain.com
      API_URL: https://api.domain.com
      JWT_SECRET: ${JWT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    expose:
      - "3001"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/health"]
      interval: 30s
      timeout: 5s
      retries: 5
    networks:
      - internal

  postgres:
    image: postgres:16-alpine
    container_name: evolvo-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: evolvo
      POSTGRES_USER: evolvo
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    expose:
      - "5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U evolvo -d evolvo"]
      interval: 30s
      timeout: 5s
      retries: 5
    networks:
      - internal

  redis:
    image: redis:7-alpine
    container_name: evolvo-redis
    restart: unless-stopped
    expose:
      - "6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 5s
      retries: 5
    networks:
      - internal

volumes:
  caddy_data:
  caddy_config:
  postgres_data:
  redis_data:

networks:
  public:
  internal:
````

If you are not using Redis yet, it can be removed from the initial compose setup.

---

# Example Caddyfile design

```caddy
domain.com {
    encode zstd gzip
    reverse_proxy web:3000
}

api.domain.com {
    encode zstd gzip
    reverse_proxy api:3001
}
```

This is the minimum shape.
Later hardening can add:

* security headers
* logging blocks
* request size limits
* rate limiting in front of the API if needed

---

# Dockerfile expectations

## Web Dockerfile

The web Dockerfile should:

* build the Next.js app in production mode
* run the standalone or production output
* keep image size reasonable
* avoid bundling dev dependencies unnecessarily

## API Dockerfile

The API Dockerfile should:

* build the NestJS app
* run the compiled production output
* run Prisma generation where needed
* avoid shipping unnecessary dev dependencies

## General rules

* multi-stage builds preferred
* production images should be small and explicit
* health endpoint must be available after startup
* secrets must not be copied into the image

---

# Database migration strategy

## Requirement

Database migrations must be part of deployment.

## Recommended approach

One of these should be used:

### Option A

Run Prisma migrations manually during deploy:

* build images
* start postgres
* run migration command against api container
* start or restart api

### Option B

Use an API startup entrypoint that waits for Postgres and runs safe production migrations before starting the server

## Rule

Do not rely on schema drift or ad hoc manual database changes.

---

# Security baseline

## Server security expectations

* SSH key auth only
* firewall enabled
* only ports 80 and 443 publicly open
* optional restricted SSH policy
* automatic security updates where appropriate
* Docker daemon access restricted to admin users only

## Container security expectations

* do not expose postgres publicly
* do not expose redis publicly
* do not hardcode secrets into images
* prefer non-root containers where practical
* keep dependencies patched
* use explicit image tags where possible

## App security expectations

* API CORS restricted to `https://domain.com`
* secure cookie/auth settings in production
* HTTPS only
* input validation at API boundary
* rate limiting may be added later if needed

---

# Websocket considerations

If the API uses websockets, Caddy must proxy upgrade requests correctly.
Caddy handles websocket proxying automatically in standard reverse proxy setups.

The web app should connect to:

* `wss://api.domain.com/...`

The API remains the websocket authority.

---

# Runtime connectivity considerations

The local runtime must connect outbound to:

* `https://api.domain.com`

No inbound port needs to be opened on the operator machine.

The runtime should authenticate against the API and communicate over HTTPS only.

---

# Logging strategy

## Minimum logging requirements

### Caddy

* access logs
* error logs

### API

* request logs
* application logs
* structured error logs
* scheduler and runtime interaction logs

### Web

* startup logs
* server runtime errors where relevant

### Postgres

Use container logs and database health monitoring.
Do not expose Postgres externally for convenience.

### Runtime

Not hosted here, but should send structured events back to the API.

## Recommendation

Prefer storing important durable logs and events in Evolvo’s observability model rather than relying only on ephemeral container logs.

---

# Deployment flow

## First deployment

1. Provision Linux server
2. Install Docker and Docker Compose plugin
3. Configure firewall
4. Point DNS for `domain.com` and `api.domain.com`
5. Copy infra files to server
6. Create production `.env`
7. Start the stack
8. Run database migrations
9. Verify:

   * `https://domain.com`
   * `https://api.domain.com/health`
   * valid TLS certificates
   * API can connect to Postgres
   * web can reach API

## Update deployment

For the initial version:

1. pull latest code
2. rebuild changed images
3. run migrations
4. restart affected services
5. verify health endpoints
6. inspect logs if needed

Example flow:

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

---

# Backup and recovery

## What must be backed up

At minimum:

* production `.env`
* Caddy data volume
* PostgreSQL data
* optional Redis data if operationally valuable
* any local file-based artifacts if those exist

## PostgreSQL backup requirement

A real backup routine is mandatory.

Recommended options:

* nightly `pg_dump`
* periodic full volume or filesystem snapshot
* off-server backup copy
* tested restore process

## Recovery priority

1. restore server access
2. restore env and infra config
3. restore Caddy certificates/state if needed
4. restore Postgres data
5. start API
6. start web
7. validate runtime can reconnect later

Because Postgres is hosted on the same server, database backup quality is critical.

---

# Monitoring and operations

## Minimum operational checks

* web container healthy
* api container healthy
* postgres healthy
* Caddy serving valid TLS
* runtime heartbeat visible in app
* disk usage under control
* database volume usage monitored
* memory pressure acceptable

## Future enhancements

Later, you may add:

* uptime checks
* metrics collection
* alerting
* log shipping
* container auto-update tooling
* separate backup monitoring
* replica or managed DB migration if growth requires it

---

# Constraints and non-goals

## Constraints

* use Docker
* use Caddy
* website on `domain.com`
* API on `api.domain.com`
* PostgreSQL on the same self-hosted server
* self-hosted control plane
* runtime remains local
* architecture must stay aligned with the planning docs

## Non-goals for initial infra

* Kubernetes
* multi-node clustering
* autoscaling
* distributed runtime execution from the server
* public database exposure
* premature infrastructure abstraction

---

# Infrastructure acceptance criteria

The infrastructure setup is successful when:

* `domain.com` serves the web app over HTTPS
* `api.domain.com` serves the API over HTTPS
* Caddy manages certificates automatically
* web and api run in Docker containers
* PostgreSQL runs on the same server in Docker with persistent storage
* postgres is not exposed publicly
* internal services are not unnecessarily exposed publicly
* the API can connect to its production Postgres instance
* deployments can be repeated consistently
* the local runtime can connect to the hosted API securely
* restart or server reboot does not require manual reconfiguration
* database backup and restore procedures exist
