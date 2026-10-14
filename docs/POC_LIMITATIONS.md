# POC boundaries

The editable local demonstration covers case creation, discovery, resource/rate provision, renewals, calculations, negotiations, version comparisons, send-back/rejection, sequential approvals, acceptance, contract/launch and guarded Closed Won. Records persist in the existing JSON store. No external integration was added.

- Identity selection is simulated, not production authentication. Existing server role/account/assignment rules are enforced against the selected identity. Administrator retains its existing approval override.
- The approval chain remains the existing BU Head then Finance sequence. Full configurable threshold/delegation administration and user provisioning were not present and are not represented as implemented. Existing configuration, identities, decision register and audit views remain available.
- Finance formula, work-type-specific billing, cost eligibility and rounding remain demo assumptions. Revenue uses utilized hours; cost uses scheduled hours. Quantity, discount, manual renewal COLA and negotiation offers now feed that same shared formula. No currency conversion is performed; mixed currencies are rejected.
- Resource cost is supplied hourly. Monthly CTC can be represented by a provider's hourly conversion; there is no independently maintained CTC source.
- Renewal scope, COLA, dates, extra-resource notes, hours, counts and utilization are manually provided. No automated SOW comparison or staffing feed exists.
- JSON writes are synchronous in one server process. Multi-process transactions, durable immutable audit storage, backups and production concurrency need a database/operational design.
- Earlier legacy versions retain their original data, including any missing calculation or revision metadata. No missing historical figures or stage events are invented. New versions contain complete calculation and pricing snapshots.
- The current demo rate dates cover 2026-2027. Update effective dates through the governed provider forms when demonstrating outside that period.
- Existing Salesforce/Project Track simulators are local mocks. Their output does not prove live connectivity, contract acceptance by an external system, or delivery of notifications. They are not needed for the Closed Won demonstration.
- All nine screens and shared layouts are covered by template tests; the end-to-end API path is exercised with real local HTTP calls. Interactive browser, pixel layout, accessibility and load/security testing were not performed.

See `IMPLEMENTATION_REPORT.md` for actual verification and `DEMO_GUIDE.md` for the reproducible demonstration.
