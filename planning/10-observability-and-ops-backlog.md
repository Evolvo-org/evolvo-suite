# Observability and Ops Backlog

## Goal

Make Evolvo v2 debuggable, inspectable, and safe to operate.

## OBS-001 - Define structured log model
**Status:** todo  
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
- [ ] Finalise schema
- [ ] Add write helpers
- [ ] Add log levels

## OBS-002 - Add API request logging
**Status:** todo  
**Outcome:** API behaviour is traceable.

Tasks:
- [ ] Add request logging middleware
- [ ] Add correlation ids
- [ ] Add error logging
- [ ] Add slow request logging

## OBS-003 - Add runtime event logging
**Status:** todo  
**Outcome:** Runtime activity is durable and queryable.

Tasks:
- [ ] Log registration
- [ ] Log heartbeat changes
- [ ] Log work dispatch
- [ ] Log command execution summaries
- [ ] Log failures

## OBS-004 - Add scheduler event logging
**Status:** todo  
**Outcome:** Scheduling decisions can be understood later.

Tasks:
- [ ] Log eligibility decisions
- [ ] Log skip reasons
- [ ] Log lease grants
- [ ] Log lease expiry recovery

## OBS-005 - Add work item timeline
**Status:** todo  
**Outcome:** Every task has a readable history.

Tasks:
- [ ] Aggregate comments, transitions, agent runs, and gate results
- [ ] Expose timeline query
- [ ] Render timeline in UI

## OBS-006 - Add runtime dashboard
**Status:** todo  
**Outcome:** Runtime health is visible at a glance.

Tasks:
- [ ] Show heartbeat age
- [ ] Show active jobs
- [ ] Show last action
- [ ] Show offline state
- [ ] Show recent failures

## OBS-007 - Add release dashboard
**Status:** todo  
**Outcome:** Release flow can be monitored.

Tasks:
- [ ] Show release history
- [ ] Show latest tag
- [ ] Show failed releases
- [ ] Show intervention-triggering releases

## OBS-008 - Add intervention dashboard
**Status:** todo  
**Outcome:** Human-blocked work is easy to act on.

Tasks:
- [ ] Show open interventions
- [ ] Show aging interventions
- [ ] Show reason categories
- [ ] Show retry availability

## OBS-009 - Add metrics and alerting hooks
**Status:** todo  
**Outcome:** The platform is ready for future alerting.

Tasks:
- [ ] Add runtime offline metric
- [ ] Add failed lease metric
- [ ] Add repeated review failure metric
- [ ] Add release failure metric
- [ ] Add usage spike metric

## OBS-010 - Add operational docs
**Status:** todo  
**Outcome:** Recovery procedures are documented.

Docs should include:
- runtime offline recovery
- stale lease recovery
- stale worktree cleanup
- failed release handling
- intervention resolution flow

## OBS-011 - Add observability tests
**Status:** todo  
**Outcome:** Critical event paths are protected.

Tasks:
- [ ] Test timeline assembly
- [ ] Test log persistence
- [ ] Test offline detection
- [ ] Test intervention visibility