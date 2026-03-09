# Evolvo v2 Planning Pack

This directory is the implementation source of truth for Evolvo v2.

Evolvo v2 is a DB-orchestrated autonomous software factory with:
- a hosted web control plane
- a hosted NestJS API as the only backend
- a local runtime worker for execution
- a cloud database
- strict workflow governance
- task-scoped git worktrees
- SaaS-ready auth, usage, and billing foundations

## Core rules

1. The NestJS API is the only service allowed to access the database.
2. The Next.js web app is a client only.
3. The Next.js web app must use TanStack Query for all reads and writes.
4. Pages should preload the data they need.
5. Components should consume that data with `useQuery`.
6. The runtime is an execution worker only. It is never the source of truth.
7. All workflow transitions must be validated by the API.
8. GitHub is only used for repo, branch, PR, merge, and tag operations.
9. Planning hierarchy and kanban workflow are separate concerns.
10. One component per `.tsx` file.
11. Tailwind CSS only.
12. Build reusable components from the beginning.

## File index

- `01-system-overview.md`
- `02-architecture.md`
- `03-domain-and-workflow.md`
- `04-phased-delivery-plan.md`
- `05-api-backlog.md`
- `06-web-backlog.md`
- `07-runtime-backlog.md`
- `08-agent-orchestration-backlog.md`
- `09-auth-billing-usage-backlog.md`
- `10-observability-and-ops-backlog.md`
- `AGENTS.md`

## Execution order

1. Foundations
2. API contracts and persistence
3. Web data layer and shell
4. Product and planning model
5. Kanban workflow engine
6. Scheduler and leasing
7. Runtime connectivity
8. Worktree engine
9. Dev agent lane
10. Review agent lane
11. Release agent lane
12. Inbox and planning automation
13. Usage, auth, billing, and observability polish

## Delivery tracking format

Use the following status labels consistently in planning updates:

- `todo`
- `in-progress`
- `blocked`
- `done`

Use the following ticket style:

## API-001 - Create NestJS app shell
**Status:** todo  
**Outcome:** A bootable NestJS API app exists with environment loading, health endpoint, and shared module boundaries.  
**Notes:** Must not include business logic shortcuts.

## Change control

When implementation decisions change:
1. Update the relevant markdown file first.
2. Update downstream backlog items second.
3. Only then change code.

The markdown files are the planning source of truth.
The database is the runtime source of truth.