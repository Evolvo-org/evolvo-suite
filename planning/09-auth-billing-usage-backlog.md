# Auth, Billing, and Usage Backlog

## Goal

Build real auth and usage foundations now so Evolvo v2 can evolve into a paid platform later without re-architecture.

## AUTH-001 - Define auth model
**Status:** todo  
**Outcome:** User, role, and access concepts are clear.

Roles:
- admin
- operator
- reviewer
- viewer

Tasks:
- [ ] Define role capabilities
- [ ] Define protected routes
- [ ] Define admin bypass rules

## AUTH-002 - Implement login and session support
**Status:** todo  
**Outcome:** Users can authenticate and maintain session state.

Tasks:
- [ ] Add login flow
- [ ] Add session persistence
- [ ] Add logout flow
- [ ] Add current-user bootstrap

## AUTH-003 - Add role-based access controls
**Status:** todo  
**Outcome:** Pages and API actions respect role permissions.

Tasks:
- [ ] Add API guards
- [ ] Add web route guards
- [ ] Add role-aware UI visibility
- [ ] Add permission tests

## BILL-001 - Add Stripe sandbox foundation
**Status:** todo  
**Outcome:** Billing scaffolding exists without blocking admin use.

Tasks:
- [ ] Add Stripe sandbox config
- [ ] Add customer mapping
- [ ] Add subscription model
- [ ] Add webhook ingestion
- [ ] Add admin subscription bypass

## BILL-002 - Add billing visibility UI
**Status:** todo  
**Outcome:** Subscription state is visible in web.

Tasks:
- [ ] Add billing settings page
- [ ] Add current plan card
- [ ] Add subscription status query
- [ ] Add billing errors visibility

## USAGE-001 - Define usage event schema
**Status:** todo  
**Outcome:** Token and cost events are tracked consistently.

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
- [ ] Finalise usage schema
- [ ] Finalise cost estimation rules
- [ ] Define aggregation periods

## USAGE-002 - Persist token usage from all agent runs
**Status:** todo  
**Outcome:** Usage is captured from day one.

Tasks:
- [ ] Add runtime usage reporting
- [ ] Add API persistence
- [ ] Add missing-field handling
- [ ] Add provider/model normalization

## USAGE-003 - Build usage aggregations
**Status:** todo  
**Outcome:** Usage can be queried meaningfully.

Tasks:
- [ ] Add by-project aggregation
- [ ] Add by-user aggregation
- [ ] Add by-agent aggregation
- [ ] Add by-provider/model aggregation
- [ ] Add date-range filtering

## USAGE-004 - Build usage dashboards
**Status:** todo  
**Outcome:** Operators can see what the system costs and where.

Tasks:
- [ ] Add usage overview cards
- [ ] Add estimated cost chart
- [ ] Add project usage breakdown
- [ ] Add user usage breakdown
- [ ] Add model usage breakdown

## USAGE-005 - Add quota foundations
**Status:** todo  
**Outcome:** The system is ready for future plan-based enforcement.

Tasks:
- [ ] Add quota model
- [ ] Add quota calculation hooks
- [ ] Add admin bypass
- [ ] Add warning state support

## USAGE-006 - Add auth and billing tests
**Status:** todo  
**Outcome:** Commercial foundations are stable.

Tasks:
- [ ] Test admin bypass
- [ ] Test role enforcement
- [ ] Test subscription state handling
- [ ] Test usage aggregation correctness