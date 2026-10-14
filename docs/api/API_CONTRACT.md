# Price Track POC API contract

Base path: `/api/v1`. JSON request/response. The current server uses a demo identity passed as `?user=<demo-user-id>` or `X-Demo-User`; this is **not a secure authentication scheme**. The real implementation must validate Entra ID access tokens and derive identity/roles from trusted claims.

## Common error shape

```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "Draft has changed since it was loaded.",
    "details": { "expected": 3, "received": 2 },
    "correlationId": "uuid"
  }
}
```

## Implemented routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Health/mode check |
| GET | `/bootstrap` | Role-filtered UI bootstrap data |
| GET | `/users` | Demo identities |
| GET | `/cases` | Accessible cases only |
| GET | `/salesforce/opportunities` | Supplied local workbook rows; Client Partner is filtered to assigned account, Admin may browse all |
| POST | `/salesforce/pricing-requests` | Create or retrieve a case from a validated workbook Opportunity ID |
| GET | `/notifications` | Current user's recent recipient-scoped notifications and unread count |
| POST | `/notifications/{notificationId}/read` | Mark the current user's notification read |
| POST | `/notifications/read-all` | Mark the current user's accessible notifications read |
| POST | `/pricing-requests` | Manual sample case creation; duplicate opportunity protection |
| GET | `/cases/{caseId}` | Case and calculation |
| GET | `/cases/{caseId}/draft` | Draft, revision and calculation |
| PUT | `/cases/{caseId}/draft/sections/{sectionKey}` | Revision-checked resource-estimates save |
| POST | `/cases/{caseId}/calculate` | Deterministic recalculation |
| POST | `/cases/{caseId}/validate-submission` | Checks demo submission prerequisites and separates production-only blockers |
| POST | `/cases/{caseId}/versions` | Create immutable Draft version from a saved calculation |
| PATCH | `/cases/{caseId}/details` | Validated opportunity, discount and renewal inputs with revision |
| GET/POST | `/cases/{caseId}/calculations` | Read or save priced calculation history |
| GET/POST | `/cases/{caseId}/negotiations` | Read or append discussion and working offered price |
| POST | `/cases/{caseId}/versions/{versionId}/submit` | Submit exact current Draft for BU Head then Finance |
| POST | `/cases/{caseId}/workflow` | Advance next stage with reason/evidence; guard Closed Won |
| POST | `/versions/{versionId}/approval-tasks/{step}/send-back` | Return with reason; retain prior decisions |
| POST | `/cases/{caseId}/comments` | Case comment |
| POST | `/cases/{caseId}/cancel` | Cancel with reason |
| POST | `/cases/{caseId}/reopen` | Reopen cancelled case (Admin) |
| POST | `/cases/{caseId}/salesforce-lifecycle` | Lifecycle event receiver |
| POST | `/cases/{caseId}/mark-agreed` | Mark an approved version agreed |
| POST | `/cases/{caseId}/restore-to-draft` | Restore values as working draft, without approval |
| GET | `/cases/{caseId}/versions/compare?left={id}&right={id}` | Retrieve two snapshots for comparison |
| POST | `/versions/{versionId}/approval-tasks/{step}/approve` | Approve current sequential task |
| POST | `/versions/{versionId}/approval-tasks/{step}/reject` | Reject with reason |
| GET | `/rates` | Rate records |
| POST | `/rates/proposals` | Propose rate |
| POST | `/rates/{proposalId}/approve` | Finance approval; self-approval blocked |
| GET | `/exceptions` | Exception register |
| POST | `/exceptions/{exceptionId}/assign` | Assign exception (Admin) |
| POST | `/exceptions/{exceptionId}/resolve` | Resolve with notes |
| GET | `/audit` | Recent audit evidence |
| GET | `/pending-decisions` | Pending decision register |
| PATCH | `/pending-decisions/{decisionId}` | Update decision status/value |
| PATCH | `/config` | Demo rule configuration |
| GET | `/integrations/project-track/handoffs` | Handoff register |
| POST | `/integrations/project-track/handoffs` | Submit a mock handoff |
| POST | `/integrations/project-track/handoffs/{handoffId}/retry` | Admin replay simulation |
| POST | `/salesforce/simulate` | Admin-only mock lifecycle event |

The route list describes this POC's logical contract, not an approved external contract. Validate schemas and authentication before production use.

### Local Excel opportunity intake

`GET /salesforce/opportunities` reads `data/Salesforce sythetic data.xlsx` on the server. Optional `search` and `stage` query parameters filter results; the caller's account scope is enforced server-side. The response includes availability, source filename/worksheet, usable row count, warnings and mapped opportunity items. No workbook rows are sent to an external service.

`POST /salesforce/pricing-requests` requires a `sourceOpportunityId` that exists uniquely in the workbook; the submitted opportunity reference and account must match that row. The response returns the existing accessible case when the reference was already used, otherwise it creates a new pricing case. Missing/duplicate references are rejected or excluded with a warning. No schema migration was needed: source metadata is stored with the case in the existing application-state payload.

### In-app notifications

Submission notifies only the first assigned approver; completion of that decision notifies the next assigned approver. Final approval, rejection or send-back notifies the request owner, submitter and case owner where they have case access. Notification keys use source event, version, approval step/outcome and recipient for idempotency. Read endpoints require the current recipient identity and re-check related case access. Notifications are persisted with the existing local state (JSON or SQLite/sql.js); they are not an external delivery service.

## Draft concurrency

Draft save requires the revision returned by the most recent read/save. A stale revision returns HTTP 409 `REVISION_CONFLICT`; the client must reload/compare rather than silently overwrite. This POC uses revision checks within one local process. Production must implement atomic compare-and-swap/transaction semantics in SQL Server.

## Pricing request sample

```json
{
  "opportunityId": "SF-OPP-1003",
  "opportunityName": "Example modernization",
  "account": "Example customer",
  "bu": "TMT1",
  "budget": 200000,
  "currency": "USD",
  "workTypes": ["T&M", "FTE"],
  "owner": "Demo Administrator",
  "opportunityType": "New business",
  "region": "India",
  "capability": "Data engineering",
  "deliveryModel": "Offshore",
  "scope": "Sample analytics delivery",
  "startDate": "2026-11-01",
  "contractEndDate": "2027-04-30",
  "durationMonths": 6,
  "targetMarginPct": 40,
  "discountPct": 0,
  "colaPct": 0
}
```

## Project Track handoff contract

See `project-track-v1.schema.json`. The POC includes `schemaVersion`, `opportunityId`, `caseId`, `versionId`, `account`, `currency`, `workTypes`, a commercial snapshot, source marker, idempotency key and correlation ID. The actual DTO must be aligned with the Project Track team. The mock receiver can simulate `success`, `timeout`, and `reject` behavior. No live endpoint is configured.

## Sample workflow bodies

- Save calculation: `POST /cases/{id}/calculations` with `{}` after saving resource inputs.
- Create version: `POST /cases/{id}/versions` with `{"comment":"Reason for this price"}`. Returns a Draft; requires a saved calculation matching the current revision/pricing.
- Submit version: `POST /cases/{id}/versions/{versionId}/submit` with `{}`. Only a current Draft may be submitted. Existing pending pricing must first be resolved.
- Record negotiation: `{"discussionDate":"2026-10-12","requestedPrice":44000,"offeredPrice":46000,"notes":"Revised scope","outcome":"Counteroffer","nextAction":"Save revised calculation","versionId":"VER-example"}`. Omit versionId for a working-draft discussion. The discussion is append-only and offered price feeds the working calculator.
- Workflow: `{"stage":"Contract & Launch","reason":"Sample signed contract and completed kickoff"}`, then `{"stage":"Closed Won","reason":"Final launch confirmation"}`. Contract/launch needs agreement of the current fully approved version. Closure additionally checks contract evidence and blocking exceptions.
- Updated rate proposal: include `supersedesId` referencing an approved rate along with the replacement provider fields. Finance approval supersedes that record without rewriting past pricing snapshots.

Case details share the creation fields and require `revision`. Supported currencies are USD, INR, GBP and EUR. Resource currency must match case currency. Costs are filtered from restricted draft, calculation, version and comparison responses. Closed Won cases reject edits.


## Master-spec route changes (13 October 2026)

- Demo identities are mandatory on protected APIs (`X-Demo-User` or demo `user` query). Unknown/missing identity yields 401; demo selection is not production authentication.
- Client Partner cannot mutate Price Track. Use `POST /api/v1/salesforce/pricing-requests` for the explicit mock Salesforce intake. Own-account scope remains enforced. Internal `POST /api/v1/pricing-requests` is for authorized pricing/provider identities.
- `POST /api/v1/cases/:id/resource-validation`: BU SPOC/Admin; body `{revision, reason}`. Records resource validation at that revision. Required before submission by the default demo configuration.
- `POST /api/v1/cases/:id/versions`: body `{revision, comment}`. Requires saved current calculation and resource validation. Creates and submits immutable formal version with tasks. It no longer creates a formal Draft version.
- Legacy `POST /api/v1/cases/:id/versions/:versionId/submit` returns 409; submit the working draft to create a fresh version. Existing legacy rows are preserved.
- `GET /api/v1/cases/:id/versions` lists filtered version history.
- `PATCH /api/v1/config`: Administrator may set `pendingVersionPolicy` to `block` or labelled demo `supersede`; data-driven `approvalPolicy` steps/rules support CM/CM-deterioration, deal value, discounts, BU, work type and exception category. Policies remain unapproved.
- `POST /api/v1/cases/:id/reopen`: Administrator, required reason, accepts Cancelled or Closed Won. Preserves old evidence, increments draft revision, sets reconciliation hold when a downstream package was accepted.
- Project Track handoff requires final agreed Closed Won version. A Pending record is queued with closure. Mock manual dispatch/retry simulates receiver outcome.
- `GET /api/v1/integrations/project-track/handoffs/:id` returns scoped/redacted handoff.
- `POST /api/v1/integrations/project-track/acknowledgements`: Administrator mock action with `{handoffId, correlationId, status}`. Accepted/Rejected only; mismatched correlation and reversal of accepted state are rejected. Accepted duplicate is idempotent.
- `CommercialAmendment` schema is design-only; authoring/dispatch disabled. No live integration claims.

Remaining API gaps: complete OpenAPI document/DTO validation, resource-line CRUD aliases, unified Salesforce lifecycle event API and production authenticated gateway are not implemented. Current documented routes adapt the baseline names to the retained monolith.

`validate-submission` reports `valid`/`demoSubmissionAllowed` only when the current draft passes rate/cost checks, is at an eligible workflow stage, has a saved current calculation and BU SPOC validation, has no blocking pending/duplicate version, and has a complete approval route. Finance approval and production-mode restrictions are reported under `productionBlockers`; these do not invalidate an otherwise-ready demo submission.
