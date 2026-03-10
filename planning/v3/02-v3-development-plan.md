# Evolvo V3 Development Plan

## Overview

Evolvo V3 is an upgrade program built on top of Evolvo V2.

V2 already provides:
- multi-project runtime
- worker-driven execution
- project registration and lifecycle handling
- orchestration foundations

V3 adds the next operating layer:
- research
- opportunity intelligence
- scoring
- approval workflow
- product definition
- deployment automation
- commercialisation preparation
- aftercare
- governor oversight

## Delivery Strategy

V3 should be delivered as a structured upgrade, not a chaotic bolt-on.

The plan is to:
1. assess V2 and define upgrade boundaries
2. add new portfolio-level domain models
3. introduce research and idea systems
4. connect approved ideas into the existing V2 execution path
5. expand into deployment, billing preparation, and aftercare
6. establish the Governor as the supervising layer

## Phase 0 — V2 to V3 Gap Analysis

### Objective
Identify which V2 parts are kept, refactored, replaced, or extended.

### Deliverables
- subsystem inventory
- keep/refactor/replace/add matrix
- V3 upgrade decision record
- initial migration map

### Acceptance Criteria
- V2 reuse decisions are explicit
- V3 module boundaries are defined
- no major implementation begins without clear upgrade direction

## Phase 1 — Portfolio Core

### Objective
Expand the system from “projects only” into a portfolio model.

### Scope
- idea states
- approved opportunity states
- active project states
- deployed product states
- archived and rejected states
- origin tracking from idea to product

### Deliverables
- portfolio schema
- lifecycle state definitions
- metadata extensions for projects and products

### Acceptance Criteria
- the system can represent the full V3 lifecycle cleanly

## Phase 2 — Research Memory Foundation

### Objective
Create the data layer for evidence, pain points, and opportunity clustering.

### Scope
- raw evidence storage
- structured pain-point storage
- cluster persistence
- semantic search support
- ingestion contracts

### Deliverables
- evidence schema
- pain-point schema
- cluster schema
- storage and retrieval interfaces

### Acceptance Criteria
- evidence and derived pain points can be stored, searched, and related

## Phase 3 — Continuous Research Worker

### Objective
Create the always-on worker that researches the web and builds evidence.

### Scope
- source discovery
- evidence capture
- extraction and normalisation
- deduplication
- source confidence handling

### Deliverables
- research worker runtime
- ingestion pipeline
- dedupe logic
- confidence scoring rules

### Acceptance Criteria
- the system can continuously gather usable evidence with manageable noise

## Phase 4 — Idea Synthesis and Scoring

### Objective
Transform clustered pain into viable SaaS ideas with explainable scores.

### Scope
- idea dossier generation
- scoring model
- ranking
- recommendation logic
- configurable weighting

### Deliverables
- dossier generator
- scorecard model
- composite scoring rules
- opportunity ranking output

### Acceptance Criteria
- the system can produce evidence-backed ideas with clear scoring rationale

## Phase 5 — Approval Workflow

### Objective
Introduce hard approval gates for critical actions.

### Scope
- idea approval
- project creation approval
- deployment approval
- Stripe approval
- domain approval
- rejection/archive handling

### Deliverables
- approval state machine
- approval event model
- audit history
- operator-facing review structure

### Acceptance Criteria
- critical actions cannot happen without explicit approval

## Phase 6 — Product Definition Handoff

### Objective
Convert approved ideas into execution-ready projects.

### Scope
- product spec generation
- project bootstrap metadata
- handoff into V2 execution
- new-project creation flow

### Deliverables
- idea-to-project transformer
- execution-ready definition format
- handoff contracts

### Acceptance Criteria
- an approved idea can become a new clean execution project

## Phase 7 — Governor MVP

### Objective
Introduce the first version of the Governor.

### Scope
- portfolio health aggregation
- execution health visibility
- research health visibility
- warnings
- recommendations

### Deliverables
- governor service
- report format
- health aggregation logic
- warning detection rules

### Acceptance Criteria
- Patrick receives useful standup-style reporting across the system

## Phase 8 — Hetzner Deployment Automation

### Objective
Deploy approved products using standardised Hetzner workflows.

### Scope
- deployment orchestration
- environment templating
- health checks
- rollback capability
- deployment state tracking

### Deliverables
- deployment worker
- deploy state model
- health monitoring hooks
- rollback plan

### Acceptance Criteria
- approved products can be deployed repeatably and safely to Hetzner

## Phase 9 — Domain and Commercialisation Preparation

### Objective
Prepare domain and Stripe commercial setup for approved products.

### Scope
- domain suggestion flow
- domain purchase preparation
- pricing hypothesis generation
- Stripe product/price/subscription preparation
- approval-gated live configuration

### Deliverables
- commercial state model
- pricing proposal engine
- domain proposal workflow
- Stripe prep workflow

### Acceptance Criteria
- products can reach launch-ready commercial state pending approval

## Phase 10 — Aftercare and Feedback Ingestion

### Objective
Create a post-launch feedback loop.

### Scope
- feedback ingestion
- clustering
- recurrence detection
- classification
- routing into project work

### Deliverables
- feedback signal model
- ingestion pipeline
- prioritisation rules
- execution handoff contracts

### Acceptance Criteria
- launched products can feed validated user feedback back into development

## Phase 11 — Governor Expansion

### Objective
Upgrade the Governor from reporter to portfolio critic.

### Scope
- trend detection
- weak opportunity identification
- project stall detection
- waste detection
- strategic recommendations

### Deliverables
- expanded governor reporting
- trend models
- portfolio recommendations
- kill/watch/invest signals

### Acceptance Criteria
- the Governor can direct attention, not just summarise activity

## Phase 12 — Client Review Mode

### Objective
Allow Evolvo to assess and critique client products using the same scoring model.

### Scope
- ingest client context
- review and score products
- generate structured critique
- optionally convert accepted recommendations into build projects

### Deliverables
- client review mode
- roast/report format
- advisory-to-build handoff flow

### Acceptance Criteria
- the system can perform structured product critique as a second operating mode

## Success Measures

V3 is successful when it can:
- find repeated market pain with evidence
- generate high-quality ideas worth approving
- create new projects from approved ideas
- deploy them safely
- prepare commercialisation cleanly
- ingest and respond to feedback
- provide continuous high-value governance