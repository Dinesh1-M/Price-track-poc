# Finance review exceptions

| Issue | Current behavior | Required evidence |
| --- | --- | --- |
| Cached workbook cost/rate outputs | Read with source hash and exact lookup key; unchanged source formulas registered | Freshly recalculated Excel fixtures and Finance approval |
| Legacy cost calculation omitted billability | New source-linked drafts use billability-inclusive workbook cost; historical versions retain original snapshots | Finance review of eligible-cost interpretation |
| Rate card has role/experience, no named employees | Fixed source role cost; no invented individual employee rates | Approved employee master if individual costing is later required |
| Source offshore rate formula uses fixed 93 while Current Dollar cell is 95.66; labels include Rs but downstream totals are USD | Preserve supplied cached lookup outputs; no inferred FX conversion; non-USD submission blocked | Finance confirms intended FX and units |
| Summary projected GM uses normalized M/N/O columns | Use normalized total GM ratio; RAI normalization is covered by regression test | Finance approves normalization intent |
| Summary simulation GM refers to empty rows 15–21 | Revenue simulations are calculated; simulation GM is unavailable with a review note | Corrected/approved workbook rule version |
| PM helper references and source wording are ambiguous | No silently repaired PM approval gate | Finance/Delivery validates helper dependencies and threshold intent |
| Source vertical HLS is not an exact pricing vertical | Explicit workbook vertical selection required | Approved source-to-pricing vertical mapping |
| No COLA formula in workbook | User-authorized extension: renewal overall cost increases by Finance COLA (initial 5%); source rates and selling price unchanged; versioned separately | Annual EVP review by Ankur Maheshwari; production Finance acceptance remains required |
| No external FX policy supplied | Unsupported currency blocks calculation/submission | Approved provider and conversion policy |
| Program milestones and Product revenue models are incomplete in workbook | Program uses explicit resource effort; Product requires explicit unit cost/units/revenue; local status remains unapproved | Finance-approved commercial models and golden cases |
| Workbook IFERROR lookup zero / display dash | Display remains nullable; missing/invalid mandatory financial inputs block submission | Finance validation of error behavior |
| Governance authority labels differ from local roles | Source is retained as reference; future sequential routing is editable and snapshotted as a local policy | Named authority mapping and approval matrix sign-off |

No production approval or exhaustive parity claim is made from source extraction or cached sample tests. Updating a master creates a new source hash; prior submitted calculations and rule snapshots remain intact.
