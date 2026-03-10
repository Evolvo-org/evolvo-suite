# Evolvo V3 Product Definition

## Purpose

This document defines the Product Definition layer in Evolvo V3.

Its job is to transform an approved idea into an execution-ready project that can be handed to the Evolvo V2 execution engine without ambiguity.

This is the bridge between:
- opportunity intelligence
- approval
- delivery execution

Without this layer, the system would jump too quickly from idea approval to building.

## Why This Layer Exists

Research and scoring identify what might be worth building.

Approval decides whether it should be pursued.

Product Definition decides exactly:
- what is being built
- for whom
- in what initial scope
- with what constraints
- in what execution shape

It converts an approved opportunity into a concrete product plan.

## Inputs

The Product Definition layer should consume:

- approved idea dossier
- scorecard
- linked opportunity cluster context
- linked pain-point summary
- monetisation hypothesis
- deployment assumptions
- approval notes from Patrick

Optional future inputs:
- preferred stack hints
- target launch window
- budget/time constraints
- portfolio strategy notes

## Outputs

The Product Definition layer should produce an execution-ready package containing:

- product definition summary
- MVP scope
- target user and ICP
- core workflows
- success criteria
- non-goals
- technical direction
- architectural assumptions
- commercial assumptions
- deployment assumptions
- initial milestones
- project bootstrap metadata

This package becomes the canonical handoff into V2 execution.

## Definition Principles

### Approved ideas are not specs
An idea dossier is not enough to build from directly.

### Scope must be constrained
The Product Definition layer must aggressively shape a realistic MVP.

### Every product must have a user
The target audience must be explicit and specific.

### Every MVP must have a job
The system must describe the core job the product performs.

### Execution should start with clarity
The output must reduce ambiguity for downstream planning/build agents.

## Suggested Output Structure

### 1. Product Summary
A short explanation of:
- what the product is
- who it is for
- what pain it solves
- why now

### 2. Target Audience
Define:
- primary user
- secondary user if relevant
- user context
- user pain and motivation

### 3. Problem Statement
Describe:
- the recurring pain
- the current bad alternatives
- the cost of the problem remaining unsolved

### 4. MVP Definition
Define:
- what the first version must do
- what the first version must not do
- minimum success outcome for launch

### 5. Core Workflows
List the critical user flows the MVP must support.

### 6. Functional Scope
A structured feature list for the first execution cycle.

### 7. Non-Goals
Explicitly define what is not included in the MVP.

### 8. Commercial Assumptions
Summarise:
- expected pricing shape
- trial assumptions
- user conversion assumptions

### 9. Deployment Assumptions
Summarise:
- deployment target
- domain assumptions
- environment assumptions

### 10. Technical Direction
Summarise:
- likely stack
- major integration assumptions
- data/storage expectations
- obvious technical risks

### 11. Milestones
Define the execution stages that V2 should plan against.

### 12. Launch Readiness Conditions
Define what must be true before production launch approval can be requested.

## MVP Shaping Rules

The Product Definition layer should reduce scope by default.

When shaping an MVP, it should prefer:
- one clear user
- one primary problem
- one strong workflow
- one coherent launch path

It should avoid:
- broad marketplaces
- multi-sided complexity too early
- excessive admin systems in v1
- speculative expansion features

## Handoff to V2

Once the Product Definition layer completes its work, it should create a new project bootstrap payload.

Suggested bootstrap contents:
- project name
- origin idea id
- product definition document reference
- lifecycle state
- initial milestone structure
- execution constraints
- deployment target flag
- commercial prep flag

This new project then enters the V2 execution engine.

## Acceptance Criteria

The Product Definition layer is working when:

- approved ideas consistently become structured, execution-ready projects
- MVP scope is clear and constrained
- downstream planning/build work starts with minimal ambiguity
- project origin remains traceable back to the idea and evidence
- launch and commercial assumptions are included early rather than bolted on later

## Final Principle

The Product Definition layer exists to ensure Evolvo V3 does not build from vague opportunity energy.

It builds from approved, shaped, constrained product definitions that are ready for disciplined execution.