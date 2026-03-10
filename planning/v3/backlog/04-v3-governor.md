# Evolvo V3 Backlog — Governor

## Epic: Governor MVP

### Story: Define governor input surfaces
**Description**  
Specify the data and state surfaces the Governor can consume from each major domain.

**Acceptance Criteria**
- portfolio, research, execution, deployment, commercial, and feedback domains expose governor-readable summaries
- required fields are documented
- missing surfaces are identified

### Story: Implement governor health aggregation
**Description**  
Create the first health aggregation layer for the Governor.

**Acceptance Criteria**
- portfolio health can be summarised
- execution health can be summarised
- research health can be summarised
- outputs are structured and reusable

### Story: Implement governor report format
**Description**  
Create the initial standup-style report shape.

**Acceptance Criteria**
- report includes positives, risks, warnings, and recommendations
- report is human-readable
- report is generated consistently

### Story: Implement warning detection rules
**Description**  
Allow the Governor to identify stalled, weak, or risky states.

**Acceptance Criteria**
- warning rules exist for stalled projects
- warning rules exist for weak research quality
- warning rules exist for unhealthy live products
- warnings include rationale

---

## Epic: Governor Expansion

### Story: Detect weak idea investment
**Description**  
Allow the Governor to identify ideas that should not absorb more effort.

**Acceptance Criteria**
- weak candidates are surfaced
- rationale is traceable to score and evidence quality
- watch/kill suggestions are supported

### Story: Detect portfolio waste
**Description**  
Allow the Governor to identify duplicated effort, stalled assets, or poor capital allocation.

**Acceptance Criteria**
- wasted effort patterns can be flagged
- duplicate or low-value work can be surfaced
- recommendations are prioritised

### Story: Add invest/watch/kill recommendation model
**Description**  
Allow the Governor to explicitly classify portfolio assets by recommended action.

**Acceptance Criteria**
- assets can receive invest/watch/kill signals
- signal generation is explainable
- Governor reports include these outcomes

### Story: Add trend awareness
**Description**  
Allow the Governor to reason across time, not just current state.

**Acceptance Criteria**
- changes over time can be compared
- improvement and decline trends are surfaced
- recommendations reflect trend direction