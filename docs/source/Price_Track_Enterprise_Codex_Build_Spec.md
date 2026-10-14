# Price Track --- Enterprise Codex Build Specification

**Purpose:** Use this document as the master instruction file for
Enterprise Codex to inspect the current repository and build a complete,
demonstrable Price Track proof of concept (POC).

**Document status:** Consolidated discovery rounds 1--6, as of 9 October
2026.\
**Project integration:** Integration with **Project Track is confirmed
as a requirement**. The detailed contract, hosting model, and final
technical integration mechanism remain to be agreed with the Project
Track team.\
**Implementation rule:** Build a working end-to-end POC, not just static
mockups. Keep confirmed requirements separate from assumptions and
visibly configurable/pending decisions.

------------------------------------------------------------------------

# 1. Instructions to Enterprise Codex

You are acting as a senior enterprise architect, product engineer,
backend engineer, frontend engineer, QA engineer, and security-conscious
implementation partner.

Your task is to inspect the existing repository and available project
documents, then implement a complete Price Track POC for pricing
workflow, rate resolution, cost/revenue/contribution-margin calculation,
sequential approvals, version history, security-aware workflow, and
integration with Salesforce and Project Track.

## 1.1 First actions

Before making code changes:

1.  Inspect the repository structure, existing source code, package
    manifests, README files, environment configuration, tests, and Git
    status.
2.  Identify the current frontend/backend frameworks, runtime versions,
    database access patterns, coding conventions, test framework, and
    existing authentication approach.
3.  Inspect any available project source documents, especially:
    -   `Price Tracker workflow 1.pptx`
    -   `Price_Track_BRD.docx`
    -   `Margin Calculator_new.xlsx`
    -   `Salesforce sythetic data.xlsx`, if available
4.  Reuse existing working patterns and compatible components. Do not
    overwrite or delete teammate changes.
5.  Create a concise implementation plan and record architecture
    decisions before major changes.
6.  Implement in small, testable steps. Run tests/build/lint after each
    meaningful stage and fix failures before continuing.
7.  Do not claim a live integration works unless it has been tested
    against an actual reachable service. Use explicit mock adapters
    where credentials, APIs, or environments are unavailable.

## 1.2 Non-negotiable implementation rules

-   **Project Track integration is in scope and confirmed as required.**
    Do not omit it. If its actual API is not yet available, implement a
    documented adapter, versioned contract, mock receiver, correlation
    IDs, idempotency, retry handling, acknowledgements, and
    integration-status UI. Mark the adapter as a mock until connected to
    a real endpoint.
-   Salesforce is the opportunity and sales-lifecycle system of record.
    Price Track owns its pricing cases, draft workspace, formal pricing
    versions, rate-resolution workflow, pricing calculations, approval
    tasks, exceptions, and audit evidence.
-   Project Track is expected to own downstream delivery processing. Do
    not implement Price Track as the delivery-management system.
-   Use a **deterministic backend pricing engine**. Do not use
    AI/LLMs/GenAI to determine prices, calculate margin, choose rates,
    approve offers, or replace business rules. No chatbot, RAG, or AI
    feature is required by this specification.
-   Never silently invent a rate, cost, owner, approval, currency
    conversion, or business rule.
-   Never silently select one value when authoritative sources conflict.
    Create a visible exception with an owner and resolution path.
-   Enforce authentication, authorization, approval eligibility, and
    field-level access in the backend. Frontend hiding alone is not
    security.
-   Preserve submitted pricing versions and audit history. Do not mutate
    old snapshots when rates, costs, FX, or rules change.
-   All thresholds, formulas, mapping rules, rates, and effective dates
    that are intended to change must be configuration-driven rather than
    hard-coded.
-   Clearly label mock data, mock integrations, and unapproved
    assumptions in the UI and documentation.
-   Do not store secrets in source control. Provide `.env.example` with
    placeholders only.
-   Avoid destructive repository-wide rewrites. Preserve existing work
    and explain changes.

## 1.3 Required deliverables

Build and document:

1.  A usable web application with navigation and responsive corporate
    UI.
2.  Backend API and domain/service layer.
3.  SQL Server-compatible persistence or a clearly documented local
    development adapter if SQL Server credentials are unavailable.
4.  Seed/demo data that demonstrates realistic end-to-end cases.
5.  Deterministic pricing engine with unit tests.
6.  Role-based access and field/action authorization.
7.  Section-level draft save/autosave and optimistic concurrency
    handling.
8.  Immutable submitted versions, approval workflow, comparison, and
    restore-as-new-working-state.
9.  Rate management and Finance approval for new rates.
10. Exception management, SLA reminders/escalation model, and
    notification outbox.
11. Salesforce intake/lifecycle adapter and Project Track handoff
    adapter.
12. API contract documentation and sample payloads.
13. Database schema/migrations and seed scripts.
14. Automated tests, test report, and instructions to run the POC.
15. A README covering architecture, setup, environment variables, known
    limitations, demo users/roles, and the mock-vs-real integration
    status.
16. A visible "Pending Business Decisions" or equivalent configuration
    page/report so unresolved rules cannot be mistaken for approved
    rules.

If the repository already contains some of these, extend them rather
than creating redundant parallel implementations.

------------------------------------------------------------------------

# 2. Product objective and scope

Price Track is an enterprise pricing lifecycle and governance
application. It takes a Salesforce opportunity, creates one pricing
case, gathers resource estimates, resolves rates and costs, calculates
financial KPIs, obtains sequential approvals, supports
negotiation/versioning, records the final agreed version, and hands the
approved commercial package to Project Track.

## 2.1 Supported work types

Support all of the following in the first release:

-   T&M
-   FTE
-   Program
-   Product

A single opportunity may contain more than one work type. Do not make
these mutually exclusive at opportunity or case level. Resource lines
may belong to different work types and use different calculation rules.

Renewal is a separate lifecycle path and may also contain multiple work
types.

## 2.2 Main user journey

1.  Client Partner selects **Request Pricing** in Salesforce.
2.  Price Track creates or retrieves the one case associated with the
    Salesforce opportunity.
3.  Price Track snapshots relevant opportunity fields and assigns work
    using configurable routing.
4.  Authorized users work in a case workspace with section-level draft
    saving and autosave.
5.  Users create/edit resource estimate lines.
6.  The backend resolves each rate and cost and calculates the requested
    KPIs.
7.  Required missing information and conflicts become explicit
    exceptions.
8.  User submits a formal pricing version after blocking validation
    passes.
9.  Sequential approvals are assigned according to configurable rules.
10. Rejection returns the version for rework; resubmission creates a new
    version.
11. Negotiation changes are tracked. Material changes to an approved
    offer require a new version and applicable reapproval.
12. Authorized users record which final approved version was agreed.
13. Salesforce Closed Won must link to the final approved and agreed
    version.
14. Price Track publishes the approved/agreed commercial payload and
    subsequent lifecycle changes to Project Track through the defined
    integration contract.
15. Price Track tracks Project Track acceptance/failure separately from
    Salesforce Closed Won.

## 2.3 Explicitly out of scope unless an existing repository feature requires it

-   AI-generated pricing or AI approval decisions.
-   A separate standalone rate-card page inside each pricing case. Rate
    resolution should be visible in the Resource Estimates workspace. A
    governed administrative rate-management area may exist separately.
-   Replacing Salesforce as the opportunity system of record.
-   Replacing Project Track as the downstream delivery system.
-   Treating a mock integration as a production integration.

------------------------------------------------------------------------

# 3. Confirmed discovery requirements

## 3.1 Intake and case lifecycle

-   Salesforce authorization is sufficient for a Client Partner to
    request pricing; they do not need a separate Price Track login just
    to submit the request.
-   One pricing case per Salesforce opportunity.
-   Multiple pricing versions per case.
-   Request processing must be idempotent and detect duplicate requests.
-   Save the opportunity snapshot received at intake.
-   Salesforce lifecycle changes must be synchronized, preserved in
    history, and assessed for impact. Do not overwrite Price Track work
    blindly.
-   A lost/cancelled opportunity cancels the case workflow with a reason
    while preserving all versions and audit history.
-   Reopening requires an authorized action, reason, and full audit
    trail.
-   Renewal is separate from new business. Identify renewals using
    Salesforce classification plus date-based alerts.
-   Renewal alerts should be configurable. The source workflow mentions
    alerts 3--4 months before renewal; make the lead time configurable
    and mark the default as needing stakeholder confirmation.
-   Validate COLA against effective-dated Finance rules. Require
    approval for exceptions.
-   For renewal utilization, compare against SOW data when available and
    flag missing data. Do not invent utilization.
-   Only the final approved and agreed pricing version can be linked to
    Closed Won.
-   Closed Won and successful Project Track handoff are different
    lifecycle events.

## 3.2 Routing and assignments

Routing must be configurable and multi-factor. Likely factors include
BU, account, project, opportunity/work type, task type, and exception
type. Do not assume every factor is mandatory until mappings are
approved.

Central administrators and delegated owners maintain routing and people
mappings without code changes.

If a required person/role cannot be resolved: - Create the case. - Mark
the role/assignment `Not Assigned`. - Create an exception and notify the
appropriate administrator. - Block only the dependent workflow step. -
Do not guess an owner or silently substitute someone.

When responsibility transfers, an administrator may reassign pending
tasks. Preserve original assignments and decision history.

If an employee leaves, disable access and notify an administrator for
manual reassignment. Delegation is time-limited and requires explicit
permissions.

## 3.3 Organizational structure

Business Unit codes supplied during discovery:

-   TMT1
-   TMT2
-   R&M
-   CPG
-   HLS-A
-   HLS-CI
-   RAI
-   MMM

Do not invent expanded BU names or a hierarchy. Store labels and
hierarchy as configuration and mark incomplete metadata as pending.

## 3.4 Resource estimate fields

Initial confirmed resource-line fields:

-   BU
-   Work type
-   Role/skill
-   Experience/grade
-   Location
-   Onshore/offshore classification
-   Hours per period
-   Billable utilization percentage
-   Start date
-   End date

The implementation must be able to extend this model. Quantity/FTE,
currency, delivery model, billing period, and employee-specific versus
role-based costing have not been finalized. Do not silently assume these
are fully decided. If required to make the POC calculate, make them
explicit configurable fields/defaults and label the assumptions in the
UI and README.

## 3.5 Rate resolution

Intended sequence:

1.  Use a valid applicable client-specific rate when one exists.
2.  Otherwise use a valid approved standard rate when permitted by the
    approved rule.
3.  If no eligible rate exists or the rate is ambiguous/conflicting,
    create a rate exception and route it to the BU SPOC.
4.  The BU SPOC may propose a new rate.
5.  Finance must approve new rates before they become reusable.
6.  BU Heads cannot approve their own proposed rate.
7.  Rate overrides must be role-restricted and audited.
8.  Expired/missing client rate can fall back to a standard rate if the
    approved fallback rule permits it.

The exact scope keys for rates (account, BU, work type, role/skill,
grade, location, currency, dates, etc.) need stakeholder validation.
Model them explicitly and support effective dates.

## 3.6 Cost, hours, FX and utilization

-   HR data is the declared authority for employee cost, but the exact
    HR/MNH source and interface remain pending.
-   Finance has controlled ability to change cost data; record who
    changed what, why, when, and the effective date.
-   Cost may be employee-specific or role/location-based; this choice is
    unresolved. Do not mix models without an explicit rule.
-   Working hours are configurable by location and contract type.
-   FTE commonly uses 160 hours/month in the current example, but this
    is not a universal rule for every work type.
-   One centrally maintained current FX rate is desired. Submitted
    versions must snapshot the actual FX value/reference used so future
    updates do not change history.
-   Renewal utilization/SOW data is checked when available; missing data
    is flagged.
-   Missing/conflicting cost, rate, FX or required utilization must not
    silently become a zero or arbitrary value.

## 3.7 Live KPIs

The Resource Estimates workspace should calculate and display:

-   Total cost
-   Total revenue
-   Contribution margin %
-   Pricing gap to target margin
-   Client budget vs. proposed revenue

The engine is deterministic and server-side. Recalculate when relevant
draft inputs change.

**Critical pending Finance decision:** The contribution margin formula,
eligible cost definition, rounding, zero-revenue behaviour and
target-gap formula have not been approved. Candidate formula only,
pending validation:

`CM% = (Revenue - Eligible Cost) / Revenue * 100`

Do not present this formula as approved. Mark the formula as
configurable/unapproved in the POC until a Finance owner confirms it. Do
not confuse margin on revenue with markup on cost.

## 3.8 Drafts, versioning and collaboration

-   Section-level drafts.
-   Manual save and autosave.
-   Authorized assigned team members can access sections according to
    permissions.
-   Optimistic concurrency; stale save must produce a conflict warning,
    not overwrite newer data silently.
-   Formal pricing version is created on submission for approval, not on
    every draft save.
-   Submitted versions are immutable snapshots.
-   Editing an approved offer creates a new version and invalidates
    prior approval for the changed offer.
-   Rejection returns work for rework; resubmission creates a new
    version.
-   Restore of historical values requires authorized approval and does
    not revive the original approval.
-   Case-wide and section-level comments with mentions.
-   Side-by-side pricing-version comparison.
-   Required sections and blocking validation must pass before
    submission.
-   Handle races between autosave, multiple editors, submission,
    rate/FX/cost changes, and restore. Use transactional snapshot
    creation and revision checks.

## 3.9 Approvals

Approval rules must be configurable by: - CM% - Discount -
Opportunity/work type - BU - Exception type

Approval is sequential.

-   Decisions occur through an authenticated Price Track action.
-   Email links may deep-link to the action page but must require
    authentication and authorization before a decision.
-   Rejected versions return for rework.
-   SLA is configurable by task type and priority.
-   Send reminders/escalations when overdue.
-   If the approver is unavailable, use a configured delegate; otherwise
    create an administrator exception/hold.
-   Finance approves all new rates and handles Finance-related matters.
-   BU Heads cannot approve their own proposed rates.
-   Special exceptions require CFO approval.
-   CFO and EVP of Finance have overall Finance access/views. Their
    exact approval powers relative to each other are unresolved.
-   Keep rate approval distinct from pricing-version approval. A new
    rate may need its own Finance approval before it can be used in a
    pricing version.
-   Approval threshold examples in source material are illustrative only
    and must not be hard-coded as policy.

## 3.10 Access control

Use combined backend-enforced authorization: - Role - BU - Account -
Case assignment - Field-level visibility - Field-level edit permission -
Action permission - Approval eligibility - Explicit, time-limited
delegation

Defaults: - Client Partners must never see accounts other than their
own. - Users see assigned accounts and explicitly assigned cases. -
Finance is restricted to Finance-related work/fields and should not gain
general Sales, Delivery, or management access merely by being Finance. -
CFO and EVP of Finance have overall Finance views/access. - BU Heads
have only their accounts according to the latest clarification, but a
previous answer also suggested BU Heads can see BU activity. Treat this
scope conflict as pending and implement a configurable policy. -
Separate restricted administrators by responsibility; admin status does
not automatically imply access to all confidential commercial data. -
Current authorization governs access to historical records. - Employee
departure disables access and notifies an administrator. - Delegation
must be explicit, time-limited, scoped and auditable. - Keep audit
history after reassignment, access removal, cancellation and
reopening. - Use Microsoft Entra ID for authentication/SSO when the
approved environment is available. Do not invent tenant IDs or
credentials.

## 3.11 Notifications and exception tracking

Channels requested: - Email - Teams - In-app

Track separately: - Notification delivery - User response/action - Task
completion

Use configurable SLA per task type and priority. Support reminders and
escalation.

Exception types include, but are not limited to: - Missing assignment -
Missing/expired/conflicting rate - Missing/conflicting cost - Missing
utilization/SOW - Invalid/missing FX configuration - Validation
failure - Approval conflict or unavailable approver - Salesforce
integration failure - Project Track handoff failure - Draft concurrency
conflict

Each exception must have a reason/type, related entity, owner, severity,
blocking scope, timestamps, resolution notes and audit history.

## 3.12 Project Track integration

Project Track integration is confirmed as required. Details are not
finalized.

Price Track should publish approved versions and subsequent lifecycle
changes through a defined API contract. The handoff should be designed
to send the approved/agreed commercial package to Project Track, which
is expected to handle downstream delivery processing.

Required: - Versioned API schema. - Authentication appropriate to the
enterprise environment. - Correlation ID and idempotency key. -
Request/response status tracking. - Validation errors visible to the
user/operator. - Retry transient failures with backoff. - After retry
exhaustion, create a monitored exception. - Replay/reconciliation path
for authorized administrators. - Duplicate delivery intake must be
prevented. - Do not silently mark handoff successful until Project Track
acknowledges acceptance. - Clearly distinguish `Approved`, `Agreed`,
`Salesforce Closed Won`, `Handoff Pending`, `Handoff Accepted`, and
`Handoff Failed`.

Until the actual Project Track API is provided, implement an adapter
interface plus a mock receiver and documented contract. Keep the mock
status visible.

## 3.13 Retention and audit

Retention period is not yet known; it must follow company policy.

Build auditable history for: - Opportunity snapshots and lifecycle
changes - Draft changes where appropriate - Submitted versions and
calculation snapshots - Rate/cost/FX changes - Approval actions and
reasons - Overrides - Reassignment and delegation - Access/role
configuration changes - Cancellation and reopening - Integration
messages, retries and acknowledgements - Exception creation and
resolution

Use append-only audit semantics for material events. Avoid logging
secrets or unnecessary sensitive data.

------------------------------------------------------------------------

# 4. Recommended architecture

Use a modular monolith or the existing repository's established
architecture for the POC. Do not create a distributed microservice
architecture unless the current platform already requires it. Preserve
clear internal module boundaries so components can be separated later if
needed.

Suggested modules:

1.  **Identity & Authorization**
2.  **Opportunity Intake & Salesforce Adapter**
3.  **Pricing Case Workflow**
4.  **Resource Estimate Workspace**
5.  **Rate Resolution & Rate Governance**
6.  **Cost/FX/Hours Rule Providers**
7.  **Deterministic Pricing Engine**
8.  **Pricing Versioning**
9.  **Approval Policy & Tasks**
10. **Exception/SLA Management**
11. **Notification Outbox**
12. **Project Track Adapter**
13. **Audit & Reporting**
14. **Administration & Configuration**

## 4.1 Stack selection rules

First inspect the repository. Reuse the current supported stack if
viable.

If the project is greenfield and stakeholders have not confirmed the
stack: - Prefer a TypeScript web frontend compatible with the existing
Project Track frontend. - Prefer a Java backend if alignment with
Project Track's Java backend is confirmed. - SQL Server is the expected
database; use migrations and least-privilege access. - Use REST APIs
with versioned schemas; use a durable queue/outbox or equivalent for
asynchronous integration if available. - Use the company's approved
Entra ID, secret management, monitoring, and CI/CD patterns when
supplied.

Do not block a demonstrable POC just because external credentials are
unavailable. Use interfaces and mock adapters, and document the
integration work still required.

## 4.2 Logical component flow

`Salesforce -> Intake API -> Case Workflow -> Resource Estimate -> Rate/Cost Resolution -> Pricing Engine -> Version Snapshot -> Sequential Approval -> Agreement/Closed Won validation -> Project Track Adapter -> Handoff Acknowledgement`

Supporting modules: `Entra ID -> Authorization` `HR/MNH -> Cost Adapter`
`Famstack/SOW -> Utilization Adapter`
`Finance configuration -> Rate/FX/hours/approval rules`
`Notification Outbox -> Email/Teams/In-app`
`Audit -> all material actions`

------------------------------------------------------------------------

# 5. API design baseline

These are suggested logical routes, not an already-approved external
contract. Adapt naming to the existing repository and document any
changes.

## 5.1 Cases and intake

-   `POST /api/v1/pricing-requests`
    -   Idempotent intake by Salesforce opportunity ID/request ID.
    -   Returns case ID and processing status.
-   `GET /api/v1/cases`
    -   Returns only cases the caller is authorized to see.
-   `GET /api/v1/cases/{caseId}`
-   `PATCH /api/v1/cases/{caseId}/classification`
-   `POST /api/v1/cases/{caseId}/reopen`
    -   Requires permission and reason.
-   `POST /api/v1/cases/{caseId}/cancel`
    -   Requires permission and reason.
-   `POST /api/v1/salesforce-lifecycle-events`
    -   Receives or reconciles opportunity lifecycle changes.

## 5.2 Drafts and resource estimates

-   `GET /api/v1/cases/{caseId}/draft`
-   `PUT /api/v1/cases/{caseId}/draft/sections/{sectionKey}`
    -   Requires revision/ETag or equivalent concurrency token.
-   `POST /api/v1/cases/{caseId}/resource-lines`
-   `PATCH /api/v1/cases/{caseId}/resource-lines/{lineId}`
-   `DELETE /api/v1/cases/{caseId}/resource-lines/{lineId}`
    -   Enforce permissions and draft state.
-   `POST /api/v1/cases/{caseId}/calculate`
    -   Returns deterministic KPIs, rule versions, validation messages
        and exceptions.
-   `POST /api/v1/cases/{caseId}/validate-submission`

## 5.3 Versions and approvals

-   `POST /api/v1/cases/{caseId}/versions`
    -   Creates an immutable version only after validation/submission.
-   `GET /api/v1/cases/{caseId}/versions`
-   `GET /api/v1/cases/{caseId}/versions/{versionId}`
-   `GET /api/v1/cases/{caseId}/versions/compare?left={id}&right={id}`
-   `POST /api/v1/versions/{versionId}/approval-tasks/{taskId}/approve`
-   `POST /api/v1/versions/{versionId}/approval-tasks/{taskId}/reject`
    -   Rejection requires reason.
-   `POST /api/v1/versions/{versionId}/restore-to-draft`
    -   Requires authorization and must not restore old approval.
-   `POST /api/v1/versions/{versionId}/mark-agreed`
    -   Authorized action; record evidence and actor.
-   `POST /api/v1/versions/{versionId}/mark-closed-won`
    -   Prefer driven by validated Salesforce lifecycle event rather
        than an arbitrary client action.

## 5.4 Rates, rules and exceptions

-   `GET /api/v1/rates/resolve`
-   `GET /api/v1/rates`
-   `POST /api/v1/rates/proposals`
-   `POST /api/v1/rates/{rateId}/approve`
    -   Finance-only; enforce proposer != approver.
-   `GET /api/v1/rules`
-   `POST /api/v1/rules/drafts`
-   `POST /api/v1/rules/{ruleId}/publish`
    -   Restrict to configured rule administrators and require audit
        evidence.
-   `GET /api/v1/exceptions`
-   `POST /api/v1/exceptions/{exceptionId}/assign`
-   `POST /api/v1/exceptions/{exceptionId}/resolve`

## 5.5 Project Track integration

-   `POST /api/v1/integrations/project-track/handoffs`
-   `GET /api/v1/integrations/project-track/handoffs/{handoffId}`
-   `POST /api/v1/integrations/project-track/acknowledgements`
-   `POST /api/v1/integrations/project-track/events`

Use actual names agreed with Project Track. The adapter should be
replaceable without changing pricing-domain logic.

## 5.6 API standards

-   Validate every request and response schema.
-   Use consistent error objects with stable error codes.
-   Return `401` for unauthenticated requests and `403` for unauthorized
    actions; do not leak confidential record existence.
-   Use optimistic concurrency tokens on editable resources.
-   Use idempotency keys for external commands.
-   Include `correlationId`, `createdAt`, `updatedAt`, and relevant
    actor metadata.
-   Never accept a client-supplied role or approval authority as proof
    of permission.
-   Keep external DTOs separate from internal database entities.
-   Add OpenAPI documentation if compatible with the repository.

------------------------------------------------------------------------

# 6. Suggested data model

Implement relational entities and migrations. Names can adapt to
existing conventions, but relationships and invariants must be
preserved.

-   `UserIdentity` / `UserRoleAssignment`
-   `BusinessUnit`
-   `AccountAccess`
-   `CaseAssignment`
-   `Delegation`
-   `PricingCase`
-   `OpportunitySnapshot`
-   `ResourceEstimateDraft`
-   `ResourceEstimateLine`
-   `PricingVersion`
-   `PricingVersionLine`
-   `RateCard`
-   `RateRecord`
-   `RateProposal`
-   `CostReference` or `CostRecord`
-   `FxRate`
-   `HoursRule`
-   `UtilizationRule`
-   `PricingRuleSet`
-   `ApprovalPolicy`
-   `ApprovalTask`
-   `ApprovalDecision`
-   `ExceptionRecord`
-   `Comment`
-   `Mention`
-   `NotificationOutbox`
-   `IntegrationMessage`
-   `ProjectTrackHandoff`
-   `AuditEvent`
-   `ConfigurationChange`

Important invariants: - One `PricingCase` per Salesforce opportunity
ID. - Multiple formal `PricingVersion` records per case. - A version is
immutable after submission. - Approval decisions reference a specific
version ID. - The final agreed version must be approved before it can be
linked to Closed Won. - Rate records have status and effective dates. -
Proposed rate approver cannot be the proposer. - Handoff is
unique/idempotent for a specific case/version/handoff event. - A failed
handoff is not a successful handoff. - A cancellation does not delete
historical versions. - Reopening does not erase cancellation or prior
audit history.

------------------------------------------------------------------------

# 7. UI and navigation requirements

Build a corporate, clean, usable UI. If the repository already contains
a visual theme, use it. A previous Price Track prototype used a
C5i-inspired deep purple, bright purple, lavender surfaces and white
cards; reuse it if appropriate to the current app. Do not spend time on
decorative UI at the expense of workflow completeness.

Suggested navigation:

1.  Dashboard
2.  Opportunities / Pricing Requests
3.  Pricing Cases
4.  Resource Estimates
5.  Rate Management (restricted administration; not a separate rate page
    inside each case)
6.  Approvals / My Tasks
7.  Exceptions
8.  Version History
9.  Workflow Tracker
10. Rules & Governance (restricted)
11. Integration Monitor (restricted)
12. Administration (restricted)

## 7.1 Dashboard

Show only metrics permitted by the current user's authorization: - Cases
by lifecycle status - Pending approvals/tasks - Overdue tasks - Open
exceptions - Cases by BU/work type where authorized - Integration
handoff status - Pricing KPIs only where field permissions allow

## 7.2 Pricing case workspace

Include: - Opportunity snapshot and lifecycle status - Case owner and
assignment status - Work-type badges for mixed work types -
Section-level save state and last-saved time - Resource estimate
editor - Rate/cost resolution status per line - Live KPI cards - Client
budget vs proposed revenue - Validation errors and blocking/non-blocking
warnings - Comments/mentions - Version history and compare - Approval
status and permitted actions - Exceptions and next action - Project
Track handoff status when applicable

Do not display confidential cost values to users lacking field
permission. A user may be permitted to see a calculated margin or a rate
without being allowed to see the underlying employee cost; enforce the
exact policy in the backend.

## 7.3 Admin pages

Restricted admin functions should allow authorized owners to maintain: -
BU/account/project/role mappings - SPOC and replacement mappings -
Approval rules and thresholds - Standard/client rate records and
effective dates - Hours, utilization, COLA and FX rules - Delegations -
Notification/SLA settings - Integration configuration/status - Pending
business decisions and mock/production integration flags

Every published configuration change should have author, approver where
required, effective date, previous value, new value and audit record.

## 7.4 Demo data

Create synthetic data that demonstrates: - Existing customer with one
valid client rate and another line using an approved standard rate. -
New customer with standard rates. - Mixed opportunity with offshore FTE
and onshore Program resources. - Renewal with COLA validation and
available/missing SOW utilization. - Missing BU SPOC. -
Missing/expired/conflicting rate. - New rate proposal awaiting Finance
approval. - A rejected pricing version and a later resubmission. - An
approved version changed during negotiation. - A Salesforce
cancellation/reopening event. - A Closed Won handoff accepted by Project
Track. - A Project Track timeout/retry and eventual exception. -
Different roles seeing different cases and fields.

Clearly label all seed data as synthetic. Do not use real employee
personal information or production credentials.

------------------------------------------------------------------------

# 8. State transitions and business validations

Implement state transitions centrally in the backend rather than
scattered frontend conditions.

## 8.1 Suggested case states

`New -> In Progress -> Awaiting Approval -> Negotiation -> Agreed -> Closed`

Additional states: `Blocked`, `Cancelled`, `Reopened`.

These labels are proposed; retain separate state dimensions for case,
pricing version, approval task, exception, and handoff.

## 8.2 Suggested pricing-version states

`Submitted -> Pending Approval -> Approved`

Alternative outcomes: - `Rejected` - `Superseded` - `Invalidated` -
`Agreed` - `Cancelled`

The exact sequence may vary with the approved policy, but the following
must always hold: - A rejected version cannot be treated as approved. -
A material change to an approved offer requires a new version and
applicable reapproval. - Historical approval evidence is retained. -
Agreement is tied to a specific version. - Closed Won validates the
final approved and agreed version.

## 8.3 Blocking validation examples

Block formal submission when: - Required resource-line fields are
missing. - Required rate/cost inputs are unresolved. - A required rate
approval is incomplete. - The formula or critical rule configuration is
not approved for production use. - Required exceptions remain
unresolved. - Required sections have not been saved. - A stale
draft/revision conflict exists. - A required approval route cannot be
resolved.

A missing unrelated owner should block only the dependent step, not all
case editing.

For the POC, unapproved formulas/rules may be demonstrated using an
explicit "Demo/Unapproved Rule Set" toggle or environment configuration,
with a visible banner. Do not silently treat these as
production-approved.

------------------------------------------------------------------------

# 9. Security implementation checklist

-   [ ] Central backend authorization middleware/policy layer.
-   [ ] Account and case access filtering on list and detail APIs.
-   [ ] Field-level redaction/authorization for sensitive cost and
    commercial data.
-   [ ] Role/action checks on rate proposals, rate approvals, pricing
    approvals, restore, reopen, cancel, overrides and configuration
    publication.
-   [ ] Proposer cannot approve own rate.
-   [ ] Approval task is bound to the correct version and step.
-   [ ] Client Partner isolation between accounts.
-   [ ] Finance-only fields/tasks separated from
    Sales/Delivery/management permissions.
-   [ ] Configurable BU Head scope until conflict is resolved.
-   [ ] Time-limited explicit delegation and revocation.
-   [ ] Leaver/access-disable workflow and reassignment exception.
-   [ ] Audit log for permission/configuration changes.
-   [ ] No credentials/secrets committed.
-   [ ] No unrestricted administrative access to sensitive data by
    default.
-   [ ] Negative tests proving unauthorized users cannot retrieve data
    directly via APIs.

------------------------------------------------------------------------

# 10. Integration implementation details

## 10.1 Salesforce adapter

Create an interface such as `SalesforceOpportunityGateway` (adapt to
repository conventions). Support: - Request pricing - Opportunity
snapshot intake - Lifecycle change handling - Duplicate request
protection - Acknowledgement/status - Reconciliation of failed events

If no Salesforce credentials are available, create a mock adapter and a
local event simulator. Keep the contract realistic and document the
exact configuration required to connect to Salesforce.

## 10.2 Project Track adapter

Create an interface such as `ProjectTrackGateway`. Support: - Publish a
specific approved/agreed version - Include opportunity/case/version
references and approved handoff fields - Receive or simulate
acknowledgement - Track pending/accepted/rejected/failed status - Retry
transient errors - Create a monitored exception after retry exhaustion -
Replay/reconcile safely - Prevent duplicate handoffs - Track subsequent
permitted lifecycle changes

Provide a mock Project Track receiver or integration simulator with: -
Success response - Validation rejection - Timeout/transient failure -
Duplicate-event response - Retry exhaustion

The POC must show an integration-monitor page and explain that the mock
receiver is not the real Project Track environment.

## 10.3 Message reliability

If supported by the existing stack, implement transactional outbox: 1.
Commit the business state and outbound message in the same database
transaction. 2. Worker sends the message. 3. Store attempt count,
timestamps, response and correlation ID. 4. Retry only retryable
failures. 5. Mark permanent failures and create/update an exception. 6.
Allow authorized replay with idempotency protection.

If a queue/outbox cannot be implemented in the available POC
environment, use an equivalent durable status table and explain the
limitation.

------------------------------------------------------------------------

# 11. Testing strategy and acceptance criteria

Create unit, integration and end-to-end tests. At minimum test:

## 11.1 Pricing engine tests

-   Correct client-rate precedence.
-   Standard-rate fallback only when permitted.
-   Missing/conflicting rate produces exception.
-   Rate validity by date.
-   Cost input resolution and missing cost.
-   Hours/utilization rules by contract/location.
-   FX snapshot remains unchanged for old versions.
-   Candidate CM formula is explicitly unapproved until Finance confirms
    it.
-   Zero/negative/missing revenue handling.
-   Target-margin pricing gap.
-   Rounding and currency consistency.

## 11.2 Workflow/version tests

-   One case per opportunity.
-   Duplicate intake idempotency.
-   Draft save does not create formal version.
-   Submission creates immutable snapshot.
-   Concurrent stale update returns conflict.
-   Rejection/resubmission creates new version.
-   Restore creates working state without reviving approval.
-   Approved offer material change invalidates previous approval for the
    changed offer.
-   Cancellation/reopening retains history.
-   Closed Won rejects a version that is not final, approved and agreed.

## 11.3 Approval/security tests

-   Sequential routing.
-   Approver cannot act on unrelated tasks.
-   Rate proposer cannot approve own rate.
-   Special exception requires CFO approval.
-   Delegation works only in its configured time window and scope.
-   Client Partner cannot access another account.
-   Finance cannot access disallowed Sales/Delivery tasks.
-   Unauthorized user cannot read restricted cost fields.
-   Admin permissions are scoped.
-   All significant actions generate audit events.

## 11.4 Integration tests

-   Salesforce request succeeds and creates one case.
-   Duplicate/replayed Salesforce event creates no duplicate case.
-   Lifecycle change preserves snapshot/history and triggers impact
    assessment.
-   Project Track handoff includes the intended version.
-   Project Track acceptance updates handoff state.
-   Project Track validation rejection creates a visible failure.
-   Timeout retries with backoff.
-   Retry exhaustion creates a monitored exception.
-   Replaying a handoff does not create duplicate delivery intake.
-   Closed Won does not imply handoff acceptance.

## 11.5 Usability tests

-   User can see save/autosave status.
-   User can understand blocking vs. warning validation.
-   User can resolve a concurrency conflict.
-   User can compare versions.
-   User sees a useful next action for a missing assignment or
    exception.
-   User sees integration status without gaining unauthorized payload
    access.

------------------------------------------------------------------------

# 12. Implementation sequence for Codex

Work in the following order, adapting to the current repository:

### Phase A --- Repository assessment

-   Inspect code, source docs and existing prototype.
-   Produce `docs/architecture/REPOSITORY_ASSESSMENT.md`.
-   Identify existing working code to preserve.
-   Record stack and dependency decisions.

### Phase B --- Domain model and persistence

-   Define entities, schema and migrations.
-   Add unique constraints, indexes and audit model.
-   Add seed/demo data.
-   Add data access/repository tests.

### Phase C --- Core workflow and access

-   Implement identity abstraction and role/policy authorization.
-   Implement idempotent case intake.
-   Implement case lifecycle, assignments, exceptions and audit.
-   Implement section drafts and concurrency protection.

### Phase D --- Pricing and versioning

-   Implement resource-line validation.
-   Implement rate resolution and rate proposal/approval.
-   Implement cost/FX/hours rule providers.
-   Implement deterministic calculation engine.
-   Implement formal version snapshots and comparison.

### Phase E --- Approvals and notifications

-   Implement configurable sequential approval policies.
-   Implement rejection/resubmission.
-   Implement SLA model, notification outbox and in-app notifications.
-   Add email/Teams adapters or explicit mock adapters where credentials
    are unavailable.

### Phase F --- Integrations

-   Implement Salesforce adapter and event simulator.
-   Implement Project Track adapter, API contract, mock receiver,
    acknowledgement, retry and exception handling.
-   Implement integration monitor/reconciliation UI.

### Phase G --- UI completion

-   Complete dashboard, case workspace, approvals, exceptions, version
    history, administration and integration monitor.
-   Enforce backend permissions in every data flow.
-   Show pending business rules and mock integrations visibly.

### Phase H --- Verification and handover

-   Run formatting, lint, type-check, build and all tests.
-   Fix failures.
-   Document run instructions, environment variables, demo users/roles,
    sample scenarios and known limitations.
-   Produce `docs/architecture/DECISIONS.md`, `docs/api/`,
    `docs/testing/TEST_REPORT.md`, and `docs/POC_LIMITATIONS.md`.
-   Provide a final implementation summary listing completed features,
    tests executed, known gaps, and steps to connect real
    Salesforce/Project Track/Entra/HR/Famstack services.

Do not stop after creating a plan or a UI shell. Continue implementing
the highest-value end-to-end path until it is runnable, testable and
demonstrable.

------------------------------------------------------------------------

# 13. Pending decision register --- must remain visible

Create `docs/PENDING_DECISIONS.md` and, if feasible, a restricted UI
page for these items. For every item record owner, status, decision,
date and impact. Do not silently resolve them.

## Priority 1

1.  Project Track API, authentication, handoff trigger, payload,
    callback/acknowledgement, and delivery ownership boundary.
    Integration itself is confirmed; the contract is not.
2.  Backend/frontend framework and deployment environment.
3.  SQL Server database/schema ownership, migration strategy and support
    model.
4.  Finance-approved CM formula, eligible cost definition, rounding and
    target-gap calculation.
5.  Approval thresholds and who can change/publish them.
6.  CFO vs. EVP of Finance approval authority; exact special-exception
    definition.
7.  Authoritative rate source and client-rate/standard-rate fallback
    policy.
8.  HR/MNH source, cost fields, cost model and Finance change authority.
9.  Authoritative identity/employee/manager/BU/account/project/SPOC
    mappings.
10. BU Head visibility conflict: BU-wide visibility vs. only assigned
    accounts.
11. Resource quantity/FTE, billing period, currency and utilization
    formula details.
12. Salesforce opportunity field mapping and which changes trigger
    recalculation/reapproval.

## Priority 2

13. Exact rate-card keys, reusability scope, effective-date behaviour
    and new-skill process.
14. FX source/update frequency and effective-date rules.
15. Renewal alert lead time, COLA values/rules, exceptions and
    approvers.
16. Famstack/SOW interface and handling when utilization data is
    missing.
17. Material-change definition and version invalidation rules.
18. Delegation restrictions for rates and special exceptions.
19. SLA durations, retry limits, performance/availability targets,
    backup and recovery targets.
20. Retention and deletion policy.
21. Audit/export access policy and reporting permissions.
22. Final work-type-specific calculation rules for T&M, FTE, Program and
    Product.
23. Whether Project Track receives handoff only after Closed Won or
    earlier after approval/agreement.
24. Whether Project Track must return delivery identifiers/status
    updates and which events Price Track must consume.

## Default behaviour while decisions are pending

-   Do not invent business facts.
-   Use explicitly labelled synthetic demo data.
-   Make values configurable.
-   Mark unapproved formulas/rules as demo-only.
-   Block production-mode submission where an unresolved rule is
    essential to financial correctness.
-   Allow non-production demonstration using a visibly labelled demo
    configuration.
-   Log assumptions and decisions in code comments/docs where relevant.
-   Never claim a stakeholder-approved policy without evidence.

------------------------------------------------------------------------

# 14. Definition of a successful POC

The POC is successful when a reviewer can:

1.  Sign in as a seeded demo role or use a documented local demo
    authentication mode.
2.  Create a pricing request through the Salesforce mock adapter.
3.  See one case created for the opportunity, with duplicate protection.
4.  Open the case and edit multiple resource lines and work types.
5.  Save/autosave drafts and demonstrate a concurrency conflict.
6.  See line-by-line client/standard rate resolution and a missing-rate
    exception.
7.  Propose a new rate and route it to Finance approval, with
    self-approval blocked.
8.  See deterministic KPI calculations and a clear banner when demo
    formulas are unapproved.
9.  Submit a formal pricing version, approve/reject it sequentially and
    resubmit a new version.
10. Compare versions and demonstrate that old submitted snapshots remain
    unchanged.
11. Demonstrate role/field/account access restrictions with negative
    tests.
12. Cancel/reopen a case with reasons and preserved history.
13. Simulate Salesforce lifecycle changes.
14. Publish the final eligible version to the Project Track mock
    receiver.
15. Demonstrate successful handoff, timeout/retry, rejection and
    monitored exception paths.
16. See integration status, exceptions, audit evidence and next actions.
17. Run the application locally using the documented setup instructions
    and execute automated tests.

The goal is a coherent end-to-end POC with honest boundaries---not a
polished dashboard that only appears to work.

------------------------------------------------------------------------

# 15. Final instruction to Enterprise Codex

Begin by inspecting the existing repository and source files. Preserve
existing work, then implement this specification incrementally. If a
detail is unresolved, build a configurable interface and visibly
document the decision instead of guessing. Ask for clarification only
when the missing decision prevents safe progress; otherwise continue
with a labelled mock or non-production configuration.

Prioritize the complete happy path plus realistic failure handling,
authorization and audit. Project Track integration must be represented
in the working POC because it is confirmed as required, but do not
misrepresent a mock contract as a live integration. Finish with runnable
code, automated tests, setup documentation, API contracts, pending
decisions and a clear implementation report.
