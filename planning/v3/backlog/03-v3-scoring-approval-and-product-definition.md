# Evolvo V3 Backlog — Scoring, Approval, and Product Definition

## Epic: Scoring Engine

### Story: Define base scoring dimensions
**Description**  
Implement scoring across demand, urgency, monetisation, competition, distribution, build complexity, strategic fit, defensibility, speed to market, and maintenance burden.

**Acceptance Criteria**
- each dimension has a definition
- each dimension is independently represented
- each dimension can be explained

### Story: Implement composite scoring
**Description**  
Generate Revenue Now, Strategic Asset, and Balanced Portfolio composite scores.

**Acceptance Criteria**
- composite scores are produced for every scored idea
- weightings are configurable
- score derivation remains explainable

### Story: Add recommendation bands
**Description**  
Classify ideas into reject, watch, investigate further, strong candidate, or approve-ready.

**Acceptance Criteria**
- every idea has a recommendation band
- recommendation bands are tied to scoring logic
- recommendation reasoning is stored

---

## Epic: Approval Workflow

### Story: Create approval state machine
**Description**  
Implement the approval state model used for critical actions.

**Acceptance Criteria**
- generic states include draft, prepared, awaiting approval, approved, rejected, expired, executed
- invalid transitions are prevented
- approval state history is preserved

### Story: Support idea approval requests
**Description**  
Allow generated ideas to be presented for approval.

**Acceptance Criteria**
- idea approval payload includes summary, scorecard, risks, and recommendation
- approval and rejection are recorded
- approved ideas can move into product definition

### Story: Support domain approval requests
**Description**  
Allow domain actions to be staged and approved.

**Acceptance Criteria**
- proposed domains can be reviewed
- approval is required before purchase execution
- decision history is recorded

### Story: Support Stripe approval requests
**Description**  
Allow live Stripe actions to be staged and approved.

**Acceptance Criteria**
- Stripe draft config is visible before approval
- approval is required for live entity creation
- approval events are auditable

### Story: Support production deployment approval requests
**Description**  
Require explicit approval before production deployment actions occur.

**Acceptance Criteria**
- deployment approval requests summarise readiness and risk
- approved deployments can proceed
- rejected deployments are recorded cleanly

---

## Epic: Product Definition

### Story: Create product definition output format
**Description**  
Define the canonical structure for approved idea handoff into execution.

**Acceptance Criteria**
- format includes summary, audience, problem, MVP, workflows, milestones, non-goals, technical direction, deployment assumptions, and commercial assumptions
- format is reusable
- format is versionable

### Story: Implement approved-idea to product-definition transformer
**Description**  
Convert approved ideas into shaped product definitions.

**Acceptance Criteria**
- product definitions are created automatically from approved ideas
- scope is constrained for MVP delivery
- origin references are preserved

### Story: Create project bootstrap payload from product definition
**Description**  
Generate the payload required to create a new execution project.

**Acceptance Criteria**
- bootstrap payload contains lineage, lifecycle state, milestones, and flags
- payload is accepted by the execution layer
- new projects are created in a consistent shape