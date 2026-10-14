# Workbook input/output map — local candidate implementation

Source: `data/Margin Calculator_new 1.xlsx`. Exact source SHA-256 and all 1,781 extracted formulas: `WORKBOOK_FORMULA_MANIFEST.json`. Source workbook remains unchanged. Implementation: `src/workbook-pricing.js`. Status: **IMPLEMENTED_UNVERIFIED**, with cached-example comparisons; not fresh Excel recalculation or Finance approval.

| Source sheet/cell | Application meaning | Input / output |
| --- | --- | --- |
| Master File - Rate Card B4:B163 | Exact role/experience lookup key | Source input, not employee identity |
| Master File - Rate Card G4:G163 / K4:K163 | Onshore / offshore hourly cost used by original lookup | Cached source rate inputs; source hash and applied rate reference retained |
| Revenue & Cost_Onshore / Revenue & Cost_Offshore `O4` | Hours/month | Source default; explicit draft assumption |
| Same sheets F9 / G9 / H9 | People / months / billability fraction | Draft quantity / periods / utilizationPct ÷ 100 |
| Same sheets E5 | Target CM fraction | Draft targetMarginPct ÷ 100 |
| Same sheets I9 / K9 / L9 / M9 | Resolved cost/hour / target selling rate / total cost / revenue | Deterministic workbook candidate calculation |
| Same sheets L29 / M29 | Stream cost and revenue sums | Dynamic sum of saved estimate lines |
| Margin_Summary H8 / C8 | Bench loading fraction / amount | Default from source; local range 5–10%; employee costs only |
| IP_Product Cost E5:G13 / G15:G17 | Unit cost × factor, summed cost; explicit revenue; CM | Product line unit cost/quantity/revenue inputs; source is a placeholder |
| Margin_Summary C10 / D10 / E10 | Total cost, total revenue, contribution margin | Includes bench and product costs; missing required inputs block submission |
| Vertical-Based GM Calculation A2:A8 / M2:O8 | Exact vertical and normalized GM ratios | No implicit HLS mapping |
| Margin_Summary F6 / F7 / F10 | Projected GM using normalized vertical ratios | Total projected GM is calculated from normalized source ratio |
| Margin_Summary E18/E19 and D18/D19 | Source target CM simulations and target revenue | Target values are read from source; total cost gross-up implemented |
| Margin_Summary F18/F19 | Simulation GM using source rows 15–21 | Empty referenced range; explicit unavailable result pending Finance review |
| Governance C13:C15 / B6:D9 | Revenue/GM thresholds and authority descriptions | Source reference; local editable approval route is unapproved and separately snapshotted |

The Salesforce workbook has sales `Type`, `Stage`, owner, account, capability, amount/currency and project dates. It does not supply contractual billing model, region, detailed delivery scope, employee identities, SSO credentials, or individual employee rates. Missing business data is requested explicitly; no source fields are invented.
