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
**Status:** done  
**Outcome:** API supports authenticated access and role checks.

Tasks:
- [x] Add auth module
- [x] Add session/token strategy
- [x] Add current-user endpoint
- [x] Add role guards
- [x] Add admin bypass rules

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
**Status:** done  
**Outcome:** Work items support comments and the system keeps audit trails.

Tasks:
- [x] Add work item comment create endpoint
- [x] Add work item comment list endpoint
- [x] Add audit trail query endpoint
- [x] Add system actor support for agent comments

## API-014 - Add queue limits configuration
**Status:** done  
**Outcome:** System defaults and per-project overrides can be stored and read.

Tasks:
- [x] Create queue limit schema
- [x] Add defaults endpoint
- [x] Add project override endpoint
- [x] Add effective settings calculation

## API-015 - Build scheduler lease system
**Status:** done  
**Outcome:** Work can be leased safely and durably.

Tasks:
- [x] Create lease model
- [x] Add lease acquisition service
- [x] Add lease expiration handling
- [x] Add lease renewal endpoint
- [x] Add lease recovery process

## API-016 - Build runtime registration and heartbeat
**Status:** done  
**Outcome:** Runtimes can register and report health.

Tasks:
- [x] Add runtime register endpoint
- [x] Add runtime heartbeat endpoint
- [x] Add runtime detail query
- [x] Add last-seen tracking
- [x] Add offline detection

## API-017 - Add runtime work dispatch
**Status:** done  
**Outcome:** The runtime can ask for work and receive leased jobs.

Tasks:
- [x] Add request-work endpoint
- [x] Add runtime job result endpoint
- [x] Add runtime progress update endpoint
- [x] Add runtime artifact upload metadata endpoint

## API-018 - Add worktree persistence endpoints
**Status:** done  
**Outcome:** Worktree lifecycle is stored centrally.

Tasks:
- [x] Add worktree create/update endpoints
- [x] Add worktree status query
- [x] Add worktree cleanup endpoint
- [x] Add stale worktree mark endpoint

## API-019 - Add agent run persistence
**Status:** done  
**Outcome:** Every agent action is durably recorded.

Tasks:
- [x] Add agent run create path
- [x] Add agent decision record
- [x] Add agent failure record
- [x] Add prompt snapshot record
- [x] Add run artifact record

## API-020 - Add review gate persistence
**Status:** done  
**Outcome:** Build, lint, typecheck, test, and criteria results are recorded structurally.

Tasks:
- [x] Add gate result schema
- [x] Add gate result report endpoint
- [x] Add gate summary query
- [x] Add criteria evaluation report fields

## API-021 - Add release endpoints
**Status:** done  
**Outcome:** Release attempts, versions, tags, and notes are stored.

Tasks:
- [x] Add release start endpoint
- [x] Add release result endpoint
- [x] Add version record endpoint
- [x] Add release notes storage
- [x] Add release history query

## API-022 - Add human intervention endpoints
**Status:** done  
**Outcome:** Blocked work can be escalated and managed.

Tasks:
- [x] Add intervention create endpoint
- [x] Add intervention list endpoint
- [x] Add intervention resolve endpoint
- [x] Add suggested action fields
- [x] Add retry-from-intervention flow

## API-023 - Add usage tracking endpoints
**Status:** done  
**Outcome:** Token and cost events are tracked from day one.

Tasks:
- [x] Add token usage event endpoint
- [x] Add model/provider metadata support
- [x] Add project usage aggregation query
- [x] Add user usage aggregation query
- [x] Add cost estimate calculation

## API-024 - Add billing endpoints
**Status:** done  
**Outcome:** Stripe sandbox billing scaffolding is present.

Tasks:
- [x] Add stripe customer mapping
- [x] Add subscription status query
- [x] Add billing portal/session support
- [x] Add admin bypass logic
- [x] Add webhook handling

## API-025 - Add websocket gateway
**Status:** done  
**Outcome:** The API can push system events to the web app.

Tasks:
- [x] Add realtime gateway
- [x] Define event names
- [x] Add project-scoped event publishing
- [x] Add authentication for sockets
- [x] Add query invalidation mapping notes

## API-026 - Add structured logging and audit events
**Status:** done  
**Outcome:** System actions are queryable and traceable.

Tasks:
- [x] Add structured log schema
- [x] Add log write service
- [x] Add system log query
- [x] Add project log query
- [x] Add request correlation id support

## API-027 - Add comprehensive tests
**Status:** done  
**Outcome:** Core API behaviour is protected by tests.

Tasks:
- [x] Unit test workflow state machine
- [x] Unit test lease behaviour
- [x] Unit test queue limit logic
- [x] Integration test project lifecycle
- [x] Integration test runtime lifecycle
- [x] Integration test release lifecycle