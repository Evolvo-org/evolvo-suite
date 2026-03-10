# Evolvo V3 Backlog — Aftercare and Feedback

## Epic: Feedback Ingestion

### Story: Define feedback signal model
**Description**  
Create the core data model for aftercare signals.

**Acceptance Criteria**
- feedback supports source type, summary, sentiment, severity, recurrence, classification, and recommendation
- feedback links to the relevant project/product
- raw and processed views are supported

### Story: Add ingestion contracts for feedback sources
**Description**  
Allow feedback to be ingested from multiple channels consistently.

**Acceptance Criteria**
- contracts are defined for adding new feedback sources
- signals can be normalised into the common model
- malformed inputs can be rejected safely

### Story: Add recurrence detection
**Description**  
Identify repeated issues and requests across signals.

**Acceptance Criteria**
- similar signals can be clustered
- recurrence counts are stored
- repeated issues are prioritised above isolated noise

### Story: Add severity handling
**Description**  
Allow serious issues to be prioritised quickly.

**Acceptance Criteria**
- severity can be represented and updated
- high-severity issues surface clearly
- Governor can consume severity data

---

## Epic: Feedback Classification and Routing

### Story: Classify feedback into action categories
**Description**  
Classify signals into bug, UX friction, feature request, monetisation issue, onboarding issue, retention risk, support pain, and trust/reliability issue.

**Acceptance Criteria**
- every classified signal has a category
- uncertain signals can be marked appropriately
- category can be revised

### Story: Create prioritisation rules
**Description**  
Prioritise actionable feedback based on severity, recurrence, and strategic value.

**Acceptance Criteria**
- prioritisation logic is documented
- high-value signals rise above noise
- prioritisation output is queryable

### Story: Route validated signals into project work
**Description**  
Allow aftercare outputs to feed back into active execution.

**Acceptance Criteria**
- validated items can be converted into project work
- links back to the source feedback are preserved
- feedback-driven work is visible in the portfolio

### Story: Create product feedback health view
**Description**  
Summarise post-launch product health.

**Acceptance Criteria**
- recurring issue trends are visible
- positive vs negative signal balance is visible
- products needing urgent attention are identifiable