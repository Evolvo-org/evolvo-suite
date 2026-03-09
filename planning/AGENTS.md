# Evolvo v2 Implementation Rules for GPT-5.4

## Purpose

This file defines how GPT-5.4 should implement Evolvo v2.

Follow these rules strictly.

## Product summary

Evolvo v2 is a hosted-control-plane, local-runtime autonomous software factory.

Apps:
- `apps/web` -> Next.js frontend
- `apps/api` -> NestJS backend
- `apps/runtime` -> local worker

The API is the only service allowed to access the database.

## Hard architecture rules

1. Do not let Next.js access Prisma or the database.
2. Do not put backend business logic into the web app.
3. Do not let the runtime become a source of truth.
4. Do not let workflow transitions happen outside the API.
5. Do not model planning hierarchy and kanban workflow as the same concept.
6. Do not rely on in-memory scheduler state as the only scheduler state.
7. Do not assume the runtime is always online.
8. Do not create giant multi-component `.tsx` files.
9. Do not use anything except Tailwind CSS for styling.
10. Do not skip reusable components in the UI package.
11. All package files should use explicit exports in their respective package.json

## Web rules

1. Use Next.js.
2. Use TanStack Query for all reads and writes.
3. Pages should preload the data they need.
4. Components should then read using `useQuery`.
5. Use `useMutation` for writes.
6. Use typed DTOs from shared contracts.
7. Prefer feature-based folders plus shared UI primitives.
8. One component per `.tsx` file.

## API rules

1. Use NestJS.
2. Use Prisma via `packages/db`.
3. Keep domain logic in services/modules, not controllers.
4. Validate all command inputs.
5. Enforce workflow transitions centrally.
6. Persist agent runs, transitions, usage, releases, and intervention cases.
7. Add structured logs for all important system actions.

## Runtime rules

1. Runtime performs repository and agent execution only.
2. Runtime must register and heartbeat with the API.
3. Runtime must receive work through leases.
4. Runtime must report progress and final results back to the API.
5. Runtime must support restart recovery and worktree reconciliation.

## Data rules

1. The database is the source of truth for all durable system state.
2. GitHub is only for repository implementation actions.
3. Every important action should create an auditable record.
4. Usage must be tracked from day one.
5. Human intervention cases must include evidence and attempts made.

## Workflow rules

Execution columns:
- Inbox
- Planning
- Ready for dev
- In dev
- Ready for review
- In review
- Ready for release
- Requires human intervention
- Released

Planning hierarchy:
- Product Spec
- Development Plan
- Epic
- Task
- Subtask

These are separate concerns and should stay separate in schema and code.

## Quality rules

A review cannot pass unless:
- build passes
- lint passes
- typecheck passes
- test passes
- acceptance criteria are satisfied
- required feedback is resolved

## Worktree rules

1. One active task should have one canonical worktree.
2. Worktree state must be persisted in the API.
3. Worktrees must be recoverable after runtime restart.
4. Release should clean up worktree state where appropriate.

## Backlog execution rules

When implementing:
1. Read the relevant planning markdown files first.
2. Update planning docs if architecture must change.
3. Implement the smallest correct vertical slice.
4. Prefer durable, explicit systems over hidden magic.
5. Keep modules cohesive and testable.
6. Add tests for state machines, scheduling, and recovery paths.

## Suggested implementation order

1. Foundations
2. API contracts
3. Web data layer
4. Project/spec/plan CRUD
5. Planning hierarchy
6. Workflow engine
7. Scheduler/leasing
8. Runtime connectivity
9. Worktree engine
10. Dev agent
11. Review agent
12. Release agent
13. Inbox/planning automation
14. Usage, auth, billing, observability polish

## Definition of done

A ticket is only done when:
- code is implemented
- types are correct
- tests pass where appropriate
- docs are updated where needed
- architecture rules are still respected

## Preferred coding style

- TypeScript throughout
- explicit types
- small focused modules
- clear naming
- no barrel-file abuse unless justified
- one component per file
- reusable primitives first
- avoid hidden side effects