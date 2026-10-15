# Local product guide

## Start and sign in

Use Node.js 22 or later. From `D:\Price_Tracker\price-track-poc`, stop the previous server with Ctrl+C, then run:

```powershell
npm ci
npm start
```

Open `http://localhost:3000`. `.env` is loaded when present; existing shell environment values take precedence. No Docker is required. The existing SQLite database is preserved.

On the first updated startup, generated credentials are written to `data/local-access/LOCAL_LOGIN_CREDENTIALS.csv`. Open that file locally. Client Partner login IDs are the full Opportunity Owner names from the supplied Salesforce workbook. Internal role accounts include Administrator, Pricing Operations, Finance Reviewer, the five named BU heads and Ankur Maheshwari (EVP Finance), plus the five named Tech COE contacts. Passwords are random and stored as hashes in the database. Change a password using the Password button after login. Keep the local credential export private; it is excluded from build artifacts.

The old demo picker is gone. A user/account query parameter or `X-Demo-User` header cannot authenticate normal requests. Sessions expire after eight hours, end on server restart, and are revoked when that user's access is changed. Temporary local login is not enterprise SSO; the server stays bound to loopback.

## Create pricing outside Price Track

Use `data/Pricing Intake.xlsx`, a separate worksheet containing all 1,057 opportunities and all 38 source reference columns. If absent, create it with `npm run intake:template`. To refresh an existing intake while preserving Request IDs and selections and creating a backup, use `npm run intake:template -- --refresh`. To create another template, supply a new output path: `npm run intake:template -- "D:\Price_Tracker\another-intake.xlsx"`.

1. Open the intake workbook in Excel.
2. Choose an existing Salesforce Opportunity ID. Reference columns show its source sales type, owner and account.
3. Supply a unique Request ID and set Request Pricing to **Yes** for the desired rows.
4. Save and close Excel, keeping Price Track running.
5. Run this in a second PowerShell window:

```powershell
cd D:\Price_Tracker\price-track-poc
npm run intake -- --file ".\data\Pricing Intake.xlsx"
```

The external command reads the token from `data/local-access/intake-token.txt`, validates each selected ID against the synthetic Salesforce source, and sends the event. It prints case IDs, never the token. An identical Request ID returns the prior case. A different Request ID for the same opportunity also returns the existing case; reusing a Request ID for another opportunity is rejected. Closed source opportunities cannot create fresh pricing cases.

For one opportunity without editing a worksheet:

```powershell
npm run intake -- --opportunity-id YOUR_SOURCE_OPPORTUNITY_ID --request-id YOUR_UNIQUE_REQUEST_ID
```

The in-app Salesforce page is a read-only source queue. Select an opportunity name or reference to view its source details; linked cases can be opened from there. A row marked **No case yet** means Price Track has not received a pricing request for that opportunity, not that the opportunity failed to open. Submit requests through the external intake workflow above; there is no in-app case creation action. Client Partners see their own Opportunity Owner rows and the cases linked to those IDs. A shared account name does not grant access to another owner's rows.

## Complete the three pricing paths

Source `Type` maps to `New Business → Net new`, `Existing Business → Existing new`, and `Renewal → Renewal`. Source sales stage is retained separately from the internal pricing stage. The synthetic workbook has no contractual billing-model column; T&M/FTE/Program/Product is selected on estimate lines instead of inferred from sales type.

Sign in as Pricing Operations to prepare assigned cases. Open a case, enter delivery scope and pricing inputs, then select each resource's role/experience from the Margin Calculator. Enter location, people, months, hours and billability. Source role costs are fixed; there is no manual employee cost override. Save the draft and calculation. Resolve source/financial exceptions. BU SPOCs see a case only after an external pricing request creates it and its source capability maps to their Tech COE; an empty case list means no matching case has been routed yet.

Opening an accessible pricing case from Pricing Cases now opens the Pricing Calculator. The calculator includes the full estimate, calculation, KPI, validation, comment, and next-action components, followed by Salesforce source details at the bottom. Source details are read-only and do not contain a pricing-input edit action. Select **Working calculation** beside the case selector for a formatted explanation of the standard or workbook formulas; the guide shows calculation logic, not case cost values.

Sign in as each assigned Tech COE and validate the current draft. `Data_Engg_and_BI` initially requires both Tilak Mukherjee and Vikas Yadav. Mixed capability fields can require several contacts. Editing estimates invalidates the prior revision's validation. An unmapped capability requires Administrator routing configuration; missing inputs do not silently become zero.

Renewals also require prior SOW/agreement evidence and comparison notes. COLA is a user-specified 5% rise in overall renewal cost, maintained by Finance and reviewed annually by Ankur Maheshwari, EVP Finance; selling price does not rise automatically. See [field coverage and policy](SALESFORCE_FIELD_MAP.md). A negotiated offer can be recorded explicitly and must be submitted and approved as a new version.

Submit the validated draft as Pricing Operations. Submission creates an immutable formal version; draft saves do not. The selected child BU’s named head then Finance Reviewer decide in sequence under the local configurable policy. Rejection/return preserves the previous version and decisions. Working drafts can change during review; old approvals remain tied to old snapshots. Agreement and Closed Won reject stale versions.

After approval, record customer agreement against the exact version, then complete Contract & Launch with evidence. To close from the outside, update the selected source row's Stage to Closed Won, save/close that source workbook, and run:

```powershell
npm run salesforce:sync -- --opportunity-id YOUR_SOURCE_OPPORTUNITY_ID --event-id YOUR_UNIQUE_EVENT_ID
```

The adapter reads source stage; an event body cannot invent it. Closed Won requires a current approved/agreed version and contract evidence. It queues a durable local handoff with status Pending. The Workflow integration monitor can dispatch to the **mock** Project Track receiver and show Accepted, timeout, rejection and retries. Acceptance is separate from Closed Won. Real Project Track delivery is not connected.

Administrator can reopen a locked case with a reason. Prior versions and handoffs remain. An accepted downstream handoff creates a reconciliation hold after reopening. Full post-win amendment publishing remains disabled.

## Change people and rules

Administration lets an Administrator edit enabled state, staff role/cost access, Tech COE contacts/capability aliases, and future approval routing/thresholds. Changes are saved in SQLite and audited. Assigned open drafts require validation again if their Tech COE mapping changes. Submitted versions retain prior rules. Source-owner Client Partners retain the source role, and self-demotion/disable of the current Administrator is blocked.

Source terms and owner/account changes require explicit Administrator source reconciliation. Existing pricing evidence is preserved; the new draft must be validated and approved again. Cost permission is enforced in API projections, including versions, calculations and handoff payloads.

## Financial scope and release status

`Margin Calculator_new 1.xlsx` supplies role/experience costs and formula semantics. All 1,781 formulas are registered in `docs/finance/WORKBOOK_ALL_FORMULAS.csv`. The calculation module covers workbook resource costs, target-CM selling price, bench loading, product input totals, CM, normalized vertical GM and revenue simulations. It uses rational decimal arithmetic and preserves applied cost/hash/rule references in submitted versions.

The source rate card has no employee names; rates are per role/experience and onshore/offshore. Golden comparisons currently use original cached workbook examples, not a fresh Excel calculation. Finance sign-off, ambiguous FX labels/constants, simulation GM references, PM checks, full Program/Product models and production financial sign-off and FX policies remain open. `NODE_ENV=production` is blocked until the enterprise release gates are met.

## Build, preserve data and resume

`npm test` checks business and access behavior. `npm run build` creates `dist` with application code and the two source workbooks. It excludes copied user databases and local access exports and refuses to mix existing `dist/data` runtime files into a new artifact. Start the artifact using `npm ci --omit=dev` and `npm start` inside `dist`; it creates its own new local database and credentials unless configured with preserved runtime paths.

Stop the server before backing up the SQLite file. Preserve it together with local access files and the exact source workbooks. Do not run two server processes against the same local database. For resuming work, read `docs/WORK_CHECKPOINT.md`; do not reset data or restart the implementation.

The legacy `npm run smoke` script still expects removed header authentication; its requested edit was rejected during this session. Use the passing full suite and explicit browser check evidence, and do not describe the legacy smoke command as passing.
