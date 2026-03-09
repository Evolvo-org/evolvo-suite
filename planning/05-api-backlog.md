# API Backlog

## Goal

Build a NestJS API that acts as the only backend authority for Evolvo v2.

## API-001 - Create NestJS app shell
**Status:** done  
**Outcome:** A bootable NestJS app exists with configuration loading, health endpoint, module boundaries, and environment validation.

Tasks:
- [x] Create NestJS app in `apps/api`
- [x] Add config module and env validation
- [x] Add `/health` endpoint
- [x] Add base error filter strategy
- [x] Add logging bootstrap
- [x] Add versioned API prefix

## API-002 - Add Prisma integration
**Status:** done  
**Outcome:** The API can connect to the cloud database via Prisma.

Tasks:
- [x] Add Prisma package usage from `packages/db`
- [x] Create Prisma service for Nest
- [x] Add app lifecycle hooks for clean shutdown
- [x] Add migration execution strategy
- [x] Add local dev DB instructions

## API-003 - Establish module boundaries
**Status:** done  
**Outcome:** Domain modules exist with clear ownership.

Modules:
- auth
- users
- projects
- planning
- workflow
- scheduler
- runtime
- worktrees
- agents
- releases
- usage
- billing
- realtime
- logs

Tasks:
- [x] Create initial module structure
- [x] Define import rules
- [x] Prevent circular coupling

## API-004 - Create contract DTO layer
**Status:** done  
**Outcome:** Request and response DTOs are typed and shared.

Tasks:
- [x] Define shared DTO patterns
- [x] Use zod or class-validator consistently
- [x] Create paginated response types
- [x] Create standard mutation response type
- [x] Export DTOs for `packages/api-client`

## API-005 - Implement auth foundation
**Status:** todo  
**Outcome:** API supports authenticated access and role checks.

Tasks:
- [ ] Add auth module
- [ ] Add session/token strategy
- [ ] Add current-user endpoint
- [ ] Add role guards
- [ ] Add admin bypass rules

## API-006 - Implement project CRUD
**Status:** done  
**Outcome:** Projects can be created, viewed, updated, started, and stopped.

Tasks:
- [x] Create project create endpoint
- [x] Create project list endpoint
- [x] Create project detail endpoint
- [x] Create project update endpoint
- [x] Create project start endpoint
- [x] Create project stop endpoint
- [x] Create project status endpoint

## API-007 - Add repository configuration endpoints
**Status:** done  
**Outcome:** Project repositories and runtime-relevant repo settings are persisted.

Tasks:
- [x] Add repository config model
- [x] Add repository create/update endpoints
- [x] Add branch config fields
- [x] Add repo validation endpoint

## API-008 - Add product spec endpoints
**Status:** done  
**Outcome:** Product descriptions can be created and updated.

Tasks:
- [x] Create product spec get endpoint
- [x] Create product spec upsert endpoint
- [x] Add spec version support if needed
- [x] Add validation rules

## API-009 - Add development plan endpoints
**Status:** done  
**Outcome:** Development plans are versioned and editable.

Tasks:
- [x] Create plan create endpoint
- [x] Create plan update endpoint
- [x] Create plan version list endpoint
- [x] Create active plan selection endpoint

## API-010 - Add hierarchy endpoints
**Status:** done  
**Outcome:** Epics, tasks, and subtasks are queryable and mutable.

Tasks:
- [x] Create epic CRUD endpoints
- [x] Create work item CRUD endpoints
- [x] Add parent-child relationship validation
- [x] Add acceptance criteria CRUD
- [x] Add dependency update endpoint
- [x] Add priority update endpoint

## API-011 - Add kanban board endpoints
**Status:** done  
**Outcome:** Board data can be queried and mutated through workflow rules.

Tasks:
- [x] Create board query endpoint
- [x] Create work item transition endpoint
- [x] Create board counts endpoint
- [x] Add drag/drop mutation contract
- [x] Add invalid transition error responses

## API-012 - Implement workflow state machine service
**Status:** done  
**Outcome:** The API centrally validates all state transitions.

Tasks:
- [x] Define allowed transitions
- [x] Add operator-only transitions
- [x] Add transition audit logging
- [x] Add transition reason requirements where needed
- [x] Add service-level tests

## API-013 - Add comments and audit trail endpoints
**Status:** todo  
**Outcome:** Work items support comments and the system keeps audit trails.

Tasks:
- [ ] Add work item comment create endpoint
- [ ] Add work item comment list endpoint
- [ ] Add audit trail query endpoint
- [ ] Add system actor support for agent comments

## API-014 - Add queue limits configuration
**Status:** todo  
**Outcome:** System defaults and per-project overrides can be stored and read.

Tasks:
- [ ] Create queue limit schema
- [ ] Add defaults endpoint
- [ ] Add project override endpoint
- [ ] Add effective settings calculation

## API-015 - Build scheduler lease system
**Status:** todo  
**Outcome:** Work can be leased safely and durably.

Tasks:
- [ ] Create lease model
- [ ] Add lease acquisition service
- [ ] Add lease expiration handling
- [ ] Add lease renewal endpoint
- [ ] Add lease recovery process

## API-016 - Build runtime registration and heartbeat
**Status:** todo  
**Outcome:** Runtimes can register and report health.

Tasks:
- [ ] Add runtime register endpoint
- [ ] Add runtime heartbeat endpoint
- [ ] Add runtime detail query
- [ ] Add last-seen tracking
- [ ] Add offline detection

## API-017 - Add runtime work dispatch
**Status:** todo  
**Outcome:** The runtime can ask for work and receive leased jobs.

Tasks:
- [ ] Add request-work endpoint
- [ ] Add runtime job result endpoint
- [ ] Add runtime progress update endpoint
- [ ] Add runtime artifact upload metadata endpoint

## API-018 - Add worktree persistence endpoints
**Status:** todo  
**Outcome:** Worktree lifecycle is stored centrally.

Tasks:
- [ ] Add worktree create/update endpoints
- [ ] Add worktree status query
- [ ] Add worktree cleanup endpoint
- [ ] Add stale worktree mark endpoint

## API-019 - Add agent run persistence
**Status:** todo  
**Outcome:** Every agent action is durably recorded.

Tasks:
- [ ] Add agent run create path
- [ ] Add agent decision record
- [ ] Add agent failure record
- [ ] Add prompt snapshot record
- [ ] Add run artifact record

## API-020 - Add review gate persistence
**Status:** todo  
**Outcome:** Build, lint, typecheck, test, and criteria results are recorded structurally.

Tasks:
- [ ] Add gate result schema
- [ ] Add gate result report endpoint
- [ ] Add gate summary query
- [ ] Add criteria evaluation report fields

## API-021 - Add release endpoints
**Status:** todo  
**Outcome:** Release attempts, versions, tags, and notes are stored.

Tasks:
- [ ] Add release start endpoint
- [ ] Add release result endpoint
- [ ] Add version record endpoint
- [ ] Add release notes storage
- [ ] Add release history query

## API-022 - Add human intervention endpoints
**Status:** todo  
**Outcome:** Blocked work can be escalated and managed.

Tasks:
- [ ] Add intervention create endpoint
- [ ] Add intervention list endpoint
- [ ] Add intervention resolve endpoint
- [ ] Add suggested action fields
- [ ] Add retry-from-intervention flow

## API-023 - Add usage tracking endpoints
**Status:** todo  
**Outcome:** Token and cost events are tracked from day one.

Tasks:
- [ ] Add token usage event endpoint
- [ ] Add model/provider metadata support
- [ ] Add project usage aggregation query
- [ ] Add user usage aggregation query
- [ ] Add cost estimate calculation

## API-024 - Add billing endpoints
**Status:** todo  
**Outcome:** Stripe sandbox billing scaffolding is present.

Tasks:
- [ ] Add stripe customer mapping
- [ ] Add subscription status query
- [ ] Add billing portal/session support
- [ ] Add admin bypass logic
- [ ] Add webhook handling

## API-025 - Add websocket gateway
**Status:** todo  
**Outcome:** The API can push system events to the web app.

Tasks:
- [ ] Add realtime gateway
- [ ] Define event names
- [ ] Add project-scoped event publishing
- [ ] Add authentication for sockets
- [ ] Add query invalidation mapping notes

## API-026 - Add structured logging and audit events
**Status:** todo  
**Outcome:** System actions are queryable and traceable.

Tasks:
- [ ] Add structured log schema
- [ ] Add log write service
- [ ] Add system log query
- [ ] Add project log query
- [ ] Add request correlation id support

## API-027 - Add comprehensive tests
**Status:** todo  
**Outcome:** Core API behaviour is protected by tests.

Tasks:
- [ ] Unit test workflow state machine
- [ ] Unit test lease behaviour
- [ ] Unit test queue limit logic
- [ ] Integration test project lifecycle
- [ ] Integration test runtime lifecycle
- [ ] Integration test release lifecycle