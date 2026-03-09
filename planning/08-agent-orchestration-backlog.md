# Agent and Orchestration Backlog

## Goal

Build the scheduler, agent lanes, retry policies, and automation flows that let Evolvo v2 operate as an autonomous software factory.

## ORCH-001 - Define scheduler rules
**Status:** todo  
**Outcome:** A clear scheduling model exists.

Rules:
- global round robin for inbox, planning, review, release
- per-project dev lane
- per-project queue caps
- fairness across projects
- retry limits
- intervention escalation thresholds

Tasks:
- [ ] Document scheduler algorithm
- [ ] Define eligibility rules
- [ ] Define fairness rules
- [ ] Define starvation prevention

## ORCH-002 - Implement work eligibility engine
**Status:** todo  
**Outcome:** The API can decide what work is eligible at any time.

Tasks:
- [ ] Add project eligibility calculation
- [ ] Add work item eligibility calculation
- [ ] Add queue cap checks
- [ ] Add blocked-state checks
- [ ] Add paused project checks

## ORCH-003 - Implement round robin state
**Status:** todo  
**Outcome:** Global agents process projects fairly.

Tasks:
- [ ] Add round robin cursor state
- [ ] Add reset rules
- [ ] Add fairness tests
- [ ] Add skipped-project handling

## ORCH-004 - Implement retry and backoff policies
**Status:** todo  
**Outcome:** Agent retries are controlled and observable.

Tasks:
- [ ] Add retry counters
- [ ] Add backoff calculation
- [ ] Add per-project policy overrides
- [ ] Add escalation threshold checks

## AGENT-001 - Define agent contracts
**Status:** todo  
**Outcome:** All agents use a standard interface and output shape.

Agents:
- inbox
- planning
- dev
- review
- release

Tasks:
- [ ] Define agent input contract
- [ ] Define agent result contract
- [ ] Define failure contract
- [ ] Define usage report contract

## AGENT-002 - Implement provider routing
**Status:** todo  
**Outcome:** Agent calls can be routed to the correct provider/model.

Tasks:
- [ ] Add provider config schema
- [ ] Add model routing rules
- [ ] Add per-agent config support
- [ ] Add project overrides if needed

## AGENT-003 - Implement inbox agent lane
**Status:** todo  
**Outcome:** The inbox agent can create candidate ideas.

Tasks:
- [ ] Define inbox context assembly
- [ ] Add project analysis prompt composition
- [ ] Add idea generation output validation
- [ ] Persist inbox items
- [ ] Record agent run and usage

## AGENT-004 - Implement planning agent lane
**Status:** todo  
**Outcome:** The planning agent can accept/reject ideas and decompose work.

Tasks:
- [ ] Define idea triage flow
- [ ] Define plan generation flow when missing
- [ ] Define decomposition into epics/tasks/subtasks
- [ ] Define acceptance criteria generation
- [ ] Persist hierarchy updates
- [ ] Fill ready-for-dev when below cap

## AGENT-005 - Implement dev agent lane
**Status:** todo  
**Outcome:** The dev agent can implement tasks in task-scoped worktrees.

Tasks:
- [ ] Define task context bundle
- [ ] Define coding prompt composition
- [ ] Run implementation against repo
- [ ] Run checks
- [ ] Persist diff, commits, artifacts
- [ ] Transition to ready-for-review

## AGENT-006 - Implement review agent lane
**Status:** todo  
**Outcome:** The review agent can validate work and provide useful feedback.

Tasks:
- [ ] Define review context bundle
- [ ] Evaluate build/lint/typecheck/test results
- [ ] Evaluate acceptance criteria
- [ ] Record pass/fail decision
- [ ] Comment on failures
- [ ] Transition to ready-for-dev or ready-for-release

## AGENT-007 - Implement release agent lane
**Status:** todo  
**Outcome:** The release agent can merge, tag, and create notes.

Tasks:
- [ ] Define release context bundle
- [ ] Add merge conflict attempt flow
- [ ] Add success path
- [ ] Add tag generation
- [ ] Add release notes generation
- [ ] Add intervention escalation on repeated failure

## AGENT-008 - Implement intervention creation rules
**Status:** todo  
**Outcome:** The system raises human intervention cases consistently.

Tasks:
- [ ] Add review failure threshold rule
- [ ] Add merge conflict failure threshold rule
- [ ] Add missing-config rule
- [ ] Add runtime failure threshold rule
- [ ] Add ambiguity rule

## AGENT-009 - Implement automation loops
**Status:** todo  
**Outcome:** The system can self-feed work safely.

Tasks:
- [ ] Add inbox loop trigger
- [ ] Add planning loop trigger
- [ ] Add review loop trigger
- [ ] Add release loop trigger
- [ ] Add dev lane trigger per project

## AGENT-010 - Implement scheduler observability
**Status:** todo  
**Outcome:** Scheduler decisions are visible and debuggable.

Tasks:
- [ ] Log eligibility decisions
- [ ] Log skipped projects
- [ ] Log lease failures
- [ ] Log transition attempts
- [ ] Expose scheduler state in UI queries

## AGENT-011 - Add orchestration tests
**Status:** todo  
**Outcome:** Multi-project flow correctness is protected.

Tasks:
- [ ] Test round robin fairness
- [ ] Test queue cap enforcement
- [ ] Test retry escalation
- [ ] Test paused project handling
- [ ] Test intervention creation