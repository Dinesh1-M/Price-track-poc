# PRICE TRACK — MASTER PRODUCT, ARCHITECTURE & CODEX BUILD INSTRUCTIONS

**Version:** 1.0 | **Date:** 13 October 2026 | **Audience:** Codex, developers, QA, product owners, Finance, Sales, BU stakeholders, IT

> **Status convention:** `CONFIRMED` = explicitly decided in discovery; `SOURCE` = present in the 9 Oct enterprise build specification or supplied workbook; `PROPOSED` = engineering recommendation, subject to validation; `PENDING` = not approved. Never turn a proposed rule into a claimed business decision.

## 0. Purpose and success criteria

Build a **complete, deployable, secure, maintainable enterprise Price Track product**, not a static mockup. It manages Salesforce-initiated pricing cases, resource planning, contractual and cost-based rates, Excel-equivalent financial calculations, exceptions, separate working drafts, immutable submitted versions, sequential approvals, negotiation changes, Closed Won validation, and acknowledged Project Track handoff. Deliver working code, migrations, tests, documentation, and deployment artifacts. Local development **must work on Windows without Docker** using SQLite/sql.js; **SQL Server is the intended production database**. Containerization/Azure deployment readiness must be built and tested later.

**Completion is not demonstrated by screenshots.** An end-to-end test must exercise persistence, backend authorization, financial calculations, approval, audit and integration failure paths. Do not claim production-ready until SQL Server, enterprise identity, security, disaster recovery, and real integration tests are completed.

## 1. Authoritative inputs and precedence

Read, in order, and record inconsistencies:
1. This document, for the **latest user-confirmed decisions**.
2. `reference/Price_Track_Enterprise_Codex_Build_Spec.md` (9 Oct 2026) for comprehensive source requirements and acceptance criteria.
3. `reference/Margin Calculator_new.xlsx` for **existing formulas and reference prices/costs**, with exact cell-level traceability.
4. `docs/FORMULA_REGISTER.csv`, if present, as an extracted index **not proof of formula correctness**.
5. `reference/Salesforce sythetic data.xlsx` for synthetic demo opportunity fields; validate mappings, do not treat as a live Salesforce contract.
6. Current repository code, migrations, tests and README; preserve working code.

When requirements conflict, log the conflict in `docs/PENDING_DECISIONS.md` with source, impact, owner and proposed resolution. Do not silently choose a business policy. For technical choices, record rationale in `docs/architecture/DECISIONS.md`.

## 2. Confirmed business decisions (13 Oct 2026)

| Topic | Confirmed requirement |
|---|---|
| Product | End-to-end, deployable enterprise application; build from scratch/extend supplied starter |
| Development | Windows laptop, VS Code, Codex; **no Docker required initially** |
| Stack direction | Align with Project Track's TypeScript/JavaScript/Node; React/TypeScript frontend, NestJS/Node backend; SQL Server production |
| Local database | SQLite via `sql.js` initially; DB provider configurable; no claim of SQL Server parity without SQL Server testing |
| UI | C5i-inspired corporate purple/white, desktop-first, responsive, executive-quality |
| Excel | **Preserve workbook calculations exactly** until Finance explicitly approves changes |
| Selling rates | Support **contractual client/standard rate cards** and **cost-based target pricing** |
| Costs | Initially role + grade + location-based, not employee-specific |
| Work types | Fully implement T&M, FTE, Program, Product, including mixed cases |
| Case ownership | Sales/Pricing team prepares pricing; BU SPOC validates resource estimates; Finance governs rates and costs |
| Client Partner intake | Salesforce **Request Pricing** only; Price Track read-only, own accounts/requests only; not involved in pricing tasks or approvals |
| Changes | Support changes throughout **pre-Closed-Won** lifecycle |
| Draft/version | Autosave/manual draft edits do **not** create formal versions; only submission/resubmission does |
| Parallel edits | While submitted version is under approval, allow a **separate working draft** without mutating submitted snapshot |
| Approvals | Configurable policy combining CM deterioration, deal value, discounts, exception types; sequential |
| Closed Won | Mark Closed Won; authorized administrators may reopen pricing with reason and audit; reopening cannot erase history |
| Project Track | Initial handoff after Closed Won; design approved-amendment event support, but post-Closed-Won amendment business process is not yet approved for release |
| External systems | Use explicit mock Salesforce/Project Track/identity/HR adapters until real access is supplied |
| Deployment | Portable, Azure likely but not confirmed; must prepare production deployment assets |

### Critical interpretation: post-Closed-Won

Two discovery answers must not be conflated: (a) first release supports pre-Closed-Won commercial changes; (b) desired Project Track contract eventually handles approved amendments. **Implement first-release Closed Won handoff and audited administrator reopen.** Design a versioned `CommercialAmendment` event/contract and tests for idempotency, but keep the **post-Closed-Won amendment authoring/approval workflow disabled pending business sign-off**. Administrator reopening does not automatically authorize changes to already accepted downstream commercial data; reconciliation and reapproval are required before any replacement handoff.

## 3. Roles, authority and field access

Implement **backend-enforced** RBAC + account/BU/case assignments + action/field permissions + explicit delegation. The UI is not a security boundary. Minimum roles:

- **Client Partner (CP):** may trigger pricing through Salesforce only; in Price Track may read *only own assigned account requests/cases* and authorized commercial outputs (quoted rates, revenue, margin, approval status). **No employee costs**, other accounts, pricing editing, internal approval tasks, rate proposals, or admin actions.
- **Sales/Pricing Analyst/Owner:** edit assigned cases/drafts, manage commercial proposals, submit versions, view permitted rates and KPIs; cost visibility requires explicit permission.
- **BU SPOC:** validate resource estimates, resolve assigned rate/resource exceptions and propose rates where authorized; no unilateral Finance rate approval.
- **BU Head:** assigned-account/BU scope is **PENDING** due to conflicting discovery; implement configurable visibility. Approval permissions are separate from visibility.
- **Finance Analyst/Approver:** manage cost/rate governance and Finance tasks only, not blanket Sales/Delivery access; new rate approval requires proposer != approver.
- **CFO / EVP Finance:** overall authorized Finance visibility; exact relative approval powers **PENDING**; special exceptions require CFO per source spec.
- **Sales EVP / executive viewers:** scoped executive reporting/approvals only where policy grants access.
- **Routing Admin / Security Admin / Integration Operator / Rule Admin:** separated administrative privileges; admin role must not automatically grant confidential commercial access.

Test negative cases: CP A cannot list/get CP B's case; guessing an ID cannot reveal existence; CP cannot call write endpoints; Finance cannot read unrelated Sales tasks; restricted cost fields absent from API responses; approver cannot act on unrelated version; delegation expires.

## 4. Business lifecycle and invariants

### 4.1 Main flow

`Salesforce Request Pricing -> idempotent intake -> one case/opportunity -> opportunity snapshot -> configurable assignment -> editable pricing workspace -> resource validation -> rate/cost/FX resolution -> deterministic KPI calculation -> blocking validation -> submit immutable version -> sequential approval -> negotiation/agreement -> Salesforce Closed Won -> durable Project Track handoff -> acknowledgement/reconciliation`.

Support separate renewal path, Salesforce lifecycle changes, cancellation/reopen with reasons, explicit exceptions and history. Do not overwrite Price Track draft or old snapshots from Salesforce updates.

### 4.2 Case, version, draft, approval and handoff are different state machines

- **Case** (proposed): `New`, `InProgress`, `Blocked`, `AwaitingApproval`, `Negotiation`, `Agreed`, `ClosedWon`, `Cancelled`, `Reopened`.
- **Working draft:** `Open`, `ValidationBlocked`, `ReadyToSubmit`, `Archived`; revision token for optimistic concurrency.
- **Formal version:** `Submitted`, `PendingApproval`, `Approved`, `Rejected`, `Superseded`, `Agreed`, `Cancelled` as applicable; **immutable payload and calculation snapshot**.
- **Approval task:** `Pending`, `Approved`, `Rejected`, `Delegated`, `Escalated`, `Cancelled`.
- **Handoff:** `NotEligible`, `Pending`, `Sending`, `Accepted`, `Rejected`, `Retrying`, `Failed`, `Reconciled`.

Centralize permitted transitions in backend services, not scattered frontend conditions. Persist actor, timestamp, reason, correlation ID and event history.

### 4.3 During-approval parallel draft — mandatory behavior

1. Version V1 submitted: immutable snapshot, approval route and tasks tied to V1.
2. Authorized Sales user opens a **separate editable draft** based on V1 while V1 approval continues.
3. Draft changes produce revisioned draft events, recalculated *preview* KPIs and change impact; they do **not** modify V1 or its approval decisions.
4. A new formal V2 is created **only when submitted**. At V2 submission, apply a **documented configurable policy** to outstanding V1 tasks (supersede/cancel/complete): this policy is **PENDING** and must not be guessed for production.
5. No approval from V1 automatically approves V2. Comparison includes inputs, costs, rates, FX, rules, KPIs, reason, submitter and approval changes.
6. Handle concurrent edits, autosave races, stale revisions, simultaneous submission, cost/rate/FX changes and restore with transactions and conflict errors.

### 4.4 Closed Won and reopening

Closed Won requires final **approved AND agreed** version. Persist Salesforce event evidence. Publish Project Track handoff only after Closed Won, with independent accepted status. Authorized admin reopen requires reason and audit, creates appropriate new working state, preserves previous Closed Won and handoff evidence, and triggers an integration reconciliation assessment. Never silently overwrite accepted Project Track data.

## 5. Financial engine and Excel parity — mandatory

**Do not refactor financial semantics until Finance signs off.** Inspect every relevant workbook sheet, cell, named range, lookup, rounding mode, date basis, currency and error handling. Relevant sheets reported in supplied workbook include `Margin_Summary`, `Governance`, `Revenue & Cost_Onshore`, `Revenue & Cost_Offshore`, `Vertical-Based GM Calculation`, `IP_Product Cost`, `Master File - Rate Card`, `Lists`, `Read Me`; verify names in actual file.

Create `docs/finance/FORMULA_TRACEABILITY.md` and machine-readable registry with: formula ID, sheet/cell, original Excel expression, input cells, named ranges, lookup dependencies, currency/units, effective configuration, backend function, status, golden-case input/expected output, tolerance, owner and approval evidence. The provided formula CSV is an **inventory**, not a tested engine.

**Representative expressions previously identified for validation against actual cells** (not blanket rules for all work types):

- `ResourceCost = People × Months × 160 × Billability × HourlyCost` in relevant example lines; **verify exact sheet/cell and units**.
- `TargetRevenue = Cost / (1 - TargetCM)` in relevant margin simulation; handle 100% target/zero denominator according to workbook behavior and a separately surfaced validation state.
- Bench loading and governance thresholds are workbook inputs/lookup results; **do not hard-code** the previously observed 5%, $250k/$1m or 50% as enterprise policy.

**Important:** The enterprise source explicitly says the Finance-approved CM definition, eligible costs, rounding, zero-revenue behavior and pricing-gap formula are pending. Preserve workbook-equivalent results in clearly marked `WORKBOOK_BASELINE / DEMO_UNAPPROVED` mode. Do not claim that Excel parity equals Finance approval. If a workbook formula masks missing data as zero, preserve its numeric behavior in parity mode **and separately raise a visible data-quality exception**; never silently accept missing costs/rates in production mode.

Implement deterministic backend calculation with decimal-safe arithmetic and explicit currency conversions. Snapshot effective rates, costs, FX, hours, formula/rule version and calculation output at submission. Later rate changes never rewrite old snapshots.

### 5.1 Rate and cost resolution

- Valid client-specific contractual rate first when eligible; otherwise approved standard rate **only if configured fallback allows**; ambiguous, expired or missing rate => exception, not invented rate.
- Separately support cost-based target selling price using workbook-equivalent target CM logic, labeled as **scenario/recommendation**, not automatically replacing a contractual rate.
- BU SPOC may propose rate; Finance approves before reuse; proposer cannot approve own proposal.
- Initial costs keyed by role, grade and location, with BU/work type/onshore-offshore/effective dates as applicable; exact authoritative keys **PENDING**.
- FX source, hours/location rules, utilization, COLA and renewal SOW validation must be configurable and effective-dated.

### 5.2 Four work types

Implement **distinct strategy interfaces and real testable behavior** for T&M, FTE, Program and Product, including mixed opportunities. Do not reuse an FTE formula for Program/Product unless workbook evidence or an explicitly marked demo policy supports it. For missing workbook logic, expose a configuration/decision gap, build a **demo-only** calculation strategy, and block production submission until Finance approves. Define per-line quantity/FTE, period, dates, utilization, location, billing basis, rate source and cost source explicitly.

### 5.3 Financial acceptance tests

Golden tests compare backend output with Excel calculated reference values for representative onshore, offshore, mixed, Program, Product, margin simulation, governance and renewal cases. Include rounding, zero/negative revenue, missing lookups, effective dates, conflicting rates, currencies, and target-gap edge cases. Record exact parity coverage and remaining mismatches; **never claim complete parity based on a handful of tests**.

## 6. Resource estimate data model

Required initial fields: BU, work type, role/skill, experience/grade, location, onshore/offshore, hours per period, billable utilization %, start/end date. Support optional/explicitly configurable quantity/FTE, currency, billing period, delivery model, client budget, rate selection and contract identifiers. Resource validation belongs to BU SPOC. Partial allocation and overlapping assignments must not be silently double counted. Maintain line-level provenance, resolved rate/cost status and exception links.

## 7. Approvals and exceptions

- Approval policy dimensions: **CM deterioration**, absolute CM/GM where configured, deal value, discount, BU, work type, exception category. Route sequentially; policy definitions effective-dated and audited.
- Threshold numbers and escalation tiers are **PENDING**; synthetic demo values must be conspicuously labeled.
- Rate approval is **distinct** from pricing-version approval.
- Special exceptions require CFO per source; CFO vs EVP Finance authority remains pending.
- Approval decisions require authenticated eligible backend action, task/version binding, decision reason on rejection, audit and SLA handling.
- Missing owner, rate, cost, FX, utilization/SOW, approval route, stale draft, Salesforce sync and Project Track failure create explicit exceptions with type, severity, owner, blocking scope, timestamps and resolution notes. Block only dependent steps.
- Email/Teams/in-app notification adapters; separate notification delivery from task completion. Use durable outbox and configurable reminders/escalations.

## 8. Integration contracts and reliability

### Salesforce

System of record for opportunities and sales lifecycle. Mock gateway for local development: `Request Pricing`, opportunity snapshot, lifecycle updates, duplicate events, cancellation/reopen and reconciliation. Exactly one case per Salesforce opportunity ID; unique database constraint and idempotency key. CP authorization at Salesforce intake is sufficient; no separate Price Track login required merely to request pricing. CP may use read-only Price Track access when authenticated appropriately.

### Project Track

Downstream delivery system; Price Track **does not** implement delivery management. After final approved/agreed version is linked to Salesforce Closed Won, publish versioned commercial payload with opportunity/case/version identifiers, commercial lines, currency, dates, rule references and correlation/idempotency keys. Actual payload fields, auth and API are **PENDING** Project Track confirmation.

Implement mock receiver scenarios: accepted, validation rejected, transient timeout, duplicate, retry exhaustion. Persist outbox message and business transition transactionally, retry with backoff, distinguish `ClosedWon` from `HandoffAccepted`, expose operator monitor and safe replay/reconciliation. Future amendment event schema may be drafted but not silently activated.

### Other systems

Microsoft Entra ID production SSO; local demo identities **only in non-production**. HR/MNH cost and Famstack/SOW utilization are future adapters, with explicit mock status and unresolved contracts. Do not store secrets in Git or expose integration payloads to unauthorized roles.

## 9. Recommended technical implementation

**Target:** npm workspaces monorepo, React + TypeScript + Vite frontend, NestJS + TypeScript REST backend, TypeORM or current working SQL Server-compatible persistence adapter, SQL Server production, SQLite `sql.js` local. Reuse current repository patterns where working. API contracts with OpenAPI and request validation. Avoid premature microservices.

Suggested folders:

```text
apps/web/                 React UI, role-based routes, pricing wizard, dashboards
apps/api/                 NestJS modules/controllers/services
packages/contracts/      Shared API schemas/types (create if useful)
packages/pricing/        Pure deterministic pricing strategies (create if useful)
db/migrations/sqlite/    Local development migrations
db/migrations/mssql/     Reviewed SQL Server migrations
docs/architecture/       Assessment, ADRs, domain/state diagrams
docs/finance/            Formula traceability, parity evidence
docs/api/                OpenAPI and integration payloads
docs/testing/            Test plan and real test reports
docs/runbooks/           Setup, deploy, restore, incident handling
reference/               Original MD spec, XLSX workbooks, synthetic data
scripts/                 Windows startup, smoke tests, seed, verification
```

**No Docker local path:** Node.js LTS, npm, Windows PowerShell, VS Code; `DB_PROVIDER=sqlite`, `SQLITE_PATH=./data/price-track.sqlite`. Use the repository's actual scripts. SQLite must persist between restarts and have migration/seed strategy. Never use `synchronize:true` in production. For SQL Server, add provider-specific migrations and test isolation/decimal/date/transaction behavior. Avoid SQL dialect assumptions. SQLite local tests are **not** proof of SQL Server deployment compatibility.

Security: authentication middleware, account-scoped queries, field-level DTO filtering, permission service, CSRF/CORS strategy appropriate to auth mode, rate limits, input validation, structured logs with redaction, audit append-only semantics, secrets via environment/approved vault, security headers and dependency scanning.

Deployment: multi-stage production builds, container assets **optional to run locally** but provided for later use, Azure-compatible environment configuration, migrations, health/readiness endpoints, structured monitoring, backup/restore plan, rollback plan and CI/CD. Final Azure target pending IT approval.

## 10. UI product map

C5i-inspired purple/white corporate system; accessible contrast, keyboard support, loading/empty/error states, responsive desktop-first layout. All displayed data and actions must respect backend permissions.

1. **Client Partner read-only portal:** own account requests, opportunity details, authorized quoted rates/revenue/margin and status; no pricing editing or internal sensitive data.
2. **Sales/Pricing dashboard:** assigned cases, blockers, due tasks, conversion funnel, commercial KPIs.
3. **Guided pricing workspace:** opportunity summary -> classification/work types -> resource estimates -> line-level rate/cost resolution -> scenario comparison -> validation -> submit.
4. **BU SPOC validation inbox:** resource lines, clarifications, assigned exceptions.
5. **Finance governance:** rates, costs, FX, rule sets, new-rate proposals, finance approval tasks.
6. **Approval inbox:** sequential tasks, decision evidence, comments, SLA.
7. **Draft/version compare:** simultaneous working draft and immutable pending version, highlighted financial and scope deltas.
8. **Exceptions and workflow tracker:** owner, blocker, next action, escalation.
9. **Executive dashboards:** authorized BU/account aggregation, revenue, cost/margin visibility by field permission, risk exposure.
10. **Integration monitor:** Salesforce and Project Track event/acknowledgement status, retry/replay permissions.
11. **Restricted administration:** routing, account mapping, user/delegation, thresholds, configuration, pending business decisions and audit.

Do not create a standalone rate-card tab *inside each case*; show line-level resolution in resource estimates and separate restricted central rate administration.

## 11. Persistence entities and hard constraints

At minimum: `UserIdentity`, `UserRoleAssignment`, `AccountAccess`, `BusinessUnit`, `CaseAssignment`, `Delegation`, `PricingCase`, `OpportunitySnapshot`, `DraftSection`, `ResourceEstimateLine`, `PricingVersion`, `PricingVersionLine`, `RateRecord`, `RateProposal`, `CostRecord`, `FxRate`, `HoursRule`, `UtilizationRule`, `PricingRuleSet`, `ApprovalPolicy`, `ApprovalTask`, `ApprovalDecision`, `ExceptionRecord`, `Comment`, `NotificationOutbox`, `IntegrationMessage`, `ProjectTrackHandoff`, `AuditEvent`, `ConfigurationChange`.

Constraints: unique opportunity ID per case; version number unique per case; immutable submitted snapshot; approval task belongs to version and step; self-rate-approval forbidden; agreement requires approval; Closed Won requires approved+agreed final version; handoff idempotent per case/version/event; cancellation/reopen append audit rather than delete; edits guarded by revision/ETag; cross-account access always denied.

## 12. API baseline (adapt naming to repository; publish OpenAPI)

```text
POST   /api/v1/pricing-requests
GET    /api/v1/cases
GET    /api/v1/cases/:id
GET    /api/v1/cases/:id/draft
PUT    /api/v1/cases/:id/draft/sections/:sectionKey
POST   /api/v1/cases/:id/resource-lines
PATCH  /api/v1/cases/:id/resource-lines/:lineId
POST   /api/v1/cases/:id/calculate
POST   /api/v1/cases/:id/validate-submission
POST   /api/v1/cases/:id/versions
GET    /api/v1/cases/:id/versions
GET    /api/v1/cases/:id/versions/compare
POST   /api/v1/versions/:id/approval-tasks/:taskId/approve
POST   /api/v1/versions/:id/approval-tasks/:taskId/reject
POST   /api/v1/versions/:id/mark-agreed
POST   /api/v1/cases/:id/reopen
POST   /api/v1/cases/:id/cancel
POST   /api/v1/rates/proposals
POST   /api/v1/rates/:id/approve
GET    /api/v1/exceptions
POST   /api/v1/exceptions/:id/resolve
POST   /api/v1/salesforce-lifecycle-events
POST   /api/v1/integrations/project-track/handoffs
POST   /api/v1/integrations/project-track/acknowledgements
GET    /api/v1/integrations/project-track/handoffs/:id
GET    /api/v1/health
```

Every endpoint: validated schema, explicit permission, stable error code, appropriate 401/403/409, correlation ID, audit where material, idempotency on external commands. Do not leak another account's record existence.

## 13. Work plan and acceptance gates for Codex

### Phase 0 — Repository inspection and repair

Inspect repository, git status, package scripts, dependencies, actual API/SQLite setup, tests and source files. Produce `docs/architecture/REPOSITORY_ASSESSMENT.md`. Verify `npm install`, `npm test`, `npm run build`, `npm run dev` and smoke tests **on the actual environment**; fix failures without destructive rewrites. The current starter is a foundation, not a completed product.

**Gate:** frontend and API boot without Docker, health endpoint works, persistent SQLite case creation and duplicate protection demonstrated, test logs recorded.

### Phase 1 — Identity, authorization and core persistence

Implement demo identities, account filtering, role/action/field policy service, migrations, case assignments, snapshots, audit, configuration and seed data.

**Gate:** automated negative API tests prove CP isolation and no unauthorized costs/edits.

### Phase 2 — Salesforce intake and case lifecycle

Implement mock opportunity gateway, duplicate/idempotent request handling, lifecycle event history, cancellation/reopen, assignments and exceptions.

**Gate:** same opportunity -> one case; cross-account conflict; lifecycle updates preserved and audited.

### Phase 3 — Excel parity and resource engine

Inspect original workbook; generate formula traceability; implement golden test fixtures; build rate/cost/FX/hours providers and four work-type strategies; implement mixed estimates, missing-data exceptions, target pricing and KPI summaries.

**Gate:** traceable parity report with passing and failing cases; demo-only/unapproved formulas visibly labeled; all four models exercised.

### Phase 4 — Drafts, parallel editing and versions

Implement section autosave, optimistic concurrency, immutable submission, draft during approval, comparison, restore, negotiation change reasons and stale data conflict handling.

**Gate:** V1 remains unchanged while draft changes; V2 created only on submission; approvals never copied; concurrency conflict reproduced.

### Phase 5 — Approvals, rate governance, notifications

Configurable sequential approval policies, rate proposal and Finance approval, task eligibility, SLA reminders, outbox, exceptions, delegation and audit.

**Gate:** approval and rejection/resubmission work; self-approval blocked; exceptions route correctly; threshold policy is data-driven.

### Phase 6 — Closed Won and Project Track

Approved+agreed Closed Won validation, mock handoff, durable outbox, retry/acknowledgement, rejection, replay/reconciliation, integration monitor, audited admin reopen.

**Gate:** accepted and failed handoff scenarios tested; Closed Won != accepted; duplicates do not create duplicate downstream intake.

### Phase 7 — UI completeness, security and deployment

Complete role-based C5i UI, accessibility, dashboards, admin screens, reporting, OpenAPI, SQL Server migrations and compatibility tests, container/deployment assets, logging, security scans, backup/restore and release runbooks.

**Gate:** full browser E2E happy/failure paths, verified SQL Server migration tests, documented Azure deployment option, security and operational sign-off checklist.

### Phase 8 — Team handover

Deliver architecture diagrams, API specs, ERD, formula parity report, test report, demo script, deployment guide, limitations, decision log and exact remaining integration steps. Report **implemented / partially implemented / not implemented** truthfully.

## 14. Demo scenarios required

- Existing client: valid client rate + standard fallback line.
- New client: standard rates; client rate absent.
- Mixed FTE offshore + Program onshore; Product and T&M examples.
- Renewal: COLA rule and missing SOW utilization exception.
- Missing SPOC; missing/expired/conflicting rate; missing cost/FX.
- New rate proposed by BU SPOC, approved by Finance; self-approval rejected.
- Pricing V1 submitted, parallel draft edited, V1 approval continues, V2 submitted; version compare.
- Rejection/resubmission, approved offer renegotiation and margin deterioration escalation.
- CP A cannot see CP B's account or costs.
- Salesforce duplicate intake, lifecycle cancellation and admin reopening.
- Closed Won with accepted Project Track handoff; timeout/retry, rejection and exhausted-retry exception.

## 15. Definition of done — release checklist

- [ ] Local Windows no-Docker installation verified from clean checkout.
- [ ] All four work-type models are implemented and tested; missing Finance rules are explicit.
- [ ] Formula parity report identifies exact workbook coverage and mismatches.
- [ ] AuthN/AuthZ enforced in backend, including negative access tests.
- [ ] SQL Server migrations and integration tests pass in approved test environment.
- [ ] Immutable versions, parallel drafts and change history work under concurrency.
- [ ] Approval/rate governance and exception SLAs work end to end.
- [ ] Salesforce/Project Track mock adapters work with failure/retry/acknowledgement paths.
- [ ] Real integrations remain clearly marked unconnected until tested.
- [ ] Secrets, audit, logging, monitoring, backup/restore and rollback documented.
- [ ] CI lint/typecheck/unit/integration/E2E/security checks pass with recorded evidence.
- [ ] Deployment artifacts and runbooks are provided; production approvals explicitly tracked.

## 16. Pending decisions — maintain visible register

**Finance:** authoritative CM/GM definitions, eligible cost, rounding, billability and utilization basis, Program/Product calculation details, target pricing and zero revenue behavior; rates scope/fallback; FX source and effective dates; thresholds and approval owners; COLA/renewal policy.

**Business/operations:** BU Head visibility, Sales/BU/Finance detailed handoffs, simultaneous pending-version supersession rule, material-change definition, Closed-Won reopening and downstream reconciliation authority, post-Closed-Won amendment workflow, routing mappings, delegation and SLAs.

**IT/integrations:** Salesforce fields and event contracts, Project Track API/payload/acknowledgement/authentication and amendments, Entra tenant, HR/MNH and Famstack/SOW interfaces, Azure deployment target, SQL Server ownership, backup/retention policy, security controls and support model.

## 17. Instructions to Codex — execute, do not merely plan

1. Read **this file completely**, then inspect referenced original source files and repository state. Do not assume previous assistant statements prove code functionality.
2. Produce an assessment and phased plan, identify gaps and unresolved policies, then **begin implementation immediately** with Phase 0 and the next feasible vertical slice.
3. Preserve existing code and teammate changes; do not perform destructive rewrites or commit secrets.
4. Use the no-Docker SQLite local configuration now; maintain a SQL Server production adapter and migration/test plan.
5. Implement real backend persistence and authorization, not UI-only mocks. External adapters may be mocks but must have real interfaces, logs and failure behavior.
6. Keep Excel formulas unmodified, traceable and covered by golden tests. Mark unapproved rules as demo-only.
7. Run lint/typecheck/build/tests after each meaningful change; show commands, actual results and fixes. Never invent successful test results.
8. Update `docs/PENDING_DECISIONS.md`, `docs/architecture/DECISIONS.md`, `docs/testing/TEST_REPORT.md`, and README as work proceeds.
9. Ask only genuinely blocking business questions; otherwise use explicitly labeled demo configuration without implying approval.
10. In every completion report include: files changed, functionality working, tests executed/results, risks, pending decisions and next implementation slice.

### Suggested first Codex prompt

> Read `PRICE_TRACK_CODEX_TEAM_MASTER_SPEC.md` and the original files under `reference/`. Inspect the repository and Git status. Verify the existing Windows/no-Docker SQLite foundation by installing dependencies, running tests/build, starting frontend/API and executing the API smoke test. Repair issues without destroying existing work. Produce the repository assessment and real verification report. Then implement Phase 1 account-scoped demo authentication/authorization with negative tests and SQL migration-backed persistence. Keep SQL Server as the production target and preserve workbook formulas exactly. Do not stop after planning.

---

**Team note:** This is a build contract and implementation roadmap, not a statement that all described features currently exist. Treat confirmed business decisions as binding, source requirements as baseline, proposed architecture as revisable engineering design, and pending rules as explicit approval dependencies.
