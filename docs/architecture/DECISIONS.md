# Architecture decisions

| ID | Decision | Rationale | Status |
|---|---|---|---|
| ADR-001 | Use a modular monolith for the POC | Workflow is easier to demonstrate and test without microservice overhead | POC decision; production stack pending |
| ADR-002 | Use deterministic backend pricing | Pricing must be repeatable and auditable; no AI/LLM prices or approvals | Confirmed by specification |
| ADR-003 | Use local JSON persistence in the runnable demo | No SQL Server connection or repository was provided | Development-only adapter |
| ADR-004 | Keep Salesforce as opportunity/lifecycle source of truth | Price Track owns pricing cases, drafts, versions, rates, approvals and audit | Confirmed by specification |
| ADR-005 | Treat Project Track as downstream delivery owner | Price Track publishes an eligible commercial version and records acknowledgement | Integration contract pending |
| ADR-006 | Use mock integration adapters until contracts/credentials exist | Avoids misrepresenting untested connections as live | Confirmed by specification |
| ADR-007 | Keep Finance formula and thresholds visibly unapproved | Finance policy is unresolved | Pending stakeholder decision |
| ADR-008 | Use a demo identity selector | Enables local role walkthrough without credentials | Local-only; replace with Entra ID |
| ADR-009 | Snapshot submitted versions | Future rate/rule changes must not mutate submitted historical values | Implemented in POC workflow |


## Master-spec foundation decisions (13 October 2026)

- ADR-010: The 13 Oct master takes precedence over earlier CP editing, create-draft-version and pre-Closed-Won handoff demos. CP is read-only in Price Track; an explicit mock Salesforce request route handles intake. Sales/Pricing Analyst prepares proposals.
- ADR-011: Adopt sql.js SQLite as local default without Docker. Import JSON once without modifying it. SQL core projections protect key constraints and snapshots; broad normalization and SQL Server compatibility remain unfinished. Preserve the current runnable monolith during this slice; React/TypeScript and NestJS migration remains required.
- ADR-012: Serialize local API requests around body reading and transactional persistence. This prevents single-process save/submit interleaving. It is not a tested multi-instance concurrency strategy.
- ADR-013: New formal versions are created only on submission. Pending-version default is block; explicit demo supersession cancels old pending tasks. This configuration is not production policy approval.
- ADR-014: Queue handoff with Closed Won in the same saved state. Receiver acceptance is independent. Reopening retains prior history and holds downstream replacements pending reconciliation. Amendment authoring is disabled.
- ADR-015: Preserve existing hourly demo formulas after inspecting the supplied Margin Calculator workbook. The workbook's sample onshore cost includes billability; the current demo cost uses scheduled hours, so no parity is claimed. Separate demo strategy IDs do not establish Program/Product financial correctness. Production startup/submission remains blocked until Finance and security gates are verified.

- ADR-016: Demo Administrator commercial access and approval override are separate explicit grants. The seeded walkthrough Administrator has both; generic Admin role membership alone grants neither confidential case visibility nor approval override. Production administrative capability separation remains unfinished.
