# Evolvo V3 Deployment and Commercialisation

## Purpose

This document defines how Evolvo V3 should prepare and launch approved products once they have been built through the V2 execution engine.

The focus is:
- Hetzner deployment
- domain workflow support
- pricing proposal generation
- Stripe setup preparation
- approval-gated live actions

## Deployment Direction

### Primary hosting target
Patrick’s Hetzner account.

### Deployment goals
- standardised hosting model
- repeatable project deployment
- environment consistency
- safe rollback
- visible deployment health
- project-to-domain mapping

## Deployment Requirements

### Project deployment state
Each project should track:
- not prepared
- deployment plan ready
- awaiting approval
- deploying
- deployed
- unhealthy
- rollback required
- archived

### Environment handling
Each project should support:
- reusable environment templates
- secret injection
- environment-specific configuration
- health-check configuration
- deploy metadata

### Operational requirements
The deployment system should support:
- health checks
- deployment logs
- rollback metadata
- post-deploy verification
- mapping between project and deployed product state

## Domain Workflow

### Role
Domain handling should be preparation-first and approval-gated for real purchases.

### Domain workflow stages
- generate suggestions
- check suitability/fit
- prepare shortlist
- await approval
- execute purchase
- assign to project
- configure routing

### Domain requirements
The system should support:
- domain suggestion generation
- project/domain association
- purchase preparation state
- approval-gated execution
- status tracking for assigned domains

## Commercialisation Workflow

### Goal
Allow V3 to prepare launch-ready pricing and subscription structures before Patrick approves live setup.

### Pricing preparation should include
- product naming
- pricing tier proposals
- value segmentation
- subscription structure proposals
- trial recommendations
- billing notes

### Stripe preparation should include
- draft product configuration
- draft price configuration
- subscription shape preparation
- metadata mapping back to project

### Live Stripe actions
Live Stripe creation must require approval.

## Commercial State Model

Each project/product should track commercial state such as:
- not prepared
- pricing proposal ready
- Stripe draft ready
- awaiting approval
- live commercial entities created
- billing wired
- launched

## Approval Principle

The system may automatically:
- suggest domains
- prepare domain actions
- propose pricing tiers
- generate Stripe draft structures

The system may not automatically:
- purchase domains
- create live Stripe billable entities
- switch products into live monetised state

Those actions must require approval.

## Final Principle

Deployment and commercialisation should move products from “built” to “launch-ready” in a standard, auditable, low-friction way without removing Patrick’s control over risky or costly actions.