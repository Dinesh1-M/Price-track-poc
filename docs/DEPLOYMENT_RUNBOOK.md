# Local release and deployment runbook

Date: 14 October 2026. Release class: **local synthetic application**. Production exposure is blocked by startup configuration.

## Upgrade an existing local workspace

1. Stop the existing server with Ctrl+C. Do not run another process against the same SQLite file.
2. Back up `data/price-track.sqlite`, any configured alternative runtime database, and private local access files if already present. Keep the exact source workbooks with the backup.
3. Run `npm ci` on Node.js 22 or later, then `npm start` from the project root.
4. On first updated startup, read generated credentials locally from `data/local-access/LOCAL_LOGIN_CREDENTIALS.csv`. Password hashes are persisted in the database; ordinary restarts do not regenerate them. Sessions end on restart.
5. Open `http://localhost:3000` and sign in. Unrelated historical demo samples are archived in the preserved database. Existing source-linked active drafts migrate to workbook pricing with a new revision and a blocking review exception. Submitted versions are preserved.

Do not reset or delete the existing database to apply this release. Review migrated resource roles/experience against the source rate card, resolve the migration exception with evidence, then revalidate the draft with the assigned Tech COEs.

## Portable artifact

`npm run build` checks source/script syntax and creates `dist` with application code, scripts, docs, package lock, environment example, and the two source XLSX files. `BUILD_MANIFEST.json` records source hashes and build metadata. User SQLite/JSON state, `.env` and generated credential/token files are excluded. The build refuses to package a `dist/data` directory containing runtime data.

In a fresh artifact directory:

```powershell
npm ci --omit=dev
npm start
```

For an existing instance, configure preserved runtime locations rather than silently creating a new production database. The application supports local SQLite/sql.js; `DB_PROVIDER=mssql` is not an implemented production adapter.

## Configuration

| Variable | Purpose |
| --- | --- |
| PORT | Local listener port, default 3000 |
| DB_PROVIDER | sqlite; legacy JSON is for isolated regression fixtures |
| SQLITE_PATH | Persistent local database path |
| LOCAL_ACCESS_DIR | Private generated credentials and external-token folder |
| SALESFORCE_WORKBOOK_PATH | Optional effective synthetic Salesforce source path |
| MARGIN_WORKBOOK_PATH | Optional effective Margin Calculator source path |
| PRICE_TRACK_URL | External CLI target URL, default local port 3000 |
| INTAKE_TOKEN | Optional CLI token supplied through environment instead of local token file |

The server and intake CLI load `.env` when present; existing environment values win. Generated passwords and tokens are never hard-coded. Keep the listener on loopback for this release. Replacing the workbooks updates source hashes/owners; affected draft financial rules require validation again. Owner/account changes require explicit administrative reconciliation.

## Verification evidence

- `npm test`: **54 passed, 0 failed**, including session authentication, account/opportunity isolation, all three paths, actual XLSX intake CLI, COE validation, version history, approvals, external closure and mock handoff.
- `node scripts/browser-check.js`: passed actual Edge login, external intake, resource editing/save and calculation. Synthetic screenshots: `docs/testing/screenshots/login.png` and `workspace.png`.
- `npm run finance:extract`: **1,781 formulas** extracted; original workbook unchanged.
- `npm run build`: passed. No remote deployment, SQL Server acceptance, fresh Excel recalculation or production integration test was executed.
- The legacy `npm run smoke` script remains incompatible with session authentication because its update was rejected by the tool approval step. Do not report that command as passing.

## Recovery and operations

Stop the process before offline backup or restore. Restore the saved database with its corresponding source workbook versions and access files. Start one server instance and check login, source access, current draft/version counts and handoff state. Restore does not revoke historical approval evidence. User access changes increment a version that invalidates old sessions. If a generated credentials file is lost, do not reset the database to recover it; use an authorized password recovery implementation or verified account reset procedure.

Source-linked Closed Won is an external event. The Project Track receiver is a local mock; accepted payloads must not be treated as delivery to the real service. Reopening after an accepted handoff preserves payload history and holds replacement delivery for reconciliation. Retry limits/backoff are enforced for normal requests; no production delivery worker or disaster-recovery SLA is claimed.

## Production gates

Finance approval and freshly recalculated golden fixtures; validated Program/Product/COLA/FX rules; approved authority mappings; enterprise SSO; tested SQL Server persistence/migrations/concurrency; authenticated Salesforce/Project Track contracts; target stack migration; infrastructure/network/security review; monitoring, backup/restore and incident exercises. Configuration or a checkbox cannot satisfy these gates. `NODE_ENV=production` remains rejected.
