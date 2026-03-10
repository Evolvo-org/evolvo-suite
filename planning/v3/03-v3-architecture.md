# Evolvo V3 Architecture

## Architectural Intent

Evolvo V3 should be built as a modular upgrade on top of the Evolvo V2 execution foundation.

The architecture must avoid turning V2 into a monolith of special cases.

V3 should introduce clear top-level bounded systems that collaborate through explicit contracts.

## Architectural Layers

### 1. Execution Foundation Layer
Inherited from V2.

Responsibilities:
- multi-project runtime
- worker orchestration
- execution lifecycle
- project registry
- baseline planning/build/test flow

This remains the trusted delivery engine for approved projects.

### 2. Portfolio Layer
New in V3.

Responsibilities:
- portfolio-wide state
- idea tracking
- opportunity tracking
- project origin tracking
- deployed product tracking
- lifecycle transitions across the full system

This becomes the top-level state model above isolated project execution.

### 3. Research Layer
New in V3.

Responsibilities:
- source discovery
- evidence collection
- evidence normalisation
- semantic storage
- pain-point derivation
- cluster formation

This layer is responsible for discovering and structuring external signals.

### 4. Opportunity Intelligence Layer
New in V3.

Responsibilities:
- cluster evaluation
- idea synthesis
- opportunity scoring
- ranking and recommendation
- dossier generation

This is the decision-support layer between research and execution.

### 5. Approval Layer
New in V3.

Responsibilities:
- approval-gated actions
- operator review checkpoints
- auditability
- action release control

This prevents unsafe or costly autonomous behaviour.

### 6. Product Definition Layer
New in V3.

Responsibilities:
- transform approved ideas into product definitions
- define MVP scope
- define execution-ready metadata
- create new project bootstrap payloads

This bridges opportunity intelligence and V2 execution.

### 7. Deployment and Commercialisation Layer
New in V3.

Responsibilities:
- Hetzner deployment
- domain workflow preparation
- pricing and Stripe preparation
- commercial state tracking

This translates delivered software into launch-ready products.

### 8. Aftercare Layer
New in V3.

Responsibilities:
- feedback ingestion
- signal clustering
- recurrence detection
- prioritisation
- routing improvements back into project work

This closes the loop after launch.

### 9. Governor Layer
New in V3.

Responsibilities:
- system-wide observation
- health reporting
- warning generation
- performance critique
- strategic recommendations

The Governor supervises the full system rather than executing isolated tasks.

## Primary System Objects

### Evidence
Raw captured signal from an external source.

### Pain Point
A structured recurring problem derived from evidence.

### Opportunity Cluster
A grouped area of repeated pain.

### Idea Dossier
A proposed product opportunity generated from an opportunity cluster.

### Scorecard
A multi-dimensional evaluation of an idea dossier.

### Project
A new execution unit created from an approved idea.

### Product
A deployed project with commercial and feedback state.

### Feedback Signal
A post-launch input from users, support, analytics, or product behaviour.

### Governor Report
A portfolio-wide assessment artifact.

## High-Level Flow

### Discovery Flow
Research Layer -> Evidence -> Pain Points -> Opportunity Clusters -> Idea Dossiers -> Scorecards

### Approval Flow
Idea Dossier + Scorecard -> Approval Layer -> Approved Idea

### Delivery Flow
Approved Idea -> Product Definition Layer -> New Project -> V2 Execution Foundation

### Launch Flow
Built Project -> Deployment and Commercialisation Layer -> Product

### Learning Flow
Product -> Aftercare Layer -> Feedback Signals -> Prioritised Work -> V2 Execution Foundation

### Oversight Flow
All Layers -> Governor Layer -> Reports, Warnings, Recommendations

## Architectural Rules

### Rule 1
Research must not directly create live projects without approval.

### Rule 2
Commercialisation and domain workflows must default to draft/prepared state until approved.

### Rule 3
The Governor must consume system state from all major domains.

### Rule 4
Aftercare must be treated as part of the lifecycle, not as an external add-on.

### Rule 5
V2 execution should remain reusable and stable, with V3 adding capability around it.

## Suggested Module Structure

- `portfolio`
- `research`
- `opportunities`
- `ideas`
- `scoring`
- `approval`
- `product-definition`
- `deployment`
- `commercialisation`
- `aftercare`
- `governor`

## Integration Direction

Each module should expose:
- domain models
- service interfaces
- event contracts
- state transitions
- persistence boundaries

Cross-module behaviour should be orchestrated through explicit flows rather than hidden coupling.

## Final Architecture Principle

V3 should feel like a coherent new operating system built on a stable V2 kernel, not like V2 with extra switches added everywhere.