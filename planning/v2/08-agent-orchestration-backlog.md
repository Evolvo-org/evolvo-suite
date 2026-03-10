# Agent and Orchestration Backlog

## Goal

Build the scheduler, agent lanes, retry policies, and automation flows that let Evolvo v2 operate as an autonomous software factory.

## ORCH-001 - Define scheduler rules
**Status:** done  
**Outcome:** A clear scheduling model exists.

Rules:
- global round robin for inbox, planning, review, release
- per-project dev lane
- per-project queue caps
- fairness across projects
- retry limits
- intervention escalation thresholds

Tasks:
- [x] Document scheduler algorithm
- [x] Define eligibility rules
- [x] Define fairness rules
- [x] Define starvation prevention

## ORCH-002 - Implement work eligibility engine
**Status:** done  
**Outcome:** The API can decide what work is eligible at any time.

Tasks:
- [x] Add project eligibility calculation
- [x] Add work item eligibility calculation
- [x] Add queue cap checks
- [x] Add blocked-state checks
- [x] Add paused project checks

## ORCH-003 - Implement round robin state
**Status:** done  
**Outcome:** Global agents process projects fairly.

Tasks:
- [x] Add round robin cursor state
- [x] Add reset rules
- [x] Add fairness tests
- [x] Add skipped-project handling

## ORCH-004 - Implement retry and backoff policies
**Status:** done  
**Outcome:** Agent retries are controlled and observable.

Tasks:
- [x] Add retry counters
- [x] Add backoff calculation
- [x] Add per-project policy overrides
- [x] Add escalation threshold checks

## AGENT-001 - Define agent contracts
**Status:** done  
**Outcome:** All agents use a standard interface and output shape.

Agents:
- inbox
- planning
- dev
- review
- release

Tasks:
- [x] Define agent input contract
- [x] Define agent result contract
- [x] Define failure contract
- [x] Define usage report contract

## AGENT-002 - Implement provider routing
**Status:** done  
**Outcome:** Agent calls can be routed to the correct provider/model.

Tasks:
- [x] Add provider config schema
- [x] Add model routing rules
- [x] Add per-agent config support
- [x] Add project overrides if needed

## AGENT-003 - Implement inbox agent lane
**Status:** done  
**Outcome:** The inbox agent can create candidate ideas.

Tasks:
- [x] Define inbox context assembly
- [x] Add project analysis prompt composition
- [x] Add idea generation output validation
- [x] Persist inbox items
- [x] Record agent run and usage

## AGENT-004 - Implement planning agent lane
**Status:** done  
**Outcome:** The planning agent can accept/reject ideas and decompose work.

Tasks:
- [x] Define idea triage flow
- [x] Define plan generation flow when missing
- [x] Define decomposition into epics/tasks/subtasks
- [x] Define acceptance criteria generation
- [x] Persist hierarchy updates
- [x] Fill ready-for-dev when below cap

## AGENT-005 - Implement dev agent lane
**Status:** done  
**Outcome:** The dev agent can implement tasks in task-scoped worktrees.

Tasks:
- [x] Define task context bundle
- [x] Define coding prompt composition
- [x] Run implementation against repo
- [x] Run checks
- [x] Persist diff, commits, artifacts
- [x] Transition to ready-for-review

## AGENT-006 - Implement review agent lane
**Status:** done  
**Outcome:** The review agent can validate work and provide useful feedback.

Tasks:
- [x] Define review context bundle
- [x] Evaluate build/lint/typecheck/test results
- [x] Evaluate acceptance criteria
- [x] Record pass/fail decision
- [x] Comment on failures
- [x] Transition to ready-for-dev or ready-for-release

## AGENT-007 - Implement release agent lane
**Status:** done  
**Outcome:** The release agent can merge, tag, and create notes.

Tasks:
- [x] Define release context bundle
- [x] Add merge conflict attempt flow
- [x] Add success path
- [x] Add tag generation
- [x] Add release notes generation
- [x] Add intervention escalation on repeated failure

## AGENT-008 - Implement intervention creation rules
**Status:** done  
**Outcome:** The system raises human intervention cases consistently.

Tasks:
- [x] Add review failure threshold rule
- [x] Add merge conflict failure threshold rule
- [x] Add missing-config rule
- [x] Add runtime failure threshold rule
- [x] Add ambiguity rule

## AGENT-009 - Implement automation loops
**Status:** done  
**Outcome:** The system can self-feed work safely.

Tasks:
- [x] Add inbox loop trigger
- [x] Add planning loop trigger
- [x] Add review loop trigger
- [x] Add release loop trigger
- [x] Add dev lane trigger per project

## AGENT-010 - Implement scheduler observability
**Status:** done  
**Outcome:** Scheduler decisions are visible and debuggable.

Tasks:
- [x] Log eligibility decisions
- [x] Log skipped projects
- [x] Log lease failures
- [x] Log transition attempts
- [x] Expose scheduler state in UI queries

## AGENT-011 - Add orchestration tests
**Status:** done  
**Outcome:** Multi-project flow correctness is protected.

Tasks:
- [x] Test round robin fairness
- [x] Test queue cap enforcement
- [x] Test retry escalation
- [x] Test paused project handling
- [x] Test intervention creation