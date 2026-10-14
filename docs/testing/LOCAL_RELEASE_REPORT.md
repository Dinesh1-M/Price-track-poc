# Local release verification — 14 October 2026

Environment: Windows PowerShell, Node.js 24.19.0, sql.js local SQLite. Verification used isolated temporary databases, generated local credentials and actual supplied source workbooks. The user's working database was not used for test mutations.

| Check | Result | Practical limit |
| --- | --- | --- |
| npm test | 54 passed / 0 failed; about 13 seconds in the last run | Includes isolated legacy fixtures as well as normal cookie-authenticated product flow |
| Actual XLSX external CLI | Passed within the normal session/integration suite | Synthetic external adapter; no Salesforce API connection |
| Three case paths | Net new, Existing new, Renewal passed through agreement, external Closed Won and distinct mock handoff acceptance | External source stage was changed in the test's in-memory source fixture, not the original workbook |
| Workbook candidate calculation | Cached onshore/offshore, revenue, bench, CM, normalized GM and revenue-simulation comparisons passed | No fresh Excel recalculation or Finance sign-off |
| Formula inventory | 1,781 formulas; shared formulas expanded; source hash locked | Extraction is not implementation approval for every source formula |
| Browser | Edge passed login, external case arrival, resource role selection/edit/save and calculation with the compact workspace | Desktop local browser check; not a full mobile/accessibility matrix |
| Build | Passed, including source workbooks and source/script syntax checks | Local synthetic artifact; no production provider or remote release |
| Data preservation | Existing source-linked draft migration preserves submitted history; SQLite persistence and immutable records tested | No SQL Server/DR exercise executed |
| Legacy npm run smoke | Not passed / obsolete header-login expectation | Update was rejected by tool approval; file preserved |

Security cases include unauthenticated/header-spoof denial, same-account cross-owner isolation, Client Partner mutation denial, nested cost redaction, sequential approval enforcement, stale-version agreement denial, required named COE validation and session revocation after access changes. No claim is made that every possible production security requirement has been tested.

Screenshots: `screenshots/login.png` and `screenshots/workspace.png`. Implementation and production gaps: `../finance/FORMULA_EXCEPTIONS.md`, `../DEPLOYMENT_RUNBOOK.md`, and `../WORK_CHECKPOINT.md`.
