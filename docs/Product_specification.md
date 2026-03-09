# Evolvo v2 Development Plan

## 1. Product goal

Build a cloud-controlled, locally-executed autonomous software factory that can:

* manage multiple software projects
* ingest a product description
* optionally ingest a development plan
* generate a development plan when one is not provided
* decompose work into epics, tasks, and subtasks
* execute work through specialised agents
* move work through strict kanban workflow states
* use isolated git worktrees per task
* review, release, tag, and generate release notes
* provide full live observability through a web app
* support future multi-user SaaS expansion

---

# 2. Updated architecture

## Final app split

### `apps/web`

Hosted online. Pure Next.js frontend.

Responsibilities:

* authentication UI
* dashboard and project UI
* kanban board
* planning hierarchy UI
* spec/plan editing UI
* logs and observability UI
* usage analytics UI
* billing/admin UI
* websocket client
* TanStack Query data access

It should **not** talk to the database directly.

---

### `apps/api`

Hosted API. NestJS.

Responsibilities:

* single backend/control plane
* database access
* auth/session handling
* project CRUD
* spec and plan CRUD
* workflow transitions
* scheduling/orchestration services
* runtime job leasing
* worktree/task metadata storage
* usage tracking
* release records
* human intervention records
* websocket/event broadcasting
* billing integration
* permission enforcement

This is the **single source of backend truth**.

---

### `apps/runtime`

Runs locally.

Responsibilities:

* poll/subscribe to the API for work
* execute agent tasks
* manage local git repos
* manage branches/worktrees
* run dev/review/release flows
* execute build/lint/typecheck/test
* report results back to API
* heartbeat/status reporting

The runtime should never own truth. It is an execution worker.

---

# 3. Core platform principle

## Source of truth

The **NestJS API + database** is the source of truth for:

* projects
* specs
* plans
* epics/tasks/subtasks
* kanban states
* workflow transitions
* scheduler state
* agent runs
* usage
* worktree records
* release attempts
* intervention cases
* audit logs

GitHub is only for:

* repo hosting
* branches
* PRs
* merging
* tags/releases

Not orchestration.

---

# 4. Web data architecture

This part is now important enough to define explicitly.

## Next.js rules

* Next.js does **not** access Prisma or DB directly
* Next.js calls the Nest API only
* TanStack Query is used for all data fetching and mutations
* pages should preload the data they need
* components should consume preloaded data with `useQuery`
* mutations use `useMutation`
* websocket events trigger invalidation/refetch where needed

## Recommended pattern

For each page:

1. server-side preload API calls for critical above-the-fold data
2. dehydrate query cache into the page
3. child components call `useQuery` with the same keys
4. TanStack hydrates instantly and continues normal caching lifecycle

That gives you:

* fast first paint
* stable query model
* one consistent data-access pattern

## Query conventions

Use TanStack Query for:

* GET
* POST
* PATCH
* DELETE
* filtered lists
* board data
* logs
* analytics
* runtime state

Even where a server action might be possible, keep business mutations flowing through the API for consistency.

---

# 5. Monorepo structure

```txt
apps/
  web/
  api/
  runtime/

packages/
  ui/
  api-client/
  db/
  auth/
  billing/
  config/
  domain/
  orchestration/
  agents/
  git/
  worktrees/
  usage/
  release/
  realtime/
  validation/
  prompts/
  logger/
  shared/
```

---

# 6. Package responsibilities

## `packages/ui`

* reusable Tailwind UI system
* one component per tsx
* design primitives
* board/tree/log components

## `packages/api-client`

* typed API client used by Next.js and optionally runtime helpers
* TanStack query functions
* query keys
* mutation wrappers
* DTO types from shared contracts

## `packages/db`

* Prisma schema
* migrations
* seed scripts
* only used by Nest API

## `packages/domain`

* domain models
* enums
* transition rules
* queue caps
* state machine definitions

## `packages/orchestration`

* scheduling logic
* project round robin
* queue filling logic
* retry/backoff policies
* lease rules

## `packages/agents`

* provider adapters
* inbox/planning/dev/review/release agent interfaces
* structured execution contracts

## `packages/git`

* branch, commit, merge, tag helpers

## `packages/worktrees`

* worktree lifecycle management
* status/reconciliation logic

## `packages/realtime`

* websocket event contracts
* broadcast payload types

## `packages/validation`

* zod schemas for DTOs, agent outputs, commands

---

# 7. Two views of work

These remain unchanged and should stay separate in the model.

## Planning hierarchy

* Product Spec
* Development Plan
* Epics
* Tasks
* Subtasks

## Execution workflow

* Inbox
* Planning
* Ready for dev
* In dev
* Ready for review
* In review
* Ready for release
* Requires human intervention
* Released

The first describes structure.
The second describes lifecycle.

---

# 8. Core backend model

The API should own these main areas.

## Auth / billing

* User
* Role
* Session
* Subscription
* StripeCustomer

## Project

* Project
* ProjectRepository
* ProjectConfig
* ProjectQueueLimits
* ProjectRuntimeStatus

## Product definition

* ProductSpec
* DevelopmentPlan
* PlanVersion
* Epic
* WorkItem
* AcceptanceCriterion

Where `WorkItem` can represent:

* Task
* Subtask

## Workflow

* WorkItemStateTransition
* WorkItemComment
* HumanInterventionCase

## Agent system

* AgentRun
* AgentDecision
* AgentFailure
* PromptSnapshot
* RunArtifact

## Runtime / git

* Worktree
* GitBranch
* PullRequest
* ReleaseRun
* ReleaseVersion
* ReleaseNote

## Usage / observability

* UsageEvent
* TokenUsageEvent
* CostEstimateEvent
* RuntimeHeartbeat
* SystemLog
* ProjectLog
* EventStream

---

# 9. API-first workflow engine

Because Nest is now central, all transitions and orchestration rules belong there.

## Strict backend state machine

Only the API can move a card between states.

Allowed transitions are enforced in domain services, for example:

* Inbox → Planning
* Planning → Ready for dev
* Ready for dev → In dev
* In dev → Ready for review
* Ready for review → In review
* In review → Ready for dev
* In review → Ready for release
* Ready for release → Released
* Ready for release → Requires human intervention

The UI never changes status directly.
The runtime never changes status directly.
They call API commands.

---

# 10. Queue and scheduler design

This now lives in the Nest API.

## API scheduler responsibilities

* round robin project selection
* eligibility calculation
* queue cap enforcement
* lease creation
* retry policy handling
* stale lease recovery
* intervention escalation
* fair distribution across projects

## Runtime responsibilities

* ask for work
* receive leased work
* execute
* report result
* renew heartbeat/lease if needed

This keeps orchestration deterministic and centralised.

---

# 11. Worktree model

Still the right approach.

## Rule

One task gets one canonical worktree.

## Lifecycle

* API creates task execution record
* runtime creates branch + worktree locally
* runtime reports worktree metadata back to API
* dev/review/release use that task-scoped worktree lifecycle
* release cleans up on success
* failures retain inspectable state until cleaned/retried

## Worktree statuses

* pending
* active
* locked-by-dev
* locked-by-review
* locked-by-release
* stale
* cleanup-pending
* archived
* failed

---

# 12. Product bootstrapping flow

## Input

Minimum:

* project name
* repository
* product description

Optional:

* development plan

## Behaviour

### If plan exists

Planner must honour it as the intended roadmap and decompose it.

### If no plan exists

Planner generates:

* development plan
* milestones/phases
* epics
* tasks
* subtasks
* acceptance criteria

## Output

A project should end up with:

* product spec
* active development plan version
* backlog hierarchy
* execution-ready work items

---

# 13. Agent topology

## Global agents

### Inbox agent

* global loop
* round robin across projects
* generates new ideas into Inbox

### Planning agent

* global loop
* consumes Inbox
* accepts/rejects ideas
* structures work
* fills Planning
* promotes to Ready for dev when allowed

### Review agent

* global loop
* processes Ready for review
* moves to In review
* validates quality gates
* returns to Ready for dev or advances to Ready for release

### Release agent

* global loop
* processes Ready for release
* handles merge conflict attempts
* merges, tags, release notes
* escalates when blocked

## Per-project agent

### Dev agent

* one lane per project
* consumes Ready for dev
* implements in worktree
* runs checks
* advances to Ready for review

---

# 14. Quality gates

Review/release success should require:

* compile/build passes
* lint passes
* typecheck passes
* test passes
* acceptance criteria satisfied
* review comments resolved

These results should be persisted in the API, not inferred from transient logs.

---

# 15. Website feature set

## Core pages

### Dashboard

* all projects
* system health
* runtime health
* stuck items
* usage summary
* intervention summary

### Projects

* list/search/filter
* running/stopped
* usage
* active task
* heartbeat

### Project detail

* overview
* product spec
* development plan
* kanban board
* planning hierarchy
* logs
* runtime state
* worktrees
* releases
* settings

### Planning view

* epics/tasks/subtasks
* dependencies
* priorities
* acceptance criteria

### Kanban board

* strict state display
* drag/drop calling transition endpoints
* comments/history
* retry/intervention visibility

### Runtime monitor

* heartbeat
* active jobs
* last action
* worktree status
* failures

### Usage analytics

* per user
* per project
* per agent
* per model/provider
* estimated cost

### Human intervention queue

* blocked items
* reason
* evidence
* retries
* operator actions

### Release history

* versions
* tags
* release notes
* merged work items

### Admin/settings

* queue defaults
* model routing
* retry policies
* billing/auth config

---

# 16. Realtime model

Use websockets from the Nest API.

## Events

* project updated
* work item moved
* work item commented
* agent run started/completed/failed
* runtime heartbeat changed
* usage event recorded
* worktree changed
* release started/completed/failed
* intervention created/resolved

## Web behaviour

* pages preload initial state
* components use `useQuery`
* websocket events invalidate relevant queries

That keeps the app simple and consistent.

---

# 17. Auth and billing

Still worth doing from day one.

## Roles

* admin
* operator
* reviewer
* viewer

## Billing

* Stripe sandbox
* admin bypasses subscription
* other users tied to subscription model later
* usage tracked from day one regardless of billing maturity

---

# 18. Retry and intervention policy

Per-project config should define:

* max review retries
* max merge conflict retries
* max dev retry attempts
* max ambiguous requirement retries
* max runtime/tool retries

Intervention cases should be created for:

* repeated merge conflict failure
* repeated review failure
* missing secrets/config
* unrecoverable repo state
* runtime failures
* unclear requirements
* broken worktree state

---

# 19. Updated implementation phases

## Phase 0 — Monorepo and platform foundations

Build:

* Turborepo setup
* Next.js web app
* NestJS API app
* runtime app
* Prisma + cloud Postgres
* shared packages
* auth scaffold
* Tailwind UI system
* typed DTO/contracts
* websocket foundation

Exit criteria:

* all apps boot
* auth works
* API can persist projects
* web reads via API only

---

## Phase 1 — API contracts and frontend data layer

Build:

* typed API client package
* TanStack Query setup
* query key conventions
* preload/hydration pattern
* mutation wrappers
* error handling strategy
* auth-aware API access

Exit criteria:

* web pages preload API data
* child components consume via `useQuery`
* mutations go through API consistently

---

## Phase 2 — Project and product-definition system

Build:

* project CRUD
* repository config
* product spec CRUD
* development plan CRUD/versioning
* initial project settings
* queue limits config

Exit criteria:

* can create a project
* can attach spec
* can attach optional plan
* data fully stored through API

---

## Phase 3 — Planning hierarchy

Build:

* epic/task/subtask schema
* acceptance criteria
* dependencies/priorities
* hierarchy UI
* planner-generated plan flow when absent

Exit criteria:

* project can produce structured backlog
* hierarchy view works
* versioned plan exists

---

## Phase 4 — Workflow engine and kanban

Build:

* strict state machine in API
* transition endpoints
* kanban board UI
* audit trail
* comments
* per-project queue caps
* manual overrides

Exit criteria:

* invalid transitions rejected by API
* board works against real workflow rules
* queue limits enforced centrally

---

## Phase 5 — Scheduler and leasing

Build:

* round robin scheduler services
* work eligibility calculation
* lease model
* retry/backoff
* stale lease recovery
* project pause/start/stop logic

Exit criteria:

* API can safely decide what work is eligible
* jobs are lease-based and resumable

---

## Phase 6 — Runtime connectivity

Build:

* runtime registration
* heartbeat endpoints
* job polling/subscription
* result reporting
* log streaming
* runtime status UI

Exit criteria:

* runtime can disconnect/reconnect safely
* API remains source of truth throughout

---

## Phase 7 — Git and worktree engine

Build:

* local repo management
* branch creation
* worktree creation
* worktree lifecycle reporting
* cleanup flow
* stale worktree reconciliation

Exit criteria:

* task worktrees exist and are tracked centrally
* runtime can resume after restart

---

## Phase 8 — Dev agent lane

Build:

* Ready for dev leasing
* task context assembly
* codex integration
* implementation flow
* check execution
* result persistence
* move to Ready for review

Exit criteria:

* a task can be implemented end-to-end via runtime and API

---

## Phase 9 — Review agent lane

Build:

* review leasing
* review execution
* gate aggregation
* pass/fail comments
* retry rules
* move to Ready for dev or Ready for release

Exit criteria:

* review produces durable, useful outcomes

---

## Phase 10 — Release agent lane

Build:

* release leasing
* merge conflict attempts
* merge flow
* tagging
* release notes generation
* worktree cleanup
* intervention escalation

Exit criteria:

* release succeeds and records versioned output

---

## Phase 11 — Inbox and planning automation

Build:

* inbox idea generation
* planning accept/reject flow
* Ready for dev auto-fill respecting queue caps
* round robin cross-project balancing

Exit criteria:

* projects can self-feed work within system limits

---

## Phase 12 — Usage, billing, and SaaS foundations

Build:

* usage tracking
* token/cost analytics
* per-user/per-project rollups
* Stripe sandbox
* role-based access
* admin subscription bypass

Exit criteria:

* commercial foundations exist even if only admin is using it

---

# 20. Updated implementation order

The best order is now:

1. monorepo + Nest API + Next web + runtime
2. shared contracts + TanStack Query data layer
3. auth + project/spec/plan CRUD
4. hierarchy model
5. kanban/state machine
6. scheduler/leasing
7. runtime heartbeat/job execution
8. worktree system
9. dev agent
10. review agent
11. release agent
12. inbox/planning automation
13. usage/billing foundations

---

# 21. Final architecture statement

**Evolvo v2 should be a NestJS API-centered autonomous software factory platform, with Next.js as a TanStack Query-driven frontend, a local runtime for execution, Prisma-backed cloud persistence, and strict DB-orchestrated workflow/state management.**
