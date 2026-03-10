# Evolvo V2 to V3 Gap Analysis

## Purpose

This document defines how Evolvo V2 should be upgraded into Evolvo V3.

The goal is to make explicit decisions on what is:
- kept
- refactored
- replaced
- added

## Baseline Assumption

Evolvo V2 already provides the execution core.

That means V3 should assume there is already value in:
- multi-project runtime
- project registration
- execution lifecycle
- orchestration behaviour
- worker-based delivery

## Keep

The following V2 capabilities should be preserved where they are structurally sound:

### Multi-project runtime
Still central to V3 because every approved opportunity becomes a new project.

### Project registry
Still required, though it must be expanded to include origin and portfolio metadata.

### Execution orchestration
Still required for planning, building, testing, and refinement.

### Existing execution agents/workers
Still useful for approved work delivery.

### Existing deployment conventions
Retain where they support the Hetzner-first direction.

## Refactor

The following V2 areas are likely still useful but too narrow for V3 as-is:

### Lifecycle state model
V2 likely assumes mostly execution-stage states.  
V3 needs idea, approval, product, commercial, and aftercare states.

### Project metadata
V2 projects need links back to:
- origin idea
- opportunity cluster
- commercial state
- feedback state
- governor state

### Runtime control layer
Control structures may need to support more than simple start/stop style project operations.

### Observability
V2 observability likely focuses on execution progress, not full portfolio health.

## Replace Only If Necessary

The following should only be replaced if extension proves too costly or messy:

### Orchestration internals
Replace only if the current system cannot support:
- research workers
- governor workers
- aftercare workers
- approval-gated flows

### State persistence model
Replace only if the current storage model cannot represent V3 lifecycle complexity cleanly.

### Command/control interface
Replace only if current commands cannot evolve without becoming brittle or confusing.

## Add

The following are major new V3 domains:

### Portfolio layer
Top-level domain for ideas, projects, products, and archives.

### Research memory
Evidence, pain points, clustering, and semantic retrieval.

### Opportunity intelligence
Idea synthesis and recommendation.

### Scoring engine
Explainable multi-dimensional scoring.

### Approval layer
Explicit gating for critical actions.

### Product definition layer
Approved-idea to project transformation.

### Deployment automation
Hetzner deployment workflow and state tracking.

### Commercialisation workflow
Pricing proposals, domain preparation, Stripe preparation.

### Aftercare
Post-launch feedback capture and routing.

### Governor
Cross-system supervision and critique.

## Upgrade Risks

### Risk 1 — V3 becomes a bolt-on blob
Mitigation:
- strong module boundaries
- explicit domain ownership
- avoid adding everything directly into core execution code

### Risk 2 — V2 assumptions leak everywhere
Mitigation:
- define V3 lifecycle states centrally
- adapt interfaces at boundaries instead of duplicating logic

### Risk 3 — Governor has weak visibility
Mitigation:
- define shared health and metrics surfaces early

### Risk 4 — Research and aftercare become disconnected
Mitigation:
- treat them as equal first-class flows around execution, not optional utilities

## Decision Summary

### Reuse as foundation
Yes.

### Rewrite whole platform from scratch
No, unless a specific subsystem proves fundamentally incompatible.

### Recommended strategy
Upgrade V2 into V3 by preserving the execution kernel and adding clearly bounded V3 systems around it.

## Final Outcome

At the end of the upgrade:
- V2 remains the project execution kernel
- V3 becomes the portfolio, research, commercialisation, and governance layer above it