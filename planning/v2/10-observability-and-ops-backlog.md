# Observability and Ops Backlog

## Goal

Make Evolvo v2 debuggable, inspectable, and safe to operate.

## OBS-001 - Define structured log model
**Status:** done  
**Outcome:** All important events can be recorded consistently.

Fields:
- level
- source
- project id
- work item id
- agent type
- runtime id
- event type
- payload
- correlation id
- timestamp

Tasks:
- [x] Finalise schema
- [x] Add write helpers
- [x] Add log levels

## OBS-002 - Add API request logging
**Status:** done  
**Outcome:** API behaviour is traceable.

Tasks:
- [x] Add request logging middleware
- [x] Add correlation ids
- [x] Add error logging
- [x] Add slow request logging

## OBS-003 - Add runtime event logging
**Status:** done  
**Outcome:** Runtime activity is durable and queryable.

Tasks:
- [x] Log registration
- [x] Log heartbeat changes
- [x] Log work dispatch
- [x] Log command execution summaries
- [x] Log failures

## OBS-004 - Add scheduler event logging
**Status:** done  
**Outcome:** Scheduling decisions can be understood later.

Tasks:
- [x] Log eligibility decisions
- [x] Log skip reasons
- [x] Log lease grants
- [x] Log lease expiry recovery

## OBS-005 - Add work item timeline
**Status:** done  
**Outcome:** Every task has a readable history.

Tasks:
- [x] Aggregate comments, transitions, agent runs, and gate results
- [x] Expose timeline query
- [x] Render timeline in UI

## OBS-006 - Add runtime dashboard
**Status:** done  
**Outcome:** Runtime health is visible at a glance.

Tasks:
- [x] Show heartbeat age
- [x] Show active jobs
- [x] Show last action
- [x] Show offline state
- [x] Show recent failures

## OBS-007 - Add release dashboard
**Status:** done  
**Outcome:** Release flow can be monitored.

Tasks:
- [x] Show release history
- [x] Show latest tag
- [x] Show failed releases
- [x] Show intervention-triggering releases

## OBS-008 - Add intervention dashboard
**Status:** done  
**Outcome:** Human-blocked work is easy to act on.

Tasks:
- [x] Show open interventions
- [x] Show aging interventions
- [x] Show reason categories
- [x] Show retry availability

## OBS-009 - Add metrics and alerting hooks
**Status:** done  
**Outcome:** The platform is ready for future alerting.

Tasks:
- [x] Add runtime offline metric
- [x] Add failed lease metric
- [x] Add repeated review failure metric
- [x] Add release failure metric
- [x] Add usage spike metric

## OBS-010 - Add operational docs
**Status:** done  
**Outcome:** Recovery procedures are documented.

Docs should include:
- runtime offline recovery
- stale lease recovery
- stale worktree cleanup
- failed release handling
- intervention resolution flow

## OBS-011 - Add observability tests
**Status:** done  
**Outcome:** Critical event paths are protected.

Tasks:
- [x] Test timeline assembly
- [x] Test log persistence
- [x] Test offline detection
- [x] Test intervention visibility