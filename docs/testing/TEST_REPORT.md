# Verification - 12 October 2026

- `npm run check`: passed all six JavaScript syntax checks.
- `npm test`: 21 passed, zero failed. Includes 11 domain tests, 2 seed tests, 7 UI tests and 1 full HTTP workflow test.
- The HTTP test starts a local server on an ephemeral port with a separate JSON store under the test directory. It serves `/` and `/app.js`, performs the pricing journey and permission/validation failure checks, re-reads persisted data, and cleans up its own test store.
- The tested final offer was V3 at USD 46,000, with V1 Returned and V2 Rejected. See `../IMPLEMENTATION_REPORT.md` for inputs and exact sequence.
- Initial sandboxed test execution failed with Windows spawn EPERM. A scoped approved test-process run succeeded. Intermediate fixture failures were fixed; final results above are from the completed implementation.
- Existing UI tests use a lightweight document stub / Node VM. Browser interaction, pixel rendering, accessibility and load/security testing have not been performed.
- No build or lint script exists in package.json.


## Master-spec verification, 13 October 2026

Environment: Windows PowerShell, Node.js 24.20.0, npm 11.19.0. No Docker used. There is no Git repository/clean-checkout evidence in the supplied workspace.

| Executed command/check | Actual result |
|---|---|
| `npm install sql.js` | First sandbox attempt failed ENOTCACHED; authorized network retry installed sql.js |
| `npm ci --ignore-scripts` | Passed: lockfile install, 1 dependency installed |
| `npm audit --audit-level=high` | Passed: 0 reported vulnerabilities in the current dependency set |
| `npm run check` | Passed syntax checks on frontend and all backend modules |
| `npm test` | Passed: 31 tests, 0 failed, 0 skipped |
| `npm run build` | Passed: local POC artifact built under dist; data and secrets excluded |
| `npm run smoke` | Passed: UI/health, SQLite bootstrap and missing-identity denial |
| `npm run dev` | Started on Windows without Docker; SQLite provider |
| GET health on fixed dev port 3107 | Passed: status ok, mode DEMO; test server then stopped |

An initial ephemeral-port dev check could not connect after the watch process restarted onto a different port following dependency installation. The fixed-port rerun succeeded. This is not reported as an always-passing dev health check.

Automated evidence:

- tests/sqlite.test.js: imports existing JSON without modifying it, restart persistence, unique opportunity IDs, immutable submitted snapshots and migration version.
- tests/master.test.js: explicit mock Salesforce intake and duplicate protection; Client Partner read-only/account/cost isolation; missing/invalid identity denial; stale revisions; separate parallel draft; default pending-version hold; explicit supersession/cancelled tasks; validation gate; fresh sequential approvals; current-version agreement; Closed Won-only pending outbox; timeout/exhaustion/exception/replay; accepted duplicate idempotency; acknowledgement correlation/terminal-state checks; disabled amendments; audited reopen and reconciliation hold; persisted SQLite state.
- tests/workflow.test.js: regression lifecycle with manual rates, self-approval rejection, calculations, returned/rejected versions, negotiations, acceptance, contract/launch and Closed Won; preserved historical values.
- tests/policy.test.js: combined configurable approval dimensions, assigned approvers, scoped/expired delegation and explicit Admin commercial permission.
- tests/ui.test.js: nine-page render/navigation, restricted editors, version-row decision visibility, Client Partner customer default, autosave preserves newer edits and creates no version.
- tests/domain.test.js: current demo arithmetic, rate precedence/errors/effective dates, explicit four work-type strategy IDs and negative inputs.

Limits: VM render tests are not browser E2E. A single workbook reference sample is covered, not comprehensive formula parity. SQL Server draft migration was not executed. No enterprise SSO, live integration, disaster recovery, multi-process concurrency or production deployment test ran. Zero dependency findings do not constitute a complete security audit.

## Excel intake and in-app notification follow-up

| Executed command/check | Actual result |
|---|---|
| `node --test tests/ui.test.js` | Passed: 19 tests, 0 failed; includes identity-scope and stale-response regression tests |
| `npm run check` | Passed syntax checks, including the workbook reader |
| `npm test` | Passed: 43 tests, 0 failed, 0 skipped |
| `npm audit --omit=dev` | Passed: 0 reported vulnerabilities |
| `npm ls --depth=0` | Direct dependencies: read-excel-file 9.3.12 and sql.js 1.14.2 |
| `npm run build` | Passed; generated local POC artifact |
| `npm run smoke` | Passed: UI, health, SQLite bootstrap and unauthenticated denial |

The full suite's first parallel run encountered a transient Windows `EPERM` while renaming a test-only SQLite file; the SQLite integration test passed alone and the subsequent complete run passed 43/43.

Workbook/API evidence: the local Salesforce workbook parser returned 1,057 rows and 1,057 usable unique Opportunity IDs. Integration coverage exercises account filtering (ABC vs Northstar), search/stage filtering, source-reference validation, duplicate retrieval, sequential approver notifications, approval/rejection outcomes, recipient access, read/read-all, and exact case/version references. UI VM tests cover the appended Notifications page, opportunity prefill/empty states, version-specific notification navigation, fresh account scoping on identity changes, and stale in-flight response rejection. A manual browser check confirmed 1,057 Admin rows across the workbook and 151 ABC-only rows for `u-cp-sf`. SQLite persistence tests confirm notification recipient/read state survives reopen without a schema migration.

Finance evidence: the actual Margin Calculator onshore sample is asserted at cost 3,386.875/revenue 6,773.75; the equivalent current demo cost is 6,773.75. This is an explicit known difference, not a parity pass. Blank/zero inputs, COLA-before-discount ordering and same/mismatched currency are covered for current demo behavior only.

Remaining limits: no interactive browser E2E/accessibility audit, no live Salesforce or external notification delivery, no full workbook golden matrix or Finance sign-off, and no SQL Server/production environment verification. See `../finance/FORMULA_TRACEABILITY.md` and `../IMPLEMENTATION_REPORT.md`.
