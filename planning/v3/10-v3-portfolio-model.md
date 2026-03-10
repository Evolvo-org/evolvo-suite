# Evolvo V3 Portfolio Model

## Purpose

This document defines the portfolio model for Evolvo V3.

Evolvo V2 primarily operated around projects.

Evolvo V3 must operate around a broader portfolio model that includes:
- research outputs
- ideas
- approvals
- projects
- deployed products
- aftercare
- archives
- strategic review

The portfolio model becomes the top-level state system for V3.

## Why Portfolio Matters

Without a portfolio model, the system cannot cleanly answer:

- what ideas are emerging
- what has been approved
- what is being built
- what is live
- what is underperforming
- what should be improved
- what should be archived
- where attention should go next

Projects alone are not enough.

## Top-Level Portfolio Entities

### Evidence
Raw external signal collected by the research system.

### Pain Point
Structured recurring problem derived from evidence.

### Opportunity Cluster
Grouped area of repeated related pain.

### Idea
A proposed product opportunity.

### Approved Opportunity
An idea that has passed approval and is ready for product definition and project creation.

### Project
An active execution unit handled by the V2 engine.

### Product
A deployed or launch-ready output of a project.

### Feedback Stream
The ongoing aftercare input attached to a product.

### Portfolio Asset
A higher-level wrapper representing the full lifecycle lineage from idea through live product and beyond.

## Lineage Model

The portfolio should preserve lineage across the lifecycle:

Evidence -> Pain Points -> Opportunity Cluster -> Idea -> Approved Opportunity -> Project -> Product -> Feedback -> Iteration

This lineage is important for:
- traceability
- scoring validation
- Governor analysis
- strategic review
- learning from outcomes

## Suggested Portfolio Asset Model

Each portfolio asset should be able to reference:

- originating idea id
- originating cluster ids
- originating pain-point ids
- current project id
- current product id
- current lifecycle state
- commercial state
- deployment state
- feedback state
- governor status
- archive status

## Lifecycle States

Suggested high-level lifecycle states:

### Discovery
The system is still gathering evidence and clustering pain.

### Candidate
An idea dossier exists but is not yet approved.

### Approved
The idea has been approved for conversion into a project.

### Defining
The product definition is being created.

### Planned
The project exists and has been defined, but work has not materially started.

### In Build
The V2 execution engine is actively delivering.

### Launch Preparation
Build work is largely complete and deployment/commercial preparation is underway.

### Awaiting Launch Approval
The product is ready for production-critical approval.

### Live
The product is deployed and operating.

### Improving
The product is live and actively iterating through aftercare.

### Watch
The product or opportunity needs monitoring due to risk, weak performance, or uncertainty.

### Archive Candidate
The asset may be retired.

### Archived
The asset is no longer active.

## Supporting State Dimensions

In addition to the main lifecycle state, each portfolio asset should have separate orthogonal states.

### Research State
Examples:
- collecting
- clustered
- confident
- stale

### Approval State
Examples:
- draft
- awaiting approval
- approved
- rejected
- expired

### Execution State
Examples:
- not started
- planning
- building
- blocked
- stalled
- complete

### Deployment State
Examples:
- not prepared
- plan ready
- awaiting approval
- deploying
- deployed
- unhealthy
- rollback required

### Commercial State
Examples:
- not prepared
- pricing drafted
- Stripe prepared
- awaiting approval
- live commercial setup complete

### Feedback State
Examples:
- no signals yet
- collecting
- recurring issues detected
- prioritised improvements active

### Governor State
Examples:
- healthy
- needs attention
- at risk
- critical
- archive candidate

## Portfolio Queries the System Must Support

The portfolio model should support questions such as:

- what are the strongest current idea candidates
- which active projects originated from which ideas
- which live products are underperforming
- which products have high recurring feedback pain
- which opportunities were rejected and why
- which live products are commercially incomplete
- which assets deserve more investment
- which assets should be killed

## Portfolio Views

The system should support views such as:

### Opportunity Pipeline View
Discovery through approved ideas.

### Build Pipeline View
Approved idea through active project execution.

### Launch Pipeline View
Products approaching deployment and monetisation readiness.

### Live Portfolio View
All deployed products and their current health.

### Feedback View
All post-launch issues, requests, and risks.

### Strategic Review View
Governor-led assessment of where attention and capital should go.

## Acceptance Criteria

The portfolio model is working when:

- the system can represent the full lifecycle from raw evidence to live product
- lineage remains traceable
- state is not overloaded into one giant project status
- the Governor can reason across all stages
- Patrick can understand what exists, where it came from, and what should happen next

## Final Principle

Evolvo V3 should think in terms of portfolio assets, not just isolated projects.

Projects are execution units.  
Portfolio assets are the real objects being governed.