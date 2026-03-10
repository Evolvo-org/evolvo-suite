# Evolvo v2 Phased Delivery Plan

## Delivery principle

Build Evolvo v2 in layers.
Do not build automation on unstable foundations.

## Phase 0 - Foundations
**Goal:** Create the monorepo, app shells, shared packages, and technical baseline.

Deliverables:
- Turborepo setup
- Next.js app shell
- NestJS app shell
- runtime app shell
- Prisma baseline
- Tailwind setup
- shared package setup
- environment strategy
- health endpoints
- CI baseline

Exit criteria:
- all apps boot
- packages resolve cleanly
- API can connect to DB
- web can talk to API
- runtime can talk to API

## Phase 1 - API contracts and web data layer
**Goal:** Standardise all client-server communication.

Deliverables:
- typed DTOs
- API client package
- query key conventions
- preload and hydration pattern
- mutation wrappers
- auth-aware API requests
- shared error handling rules

Exit criteria:
- all page data comes from API
- all page mutations go through API
- components use `useQuery`
- no direct DB usage in web

## Phase 2 - Project and product-definition system
**Goal:** Make projects, specs, and plans real.

Deliverables:
- project CRUD
- repository configuration
- product spec CRUD
- development plan CRUD
- plan versioning
- project settings
- queue limit settings

Exit criteria:
- a new project can be created
- a spec can be stored
- a plan can be stored or omitted
- project settings persist through API

## Phase 3 - Planning hierarchy
**Goal:** Model work decomposition.

Deliverables:
- epic, task, subtask schema
- acceptance criteria
- dependencies
- priorities
- planning hierarchy UI
- planner-generated plan flow

Exit criteria:
- a project can generate or ingest a structured backlog
- hierarchy is visible and editable
- plan versions are durable

## Phase 4 - Kanban workflow engine
**Goal:** Build strict workflow state handling.

Deliverables:
- workflow state machine
- transition services
- board queries
- board mutation endpoints
- comments and audit trail
- queue cap enforcement
- operator overrides

Exit criteria:
- invalid transitions are rejected
- board reflects durable backend state
- queue caps work

## Phase 5 - Scheduler and leasing
**Goal:** Centralise work eligibility and leasing.

Deliverables:
- project round robin
- fairness logic
- lease creation
- lease renewal
- retry and backoff logic
- stale lease recovery

Exit criteria:
- work can be leased safely
- offline runtime does not lose work
- fairness rules are enforced

## Phase 6 - Runtime connectivity
**Goal:** Make the local runtime a durable worker.

Deliverables:
- runtime registration
- heartbeat endpoints
- job polling or subscription
- result reporting
- structured log streaming

Exit criteria:
- runtime can disconnect and reconnect
- API remains source of truth
- logs and state updates are visible in web

## Phase 7 - Git and worktree engine
**Goal:** Support isolated execution by task.

Deliverables:
- repo sync
- branch creation
- worktree creation
- worktree persistence
- worktree cleanup
- worktree reconciliation

Exit criteria:
- each active task can have a tracked worktree
- stale worktrees can be detected and handled

## Phase 8 - Dev agent lane
**Goal:** Implement tasks automatically.

Deliverables:
- ready-for-dev leasing
- task context assembly
- dev agent execution
- code generation/editing
- build/lint/typecheck/test execution
- result persistence
- transition to ready-for-review

Exit criteria:
- a task can be taken from queue and implemented end-to-end

## Phase 9 - Review agent lane
**Goal:** Review work automatically and safely.

Deliverables:
- ready-for-review leasing
- review execution
- gate evaluation
- pass/fail comments
- retry handling
- transitions back to dev or forward to release

Exit criteria:
- review produces durable pass/fail outcomes
- feedback is stored and visible

## Phase 10 - Release agent lane
**Goal:** Release work automatically.

Deliverables:
- ready-for-release leasing
- merge conflict attempt flow
- merge execution
- version tagging
- release notes generation
- worktree cleanup
- escalation to human intervention

Exit criteria:
- work can be merged, tagged, and recorded end-to-end

## Phase 11 - Inbox and planning automation
**Goal:** Enable self-feeding backlog behaviour.

Deliverables:
- inbox idea generation
- planner accept/reject processing
- automatic queue filling
- cross-project round robin processing

Exit criteria:
- projects can generate and process work autonomously within limits

## Phase 12 - Admin access, usage, and observability polish
**Goal:** Make the system safe to operate internally.

Deliverables:
- usage analytics
- token and model reporting
- admin session hardening
- intervention workflows
- runtime dashboards
- release dashboards
- audit visibility

Exit criteria:
- usage is fully visible
- admin-only access is safe and predictable
- the platform is operator-safe
