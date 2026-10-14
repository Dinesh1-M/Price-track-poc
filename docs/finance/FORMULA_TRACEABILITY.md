# Workbook and formula traceability

> **14 October 2026 update:** source-linked drafts now use `src/workbook-pricing.js`, including the workbook's billability-inclusive cost and normalized vertical GM. All 1,781 formulas are registered in `WORKBOOK_ALL_FORMULAS.csv` / `WORKBOOK_FORMULA_MANIFEST.json`. See `WORKBOOK_INPUT_OUTPUT_MAP.md` and `FORMULA_EXCEPTIONS.md` for current coverage and gaps. The older engine comparison below is retained as historical baseline evidence; it does not describe the current source-linked pricing path. Fresh Excel parity and Finance approval remain open.

## Status

The supplied workbooks were inspected locally and were not modified:

- `data/Salesforce sythetic data.xlsx`: `Sheet1`, 1,057 data rows and 1,057 usable unique Opportunity IDs.
- `data/Margin Calculator_new 1.xlsx`: summary, onshore/offshore cost and revenue calculators, vertical GM conversion, IP/product cost, and rate-card sheets.

Workbook formulas and cached example outputs are **reference evidence only**, not approved Finance policy. The workbook's sample onshore cost includes billability; Price Tracker's current demo cost does not. Exact Excel parity is therefore **not established**. No financial formula was changed based on the workbook.

## Salesforce field mapping

| Workbook field | Price Tracker mapping | Notes |
|---|---|---|
| `Opportunity ID` | `case.opportunityId`, `case.sourceOpportunity.id` | Required unique source reference; validated against the workbook on create |
| `Proposal Number` | `case.sourceOpportunity.proposalNumber` | Retained as source metadata |
| `Account Name` | `case.account`, `case.sourceOpportunity.account` | Client Partner rows are account-scoped server-side |
| `Opportunity Name` | `case.opportunityName` | |
| `Stage` | `case.sourceOpportunity.stage` | Preserved, not treated as Price Tracker workflow stage |
| `Amount` | `case.budget`, source amount | Currency prefix is parsed separately |
| `Opportunity Owner` | Source metadata and selection view | Price Tracker owner remains the requestor/assigned pricing owner |
| `Type` | `case.opportunityType` | Source sales type; unknown values remain visible in the intake form |
| `Opportunity Type` | Source metadata | Preserved separately (e.g. DAA/MIA classification) |
| `Project Start Date`, `Project End Date` | `case.startDate`, `case.contractEndDate`; derived duration | Dates are parsed from workbook date or D/M/Y values |
| `Vertical`, `Sub-Vertical`, `Primary Capability`, `Primary Functionality` | Case capability/source metadata | User-entered region and delivery model are not present in the workbook |
| `Fiscal Period`, `Probability (%)`, `Close Date`, `Next Step`, `Products`, `Solutions/Services`, `Source of Lead`, `Contact Role` | Source metadata | Not promoted to pricing policy inputs without business mapping approval |

The workbook has no region or delivery-model column. The intake form requires those fields where applicable; it does not infer them. No live Salesforce API, OAuth, webhook or external synchronization is configured.

## Margin Calculator formula map

The expressions below were read from the workbook's OpenXML formulas and compared with cached workbook values. Rows 9 and 29 are sample line and subtotal references, not hard-coded implementation rules.

| Workbook reference | Verified expression | Meaning / cached sample |
|---|---|---|
| `Revenue & Cost_Onshore!L9` | `F9*G9*$O$4*H9*I9` | People × months × hours/month × billability × cost/hour = 3,386.875 |
| `Revenue & Cost_Onshore!M9` | `L9/(1-$E$5)` | Cost grossed up to requested CM = 6,773.75 |
| `Revenue & Cost_Onshore!I9` | `IFERROR(VLOOKUP(D9,'Master File - Rate Card'!$B$4:$H$163,6,0),0)` | Onshore cost/hour lookup; missing lookup is converted to zero in the workbook |
| `Revenue & Cost_Onshore!K9` | `IFERROR(I9/(1-$E$5),0)` | Onshore selling rate at selected CM |
| `Revenue & Cost_Offshore !L9` | `F9*G9*$O$4*H9*I9` | Offshore sample cost = 1,164.8745519713261; sample billability is 100% |
| `Revenue & Cost_Offshore !M9` | `L9/(1-$E$5)` | Offshore sample revenue = 2,329.7491039426523 |
| `Margin_Summary!C8` | `$H$8*(C6+C7)` | Bench loading amount, using the configured percentage and onshore/offshore costs |
| `Margin_Summary!C9` / `D9` | `'IP_Product Cost'!G15` / `'IP_Product Cost'!G16` | Product/IP cost and revenue totals |
| `IP_Product Cost!G5` | `IFERROR(E5*F5,"-")` | Line cost per unit × factor/quantity |
| `IP_Product Cost!G15` | `SUM(G5:G13)` | Total IP/product cost |
| `IP_Product Cost!G17` | `IFERROR((G16-G15)/G16,"-")` | IP/product contribution margin |
| `Margin_Summary!E10` | `IFERROR((D10-C10)/D10,"-")` | Total contribution margin; cached sample 47.5% |
| `Margin_Summary!F6` / `F7` / `F10` | Onshore/offshore/total CM multiplied by a vertical lookup from `Vertical-Based GM Calculation` | Produces projected GM; sample total 37.2472266% |
| `Revenue & Cost_Onshore!L29` / `M29` | `SUM(L9:L28)` / `SUM(M9:M28)` | Onshore total cost / revenue feeding `Margin_Summary!C6` / `D6` |

The onshore sample inputs are one person, one month, 160 hours/month, 50% billability and cost/hour 42.3359375. Price Tracker's equivalent hourly-effort demo calculates cost on all 160 scheduled hours (6,773.75), exactly twice the workbook cached cost (3,386.875). Its revenue is separately derived from utilized hours and an approved demo selling rate; the workbook grosses cost up at target CM. This mismatch is explicitly tested in `tests/formula-traceability.test.js`.

The workbook uses rate-card `VLOOKUP` formulas wrapped in `IFERROR(...,0)`, vertical lookup tables, adjustable bench loading, and a placeholder IP/product calculator. Price Tracker instead reports missing rates as exceptions and does not apply workbook vertical GM or bench/IP allocations. Discount, COLA, FX conversion, zero/blank handling, rounding and governance meanings still require a complete sheet-level review and Finance decisions. Do not silently copy the workbook's zero fallback or treat its cached values as policy.

## Current Price Tracker demo arithmetic

The existing calculation service in `src/domain.js` remains unchanged financially:

- Scheduled hours = hours/period × periods × quantity.
- Revenue = scheduled hours × utilization × resolved hourly rate.
- Cost = scheduled hours × manual cost/hour.
- COLA is applied to base revenue before discount; an offered price overrides the discount calculation.
- Contribution margin = (revenue − cost) / revenue; target revenue = cost / (1 − target margin); gap = target revenue − revenue.

These formulas are `DEMO_UNAPPROVED / PARITY_NOT_VERIFIED`. Same-currency validation remains in place; no FX provider exists. T&M, FTE, Program and Product still use hourly-effort demo semantics. Production startup/submission remains blocked.

## Tests and Finance decisions

- `tests/formula-traceability.test.js` locks the supplied onshore sample's cached cost/revenue values and verifies the known cost mismatch against current demo arithmetic.
- `tests/domain.test.js` covers current demo normal arithmetic, blank/zero input behavior, COLA-before-discount ordering, and same/mismatched currency behavior. These are not assertions of workbook parity.
- The workbook is not calculated by the application or test runner; the workbook's cached values are used only as references.

Finance must confirm billability in eligible delivery cost, CM versus projected GM definitions, target-margin gross-up, bench loading, IP/product cost and revenue treatment, rate-card lookup keys and missing-rate behavior, discount/COLA ordering, supported currencies/FX, rounding, and zero/blank/error handling. Until those decisions and comprehensive golden cases are approved, no production pricing or parity claim is permitted.

Registry: `FORMULA_REGISTER.csv`.
