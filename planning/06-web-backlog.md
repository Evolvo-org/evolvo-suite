# Web Backlog

## Goal

Build a Next.js operator interface that consumes the API only, preloads page data, and uses TanStack Query for all reads and writes.

## WEB-001 - Create Next.js app shell
**Status:** done  
**Outcome:** A bootable Next.js app exists with Tailwind, routing, and app layout shell.

Tasks:
- [x] Create `apps/web`
- [x] Add Tailwind CSS
- [x] Add app shell layout
- [x] Add route grouping strategy
- [x] Add error and loading boundaries

## WEB-002 - Establish frontend architecture rules
**Status:** done  
**Outcome:** The frontend has agreed conventions for components, features, and data fetching.

Tasks:
- [x] Define folder structure
- [x] Define one-component-per-file rule
- [x] Define page preload pattern
- [x] Define client/server component rules
- [x] Define query key naming rules

## WEB-003 - Build `packages/ui`
**Status:** done  
**Outcome:** Shared UI primitives exist and are reusable.

Tasks:
- [x] Add button component
- [x] Add input component
- [x] Add textarea component
- [x] Add select component
- [x] Add badge component
- [x] Add card component
- [x] Add dialog component
- [x] Add sheet/drawer component
- [x] Add table component
- [x] Add tabs component

## WEB-004 - Add TanStack Query foundation
**Status:** done  
**Outcome:** The app uses a single standard query architecture.

Tasks:
- [x] Add query client provider
- [x] Add dehydrate/hydrate support
- [x] Add default query config
- [x] Add mutation error handling
- [x] Add auth-aware fetch wrapper integration

## WEB-005 - Create typed API client integration
**Status:** done  
**Outcome:** The web app consumes typed API methods only.

Tasks:
- [x] Add `packages/api-client`
- [x] Add query functions
- [x] Add mutation functions
- [x] Add shared response typing
- [x] Add query key helpers

## WEB-006 - Implement auth UI
**Status:** todo  
**Outcome:** Users can sign in and the app respects session state.

Tasks:
- [ ] Add sign-in page
- [ ] Add session-aware layout
- [ ] Add current-user bootstrap
- [ ] Add role-aware route protection

## WEB-007 - Build dashboard page
**Status:** todo  
**Outcome:** Operators can see system-wide status at a glance.

Tasks:
- [ ] Add dashboard route
- [ ] Preload summary data
- [ ] Add projects summary cards
- [ ] Add runtime health widgets
- [ ] Add intervention summary
- [ ] Add usage snapshot

## WEB-008 - Build projects list page
**Status:** done  
**Outcome:** All projects can be viewed, filtered, and opened.

Tasks:
- [x] Add project list query
- [x] Add project list page
- [x] Add filters and search
- [x] Add status indicators
- [x] Add create project CTA

## WEB-009 - Build project create flow
**Status:** done  
**Outcome:** Operators can create a project with product description and optional plan.

Tasks:
- [x] Add create project page
- [x] Add repository config form
- [x] Add product spec field
- [x] Add optional development plan field
- [x] Add queue limit defaults support

## WEB-010 - Build project overview page
**Status:** done  
**Outcome:** Each project has a summary page.

Tasks:
- [x] Add overview route
- [x] Preload overview data
- [x] Add status summary
- [x] Add current queue counts
- [x] Add runtime summary
- [x] Add latest activity panel

## WEB-011 - Build product spec editor
**Status:** done  
**Outcome:** Product descriptions can be viewed and edited cleanly.

Tasks:
- [x] Add spec editor component
- [x] Add save mutation
- [x] Add unsaved change handling
- [x] Add version display if applicable

## WEB-012 - Build development plan editor
**Status:** done  
**Outcome:** Plans can be viewed, edited, and versioned.

Tasks:
- [x] Add plan editor page
- [x] Add version switcher
- [x] Add active plan controls
- [x] Add plan save mutation
- [x] Add plan generation trigger

## WEB-013 - Build planning hierarchy view
**Status:** done  
**Outcome:** Epics, tasks, and subtasks are visible and editable in tree form.

Tasks:
- [x] Add hierarchy query
- [x] Add tree components
- [x] Add expand/collapse
- [x] Add create epic/task/subtask actions
- [x] Add acceptance criteria editor
- [x] Add dependency UI
- [x] Add priority controls

## WEB-014 - Build kanban board page
**Status:** done  
**Outcome:** Work items are visible in strict workflow columns.

Tasks:
- [x] Add board query
- [x] Add board page
- [x] Add column components
- [x] Add card components
- [x] Add drag/drop integration
- [x] Add transition mutation handling
- [x] Add invalid transition feedback

## WEB-015 - Build work item detail panel
**Status:** done  
**Outcome:** A work item can be inspected and edited in detail.

Tasks:
- [x] Add work item detail panel
- [x] Add comments area
- [x] Add audit history area
- [x] Add acceptance criteria area
- [x] Add dependency summary
- [x] Add retry/intervention summary

## WEB-016 - Build runtime monitor UI
**Status:** done  
**Outcome:** Operators can see runtime health and activity.

Tasks:
- [x] Add runtime page
- [x] Add heartbeat display
- [x] Add active job display
- [x] Add last action display
- [x] Add runtime log stream view
- [x] Add offline warning state

## WEB-017 - Build worktree visibility UI
**Status:** done  
**Outcome:** Task worktree state is visible.

Tasks:
- [x] Add worktree list
- [x] Add worktree status badges
- [x] Add branch and PR summary
- [x] Add cleanup actions where allowed

## WEB-018 - Build release history UI
**Status:** done  
**Outcome:** Releases, versions, and notes are visible.

Tasks:
- [x] Add release history page
- [x] Add version list
- [x] Add release detail panel
- [x] Add release notes rendering

## WEB-019 - Build human intervention queue UI
**Status:** done  
**Outcome:** Blocked work can be reviewed and resolved.

Tasks:
- [x] Add intervention list page
- [x] Add intervention detail panel
- [x] Add resolve/retry actions
- [x] Add evidence display
- [x] Add suggested action display

## WEB-020 - Build usage analytics UI
**Status:** done  
**Outcome:** Usage is visible per project, per user, and per agent.

Tasks:
- [x] Add usage overview page
- [x] Add date range filters
- [x] Add project usage chart
- [x] Add user usage chart
- [x] Add model/provider breakdown
- [x] Add estimated cost widgets

## WEB-021 - Build settings pages
**Status:** done  
**Outcome:** Operators can manage defaults and system settings.

Tasks:
- [x] Add project settings page
- [x] Add queue limits editor
- [x] Add retry policy editor
- [x] Add model routing settings UI
- [x] Add billing settings page

## WEB-022 - Add websocket-driven query invalidation
**Status:** done  
**Outcome:** The UI updates in near real time.

Tasks:
- [x] Add socket client
- [x] Add authenticated socket connection
- [x] Add event handlers
- [x] Add query invalidation map
- [x] Add reconnect behaviour

## WEB-023 - Add loading, empty, and error polish
**Status:** todo  
**Outcome:** The UI is resilient and usable.

Tasks:
- [ ] Add skeleton states
- [ ] Add empty states
- [ ] Add mutation error toasts
- [ ] Add retry affordances
- [ ] Add not-found handling

## WEB-024 - Add frontend tests
**Status:** todo  
**Outcome:** Core user flows are protected.

Tasks:
- [ ] Test dashboard load
- [ ] Test project create flow
- [ ] Test board rendering
- [ ] Test drag/drop transition path
- [ ] Test query invalidation on realtime events
