# Runtime Backlog

## Goal

Build a local execution runtime that performs repository work safely and reports all durable state back to the API.

## RUN-001 - Create runtime app shell
**Status:** done  
**Outcome:** A bootable runtime app exists with configuration, logging, and graceful shutdown.

Tasks:
- [x] Create `apps/runtime`
- [x] Add config loading
- [x] Add logger
- [x] Add signal handling
- [x] Add startup diagnostics

## RUN-002 - Add API client integration
**Status:** done  
**Outcome:** Runtime can authenticate and communicate with the API.

Tasks:
- [x] Add runtime auth config
- [x] Add typed API client usage
- [x] Add retry strategy for API calls
- [x] Add request correlation ids

## RUN-003 - Add runtime registration
**Status:** done  
**Outcome:** Runtime can register itself with the API.

Tasks:
- [x] Add register call on startup
- [x] Add runtime identity persistence
- [x] Add capability reporting

## RUN-004 - Add heartbeat loop
**Status:** done  
**Outcome:** Runtime reports health regularly.

Tasks:
- [x] Add heartbeat timer
- [x] Add current status payload
- [x] Add active job summary
- [x] Add last error field

## RUN-005 - Add work polling or subscription loop
**Status:** done  
**Outcome:** Runtime can request leased work from the API.

Tasks:
- [x] Add work request loop
- [x] Add idle behaviour
- [x] Add backoff when no work exists
- [x] Add lease-aware cancellation support

## RUN-006 - Add local repo registry
**Status:** done  
**Outcome:** Runtime knows where repos are stored locally.

Tasks:
- [x] Add local repo path strategy
- [x] Add project-to-path mapping
- [x] Add repo existence check
- [x] Add repo metadata persistence

## RUN-007 - Add repo sync support
**Status:** done  
**Outcome:** Runtime can clone and update repositories.

Tasks:
- [x] Add clone flow
- [x] Add fetch/pull flow
- [x] Add remote validation
- [x] Add branch sync helpers

## RUN-008 - Add branch management
**Status:** done  
**Outcome:** Runtime can create and track task branches.

Tasks:
- [x] Add branch naming helpers
- [x] Add branch create flow
- [x] Add base branch selection
- [x] Add branch cleanup strategy

## RUN-009 - Add worktree creation
**Status:** done  
**Outcome:** Runtime can create a canonical worktree per task.

Tasks:
- [x] Add worktree create flow
- [x] Add path generation strategy
- [x] Add worktree metadata reporting
- [x] Add dirty state detection

## RUN-010 - Add worktree lifecycle actions
**Status:** done  
**Outcome:** Runtime can update, lock, unlock, and clean worktrees.

Tasks:
- [x] Add lock state updates
- [x] Add cleanup path
- [x] Add stale detection support
- [x] Add archive support if needed

## RUN-011 - Add structured command execution
**Status:** done  
**Outcome:** Runtime can run commands safely and capture output.

Tasks:
- [x] Add command runner
- [x] Add stdout/stderr capture
- [x] Add timeout support
- [x] Add exit code handling
- [x] Add artifact path collection

## RUN-012 - Add build/lint/typecheck/test execution
**Status:** done  
**Outcome:** Runtime can execute quality gates consistently.

Tasks:
- [x] Add build command support
- [x] Add lint command support
- [x] Add typecheck command support
- [x] Add test command support
- [x] Add result normalization

## RUN-013 - Add diff and commit support
**Status:** done  
**Outcome:** Runtime can create commits and report changes.

Tasks:
- [x] Add diff summary generation
- [x] Add commit message generation
- [x] Add commit execution
- [x] Add commit metadata reporting

## RUN-014 - Add PR support
**Status:** done  
**Outcome:** Runtime can create or update PRs where needed.

Tasks:
- [x] Add PR create flow
- [x] Add PR update flow
- [x] Add PR metadata reporting
- [x] Add PR comment support if used

## RUN-015 - Add artifact reporting
**Status:** done  
**Outcome:** Runtime can report generated evidence to the API.

Tasks:
- [x] Add artifact metadata upload support
- [x] Add log attachment support
- [x] Add gate result reporting
- [x] Add release notes draft reporting

## RUN-016 - Add lease-safe execution loop
**Status:** done  
**Outcome:** Runtime can perform work without causing state drift.

Tasks:
- [x] Add active lease context
- [x] Add progress update loop
- [x] Add lease renewal support
- [x] Add cancellation handling
- [x] Add failure finalization

## RUN-017 - Add recovery on restart
**Status:** done  
**Outcome:** Runtime restart does not orphan local state.

Tasks:
- [x] Detect unfinished local worktrees
- [x] Reconcile with API state
- [x] Resume or mark stale where needed
- [x] Re-register safely after restart

## RUN-018 - Add runtime tests
**Status:** done  
**Outcome:** Critical runtime behaviour is protected.

Tasks:
- [x] Test heartbeat flow
- [x] Test repo sync flow
- [x] Test worktree creation
- [x] Test command execution
- [x] Test restart reconciliation