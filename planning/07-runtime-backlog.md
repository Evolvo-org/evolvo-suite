# Runtime Backlog

## Goal

Build a local execution runtime that performs repository work safely and reports all durable state back to the API.

## RUN-001 - Create runtime app shell
**Status:** todo  
**Outcome:** A bootable runtime app exists with configuration, logging, and graceful shutdown.

Tasks:
- [ ] Create `apps/runtime`
- [ ] Add config loading
- [ ] Add logger
- [ ] Add signal handling
- [ ] Add startup diagnostics

## RUN-002 - Add API client integration
**Status:** todo  
**Outcome:** Runtime can authenticate and communicate with the API.

Tasks:
- [ ] Add runtime auth config
- [ ] Add typed API client usage
- [ ] Add retry strategy for API calls
- [ ] Add request correlation ids

## RUN-003 - Add runtime registration
**Status:** todo  
**Outcome:** Runtime can register itself with the API.

Tasks:
- [ ] Add register call on startup
- [ ] Add runtime identity persistence
- [ ] Add capability reporting

## RUN-004 - Add heartbeat loop
**Status:** todo  
**Outcome:** Runtime reports health regularly.

Tasks:
- [ ] Add heartbeat timer
- [ ] Add current status payload
- [ ] Add active job summary
- [ ] Add last error field

## RUN-005 - Add work polling or subscription loop
**Status:** todo  
**Outcome:** Runtime can request leased work from the API.

Tasks:
- [ ] Add work request loop
- [ ] Add idle behaviour
- [ ] Add backoff when no work exists
- [ ] Add lease-aware cancellation support

## RUN-006 - Add local repo registry
**Status:** todo  
**Outcome:** Runtime knows where repos are stored locally.

Tasks:
- [ ] Add local repo path strategy
- [ ] Add project-to-path mapping
- [ ] Add repo existence check
- [ ] Add repo metadata persistence

## RUN-007 - Add repo sync support
**Status:** todo  
**Outcome:** Runtime can clone and update repositories.

Tasks:
- [ ] Add clone flow
- [ ] Add fetch/pull flow
- [ ] Add remote validation
- [ ] Add branch sync helpers

## RUN-008 - Add branch management
**Status:** todo  
**Outcome:** Runtime can create and track task branches.

Tasks:
- [ ] Add branch naming helpers
- [ ] Add branch create flow
- [ ] Add base branch selection
- [ ] Add branch cleanup strategy

## RUN-009 - Add worktree creation
**Status:** todo  
**Outcome:** Runtime can create a canonical worktree per task.

Tasks:
- [ ] Add worktree create flow
- [ ] Add path generation strategy
- [ ] Add worktree metadata reporting
- [ ] Add dirty state detection

## RUN-010 - Add worktree lifecycle actions
**Status:** todo  
**Outcome:** Runtime can update, lock, unlock, and clean worktrees.

Tasks:
- [ ] Add lock state updates
- [ ] Add cleanup path
- [ ] Add stale detection support
- [ ] Add archive support if needed

## RUN-011 - Add structured command execution
**Status:** todo  
**Outcome:** Runtime can run commands safely and capture output.

Tasks:
- [ ] Add command runner
- [ ] Add stdout/stderr capture
- [ ] Add timeout support
- [ ] Add exit code handling
- [ ] Add artifact path collection

## RUN-012 - Add build/lint/typecheck/test execution
**Status:** todo  
**Outcome:** Runtime can execute quality gates consistently.

Tasks:
- [ ] Add build command support
- [ ] Add lint command support
- [ ] Add typecheck command support
- [ ] Add test command support
- [ ] Add result normalization

## RUN-013 - Add diff and commit support
**Status:** todo  
**Outcome:** Runtime can create commits and report changes.

Tasks:
- [ ] Add diff summary generation
- [ ] Add commit message generation
- [ ] Add commit execution
- [ ] Add commit metadata reporting

## RUN-014 - Add PR support
**Status:** todo  
**Outcome:** Runtime can create or update PRs where needed.

Tasks:
- [ ] Add PR create flow
- [ ] Add PR update flow
- [ ] Add PR metadata reporting
- [ ] Add PR comment support if used

## RUN-015 - Add artifact reporting
**Status:** todo  
**Outcome:** Runtime can report generated evidence to the API.

Tasks:
- [ ] Add artifact metadata upload support
- [ ] Add log attachment support
- [ ] Add gate result reporting
- [ ] Add release notes draft reporting

## RUN-016 - Add lease-safe execution loop
**Status:** todo  
**Outcome:** Runtime can perform work without causing state drift.

Tasks:
- [ ] Add active lease context
- [ ] Add progress update loop
- [ ] Add lease renewal support
- [ ] Add cancellation handling
- [ ] Add failure finalization

## RUN-017 - Add recovery on restart
**Status:** todo  
**Outcome:** Runtime restart does not orphan local state.

Tasks:
- [ ] Detect unfinished local worktrees
- [ ] Reconcile with API state
- [ ] Resume or mark stale where needed
- [ ] Re-register safely after restart

## RUN-018 - Add runtime tests
**Status:** todo  
**Outcome:** Critical runtime behaviour is protected.

Tasks:
- [ ] Test heartbeat flow
- [ ] Test repo sync flow
- [ ] Test worktree creation
- [ ] Test command execution
- [ ] Test restart reconciliation