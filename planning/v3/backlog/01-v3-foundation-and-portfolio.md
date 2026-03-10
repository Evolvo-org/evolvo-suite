# Evolvo V3 Backlog — Foundation and Portfolio

## Epic: V2 to V3 Gap Analysis

### Story: Inventory V2 subsystems
**Description**  
Create a clear inventory of the current V2 subsystems and their responsibilities.

**Acceptance Criteria**
- all major V2 subsystems are listed
- each subsystem has an owner/responsibility summary
- subsystem dependencies are documented

### Story: Classify V2 components into keep/refactor/replace/add
**Description**  
Produce a decision matrix for V3 upgrade planning.

**Acceptance Criteria**
- each subsystem has one of the four decisions
- rationale is recorded
- no ambiguous items remain

### Story: Define V3 module boundaries
**Description**  
Define the top-level V3 modules and their contracts.

**Acceptance Criteria**
- each module has a purpose
- cross-module interactions are described
- hidden responsibility overlap is minimised

---

## Epic: Portfolio Core

### Story: Introduce portfolio asset model
**Description**  
Create the new top-level portfolio asset concept that can track lineage from idea to live product.

**Acceptance Criteria**
- portfolio asset can reference idea, project, product, feedback, and governor state
- lineage is preserved cleanly
- model does not overload project state

### Story: Expand lifecycle state model
**Description**  
Support discovery, candidate, approved, defining, planned, build, launch, live, improving, watch, archive candidate, and archived states.

**Acceptance Criteria**
- lifecycle states are implemented centrally
- invalid transitions are prevented
- state meanings are documented

### Story: Add orthogonal state dimensions
**Description**  
Add independent state tracking for approval, execution, deployment, commercial, feedback, and governor health.

**Acceptance Criteria**
- dimensions are stored separately from main lifecycle state
- state combinations can be reasoned about cleanly
- Governor can consume these dimensions

### Story: Link projects back to origin ideas
**Description**  
Ensure projects created in V3 can always be traced back to the approved idea and opportunity that created them.

**Acceptance Criteria**
- origin references exist on project records
- lineage survives project execution
- traceability is queryable

---

## Epic: Portfolio Views

### Story: Build opportunity pipeline view
**Description**  
Create a view of ideas moving from discovery to approval.

**Acceptance Criteria**
- candidate ideas are visible
- approval state is visible
- ranking/score summary is visible

### Story: Build build-pipeline view
**Description**  
Create a view of approved ideas moving through product definition and execution.

**Acceptance Criteria**
- approved items can be tracked into project execution
- stalled items are identifiable
- lifecycle transitions are visible

### Story: Build live portfolio view
**Description**  
Create a portfolio-level view for live products and their health.

**Acceptance Criteria**
- live products are listed with health indicators
- commercial and deployment readiness are visible
- watch/archive candidate products are visible