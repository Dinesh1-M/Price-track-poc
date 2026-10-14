# Codex Task: Upgrade the Existing Price Tracker into an End-to-End Sample-Use-Case POC

## 1. Objective

Modify the existing Price Tracker application in place so it demonstrates a **complete sample pricing use case from case creation through negotiation, approvals, and Closed Won**. This is a working proof of concept (POC), not just a visual UI rearrangement. Use realistic, internally consistent sample data and make the workflow demonstrable end to end.

Inspect the current repository, routes, components, state/data layer, database or local persistence, permissions, and `package.json` before changing anything. Preserve the current framework, stack, coding conventions, and existing functionality. Do not create a separate app or rewrite unrelated parts.

The application will act as a **sample environment in which we are the data providers**. For the POC, HR/rate-card information, resource details, client/opportunity information, utilization, negotiation updates, and approval decisions will be entered or supplied dynamically by users through the app. Use existing backend/database/local persistence if available. If no persistence exists, use the project's existing local-data approach or add a small, consistent mock-data/service layer with local persistence suitable for the current stack. Clearly distinguish sample/demo data from live enterprise integrations. Do not pretend that a real external system is connected.

## 2. Required navigation order

Show exactly these nine pages in this order:

1. Dashboard
2. Pricing Cases
3. Renewals
4. Resource Estimates & Pricing Calculator
5. Negotiations & Pricing Versions
6. Pricing Calculator
7. Approvals
8. Workflow Tracker
9. Administration

## 3. Remove the standalone Rate Cards page

- Remove Rate Cards from visible navigation and remove or redirect its user-facing standalone route so there is no dead link or broken page.
- **Do not delete rate-card data, data-provider forms, calculation logic, shared services, backend endpoints, or data structures used by pricing calculations.** Rate information must still be provided dynamically through the appropriate POC data-entry/provider workflow, such as resource/rate inputs or Administration/master-data controls, according to the existing app architecture.

## 4. End-to-end sample use case (must be demonstrable)

Implement and seed at least one coherent, realistic sample scenario with linked records. Example scenario (use these as editable demo defaults, not hard-coded immutable business rules):

- A sales user creates a pricing case for an existing or prospective customer and provides opportunity name/reference, customer, opportunity type, geography/location, service/capability, delivery model, scope, expected start date, and contract duration.
- The case moves through the relevant workflow stages, for example Suspect → Recognition of Need → Evaluation of Options → Resolution of Concerns → Proposal → Negotiation → Approval → Contract & Launch → Closed Won. Adapt names to existing stage definitions; preserve any existing exclusions or stage rules where already implemented.
- The data provider (acting as HR/rate-card or resource-data provider in this POC) enters or updates the required skill/grade/location, available resource information, monthly cost or hourly cost, standard/client-specific sell rate, currency, effective date, resource quantity, hours, and duration. These values must be editable at runtime and used by the calculator; do not hard-code them only inside calculation code.
- Resource estimates are created/edited and linked to the pricing case.
- The pricing calculator calculates estimated delivery cost, sell price, discount, margin/contribution margin (CM%), and a readable breakdown using the supplied values and the existing calculation rules. Display the formula inputs and totals so a user can explain how the result was produced.
- The sales/client-partner user records a proposed price and negotiation details, then updates the offered/requested price and notes after each discussion.
- Every material pricing change can be saved as a new version (V1, V2, V3, etc.). Previous versions remain available and must not be overwritten. Show who/when changed the version where the current app supports user/timestamp fields, along with price, discount, CM%, notes/reason, and status. Provide a version comparison so users can see what changed between versions.
- Submit the selected version for approval. The approval queue must show the linked case and exact version, price/discount/CM%, approver role, status, comments, and action history as supported by the existing app. Approve, reject, or send back for changes using existing actions and permissions. A returned/rejected pricing version should be editable and resubmittable without losing prior history.
- Once the approved offer is accepted and the required workflow steps are complete, let the authorized user update the case through contract/launch and mark it **Closed Won**. Show the final accepted price, final version, approval outcome, and closed-won status on the case/workflow/dashboard. Preserve the history of earlier negotiations, calculations, versions, and approvals.
- Make the sample scenario easy to demonstrate from beginning to end. Provide clear next-step actions and visible statuses so a reviewer can follow the case without guessing which page to open next.

The above is a sample workflow for the POC. Follow existing app permissions and configured workflow/approval rules where present. Do not silently bypass required approvals to reach Closed Won. If a step is not supported in the existing project, implement the smallest consistent UI/data-flow change needed and identify any limitation in the completion report.

## 5. Dynamic data-provider approach (no external integrations)

We will act as the providers of sample data. Provide usable forms or editable controls for relevant information, rather than static display-only values. Depending on existing architecture, include:

- **Opportunity/case data:** customer, opportunity name/reference, opportunity type, location/region, stage, owner, scope, contract dates and expected duration.
- **HR/resource data:** skill/capability, grade/level, location, resource count, monthly CTC/cost, cost per hour, hours, duration and availability/notes where applicable.
- **Rate/pricing data:** standard or client-specific rate, currency, effective date, pricing model, and the fields the current calculator needs. Keep access to sensitive/master values aligned with existing roles.
- **Renewal inputs:** contract end date, current scope, utilization/hours and extra-resource details entered manually for this POC.
- **Negotiation data:** meeting/discussion date, requested price, offered price, discount, notes/reason, outcome and next action.
- **Approval data:** submitter, assigned approver/role, decision, comments and decision date where supported.

Requirements:
- Changes made in these forms must flow into the relevant case, estimate, calculation, version, approval, workflow, and dashboard views.
- Use one consistent source of truth for each record in the current app's data/state architecture; avoid unrelated duplicate copies of case, resource, and pricing data.
- Validate required fields, numeric values, currency, dates, and missing provider data. Show helpful validation messages and a clear empty state if data has not yet been supplied.
- If mock data is needed, seed a small coherent sample dataset and allow users to edit it. Make clear it is demonstration data.
- Use the current project's persistence approach. If it only uses in-memory state, explain the limitation in the final report; do not claim data survives a refresh unless it actually does.
- Do not add Salesforce, HRIS, Famstack, email, Microsoft Graph, or any other external API/integration.

## 6. Combined page: Resource Estimates & Pricing Calculator

Combine the existing Resource Estimates and Pricing Calculator functionality into one responsive page.

### Layout
- Desktop: two-column layout.
- Resource Estimates: compact left panel, approximately 25% of the content width.
- Pricing Calculator: main right panel, approximately 75% of the content width.
- Small screens: stack Resource Estimates first and Pricing Calculator second without horizontal overflow.
- Follow existing styles, typography, colours, spacing and responsive conventions.

### Resource Estimates panel
Keep important fields and functionality, including applicable skill/capability, grade/level, location, quantity, hours per resource, duration, delivery model, cost/rate inputs, add resource/skill line, and edit/remove actions. Use compact rows, collapsible details, or an edit dialog/drawer if needed. Values supplied here must be used by the calculator.

### Pricing Calculator panel
Preserve the current calculator's inputs, validation, breakdown and actions, including case/customer context, resource lines, cost/rate inputs, renewal COLA where applicable, discount, calculated sell price, estimated cost, CM%, Calculate Price, Save Calculation, Create Pricing Version and Submit for Approval. Keep the calculation rules in a shared component/service; do not create conflicting formulas between this page and the standalone calculator. Do not display success unless the underlying action actually succeeds.

## 7. Negotiations & Pricing Versions

Place this page immediately after the combined page. It must support the end-to-end sample use case and preserve all existing records/relationships.

- Display the case reference and linked customer/opportunity.
- Show the complete version timeline (V1, V2, V3, etc.) without overwriting earlier versions.
- Record negotiation date, requested/offered price, discount, relevant margin/CM%, notes/reason, user and status where available.
- Allow users to create a new version from an updated calculation or negotiation outcome.
- Show a comparison of important values across versions and clearly identify the current/submitted/approved/final accepted version.
- Keep version history linked to its case, calculations, negotiations and approvals.
- Include an understandable empty state and actions that lead to the next relevant step.

## 8. Standalone Pricing Calculator

Keep a separate full-width Pricing Calculator immediately after Negotiations & Pricing Versions. Reuse the same calculation component, formula, validation and data model as the combined page. Keep the selected case/resource context consistent with the app's existing state/backend approach. Avoid accidental duplicate version creation; saving a calculation and creating a pricing version should remain distinct actions if that is how the current app works.

## 9. Other pages and workflow behaviour

### Dashboard
Keep existing KPI cards, case overview, filters, status and activity information. Reflect real demo records and their current statuses, including negotiation, pending approval and Closed Won. Do not use static KPI numbers that conflict with the records shown elsewhere.

### Pricing Cases
Support creating/viewing/editing cases and viewing linked estimates, calculations, negotiation history, versions and approvals. Display stage, owner, customer/opportunity details, current version and final outcome when applicable.

### Renewals
Keep renewal tracking, contract dates, prior scope/SOW, manual utilization, COLA and extra-resource checks wherever implemented. For the POC, users/data providers manually enter renewal and utilization information; do not integrate with an external system.

### Approvals
Keep the approval queue and existing approve/reject/send-back actions and permission checks. Every approval must reference the exact pricing case and version submitted, and the selected version's values must be visible to the approver. Preserve decision comments and history.

### Workflow Tracker
Show the workflow stages, current stage, owner, waiting status, elapsed time, next action, and status/reason fields where available. Reflect the same case status as Pricing Cases and Dashboard. Clearly show the path to Closed Won and prevent the case from being marked Closed Won before required configured steps are completed.

### Administration
Keep existing users/roles, access, workflow, finance rules, approval rules, skills/levels and audit configuration UI. Where suitable, provide controlled sample-data/master-data entry for the POC. Respect existing role-based permissions; do not expose restricted values to unauthorized roles.

## 10. Technical constraints

1. Modify the existing codebase in place; do not create a separate replacement application.
2. Inspect the existing code and `package.json` before deciding how to run checks.
3. Preserve the current framework, stack, data architecture, coding conventions and role/permission checks.
4. No external APIs, email, Microsoft Graph, Salesforce, HRIS or Famstack integrations.
5. Reuse existing components and calculation logic wherever possible.
6. Maintain active navigation highlighting, page titles, routes and breadcrumbs where present.
7. Handle loading, empty, validation and error states consistently.
8. Do not make unrelated changes or silently change business rules.
9. Never fabricate successful saves, approvals, external syncs or persistence.
10. Do not bypass company security controls or request unrestricted machine access. Work only within the authorized project workspace.
11. If something is blocked by permissions or environment policy, do not claim it was changed; report the blocker and what the user needs to authorize.

## 11. Acceptance criteria

- The sidebar contains exactly the nine pages in the specified order.
- Rate Cards is not visible as a standalone page, while required rate data and calculation logic remain available.
- A reviewer can follow a linked sample case from creation through resource/rate data entry, calculation, negotiation, version history, approval, contract/launch and Closed Won.
- Sample HR/resource/rate/opportunity/negotiation data is editable through the app and affects the relevant calculations and pages.
- The calculator uses the entered resource and rate values, displays a transparent breakdown, and shares calculation logic across both calculator pages.
- New pricing versions preserve prior versions; negotiation history and approval decisions remain linked to the correct case and version.
- Rejected or returned pricing can be revised and resubmitted without losing history.
- Closed Won is reflected consistently across the case, workflow tracker and dashboard and is only reachable after required workflow/approval steps.
- The combined page uses approximately 25% width for Resource Estimates and 75% for the calculator on desktop, and stacks on small screens.
- No external integration is added, and the app does not falsely claim live system connectivity.
- Available existing build/test/lint checks are run and actual results are reported.

## 12. Codex execution instructions

1. Inspect the repository and identify current routes, navigation, data models/services, persistence, page components, calculation logic, negotiation/version logic, approvals and workflow transitions.
2. Briefly map the existing data flow before editing, then implement the smallest coherent set of changes needed for the end-to-end POC.
3. Seed or update a linked sample scenario only using the project's existing data/persistence approach; keep it editable.
4. Test the full scenario, including creating a case, supplying resource/rate inputs, calculating a price, creating multiple versions, recording negotiation changes, submitting for approval, processing an approval or send-back, and completing the valid path to Closed Won.
5. Inspect `package.json` and run only scripts that actually exist. Fix issues introduced by the changes.
6. Do not stop after writing a plan. Make the changes in the authorized current workspace. If filesystem access is read-only or a command is denied, stop safely and report the exact blocker rather than claiming completion.
7. At the end, report: files changed, data flow/persistence used, navigation changes, sample scenario demonstrated, version/negotiation/approval handling, Closed Won path, checks run with actual results, and any known limitations or blocked steps.


## 13. Implemented follow-up changes (13 October 2026)

This section records the implemented fixes following the original requirements above.

### 13.1 BU Head visibility and sequential Finance approval

- On server startup, existing pricing cases receive missing BU Head assignments for users whose BU matches the case. Existing assignments are preserved. This repairs the Northstar case without resetting its saved pricing data.
- The Approvals queue shows which earlier role must approve first, for example **Waiting for BU Head approval**.
- Approve, Reject and Send back buttons are available only to the assigned role (or Administrator), after earlier steps are approved. The existing CFO / EVP Finance role compatibility is retained.
- Backend role and sequential-approval checks remain enforced. Finance cannot bypass BU Head approval.

### 13.2 Approval decisions in Version timeline and comparison

- **Negotiations & Pricing Versions > Version timeline and comparison** includes an **Approval decisions** column on each version row.
- Each step shows its role, decision/status, reviewer, decision timestamp and comments when recorded.
- Decisions stay linked to the version that was reviewed. An approved V1 still shows its decisions when a newer V2 draft exists.
- Draft versions without approval tasks show **Not submitted for approval**.
- Version notes remain in their own column. There is no separate approval-history section.
- The Approvals page includes a link to the versions page. A successful approval preserves the reviewed case selection and refreshes the saved data.

### 13.3 Saved resource cost change history

- Saving resource estimates records changed hourly costs with resource ID, skill/role, grade, currency, previous cost, new cost, editor, timestamp and draft revision.
- **Negotiations & Pricing Versions > Resource cost change history** displays these saved changes for the selected case.
- Use **Save draft**, **Calculate Price** or **Save Calculation** to persist resource edits. Unsaved edits do not become history.
- Cost history is excluded from backend responses for identities without cost visibility. Existing version snapshots remain unchanged.
- This history captures newly saved changes; earlier edits made before this feature cannot be reconstructed automatically.

### 13.4 Client Partner new-case form

- The new-case form prefills the Client Partner's assigned customer, **Northstar Retail**, and makes the Customer field read-only for that role.
- The form explains the assigned-customer restriction. The default BU uses the selected user's BU, with R&M as the fallback.
- Server-side assigned-account checks remain enforced.
- Modal save errors appear inside the form as well as in the toast, allowing the user to read and correct validation failures.
- New cases require a unique opportunity reference. Reusing an existing reference returns the accessible existing case rather than creating a duplicate.

### 13.5 Missing skill / HR demonstration scope

- The POC has no HR login, HR skill-master screen or live HR integration.
- A BU SPOC or Administrator represents the manual data provider: use **Add resource**, enter the missing skill/role and grade, and supply its hourly cost and resource estimates.
- A matching selling rate is proposed separately under **Administration > Local rate administration** and approved by Finance before pricing can resolve it.
- Matching rate fields include skill/role, grade, BU, work type, location, currency and client/standard scope. Effective dates must cover the calculation date.
- Describe an HR-maintained skill master as a future capability, not an implemented feature.

### 13.6 Demonstration sequence

1. As Demo Client Partner, create a Northstar Retail / R&M case with a unique opportunity reference and complete scope and contract details.
2. Advance discovery stages in order through Proposal using Workflow Tracker and record a reason at each stage.
3. As Demo BU SPOC, add the missing skill and its resource estimates and cost; save the draft.
4. Propose its matching selling rate in Administration; switch to Demo Finance Reviewer to approve the rate.
5. As BU SPOC, calculate pricing, save the calculation and create V1 with a reason.
6. As Client Partner, record a discussion and revised offer; save a fresh calculation and create V2.
7. Show V1/V2 pricing differences in Version timeline and comparison, then submit V2.
8. Approve first as Demo BU Head, then as Demo Finance Reviewer. Show both decisions directly in V2's Approval decisions column.
9. As Client Partner, mark the approved current version agreed and record customer acceptance evidence.
10. Advance to Contract & Launch with evidence, then Closed Won. Verify the final version and price in the case, workflow and dashboard.

Reselect the same case after changing identities. Material pricing edits after approval require a new calculation/version and approval. Returned/rejected versions retain their original history; restore for revision and create a new version instead of overwriting them.

### 13.7 Changed files and validation

| File | Changes |
|---|---|
| `src/server.js` | Existing-case BU Head assignments, saved resource cost history and cost-history redaction |
| `public/app.js` | Approval dependencies/actions, per-version approval column, cost history, assigned-customer defaults and modal errors |
| `public/styles.css` | Wrapping and spacing for approval details within version rows |
| `tests/ui.test.js` | Regression checks for approval sequencing, cost history, decisions on the correct version row and Client Partner customer defaults |
| `tests/workflow.test.js` | HTTP checks for BU Head visibility, cost-history persistence/redaction and Finance decision details |
| `docs/DEMO_GUIDE.md` | Saved cost-history and approval-flow guidance |

Latest verification: **`npm run check` passed; `npm test` passed all 25 tests**. Test coverage includes the linked workflow through negotiations, returned/rejected versions, sequential approvals, agreement, contract/launch and Closed Won.

Data continues to persist locally in `data/store.json`. No live external integrations were added. Demo identity selection simulates roles, and the pricing formula remains labelled demo/unapproved.


## 14. Master-spec follow-up implementation (13 October 2026)

The master specification at reference/PRICE_TRACK_CODEX_TEAM_MASTER_SPEC.md supersedes earlier demo behavior in this document:

- Client Partner now has read-only Price Track access. Request Pricing uses the explicit mock Salesforce intake dialog/route. Demo Pricing Analyst prepares commercial work.
- Local persistence defaults to SQLite/sql.js with migrations and core constraints. Existing JSON is imported without modifying/deleting it; subsequent runs use SQLite.
- Resource draft edits may be manually saved or opt-in autosaved; they do not create formal versions. BU SPOC validation is recorded at the current revision.
- Submit working draft creates the formal immutable version and approval tasks. Legacy Draft rows are preserved as history.
- Pending-version replacement defaults to block. Administrator can explicitly choose labelled demo supersession, which cancels outstanding old tasks and requires fresh approvals.
- Approval decisions remain directly in Version timeline and comparison. Configuration-driven demo routes support deal value, discount, CM/deterioration, BU, work type and exception categories.
- Closed Won queues a pending Project Track outbox record. Receiver acceptance is separate. First dispatch requires the final agreed Closed Won version.
- Closed Won reopen is audited and preserves final/handoff evidence. Previously accepted downstream data sets a reconciliation hold. Post-Closed-Won CommercialAmendment authoring/dispatch is disabled.
- Existing financial arithmetic is retained with explicit four-work-type demo strategy IDs. Exact workbook parity is unverified because the required workbooks are absent.
- Latest checks: syntax, 31 automated tests, local artifact build and HTTP smoke passed; lockfile installation and dependency audit passed; development startup and fixed-port health were verified.

Full before/after requirement status: docs/MASTER_SPEC_GAP_ANALYSIS.md. Changed/new file inventory and remaining work: docs/IMPLEMENTATION_REPORT.md. Actual verification evidence: docs/testing/TEST_REPORT.md. Current walkthrough: docs/DEMO_GUIDE.md.

This is a tested local foundation/lifecycle update, not full enterprise master-spec completion. React/Nest migration, SQL Server tests, workbook parity, complete financial providers, enterprise SSO, browser E2E and production security/deployment gates remain open.
