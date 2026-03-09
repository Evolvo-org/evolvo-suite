# Evolvo v2 Domain and Workflow

## Core domain areas

The system has six major domain areas:

1. Project definition
2. Planning hierarchy
3. Workflow execution
4. Runtime and git state
5. Agent execution
6. Usage and observability

## Core entities

## Project definition
- Project
- ProjectRepository
- ProjectConfig
- ProjectQueueLimits
- ProjectRuntimeStatus

## Planning hierarchy
- ProductSpec
- DevelopmentPlan
- PlanVersion
- Epic
- WorkItem
- AcceptanceCriterion

`WorkItem` should represent:
- task
- subtask

## Workflow execution
- WorkItemState
- WorkItemStateTransition
- WorkItemComment
- HumanInterventionCase

## Runtime and git state
- Worktree
- GitBranch
- PullRequest
- ReleaseRun
- ReleaseVersion
- ReleaseNote

## Agent execution
- AgentRun
- AgentDecision
- AgentFailure
- PromptSnapshot
- RunArtifact

## Usage and observability
- UsageEvent
- TokenUsageEvent
- CostEstimateEvent
- RuntimeHeartbeat
- SystemLog
- ProjectLog
- EventStream

## Planning hierarchy model

Hierarchy:

- ProductSpec
  - DevelopmentPlan
    - Epic
      - Task
        - Subtask

A task or subtask may also appear in a kanban state.

Important:
- hierarchy defines structure
- kanban defines execution state
- do not collapse these into a single concern

## Kanban workflow states

The execution columns are:

- Inbox
- Planning
- Ready for dev
- In dev
- Ready for review
- In review
- Ready for release
- Requires human intervention
- Released

## Allowed transitions

Allowed transitions should be explicit and centrally enforced.

Base transitions:

- Inbox -> Planning
- Planning -> Ready for dev
- Ready for dev -> In dev
- In dev -> Ready for review
- Ready for review -> In review
- In review -> Ready for dev
- In review -> Ready for release
- Ready for release -> Released
- Ready for release -> Requires human intervention
- In dev -> Requires human intervention
- In review -> Requires human intervention
- Planning -> Requires human intervention

Operator-only transitions may also exist to recover blocked work.

## Queue limits

Queue limits are configured:
- with system defaults
- with per-project overrides

Project limits should include at least:
- max planning
- max ready for dev
- max in dev
- max ready for review
- max in review
- max ready for release
- max review retries
- max merge conflict retries
- max runtime retries
- max ambiguity retries

## Product bootstrapping rules

Each project must support:

### Minimum input
- name
- repository
- product description

### Optional input
- development plan

### Behaviour
If a development plan is provided:
- planner should respect it as intended direction
- planner may refine and decompose it
- planner must not silently replace it

If no development plan is provided:
- planner generates a development plan
- planner generates epics
- planner generates tasks
- planner generates subtasks
- planner generates acceptance criteria

## Worktree rules

Each active implementation task should have one canonical worktree.

Recommended statuses:
- pending
- active
- locked-by-dev
- locked-by-review
- locked-by-release
- stale
- cleanup-pending
- archived
- failed

## Review gates

A review can only pass when:
- compile/build passes
- lint passes
- typecheck passes
- test passes
- acceptance criteria are satisfied
- required review feedback is resolved

## Release rules

A release should:
- merge to main
- create a version tag
- generate release notes
- mark associated work as released
- clean up worktree state where appropriate

## Human intervention

A human intervention case should be created for:
- repeated merge conflict failures
- repeated review failures
- missing secrets or config
- unrecoverable repo state
- runtime failures beyond threshold
- planner ambiguity beyond threshold
- worktree corruption or unrecoverable stale state

Each intervention case should include:
- summary
- reason
- attempts made
- supporting evidence
- suggested next action