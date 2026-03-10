# Evolvo v2 Architecture

## Topology

Evolvo v2 consists of three apps:

- `apps/web`
- `apps/api`
- `apps/runtime`

And a set of shared packages.

## Application responsibilities

## `apps/web`
Next.js application.
Hosted online.

Responsibilities:
- admin session UI
- project dashboard
- planning hierarchy UI
- kanban board UI
- logs and runtime visibility UI
- usage visibility UI
- websocket client
- TanStack Query integration

Non-responsibilities:
- no direct DB access
- no Prisma access
- no business logic source of truth
- no workflow rule ownership

## `apps/api`
NestJS application.
Hosted online.

Responsibilities:
- database access via Prisma
- business logic
- workflow state machine
- scheduler and lease engine
- admin session enforcement
- runtime coordination
- event broadcasting
- audit logging
- release metadata persistence
- usage tracking

This is the single backend authority.

## `apps/runtime`
Local daemon/worker.

Responsibilities:
- repo clone and sync
- branch management
- worktree management
- agent execution
- build, lint, typecheck, test
- PR and merge support
- release execution
- heartbeat and result reporting

Non-responsibilities:
- no orchestration source of truth
- no local-only state that the platform depends on
- no direct human-facing control plane

## Data flow

### Web flow
1. Web preloads page data from API.
2. API returns typed DTOs.
3. Web hydrates TanStack Query cache.
4. Components read using `useQuery`.
5. Mutations go back through API.
6. Websocket events invalidate relevant queries.

### Runtime flow
1. Runtime registers with API.
2. Runtime sends heartbeats.
3. Runtime requests or receives leased jobs.
4. Runtime performs execution.
5. Runtime reports progress, logs, artifacts, and final result.
6. API updates state and broadcasts events.

## Frontend data rules

### TanStack Query requirements
Use TanStack Query for:
- GET
- POST
- PATCH
- DELETE
- filtered lists
- board state
- logs
- usage
- runtime state
- settings

### Page-loading rules
Every page should preload the data required for first render.
After hydration, components should read with `useQuery`.

### Mutation rules
Mutations use `useMutation` and must hit the NestJS API.
Do not bypass this with direct database access.

## Shared package layout

Recommended package structure:

- `packages/ui`
- `packages/api-client`
- `packages/db`
- `packages/domain`
- `packages/orchestration`
- `packages/agents`
- `packages/git`
- `packages/worktrees`
- `packages/realtime`
- `packages/validation`
- `packages/logger`
- `packages/shared`

## Package responsibilities

## `packages/ui`
Shared Tailwind component library.
One component per file.

## `packages/api-client`
Typed API client for web and optionally runtime helpers.
Contains:
- query key definitions
- fetch wrappers
- mutation wrappers
- request/response types
- hydration helpers

## `packages/db`
Prisma schema and migrations.
Used by API only.

## `packages/domain`
Domain enums, state machines, and workflow rules.

## `packages/orchestration`
Scheduler logic, queue caps, fairness rules, retry logic, lease helpers.

## `packages/agents`
Agent interfaces, provider adapters, prompt composition, structured agent outputs.

## `packages/git`
Git utilities for branch, merge, tag, PR support.

## `packages/worktrees`
Worktree lifecycle management and reconciliation logic.

## `packages/realtime`
Websocket contracts and event definitions.

## `packages/validation`
Zod schemas for DTOs, commands, and agent outputs.

## Architectural constraints

1. Only the API talks to the database.
2. Only the API decides workflow validity.
3. Only the runtime performs repository execution.
4. All durable system state lives in the database.
5. All queueing and leasing is database-backed.
6. Realtime events are derived from persisted state changes.
7. The web UI must remain usable even if the runtime is offline.

## Failure model

The system must assume:
- the runtime may be offline
- the web may reconnect after stale state
- the API may need to recover incomplete leases
- tasks may be interrupted mid-run
- worktrees may become stale or dirty

The architecture must support recovery without state loss.
