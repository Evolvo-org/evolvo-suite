# Evolvo v2 System Overview

## Purpose

Evolvo v2 is an autonomous software factory platform capable of creating and evolving real software products using a mixed-agent architecture.

The system must support:
- multiple projects
- end-to-end product execution
- backlog generation from product descriptions
- optional human-supplied development plans
- strict execution workflow
- local code execution
- full operator visibility through a hosted web interface

## Product goal

Given a project with:
- a repository
- a product description
- optionally a development plan

Evolvo v2 should be able to:
- generate or refine the development plan
- break the work into epics, tasks, and subtasks
- move work into execution
- implement work in isolated worktrees
- review work against quality gates
- release work to main
- tag versions
- generate release notes
- escalate to human intervention when blocked

## Operating model

The system has three main parts:

### Web
The hosted operator interface for:
- project management
- kanban board
- planning hierarchy
- live runtime status
- usage analytics
- intervention handling
- settings and billing

### API
The hosted NestJS control plane for:
- all database interaction
- all business logic
- all scheduling and workflow rules
- auth and billing
- runtime job leasing
- event broadcasting

### Runtime
The local execution worker for:
- git operations
- worktree management
- code generation and editing
- build, lint, typecheck, and test execution
- release execution

## Source of truth

### Database-backed truth
The API + database are the source of truth for:
- projects
- specs
- plans
- epics, tasks, subtasks
- workflow states
- leases
- logs
- usage
- worktrees
- releases
- intervention cases

### Non-source systems
GitHub is not the source of orchestration truth.
It is an implementation surface for:
- repositories
- branches
- pull requests
- merge operations
- tags

## Core product views

### Planning view
This represents what should be built.

Hierarchy:
- Product Spec
- Development Plan
- Epic
- Task
- Subtask

### Kanban view
This represents execution state.

Columns:
- Inbox
- Planning
- Ready for dev
- In dev
- Ready for review
- In review
- Ready for release
- Requires human intervention
- Released

These two views must stay separate in the data model.

## Workflow principle

Workflow states are strict backend-enforced states.
The UI can request state changes but cannot force them.
The runtime can request state changes but cannot force them.
The API validates all transitions.

## Initial product stance

Evolvo v2 is being built as:
- an internal autonomous software factory first
- with architecture designed to grow into a multi-user SaaS later

That means:
- real auth now
- real usage tracking now
- real billing scaffolding now
- admin bypass allowed initially
- no shortcuts that would block future subscriptions

## Non-goals for the first major release

The first major version of v2 does not need:
- multi-runtime distributed scheduling
- enterprise-grade tenancy complexity
- advanced team collaboration workflows
- public marketplace features
- deep deployment pipeline integrations beyond release tagging and merge flow

## Success criteria

Evolvo v2 is successful when:
- a project can be created from a product description
- a plan can be generated or ingested
- work can move through a strict kanban lifecycle
- dev, review, and release can execute in isolated worktrees
- the hosted web UI shows live project and runtime state
- all state is durable and recoverable after runtime restarts
- usage is tracked from day one