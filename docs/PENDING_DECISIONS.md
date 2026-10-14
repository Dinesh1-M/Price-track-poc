# Pending business decisions

These decisions are intentionally unresolved in the POC. Owner labels are proposed routing groups based on the build specification, not confirmed named approvers. Record the actual decision, owner, date, and evidence after stakeholder confirmation.

| ID | Priority | Decision | Suggested owner | Status | Impact |
|---|---|---|---|---|---|
| DEC-01 | P1 | Project Track API, authentication, handoff trigger, payload, acknowledgement and delivery boundary | Project Track / Architecture | Pending | Required before live handoff |
| DEC-02 | P1 | Frontend/backend framework and deployment environment | Architecture / Platform | Pending | Determines production packaging |
| DEC-03 | P1 | SQL Server schema ownership, migrations and support model | Data Platform | Pending | Required for durable persistence |
| DEC-04 | P1 | Finance-approved CM formula, eligible costs, rounding and target gap | Finance | Pending | Blocks production financial submission |
| DEC-05 | P1 | Approval thresholds and who can publish them | Finance Leadership | Pending | Controls pricing governance |
| DEC-06 | P1 | CFO vs EVP Finance authority and special-exception definition | Finance Leadership | Pending | Approval segregation |
| DEC-07 | P1 | Authoritative rate source and client/standard fallback | Finance | Pending | Rate resolution correctness |
| DEC-08 | P1 | HR/MNH cost source, cost fields, cost model and change authority | HR / Finance | Pending | Cost correctness |
| DEC-09 | P1 | Identity, manager, BU, account, project and SPOC mappings | Identity / Operations | Pending | Access and assignment correctness |
| DEC-10 | P1 | BU Head visibility: BU-wide vs assigned accounts | Business / Security | Pending | Access-control scope |
| DEC-11 | P1 | Resource quantity/FTE, billing period, currency and utilization formula | Finance / Delivery | Pending | Work-type calculation correctness |
| DEC-12 | P1 | Salesforce field mapping and changes that trigger recalculation/reapproval | Salesforce / Sales | Pending | Lifecycle synchronization |
| DEC-13 | P2 | Rate-card keys, reusability and effective-date behavior | Finance | Pending | Rate governance |
| DEC-14 | P2 | FX source/update frequency/effective dates | Finance | Pending | Currency correctness |
| DEC-15 | P2 | Renewal lead time, COLA rules and approvers | Finance / Delivery | Pending | Renewal workflow |
| DEC-16 | P2 | Famstack/SOW interface and missing utilization behavior | Delivery Operations | Pending | Renewal utilization validation |
| DEC-17 | P2 | Material-change definition and version invalidation | Sales / Finance | Pending | Reapproval correctness |
| DEC-18 | P2 | Delegation restrictions for rates and special exceptions | Security / Finance | Pending | Separation of duties |
| DEC-19 | P2 | SLA durations, retries and availability targets | Operations / Platform | Pending | Supportability |
| DEC-20 | P2 | Retention and deletion policy | Security / Legal | Pending | Audit and records compliance |
| DEC-21 | P2 | Audit/export access and reporting permissions | Security / Business | Pending | Confidentiality |
| DEC-22 | P2 | Work-type-specific calculation rules for T&M, FTE, Program and Product | Finance / Delivery | Pending | Pricing correctness |
| DEC-23 | P2 | Handoff trigger: after agreement/approval or after Closed Won | Project Track / Sales | Pending | Lifecycle boundary |
| DEC-24 | P2 | Project Track returned delivery IDs/status events and consumed lifecycle events | Project Track | Pending | Reconciliation and status sync |

## Default while unresolved

- Demo data only; no production credentials.
- Candidate formulas and thresholds are visibly labelled unapproved.
- The POC must not be represented as an approved pricing policy.
- Actual integration must be verified against a reachable test environment before being called live.


## Latest master-spec precedence and missing inputs (13 October 2026)

| Source/conflict | Decision / unresolved item | Owner | Impact / resolution |
|---|---|---|---|
| Earlier demo guide allowed CP pricing edits; master section 2 prohibits them | Confirmed: CP read-only Price Track, Salesforce Request Pricing intake only | Business / Sales | New Pricing Analyst identity owns pricing work; prior user-created records remain |
| Earlier UI created Draft formal versions before submission; master 4.3 says only submission | Confirmed: draft saves do not create formal versions | Business / Finance | New submit action creates version; legacy Draft rows preserved as history |
| Earlier source allowed agreed-version handoff; master 4.4 specifies Closed Won | Confirmed: first handoff after Closed Won | Project Track / Sales | New handoff eligibility enforces final agreed Closed Won version |
| Master confirms React/TypeScript/NestJS and SQL Server; current monolith is vanilla JS/Node | Target confirmed; migration remains unfinished | Architecture | Local foundation preserved; no claim target-stack compliance |
| Supplied workbooks are local POC inputs, not approved policy | Salesforce mapping is implemented; Margin Calculator formulas and cached sample values are inspected, but cost/billability behavior differs from the demo | Finance / Sales | Confirm eligible-cost/billability, vertical GM, bench/IP treatment, rate-card behavior, currency, rounding and discount/COLA before changing formulas; exact parity is not claimed |
| Pending simultaneous-version policy | Production undecided; local default block, optional explicit demo supersede | Business / Finance | Do not present supersession behavior as approved enterprise policy |
| BU Head scope conflict | Production undecided; assigned visibility and optional buWideAccess | Business / Security | Configurable local behavior retained |
| Closed Won reopen/downstream replacement | Reopen audited; replacement dispatch held if previously accepted | Business / Project Track | Reconciliation authority and reapproval process required |
| CommercialAmendment event | Schema design only; authoring/dispatch disabled | Business / Project Track | Post-Closed-Won amendment release requires sign-off |
| SQL Server/Entra/Azure | Approved environment, contracts and test access absent | IT | Production startup deliberately blocked |
