# Web Backlog

## Goal

Build a Next.js operator interface that consumes the API only, preloads page data, and uses TanStack Query for all reads and writes.

## WEB-001 - Create Next.js app shell
**Status:** todo  
**Outcome:** A bootable Next.js app exists with Tailwind, routing, and app layout shell.

Tasks:
- [ ] Create `apps/web`
- [ ] Add Tailwind CSS
- [ ] Add app shell layout
- [ ] Add route grouping strategy
- [ ] Add error and loading boundaries

## WEB-002 - Establish frontend architecture rules
**Status:** todo  
**Outcome:** The frontend has agreed conventions for components, features, and data fetching.

Tasks:
- [ ] Define folder structure
- [ ] Define one-component-per-file rule
- [ ] Define page preload pattern
- [ ] Define client/server component rules
- [ ] Define query key naming rules

## WEB-003 - Build `packages/ui`
**Status:** todo  
**Outcome:** Shared UI primitives exist and are reusable.

Tasks:
- [ ] Add button component
- [ ] Add input component
- [ ] Add textarea component
- [ ] Add select component
- [ ] Add badge component
- [ ] Add card component
- [ ] Add dialog component
- [ ] Add sheet/drawer component
- [ ] Add table component
- [ ] Add tabs component

## WEB-004 - Add TanStack Query foundation
**Status:** todo  
**Outcome:** The app uses a single standard query architecture.

Tasks:
- [ ] Add query client provider
- [ ] Add dehydrate/hydrate support
- [ ] Add default query config
- [ ] Add mutation error handling
- [ ] Add auth-aware fetch wrapper integration

## WEB-005 - Create typed API client integration
**Status:** todo  
**Outcome:** The web app consumes typed API methods only.

Tasks:
- [ ] Add `packages/api-client`
- [ ] Add query functions
- [ ] Add mutation functions
- [ ] Add shared response typing
- [ ] Add query key helpers

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
**Status:** todo  
**Outcome:** All projects can be viewed, filtered, and opened.

Tasks:
- [ ] Add project list query
- [ ] Add project list page
- [ ] Add filters and search
- [ ] Add status indicators
- [ ] Add create project CTA

## WEB-009 - Build project create flow
**Status:** todo  
**Outcome:** Operators can create a project with product description and optional plan.

Tasks:
- [ ] Add create project page
- [ ] Add repository config form
- [ ] Add product spec field
- [ ] Add optional development plan field
- [ ] Add queue limit defaults support

## WEB-010 - Build project overview page
**Status:** todo  
**Outcome:** Each project has a summary page.

Tasks:
- [ ] Add overview route
- [ ] Preload overview data
- [ ] Add status summary
- [ ] Add current queue counts
- [ ] Add runtime summary
- [ ] Add latest activity panel

## WEB-011 - Build product spec editor
**Status:** todo  
**Outcome:** Product descriptions can be viewed and edited cleanly.

Tasks:
- [ ] Add spec editor component
- [ ] Add save mutation
- [ ] Add unsaved change handling
- [ ] Add version display if applicable

## WEB-012 - Build development plan editor
**Status:** todo  
**Outcome:** Plans can be viewed, edited, and versioned.

Tasks:
- [ ] Add plan editor page
- [ ] Add version switcher
- [ ] Add active plan controls
- [ ] Add plan save mutation
- [ ] Add plan generation trigger

## WEB-013 - Build planning hierarchy view
**Status:** todo  
**Outcome:** Epics, tasks, and subtasks are visible and editable in tree form.

Tasks:
- [ ] Add hierarchy query
- [ ] Add tree components
- [ ] Add expand/collapse
- [ ] Add create epic/task/subtask actions
- [ ] Add acceptance criteria editor
- [ ] Add dependency UI
- [ ] Add priority controls

## WEB-014 - Build kanban board page
**Status:** todo  
**Outcome:** Work items are visible in strict workflow columns.

Tasks:
- [ ] Add board query
- [ ] Add board page
- [ ] Add column components
- [ ] Add card components
- [ ] Add drag/drop integration
- [ ] Add transition mutation handling
- [ ] Add invalid transition feedback

## WEB-015 - Build work item detail panel
**Status:** todo  
**Outcome:** A work item can be inspected and edited in detail.

Tasks:
- [ ] Add work item detail panel
- [ ] Add comments area
- [ ] Add audit history area
- [ ] Add acceptance criteria area
- [ ] Add dependency summary
- [ ] Add retry/intervention summary

## WEB-016 - Build runtime monitor UI
**Status:** todo  
**Outcome:** Operators can see runtime health and activity.

Tasks:
- [ ] Add runtime page
- [ ] Add heartbeat display
- [ ] Add active job display
- [ ] Add last action display
- [ ] Add runtime log stream view
- [ ] Add offline warning state

## WEB-017 - Build worktree visibility UI
**Status:** todo  
**Outcome:** Task worktree state is visible.

Tasks:
- [ ] Add worktree list
- [ ] Add worktree status badges
- [ ] Add branch and PR summary
- [ ] Add cleanup actions where allowed

## WEB-018 - Build release history UI
**Status:** todo  
**Outcome:** Releases, versions, and notes are visible.

Tasks:
- [ ] Add release history page
- [ ] Add version list
- [ ] Add release detail panel
- [ ] Add release notes rendering

## WEB-019 - Build human intervention queue UI
**Status:** todo  
**Outcome:** Blocked work can be reviewed and resolved.

Tasks:
- [ ] Add intervention list page
- [ ] Add intervention detail panel
- [ ] Add resolve/retry actions
- [ ] Add evidence display
- [ ] Add suggested action display

## WEB-020 - Build usage analytics UI
**Status:** todo  
**Outcome:** Usage is visible per project, per user, and per agent.

Tasks:
- [ ] Add usage overview page
- [ ] Add date range filters
- [ ] Add project usage chart
- [ ] Add user usage chart
- [ ] Add model/provider breakdown
- [ ] Add estimated cost widgets

## WEB-021 - Build settings pages
**Status:** todo  
**Outcome:** Operators can manage defaults and system settings.

Tasks:
- [ ] Add project settings page
- [ ] Add queue limits editor
- [ ] Add retry policy editor
- [ ] Add model routing settings UI
- [ ] Add billing settings page

## WEB-022 - Add websocket-driven query invalidation
**Status:** todo  
**Outcome:** The UI updates in near real time.

Tasks:
- [ ] Add socket client
- [ ] Add authenticated socket connection
- [ ] Add event handlers
- [ ] Add query invalidation map
- [ ] Add reconnect behaviour

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