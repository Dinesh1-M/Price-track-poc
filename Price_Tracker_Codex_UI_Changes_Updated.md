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

## 15. New follow-up requirements: Excel-based Salesforce opportunity intake and in-app notifications

This section adds the next POC requirements. It supplements earlier sections and supersedes any earlier wording that conflicts with these specific requirements. Preserve existing application architecture and working functionality unless a change is explicitly required below.

### 15.1 Excel files to be provided as data sources

The project owner will provide two Excel workbooks:
1. A Salesforce opportunity dataset in Excel.
2. A Margin Calculator Excel workbook containing current margin/pricing calculation logic and/or reference values.

These files will be supplied separately. Do not assume their filenames, worksheet names, column names, formulas, or schema before inspecting the actual files.

When the files are available:
- Inspect relevant worksheets, headers, data types, formulas, lookups, and dependencies before implementation.
- Map Salesforce opportunity columns to existing Price Tracker case/opportunity fields.
- Map the Margin Calculator workbook's inputs, formulas, outputs, and business rules to Price Tracker's calculation flow.
- Reuse the current app's data model and calculation service where practical. Avoid conflicting formulas or a second source of truth.
- Record unclear, missing, or conflicting fields as questions; do not silently guess.
- Treat the workbooks as provided/local POC data, not as proof of a live Salesforce or finance-system connection.
- Do not modify source workbooks unless explicitly requested. Preserve originals.
- Do not expose confidential data in logs, errors, or UI beyond authorized access.

If either workbook is not present in the authorized project workspace, do not fabricate its contents. Implement only clearly supported scaffolding and report which workbook is still needed.

### 15.2 Salesforce opportunity selection and opening Price Tracker

Add a POC workflow in which a Client Partner can select an opportunity from the supplied Salesforce Excel dataset and open the corresponding pricing workflow in Price Tracker.

Expected behaviour:
1. Provide an entry point labelled clearly, such as **Salesforce Opportunities** or **Select Opportunity**, positioned appropriately in the existing UI. Do not create a separate application.
2. Show opportunities read from the supplied Excel dataset, using useful identifying fields that actually exist in the workbook, such as opportunity reference/ID, opportunity name, customer/account, stage, region, currency, owner, and engagement model.
3. Allow the Client Partner to search, filter, and select an opportunity.
4. On selection, open the relevant Price Tracker route/page and prefill supported opportunity/customer fields from the selected dataset row.
5. Preserve the source opportunity reference/ID so the case remains traceable to the selected record.
6. If a Price Tracker case already exists for that opportunity reference, open it instead of creating a duplicate.
7. If no case exists, provide the appropriate new pricing-request flow with the opportunity information prefilled, subject to existing permissions and required fields.
8. Validate missing or duplicate references and display clear messages.
9. Enforce applicable access restrictions in the backend/service layer, not only in the UI.
10. Show a clear empty state if the dataset is missing or contains no usable opportunity records.

This is an **Excel-backed POC intake flow**, not a live Salesforce integration. Do not add Salesforce APIs, OAuth, webhooks, external network calls, or claims of real-time synchronization. The UI may resemble an opportunity-selection experience, but the source is the supplied Excel dataset.

### 15.3 In-app notifications in the left sidebar

Add a new **Notifications** entry to the existing left sidebar. This must be an in-app notification feature; do not add email, Microsoft Graph, Teams, SMS, browser push, or other external notification integrations.

The Notifications page should show actionable items generated by actual Price Tracker workflow events. Examples:
- A BU Head receives an in-app notification when a pricing version is submitted and awaits their approval.
- A Finance approver receives a notification when the required earlier approval is complete and the item is awaiting Finance approval.
- The submitter/request owner receives a notification when a quote is approved, rejected, or returned for changes.
- Authorized users may receive a notification when a Project Track handoff is pending, fails, or completes, if these events are supported.
- Each notification links to the relevant case, exact pricing version, approval task, or handoff record.

Each notification should include, where applicable:
- Notification ID
- Recipient user/role
- Title
- Short message
- Notification type/category
- Related case ID/reference
- Related pricing version or approval task ID
- Created timestamp
- Read/unread status
- Action/destination route
- Source event
- Status, such as unread/read or open/resolved, if needed

Expected behaviour:
1. Add a visible Notifications item to the left sidebar and show an unread count/badge when unread notifications exist.
2. List the current user's notifications, newest first, with clear read/unread styling.
3. Allow users to open a notification and navigate to the related record if authorized.
4. Support marking an item as read and, if appropriate, marking all as read.
5. Generate notifications from actual persisted workflow events/actions; do not create fake notifications merely to populate the screen.
6. Prevent duplicate notifications for the same event/recipient when retries or page refreshes occur. Use a stable event/reference key if supported.
7. Enforce recipient access in the backend/service layer. Users must not view another user's restricted case details by changing a URL or client-side state.
8. Keep notifications consistent with the current persistence layer. If they persist only locally, explain that limitation; do not claim cross-device or enterprise delivery.
9. If no notifications exist, show a helpful empty state explaining that approval/workflow notifications appear when relevant events occur.
10. Use clear messages, for example: **“Approval required: Northstar Retail — V2 is awaiting your BU Head review.”**

### 15.4 Approval notification rules

Use the existing sequential approval logic:
- When a version is submitted, create an in-app notification for the assigned first approver, such as the BU Head.
- Do not notify Finance that its action is ready until the required preceding approval is completed, unless an explicitly approved business rule says otherwise.
- When the BU Head approves, update the approval task and notify Finance if Finance is the next required approver.
- When Finance approves, notify the appropriate submitter/request owner that the version has completed internal approval.
- When an approval is rejected or sent back, notify the appropriate submitter/request owner and include the recorded reason/comment where permissions allow.
- Notifications must reference the exact case and version. A V1 notification must not accidentally open or imply approval of V2.
- A material change that creates a new version must follow existing approval rules and must not reuse stale approval notifications as evidence of approval.

A notification is an alert only. It does not grant approval permission and does not itself approve a quote. Preserve backend role checks and sequential approval checks.

### 15.5 Margin Calculator workbook: parity and validation

Once the Margin Calculator Excel workbook is provided:
- Inspect its formulas and input/output relationships before changing Price Tracker's calculator.
- Create a field/formula mapping from workbook inputs to Price Tracker fields and workbook outputs to displayed results.
- Compare current Price Tracker calculations with the workbook using test cases including normal values, zero/blank values, discounts, and supported currency or COLA scenarios.
- Identify differences in formula definitions, rounding, currency handling, CM/GM terminology, and edge-case handling.
- Do not automatically assume the spreadsheet is approved policy if formulas or business meanings are unclear. Flag these for Finance confirmation.
- Keep formula logic in a shared calculation service used by both calculator views.
- Add or update automated tests for verified formula behaviour.
- Do not hard-code workbook cell addresses or formulas without documenting their meaning and verifying the workbook structure.
- Do not claim workbook parity until the actual workbook has been inspected and comparison tests pass.

### 15.6 Data model and implementation guidance

Inspect current SQLite/sql.js persistence, migrations, user/role model, case records, opportunity-reference uniqueness, approval tasks, version history, and routes before implementing.

Reuse the existing persistence and authorization approach. Add only the smallest required schema changes, such as a notifications table or equivalent persistent store, and migrations if needed. Tie notification creation to the same successful transaction/event as the workflow action where supported. If atomic handling is unavailable, use a safe idempotent approach and document the limitation.

For opportunity intake:
- Store or reference the source opportunity ID/reference.
- Enforce the existing duplicate-opportunity rule.
- Keep the source workbook as the imported data source; do not silently turn imported rows into fabricated live Salesforce records.
- If refresh/re-import is added, define how changed source rows are handled. Do not overwrite local pricing history, negotiation history, approval decisions, or Closed Won/handoff evidence.

For notifications:
- Add backend/service functions for creating, listing, reading, and marking notifications as read.
- Check recipient identity and authorization on every relevant request.
- Do not expose sensitive employee costs or other restricted fields in notification messages unless the recipient is authorized to see them.

### 15.7 Navigation and visual behaviour

- Add **Notifications** as a new left-sidebar item without removing or renaming the existing nine required pages.
- Preserve the existing nine-page navigation order. Place Notifications after those pages or in another sensible position without reordering the original nine.
- Add an unread badge/count if consistent with the current design.
- Match existing styling, responsive layout, accessibility patterns, and active-navigation treatment.
- Make the opportunity-selection entry point easy for the Client Partner to find without creating duplicate/conflicting pricing-case routes.
- Ensure notification links preserve the relevant case and pricing-version context.

### 15.8 Acceptance criteria for these follow-up requirements

- The supplied Salesforce Excel dataset can be read and its usable opportunities are shown in Price Tracker.
- Selecting an opportunity opens the appropriate Price Tracker case/pricing flow with supported fields prefilled.
- The opportunity reference is preserved and duplicate cases are not created for the same reference.
- The Margin Calculator workbook is inspected before any claim of formula parity.
- Verified formulas are mapped, tested, and documented; unresolved financial rules are flagged for Finance.
- Notifications appears in the left sidebar without removing or renaming the existing nine pages.
- Submitting a version creates a notification for the correct first approver.
- Completing a prior approval creates the next approver's notification only when that approval becomes actionable.
- Approval outcomes notify the appropriate user and link to the correct case/version.
- Read/unread state persists using the existing persistence mechanism.
- Notifications do not bypass approval permissions or expose restricted case data.
- No external API, email, Microsoft Graph, Teams, or live Salesforce connection is added.
- Automated tests cover opportunity selection/prefill, duplicate prevention, notification creation, recipient access, read/unread state, and version-specific approval notifications where supported.
- Run applicable checks and report actual results.

### 15.9 Execution instructions

1. Inspect the current repository and this specification before editing.
2. Inspect both Excel workbooks when available; do not guess their structure.
3. Briefly explain how opportunity intake, approval workflow, persistence, and navigation currently work before editing.
4. Implement Excel-backed opportunity selection and in-app notifications in the existing application.
5. Preserve all current functionality and the existing nine-page navigation.
6. Update tests and relevant documentation.
7. Run available checks and report actual outcomes.
8. Report files changed, schema/migrations added, how to load/use the Excel data, how notification recipients are determined, how to demonstrate the flow, and unresolved Finance/business decisions.
9. Do not claim a live Salesforce connection or external notification delivery.
