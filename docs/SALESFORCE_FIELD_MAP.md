# Salesforce field coverage and renewal policy

Updated 14 October 2026. Audited **38 columns across 1,057 opportunities** in the supplied synthetic workbook. Both original source workbooks remain unchanged.

## Full source inventory

All 38 source values are retained in `sourceFields`, with typed dates, amount/currency and quarterly accrued values also mapped separately. All appear in the refreshed Pricing Intake workbook as references. Empty fields remain empty.

| Source column | Populated / 1,057 | Use |
|---|---:|---|
| Proposal Number | 1057 | Preserved source context and audit reference |
| Opportunity ID | 1057 | Unique external intake identity and duplicate prevention |
| Parent Account ID | 1057 | Preserved source context and audit reference |
| Account ID | 1057 | Preserved source context and audit reference |
| Account Name | 1057 | Preserved source context and audit reference |
| Opportunity Owner | 1057 | Client Partner login identity and strict source ownership |
| Opportunity Name | 1057 | Preserved source context and audit reference |
| Stage | 1057 | Source lifecycle and external Closed Won / Lost events |
| Fiscal Period | 1057 | Preserved source context and audit reference |
| Amount | 1057 | Source opportunity value used as provisional overall budget; not an approved budget ceiling |
| Probability (%) | 1057 | Preserve source value; fractional representation in workbook |
| Age | 1057 | Preserved source context and audit reference |
| Close Date | 1057 | Renewal reminder exactly three calendar months earlier |
| Created Date | 1057 | Preserved source context and audit reference |
| Next Step | 1057 | Preserved source context and audit reference |
| Lead Source | 0 | Distinct from Source of Lead; blank in supplied data |
| Type | 1057 | Net new / existing new / renewal path |
| Historical CT Proposal Number | 0 | Preserved source context and audit reference |
| PE Proposal Number | 0 | Preserved source context and audit reference |
| Proposal Date | 14 | Preserved source context and audit reference |
| Proposal Submission Date | 0 | Preserved source context and audit reference |
| Project Start Date | 1051 | Source staffing start |
| Project End Date | 1051 | Project term end; distinct from renewal Close Date |
| Q1 Accrued Value | 1057 | Quarterly accrued value; separate from opportunity budget, never added to Amount |
| Q2 Accrued Value | 1057 | Quarterly accrued value; separate from opportunity budget, never added to Amount |
| Q3 Accrued Value | 1057 | Quarterly accrued value; separate from opportunity budget, never added to Amount |
| Q4 Accrued Value | 1057 | Quarterly accrued value; separate from opportunity budget, never added to Amount |
| Parent Account | 1057 | Preserved source context and audit reference |
| Opportunity Type | 1057 | Source solution classification (DAA/MIA/etc.), not billing type |
| Solutions/Services | 1057 | Preserved source context and audit reference |
| Last Modified Date | 1057 | Preserved source context and audit reference |
| Products | 1057 | Preserved source context and audit reference |
| Vertical | 1057 | Parent BU category: RCM or TMT; preserved independently from child BU |
| Sub-Vertical | 1057 | Source segmentation; do not infer Tech 1 versus Tech 2 |
| Primary Capability | 1049 | Named Tech COE assignment |
| Primary Functionality | 1049 | Preserved source context and audit reference |
| Source of Lead | 0 | Preserved source context and audit reference |
| Contact Role | 1057 | Source contact value; never used to grant access |

## Additional inputs the source does not contain

- **Actual utilization** and its reporting period/evidence: pricing team supplies actual percentage and report reference. Resource estimate billability is a separate, hours-weighted proposed figure. Neither is invented as a Salesforce field.
- **COLA**: initial **5% increase in overall renewal cost**, per the user. Finance maintains this policy in Administration; EVP Finance **Ankur Maheshwari** records annual review. It is a separate commercial extension outside the source workbook.
- **Child BU**: RCM branches to R&M or CPG; TMT branches to Tech 1 or Tech 2. Select the child BU explicitly because no source discriminator was supplied. Source Vertical/Sub-Vertical remain unchanged.
- Contract billing model, detailed scope, delivery region, prior SOW and individual employee costs are absent. Billing model is selected per resource line. Source rate card costs are fixed by role/experience, not employee identity.

## Renewal reminders

In-app alerts start at **Close Date minus three calendar months**, with end-of-month clamping and Asia/Kolkata dates. Close Date is distinct from Project End Date. The startup scan, authenticated bootstrap/notification reads and one-minute background scan catch eligible open renewals even before an external pricing request exists. A closed or lost source is excluded; overdue open source rows are labeled overdue. Alert records deduplicate per source opportunity / close date / recipient and persist with read state in SQLite.

Owners receive only their own source opportunities. Assigned case staff also receive review alerts once a case exists. Source ownership changes revoke old owner alerts. Notifications show budget, BU, actual utilization status and current cost COLA. Email and Teams delivery are not implemented. The app must be running; a restart catches missed due dates.

## Cost COLA and annual review

```text
Workbook delivery cost = people * months * hours/month * billability * fixed workbook cost/hour
Bench cost = eligible employee cost * bench %
Cost before COLA = employee cost + product cost + bench cost
Renewal COLA cost addition = cost before COLA * Finance COLA %
Renewal total cost = cost before COLA + COLA cost addition
Selling price = workbook base offer after explicit discount / negotiated offer
CM % = (selling price - renewal total cost) / selling price * 100
Target revenue = renewal total cost / (1 - target CM)
```

COLA does not change the fixed source rates or automatically increase the selling price. Non-renewal COLA is zero. Finance changes revise active renewal drafts and invalidate COE validation; submitted versions preserve their source rates, cost calculation and COLA policy snapshot. Only Finance/EVP Finance may edit the rate, and only EVP Finance may record annual approval. An annual reminder is generated when the current India calendar year lacks EVP review, including after a rate change. Annual review remains visible as pending until completed; this local implementation does not claim production financial approval.

## BU heads

| Parent vertical | BU | Assigned head |
|---|---|---|
| RCM | R&M | namratta pandya |
| RCM | CPG | Ashish gupta |
| TMT | Tech 1 | Anil damodaran |
| TMT | Tech 2 | kiran nandavarappu |
| Unspecified | MMM | mallesh reddy |
| Unspecified | HLS-A | Head assignment required |
| Unspecified | HLS-CI | Head assignment required |
| Unspecified | RAI | Head assignment required |

Approval binds to the selected BU's configured active head. Missing head assignments block submission; another BU's head or generic administrator cannot decide that BU approval task. Administration > BU approval owners updates mappings in the database. Submitted approval tasks retain their original assignee snapshots.

## Intake refresh and external trigger

`data/Pricing Intake.xlsx` contains 47 columns: three request controls, all 38 source references, and six derived/explanatory fields for budget, currency, reminder date, BU choice, utilization and COLA. All 1,057 source opportunities are available; closed opportunities remain reference rows and cannot be triggered.

Run `npm run intake:template -- --refresh` to refresh references. Every existing Request ID and Yes/No flag is preserved, including requests no longer in the source; a timestamped backup is saved first. Unknown extra custom columns are not retained in the refreshed file and remain available in that backup. Only Request ID, Opportunity ID and Request Pricing=Yes are sent by the CLI. The server reads authoritative source values again, so changing reference cells cannot alter price, ownership, stage or budget.

```powershell
npm run intake -- --file "data/Pricing Intake.xlsx"
```
