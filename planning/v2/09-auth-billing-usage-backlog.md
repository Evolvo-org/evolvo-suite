# Access and Usage Backlog

## Goal

Document the internal single-admin access model and the usage visibility required to operate Evolvo v2 safely.

External user accounts, subscriptions, billing, and quota enforcement are out of scope for v1.
Legacy billing references in completed API and web backlog items reflect earlier exploratory scaffolding and do not define remaining v1 scope.

## AUTH-001 - Define auth model
**Status:** done  
**Outcome:** The access model is clear for internal operation.

Access model:
- admin

Tasks:
- [x] Define the single-admin access model
- [x] Define protected admin routes
- [x] Remove multi-role requirements from v1 scope
- [x] Record external account support as post-v1 work if ever needed

## AUTH-002 - Implement login and session support
**Status:** done  
**Outcome:** The admin user can authenticate and maintain session state.

Tasks:
- [x] Add admin login flow
- [x] Add session persistence
- [x] Add logout flow
- [x] Add current-user bootstrap

## AUTH-003 - Harden admin-only access controls
**Status:** done  
**Outcome:** Pages and API actions assume an authenticated admin-only operator model.

Tasks:
- [x] Add API guards for authenticated admin access
- [x] Add web route guards for authenticated admin access
- [x] Remove role-aware UI visibility as a v1 requirement
- [x] Treat access coverage as admin-session coverage rather than role-matrix testing

## BILL-001 - Remove billing from v1 scope
**Status:** done  
**Outcome:** Billing is explicitly not part of the v1 acceptance scope.

Tasks:
- [x] Remove Stripe sandbox as required v1 work
- [x] Remove customer mapping as required v1 work
- [x] Remove subscription modelling as required v1 work
- [x] Remove webhook ingestion as required v1 work
- [x] Remove admin subscription bypass as required v1 work

## BILL-002 - Remove billing UI from v1 scope
**Status:** done  
**Outcome:** Billing visibility is not required for the internal v1 product.

Tasks:
- [x] Remove billing settings as required v1 UI
- [x] Remove current plan display as required v1 UI
- [x] Remove subscription status as required v1 UI
- [x] Remove billing error visibility as required v1 UI

## USAGE-001 - Define usage event schema
**Status:** done  
**Outcome:** Token and cost events are tracked consistently for internal visibility and observability.

Fields should include:
- project id
- user id where applicable
- agent type
- provider
- model
- input tokens
- output tokens
- total tokens
- estimated cost
- timestamp

Tasks:
- [x] Finalise usage schema
- [x] Finalise cost estimation rules
- [x] Define aggregation periods

## USAGE-002 - Persist token usage from all agent runs
**Status:** done  
**Outcome:** Usage is captured from day one.

Tasks:
- [x] Add runtime usage reporting
- [x] Add API persistence
- [x] Add missing-field handling
- [x] Add provider/model normalization

## USAGE-003 - Build usage aggregations
**Status:** done  
**Outcome:** Usage can be queried meaningfully.

Tasks:
- [x] Add by-project aggregation
- [x] Add by-user aggregation
- [x] Add by-agent aggregation
- [x] Add by-provider/model aggregation
- [x] Add date-range filtering

## USAGE-004 - Build usage dashboards
**Status:** done  
**Outcome:** Operators can see what the system costs and where.

Tasks:
- [x] Add usage overview cards
- [x] Add estimated cost chart
- [x] Add project usage breakdown
- [x] Add user usage breakdown
- [x] Add model usage breakdown

## USAGE-005 - Remove quota foundations from v1 scope
**Status:** done  
**Outcome:** Quota enforcement is not part of the internal v1 acceptance scope.

Tasks:
- [x] Remove quota model as required v1 work
- [x] Remove quota calculation hooks as required v1 work
- [x] Remove admin bypass as a quota concern in v1
- [x] Remove quota warning state support as required v1 work

## USAGE-006 - Close the auth/billing commercial track
**Status:** done  
**Outcome:** No separate commercial-readiness backlog remains for v1.

Tasks:
- [x] Remove admin bypass subscription testing from v1 scope
- [x] Remove role-matrix testing from v1 scope
- [x] Remove subscription state handling tests from v1 scope
- [x] Track usage correctness in the normal API and web test suites
