# Evolvo V3 Research and Scoring

## Purpose

This document defines how Evolvo V3 should:
- discover pain points
- structure evidence
- identify meaningful opportunity areas
- generate ideas
- score those ideas in an explainable way

## Research Philosophy

The research system should not generate random startup ideas.

It should identify:
- repeated pain
- clear affected audiences
- weak or hated alternatives
- evidence of urgency
- signs of willingness to pay
- sufficiently specific product shapes

The system must prefer evidence-backed opportunity discovery over creative guessing.

## Research Data Model

### Evidence
Raw supporting signal captured from a source.

Suggested fields:
- id
- source type
- source url
- captured timestamp
- title
- excerpt
- content reference
- category
- tags
- confidence

### Pain Point
A structured problem derived from evidence.

Suggested fields:
- id
- title
- problem statement
- target audience
- severity
- urgency
- workaround summary
- evidence count
- confidence
- status

### Opportunity Cluster
A grouping of related pain points.

Suggested fields:
- id
- theme
- linked pain points
- linked evidence count
- target audience
- market area
- confidence
- heat score
- threshold state

## Hybrid Memory Model

The research system should use a hybrid model:

### 1. Raw evidence store
For traceability and audits.

### 2. Structured pain-point store
For reliable downstream scoring and reasoning.

### 3. Semantic/vector layer
For similarity search, clustering, and deduplication.

### 4. Analytics layer
For thresholds, market heat, concentration, and trend analysis.

The vector layer should support discovery, not replace structured data.

## Opportunity Threshold Logic

A cluster should not be promoted to idea generation just because it has many mentions.

A cluster becomes an opportunity candidate when it has:
- repeated evidence from multiple sources
- a clear audience
- a specific recurring problem
- signs of urgency or workflow blockage
- identifiable gaps in current solutions
- plausible buildability
- monetisation signals

## Idea Dossier Generation

Once a cluster crosses threshold, the system should generate an idea dossier.

A dossier should include:
- idea name
- problem solved
- target audience
- why this pain matters
- MVP shape
- key workflows
- alternatives in the market
- differentiation angle
- monetisation hypothesis
- distribution notes
- risks
- recommendation

## Scoring Principles

The scoring model must:
- remain explainable
- remain traceable back to evidence
- support different strategic modes
- avoid hiding everything behind one opaque number

## Base Scoring Dimensions

Each idea should be scored across at least:

### Demand Score
How clearly the market appears to want a solution.

### Urgency Score
How painful or time-sensitive the problem appears to be.

### Monetisation Score
How likely the audience is to pay.

### Competition Pressure Score
How crowded or difficult the market appears to be.

### Distribution Feasibility Score
How realistic it is to acquire users.

### Build Complexity Score
How difficult the MVP is to build.

### Strategic Fit Score
How well the idea aligns with Patrick’s portfolio and capabilities.

### Defensibility Score
How much room there is for meaningful long-term value.

### Speed to Market Score
How quickly a useful product could be launched.

### Maintenance Burden Score
How heavy the long-term support and complexity load is likely to be.

## Composite Scores

At minimum, each idea should receive:

### Revenue Now Score
Optimised toward:
- speed to market
- monetisation
- urgency
- practical distribution

### Strategic Asset Score
Optimised toward:
- defensibility
- longer-term value
- market depth
- strategic fit

### Balanced Portfolio Score
A blended score for portfolio decision making.

## Output Requirements

For each idea, the system should produce:
- a structured dossier
- dimension-level scores
- composite scores
- explanation of major strengths
- explanation of major weaknesses
- recommendation status

## Approval Recommendation Bands

Suggested recommendation bands:
- reject
- watch
- investigate further
- strong candidate
- approve-ready

## Tuning Direction

Scoring should be configurable over time.

V3 should allow tuning of:
- scoring weights
- portfolio preferences
- minimum approval thresholds
- category-specific adjustments

## Final Principle

Research is only valuable if it produces fewer, stronger, evidence-backed ideas rather than endless plausible noise.