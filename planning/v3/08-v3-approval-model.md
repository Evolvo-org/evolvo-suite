# Evolvo V3 Approval Model

## Purpose

This document defines which actions Evolvo V3 may perform autonomously and which actions require explicit approval.

The approval model exists to:
- preserve operator control
- prevent unsafe automation
- protect against costly mistakes
- provide auditability across important actions

## Principle

Evolvo V3 should be highly autonomous in research, preparation, analysis, and recommendation.

Evolvo V3 should be approval-gated for real-world actions with:
- financial cost
- production risk
- irreversible effects
- portfolio impact

## Approval-Gated Actions

The following actions must require explicit approval:

### Idea approval
Before an idea can become a project.

### Project creation
Before a new approved idea enters the execution system.

### Domain purchase
Before any live domain purchase is executed.

### Stripe live object creation
Before live product, pricing, or subscription entities are created.

### Production deployment
Before a product is released into its production environment.

### Major pricing changes
Before major commercial changes are applied to a live product.

### Kill/archive actions
Before important live or strategic assets are retired or archived.

## Autonomous Actions

The following actions may be automated without approval:

### Research actions
- evidence collection
- clustering
- pain-point extraction
- opportunity detection

### Intelligence actions
- dossier generation
- scoring
- ranking
- recommendation generation

### Preparation actions
- deployment planning
- domain suggestion
- pricing proposal generation
- Stripe draft preparation

### Listening actions
- feedback ingestion
- feedback clustering
- recurrence analysis
- backlog recommendation

### Oversight actions
- governor reports
- warnings
- recommendations

## Approval States

Suggested generic approval states:
- draft
- prepared
- awaiting approval
- approved
- rejected
- expired
- executed

## Approval Requirements

Each approval request should record:
- action type
- target entity
- reason
- generated recommendation
- risks
- expected outcome
- timestamp
- decision
- decider

## Auditability

Every approval-gated action should be auditable.

Audit history should record:
- what was proposed
- what evidence or context supported it
- who approved or rejected it
- when the decision was made
- what action followed

## Operator Experience

Approval requests should be concise, explicit, and actionable.

Each request should answer:
- what is being proposed
- why it is being proposed
- what happens if approved
- what happens if rejected
- what risks exist

## Final Principle

Evolvo V3 should be autonomous enough to reduce Patrick’s workload, but never so autonomous that it removes Patrick’s control over consequential decisions.