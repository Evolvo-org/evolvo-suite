# Evolvo V3 Backlog — Research and Opportunity Intelligence

## Epic: Research Memory

### Story: Create evidence store
**Description**  
Store raw research evidence with source metadata and traceability.

**Acceptance Criteria**
- evidence records support source type, URL, timestamp, excerpt, and confidence
- evidence can be queried by source and category
- raw evidence is retained for auditability

### Story: Create pain-point store
**Description**  
Create a structured store for normalised pain points derived from evidence.

**Acceptance Criteria**
- pain points support audience, severity, urgency, workaround, and confidence
- linked evidence count is tracked
- duplicate pain points can be merged or linked

### Story: Create opportunity cluster model
**Description**  
Represent grouped areas of recurring related pain.

**Acceptance Criteria**
- clusters can link to multiple pain points
- clusters track evidence density and confidence
- clusters support threshold evaluation

### Story: Add semantic retrieval layer
**Description**  
Add embeddings/vector support for clustering, deduplication, and semantic search.

**Acceptance Criteria**
- semantic similarity search is available
- duplicate/similar evidence can be identified
- vector support complements structured storage

---

## Epic: Continuous Research Worker

### Story: Implement source ingestion contracts
**Description**  
Define the interfaces for research source ingestion.

**Acceptance Criteria**
- ingestion contracts are documented
- new sources can plug in consistently
- extracted data maps cleanly into the evidence model

### Story: Implement evidence extraction pipeline
**Description**  
Extract usable evidence from ingested research material.

**Acceptance Criteria**
- extracted outputs are structured
- malformed evidence is rejected or quarantined
- extraction confidence is recorded

### Story: Implement deduplication logic
**Description**  
Reduce repeated noise in evidence collection.

**Acceptance Criteria**
- exact duplicates are suppressed
- near-duplicates can be flagged or merged
- dedupe behaviour is measurable

### Story: Implement confidence scoring rules
**Description**  
Add confidence scoring for evidence and derived pain points.

**Acceptance Criteria**
- evidence records include confidence
- low-confidence material can be filtered
- confidence contributes to cluster quality

---

## Epic: Opportunity Intelligence

### Story: Define opportunity threshold rules
**Description**  
Specify what makes a cluster strong enough to become an idea candidate.

**Acceptance Criteria**
- threshold rules consider evidence count, source diversity, audience clarity, urgency, and monetisation signals
- threshold logic is documented
- weak clusters do not proceed automatically

### Story: Generate idea dossiers from qualified clusters
**Description**  
Create structured product opportunity dossiers from strong clusters.

**Acceptance Criteria**
- dossiers include problem, audience, MVP shape, risks, alternatives, and monetisation hypothesis
- each dossier references source clusters
- dossiers are stored for approval review

### Story: Rank opportunity candidates
**Description**  
Create ranked output of candidate opportunities.

**Acceptance Criteria**
- ranking uses scorecards
- ranking includes rationale
- strongest candidates are surfaced clearly