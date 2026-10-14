# Session login and external intake contract

Temporary local identity only; real Salesforce and SSO are not connected.

| Method / route | Authentication | Behavior |
| --- | --- | --- |
| POST /api/v1/auth/login | Login ID + generated password in JSON | Issues HttpOnly SameSite=Strict session cookie |
| GET /api/v1/auth/session | Cookie | Public user projection; 401 when expired/revoked |
| POST /api/v1/auth/logout | Cookie if present | Ends session and clears cookie |
| POST /api/v1/auth/password | Cookie, currentPassword/newPassword | Persists scrypt hash; revokes older sessions |
| POST /api/v1/integrations/salesforce/pricing-requests | Bearer integration token | requestId + opportunityId; full source fields read server-side; returns caseId and duplicate flag |
| POST /api/v1/integrations/salesforce/events | Bearer integration token | eventId + opportunityId; source stage read server-side; eligible Closed Won queues handoff |
| PATCH /api/v1/admin/users/:id | Administrator cookie | Validates role/enabled/cost access changes; persists/audits and revokes target sessions |
| PUT /api/v1/admin/tech-coe-mappings | Administrator cookie | Validates active named COE contact and source aliases; invalidates affected open draft validation |
| POST /api/v1/admin/cases/:id/reconcile-source | Administrator cookie | Reason required; preserves prior source history and advances draft revision |
| PATCH /api/v1/config | Authorized internal cookie | Validates and persists future approval policy; old submitted policies remain snapshotted |

Manual POST `/api/v1/pricing-requests` is blocked. Normal POST `/api/v1/salesforce/pricing-requests` is also blocked; only isolated legacy fixtures use it. Query-string identity and `X-Demo-User` do not authenticate normal startup. Cross-origin mutating browser requests are rejected.

Request/event IDs must contain 3–120 letters/digits or `._:-`. A replay with the same entity returns the original result; reuse for a different opportunity is a conflict. Closed-source intake, missing/duplicated source IDs, missing owners, source ownership/terms changes, stale versions and incomplete agreement/contract evidence return explicit errors. Account/name/amount/type/stage fields supplied by the event body cannot override source data.

Client Partner source lists are owner filtered and cases are filtered by the authoritative source opportunity ID set. Cost fields are removed from calculations, version snapshots and handoff responses. Password hashes/integration-token hashes are never part of user/bootstrap projections. Cookie access to internal administration and Client Partner mutations are checked server-side.
