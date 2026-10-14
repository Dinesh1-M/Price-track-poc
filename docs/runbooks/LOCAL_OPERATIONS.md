# Local operations

Windows, Node.js 18+ (verified here on Node 24.20.0), npm. No Docker required.

```powershell
cd price-track-poc
npm ci
$env:DB_PROVIDER='sqlite'
$env:SQLITE_PATH='./data/price-track.sqlite'
npm start
```

Open http://localhost:3000. Demo identity picker is user-controlled and is not enterprise authentication. Listener is loopback-only. Production startup is blocked. Run a single local server process per database; multi-process coordination and SQL Server parity are not verified.

First startup imports existing data/store.json into SQLite only if the SQLite file does not exist. The original JSON remains unchanged. Subsequent starts load SQLite. Do not expect later JSON edits to affect the SQLite database. To preserve previous data before startup, make an offline copy of the JSON and SQLite files. Never delete them to resolve an error.

Backup: stop the server, copy the SQLite file to an approved location, retain the original import JSON. Restore: stop the server, preserve the current SQLite file separately, copy a known backup into SQLITE_PATH, then start and verify health and known case/version records. Access controls apply to backups too. File-level procedure only; disaster recovery and retention policy await IT approval.

Verification: npm run check; npm test; npm run build; npm run smoke. Build packages the current local POC into dist without data or secrets; run npm ci --omit=dev inside an artifact before npm start. This artifact is not a production deployment.

Rollback: restore the prior application files and a compatible offline database backup. Do not point old JSON-only code at the SQLite file. Migration 001 creates local core tables; SQL Server migrations, enterprise release rollback and production security must be completed separately.
