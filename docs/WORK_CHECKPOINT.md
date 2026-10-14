# Price Track work checkpoint

Updated: 14 October 2026. User resumed work. Continue the existing repository; do not rebuild from scratch.

## Workspace and authorizations

Project: `D:\Price_Tracker\price-track-poc`. No Git repository. Preserve the original source workbooks, user database and historical submitted versions. The handoff MD is project context; newer user instructions take precedence. External Pricing Intake worksheet/CLI, owner session login, five named Tech COEs, resource UI, source formulas and local deployment work were authorized. User subsequently specified renewal reminders, Finance cost COLA and named BU approval owners.

No subagents requested. React/Nest/SQL Server target migration and live integrations remain outstanding. Do not claim production approval. Production startup intentionally rejects until release gates are satisfied.

## Latest implemented requirements

- All **38 Salesforce columns / 1,057 opportunities** audited and retained; typed amount/currency, dates, quarter accrued values and full source fields. Complete coverage is in `docs/SALESFORCE_FIELD_MAP.md`.
- `data/Pricing Intake.xlsx` upgraded to **47 columns**, all source opportunities, Close Date, amount/budget, vertical/subvertical, reminder date and explanatory utilization/COLA columns. Existing Request IDs and Yes/No flags preserved; timestamped backups remain alongside it. All new selections default No. The server trusts only the source workbook, never editable reference cells.
- Renewal in-app reminders start **three calendar months before Close Date**, distinct from project end. Calendar month-end handling, India timezone, recipient scope, ownership revocation and deduplication implemented. Startup, authenticated bootstrap/notification reads and minute scheduler refresh alerts; startup catches missed dates. Alerts exist before a pricing case and never create cases. No email/Teams delivery.
- Historical actual utilization plus report/evidence are explicit editable renewal inputs. Proposed billability is derived separately from resource hours. Source contains neither actual utilization nor COLA.
- User explicitly specified **COLA increases overall cost**, initially **5%**, Finance editable, annual EVP Finance review by **Ankur Maheshwari**. Source fixed rates and selling price remain unchanged; all cost including bench/products is adjusted. Calculation and rule snapshots retain applied policy. Finance changes revise active renewal drafts and invalidate COE validation. Annual review notifications persist. Only EVP Finance can record annual approval.
- User specified **RCM -> R&M / CPG**, **TMT -> Tech 1 / Tech 2**. No discriminator for Tech 1/2 supplied; child BU selection is explicit. Named heads: R&M — namratta pandya; CPG — Ashish gupta; Tech 1 — Anil damodaran; Tech 2 — kiran nandavarappu; MMM — mallesh reddy.
- HLS-A, HLS-CI and RAI have no known heads. Missing active head blocks submission. Only selected BU head may decide its BU task. Admin mappings persist and invalidate affected draft validation; submitted task assignees remain snapshots.
- Ankur's normal login ID is his name; any old generic EVP credential is rotated during migration. Generic BU Head demo identity is disabled in normal mode. Generated credentials remain private in `data/local-access/LOCAL_LOGIN_CREDENTIALS.csv`.
- Fixed approval-policy date validation discovered during review, so effective-date policies can be saved.

## Existing implemented flow

Hashed random passwords, cookie sessions, strict source-owner opportunity isolation even across shared account names, read-only Client Partners, no in-app pricing creation, token-authenticated external intake and lifecycle events, idempotency, audited source reconciliation, five editable Tech COE mappings, all assigned COEs validating current revision, immutable versions, sequential BU/Finance approvals, rejection/resubmission, agreement and guarded external Closed Won, separate mock handoff acceptance.

Source workbook engine uses rational decimal arithmetic, fixed role/experience/location costs, target-margin gross-up, employee bench loading, normalized vertical GM and explicit product inputs. All 1,781 formulas extracted; cached comparison fixtures pass. Finance sign-off and fresh Excel parity are still required. Ambiguous workbook FX/constants, Program/Product/PM semantics remain documented.

## Verification

- Latest `npm test`: **54 passed / 0 failed**. Includes all three complete paths, real XLSX CLI, normal cookie auth, owner isolation, named COE validation, named BU head routing, Finance-only COLA changes and EVP-only review, immutable history after cost policy change, calendar boundaries, pre-intake reminders, all 38 fields and wide intake refresh preserving Yes selections.
- Latest `node scripts/browser-check.js`: **passed** using hidden Edge and isolated temporary DB. Covers login, external case arrival, BU selection, resource editing/save/calculation, renewal queue and BU/Finance policy screens. Screenshots: `docs/testing/screenshots/login.png`, `workspace.png`, `renewals.png`, `bu-finance-policy.png`.
- Original 1,781-formula manifest/source hash remains protected by tests.
- Final `npm run build`: **passed**, built 14 October 2026 at 16:03 UTC. Inspected `dist/data`: only the two original source XLSX files. Databases, credentials, backups and .env excluded.
- `scripts/smoke.js` edit was previously rejected by the tool approval step. Preserve it; it still targets legacy header auth. Do not claim it passes or bypass the rejected edit.
- CI configuration exists but has not been run remotely.

## Local server and backups

Updated server started hidden on port **3000**, PID **24588**, from this workspace. Logs: `data/local-server.out.log` and `data/local-server.err.log`. Health check returned HTTP 200 / status ok after startup. Read-only inspection confirmed all eight BU mappings, Ankur's login, 5% COLA, 40 source owners and 11 active renewal alerts. Check health before restarting; do not start another process against the same SQLite file.

Before startup, copied the existing SQLite database and legacy JSON to:
`data/backups/before-renewal-bu-update-20261014-213148`.

Tests/browser use isolated temporary databases. The local server intentionally performs authorized schema/state migrations and provisions new identities in the backed-up user database. Source XLSX files are unchanged.

## How to check

Open `http://localhost:3000`, hard refresh with Ctrl+F5, sign in using the locally generated credential export. Review Renewals and Administration (as appropriate role). Pricing requests originate externally:
`npm run intake -- --file "data/Pricing Intake.xlsx"`.
Refresh worksheet references with `npm run intake:template -- --refresh`; this preserves Request IDs/selections and saves a backup.

## Remaining production work

Fresh Excel golden fixtures and Finance acceptance; real SSO and external API contracts; target stack and tested SQL Server persistence/concurrency/migrations; monitored deployment, backup/restore and security/operational acceptance. Unknown BU heads and unsupported source capabilities require actual named assignments. Local functional coverage is not production readiness.
