# Evolvo V3 Backlog — Deployment and Commercialisation

## Epic: Hetzner Deployment

### Story: Define deployment state model
**Description**  
Implement the deployment state model for V3 products.

**Acceptance Criteria**
- states include not prepared, plan ready, awaiting approval, deploying, deployed, unhealthy, rollback required
- state transitions are documented
- deployment health can be surfaced

### Story: Create deployment worker contracts
**Description**  
Define the worker interfaces for project deployment.

**Acceptance Criteria**
- deployment worker responsibilities are explicit
- contracts include environment inputs and deployment outputs
- deployment results can be audited

### Story: Add environment template support
**Description**  
Allow projects to deploy using standard reusable environment templates.

**Acceptance Criteria**
- environment templates are versionable
- secrets and config are separately handled
- projects can map cleanly to templates

### Story: Add post-deploy verification hooks
**Description**  
Validate health after deployment.

**Acceptance Criteria**
- post-deploy checks can run automatically
- unhealthy deployments are detected
- deployment state updates reflect verification results

### Story: Add rollback metadata and workflow
**Description**  
Prepare for safe recovery from bad deployments.

**Acceptance Criteria**
- rollback conditions are defined
- rollback metadata is stored
- rollback actions can be initiated intentionally

---

## Epic: Domain Workflow

### Story: Generate domain suggestions
**Description**  
Produce domain suggestions for approved products.

**Acceptance Criteria**
- suggestions are linked to the project/product
- shortlistable candidates are produced
- proposals can be reviewed before action

### Story: Create domain approval request model
**Description**  
Stage domain actions for approval.

**Acceptance Criteria**
- proposed domain action is auditable
- approval is required for purchase execution
- rejected suggestions are tracked

### Story: Link domains to portfolio assets
**Description**  
Track domain assignment and status per product.

**Acceptance Criteria**
- products can reference assigned domains
- domain state is visible in the portfolio
- multiple suggestions can exist before final assignment

---

## Epic: Commercialisation and Stripe Preparation

### Story: Generate pricing proposals
**Description**  
Create draft pricing tiers and subscription structure proposals.

**Acceptance Criteria**
- proposals include tier names, value segmentation, and pricing assumptions
- proposals are linked to the project/product
- proposals are reviewable before live action

### Story: Create Stripe draft configuration model
**Description**  
Represent prepared Stripe configuration before approval.

**Acceptance Criteria**
- draft products and prices can be modelled
- draft config maps back to the project
- live state is separate from draft state

### Story: Create Stripe approval workflow
**Description**  
Require approval before live Stripe configuration is created.

**Acceptance Criteria**
- approval request shows what will be created
- execution only occurs after approval
- audit history is preserved

### Story: Track commercial readiness
**Description**  
Expose product readiness for monetisation.

**Acceptance Criteria**
- commercial states are visible in the portfolio
- products can be identified as commercially incomplete
- Governor can consume commercial readiness