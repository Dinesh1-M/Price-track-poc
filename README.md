# Price Track

A local pricing workspace driven by the supplied Salesforce synthetic data and Margin Calculator workbook. Opportunity requests originate outside the application. The application manages estimates, named Tech COE validation, immutable submitted versions, sequential approvals, agreement, external Closed Won and a separate mock Project Track handoff.

## Start

Requires Node.js 22 or later. Stop any older server before starting this version.

```powershell
cd D:\Price_Tracker\price-track-poc
npm ci
npm start
```

Open http://localhost:3000. Existing SQLite data is preserved. First updated startup generates temporary passwords in `data/local-access/LOCAL_LOGIN_CREDENTIALS.csv`. Client Partner login IDs are full Opportunity Owner names from Salesforce synthetic data; internal and Tech COE logins are listed in that file. There is no default password or role selector. Generated access files are private local runtime data and are excluded from builds.

## Request pricing outside the app

A separate `data/Pricing Intake.xlsx` is supplied with three actual source-linked examples. Set Request Pricing to **Yes**, provide a unique Request ID, save/close Excel, then run this in a second terminal:

```powershell
npm run intake -- --file ".\data\Pricing Intake.xlsx"
```

If the intake workbook is absent, run `npm run intake:template`. That command refuses to overwrite an existing request workbook. The CLI reads an external integration token generated on first startup. Replays return the same case. In-app source opportunities are read-only; manual case creation is blocked.

## Data and workflow

- Source-owned Client Partner access covers their opportunities and resulting cases. Sharing an account name does not expose another owner's records.
- Source Type maps to **Net new**, **Existing new**, or **Renewal**. Source sales stage stays separate from internal pricing progress.
- Tech COE contacts are Tilak Mukherjee (BI), Udayanath (AppDev), Soviek Saurav (AI), Amit Yadav (Databricks), and Vikas Yadav (Data Engineering). Contacts, aliases, roles and approval policy are editable in Administration and persist in SQLite.
- Role/experience selections use fixed source costs; workbook math includes billability, target-CM gross-up, bench loading, product inputs and normalized vertical GM.
- All assigned Tech COEs validate the current revision before submission. Draft saves do not create formal versions. Submitted inputs, applied costs, source hash and policies are snapshotted.
- Source-linked Closed Won is received through `npm run salesforce:sync -- --opportunity-id ID --event-id UNIQUE_EVENT_ID` after the source workbook Stage changes. Agreement, current approval and contract evidence are required. Handoff acceptance is tracked separately.

Detailed steps: [Local product guide](docs/LOCAL_PRODUCT_GUIDE.md). Resume work: [Work checkpoint](docs/WORK_CHECKPOINT.md). Lifecycle diagram: [Process flow](docs/PROCESS_FLOW.md).

## Verification and packaging

```powershell
npm test
npm run build
```

See [Salesforce field coverage](docs/SALESFORCE_FIELD_MAP.md) for all 38 columns, three-month renewal reminders, Finance cost COLA and BU head routing.

The final source suite has **54 passing tests**. A real headless Edge check passed login, external intake, resource editing/save and calculation; screenshots are under `docs/testing/screenshots`. The full 1,781-formula source manifest and cached workbook comparison tests are under `docs/finance` and `tests/workbook-engine.test.js`.

Build output is `dist`, including code and the two original source workbooks. User databases and generated credentials are not copied. Run `npm ci --omit=dev` and `npm start` inside a fresh artifact for a new local instance. Preserve runtime data separately and run one server process per SQLite file.

The old `npm run smoke` command still expects legacy header authentication; its edit was rejected in this session. It is not part of the reported passing verification.

## Release status

This is a functional **local synthetic release**, with temporary session authentication. Salesforce and Project Track are not live integrations. Source formula extraction and cached samples do not establish exhaustive fresh-Excel parity or Finance approval. Workbook anomalies, FX and complete Program/Product models remain documented review items. SSO, a tested SQL Server provider, operational/security acceptance and the target React/TypeScript/NestJS migration remain open. Production startup is intentionally blocked.

See [financial exceptions](docs/finance/FORMULA_EXCEPTIONS.md) and [deployment runbook](docs/DEPLOYMENT_RUNBOOK.md).
