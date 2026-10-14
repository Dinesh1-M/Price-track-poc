# End-to-end sample pricing POC - 12 October 2026

Implemented the supplied `Price_Tracker_Codex_UI_Changes (1).md` in the existing Node HTTP / vanilla JavaScript application. No external integration or dependency was added.

## Files changed

- `src/domain.js`: shared quantity/hour/cost/rate formula, finite numeric/date/currency validation, discount, renewal COLA, negotiated offer override and Closed Won guards. Existing utilization and scheduled-cost assumptions remain in effect; rate resolution now also respects supplied grade and business unit.
- `src/lifecycle.js` (new): validated case/provider inputs, stage transitions, negotiation validation, sample defaults and accepted offer summary.
- `src/poc-api.js` (new): case/renewal edits, saved calculations, discussion records, separate immutable version creation and submission, guarded workflow advancement.
- `src/server.js`: existing API integration, role/assignment checks, send-back decisions, approval and agreement history, controlled rate replacement, cost response filtering and terminal-state guards.
- `src/store.js`: additive persisted sample defaults and one approved sample Northstar FTE rate. Existing versions and records are preserved.
- `data/store.json`: additive migration of editable sample metadata, quantities, availability, stage history arrays and the Northstar rate. No test journey is inserted into the working dataset.
- `public/app.js`: provider forms, shared calculator controls and formula explanation, renewal inputs, negotiation timeline, version comparisons, exact-version approval values, stage actions and final offer views.
- `public/styles.css`: current-stage styling and wrapping. Existing 1:3 desktop workspace and stacked mobile layout remain.
- `package.json`: existing syntax-check script extended to the two new backend modules.
- `tests/ui.test.js`: additional provider/action/formula/final-outcome assertions.
- `tests/workflow.test.js` (new): real local HTTP workflow with isolated JSON storage, negative validation/permission cases and preserved pricing history.
- `README.md`, `docs/DEMO_GUIDE.md`, `docs/POC_LIMITATIONS.md`, `docs/api/API_CONTRACT.md`, `docs/testing/TEST_REPORT.md`, and this report: current usage, contract, validation evidence and limitations.

## Navigation and data flow

The existing sidebar already contains exactly Dashboard; Pricing Cases; Renewals; Resource Estimates & Pricing Calculator; Negotiations & Pricing Versions; Pricing Calculator; Approvals; Workflow Tracker; Administration. Both calculator pages use the same draft and backend calculation. Rate data stays under Administration, and legacy Rate Cards links resolve there.

Manual forms -> existing REST API -> case/resource/rate records in `data/store.json` -> one shared pricing engine -> saved calculation records -> version snapshots linked to calculations and negotiations -> sequential BU Head and Finance decisions -> recorded client acceptance -> Contract & Launch evidence -> Closed Won. Bootstrap derives all page values from these records. Local data survives refresh and server reload; tests re-read saved JSON to confirm final state and history.

The current Northstar PT-1001 sample is coherent and fully calculable. Its editable initial resources produce $65,856 revenue and $32,640 scheduled cost with no discount/COLA (sample formula). New cases start at Suspect; migrated samples start at their existing equivalent stage. No fictitious past stage events are invented.

## Actual workflow demonstrated by the HTTP test

1. Client Partner created an R&M Northstar renewal case and advanced the four discovery transitions through Proposal.
2. Administrator supplied a sample rate; Finance approved it, with self-approval blocked. Administrator supplied two analysts, 100 hours/month, six months, 80% utilization, $20/hour cost and $50/hour sell rate.
3. Cost $24,000; base $48,000; 5% COLA $50,400; 10% discount offer $45,360. Saved calculation and draft V1 were separate actions.
4. V1 was submitted and returned by the assigned BU Head. A client discussion requested $40,000 and offered $44,000; saved V2 retained the discussion link. BU Head approved V2, then Finance rejected it.
5. Restored a new working draft, recorded a second discussion, saved V3 at $46,000, and submitted it. BU Head then Finance approved their exact tasks. Client Partner recorded acceptance evidence, completed Contract & Launch with evidence, and marked Closed Won.
6. Final $46,000 / V3, returned V1, rejected V2, all three calculations, both discussions and approval comments remained persisted. A later approved rate replacement did not rewrite the accepted offer.

Negative checks cover stage skipping, missing calculation, duplicate draft creation, invalid rates/dates/duration/discussion prices, unauthorized account/approval actions, cost overwrite, out-of-order and post-return approval, absent acceptance/launch evidence, and edits after closure.

## Actual checks

- `npm run check`: PASS, six JavaScript syntax checks.
- `npm test`: PASS, 21 tests, zero failures.
- First sandboxed `npm test` attempt was blocked by Windows `spawn EPERM`. Rerunning with the approved scoped test-process permission succeeded. Two initial UI fixture failures were fixed by adding the persisted defaults to the seed.
- HTTP test served the homepage and app script, exercised real API calls and re-read persisted JSON. Test data was isolated and cleaned up.
- No build or lint script exists. No new build/lint command was invented.
- Template/UI assertions use the existing lightweight Node VM harness. No interactive browser or pixel/accessibility review was performed.

See `DEMO_GUIDE.md` for a reviewer walkthrough and `POC_LIMITATIONS.md` for the remaining POC boundaries.


## Master-spec implementation report, 13 October 2026

This update supersedes earlier report descriptions of JSON-only defaults, Client Partner editing, formal Draft-version creation and pre-Closed-Won handoff. **The entire master specification is not complete.** Requirement-by-requirement before/after status, affected files and remaining work are in MASTER_SPEC_GAP_ANALYSIS.md.

Implemented local foundation: SQLite/sql.js migration-backed core persistence and non-destructive JSON import; role/account filtering and mandatory demo identity; Client Partner read-only Price Track with explicit mock Salesforce intake; Pricing Analyst preparation; revision-bound BU SPOC validation; opt-in resource autosave; formal snapshots only at submission; explicit pending-version block/supersede configuration; assigned sequential tasks and configuration-driven demo routing dimensions; per-version decision column; Closed Won pending outbox; mock handoff failure/replay and correlation acknowledgements; audited Closed Won reopen with downstream reconciliation hold; disabled CommercialAmendment dispatch; local build, smoke and operations artifacts.

Financial semantics are preserved. Work-type strategies are explicit demo interfaces, not verified Program/Product business models. Exact workbook parity, decimal/FX semantics and Finance approval remain unresolved. Production startup and production submission are blocked.

### Modified files in this master-spec update

- package.json, .env.example, .gitignore, README.md
- src/server.js, src/store.js, src/domain.js, src/poc-api.js
- public/app.js
- tests/domain.test.js, tests/workflow.test.js, tests/ui.test.js
- docs/DEMO_GUIDE.md, docs/architecture/REPOSITORY_ASSESSMENT.md, docs/architecture/DECISIONS.md
- docs/PENDING_DECISIONS.md, docs/testing/TEST_REPORT.md, docs/api/API_CONTRACT.md, docs/IMPLEMENTATION_REPORT.md
- Price_Tracker_Codex_UI_Changes (1).md

### Newly created files

- package-lock.json
- src/sqlite-store.js, src/policy.js, src/work-types.js
- db/migrations/sqlite/001_core.sql; db/migrations/mssql/001_core.sql (unverified draft)
- tests/master.test.js, tests/sqlite.test.js, tests/policy.test.js
- scripts/build.js, scripts/smoke.js
- reference/PRICE_TRACK_CODEX_TEAM_MASTER_SPEC.md
- docs/MASTER_SPEC_GAP_ANALYSIS.md
- docs/finance/FORMULA_TRACEABILITY.md, docs/finance/FORMULA_REGISTER.csv
- docs/runbooks/LOCAL_OPERATIONS.md
- docs/api/commercial-amendment-v1.schema.json (design-only)

Generated dist is an ignored local POC artifact. dev-verification.sqlite is an isolated ignored local verification database. The existing data/store.json was not deleted or replaced by this update.

### Verification and limits

Final npm run check, npm test (31/31), npm run build and npm run smoke passed. npm ci --ignore-scripts and npm audit --audit-level=high passed, with 0 reported dependency vulnerabilities. npm run dev started and a fixed-port health request succeeded. See testing/TEST_REPORT.md for actual evidence and the transient first dev check failure.

Remaining unimplemented/unverified requirements: React/TypeScript/NestJS migration; full normalized financial/governance providers and admin capabilities; real SQL Server adapter/compatibility tests; comprehensive workbook golden coverage and decimal/FX calculations; enterprise identity and live integration contracts; complete OpenAPI/DTO schemas; automated outbox/reminder workers; full version-input deltas; browser E2E/accessibility; CI/CD, production deployment and disaster recovery/security sign-off. These are release gaps, not claimed completed features. The supplied workbooks are available and inspected; Finance approvals and comprehensive parity evidence remain open.

### Run locally

From price-track-poc, run npm ci, set DB_PROVIDER=sqlite and SQLITE_PATH=./data/price-track.sqlite in PowerShell, then npm start. Open http://localhost:3000. Restart a currently running older server before reviewing this update. Use Demo Pricing Analyst for pricing work and Demo Client Partner only for mock Salesforce intake/read-only commercial views. Follow DEMO_GUIDE.md.

### Excel intake and notification follow-up

The Client Partner can open **Salesforce Opportunities** and browse the supplied local workbook. `u-cp-sf` is scoped to ABC because the workbook has no Northstar rows; all creation requests validate the source Opportunity ID and account on the server. Existing cases open rather than duplicate. No live Salesforce calls or source workbook edits are made.

Approval notifications are generated from successful workflow actions: submission alerts only the first assigned approver, the next approver is alerted after the preceding approval, and final/rejected/returned outcomes alert accessible request owners/submitters. Stable event/version/task/recipient keys prevent duplicates. Notifications and read state live in the existing application-state payload, so no schema migration was needed; persistence is local JSON or SQLite/sql.js, not external delivery.

The Margin Calculator workbook was inspected and mapped in `docs/finance/FORMULA_TRACEABILITY.md`. Its onshore sample cost is 3,386.875 versus Price Tracker's 6,773.75 for equivalent 160 scheduled hours at 50% billability. This difference is regression-tested and existing pricing semantics were intentionally not changed. Formula policy, vertical GM, bench/IP treatment and FX/rounding remain Finance decisions. See `docs/testing/TEST_REPORT.md` for current verification evidence.
