# Home Project Planner — practical roadmap

The product goal is **finish useful household work and avoid surprise spending**, not to become a generic task manager. Work in small, testable improvements, preserving local data on every release.

## Completed
- [x] Project overview, priority explanations and manual overrides
- [x] Tasks/checklists, forecasts, materials, quotes and financing calculator
- [x] House maintenance routines, calendar-month scheduling and service history
- [x] Replacement part details, on-hand stock, price-aware shopping list
- [x] Equipment inventory, label photos, maintenance links and confirmed restocking
- [x] Guided completion with actual costs, receipts, used parts and opt-in stock deduction
- [x] Upcoming maintenance agenda (30/60 days) and low-stock thresholds
- [x] Opt-in spring/summer/fall/winter home care templates
- [x] Equipment search across appliance labels and linked replacement SKUs with warranty alerts
- [x] Yearly actual service spending, receipt history and cost-by-equipment reports
- [x] Manual cross-device share/import, non-destructive new-record merge previews and backup reminders
- [x] Unified Today view: scheduled maintenance, dated project steps and quick wins
- [x] Opt-in guided home/equipment setup and minimal Quick add
- [x] iCalendar export of actual next maintenance due dates with one-day alerts
- [x] Searchable home reference book with local manuals, labels, receipts and parts
- [x] Versioned JSON export/restore, local IndexedDB, offline PWA and CI

## Next — high value, low complexity
1. **Opt-in continuous sync, if requested.** Requires user-selected authentication and backend, private per-user access controls, encrypted transport, offline queues and conflict resolution. The app already has manual share/merge, no backend needed.
2. **Restore safety and backups.** Add archive snapshots/undo checkpoints if browser storage grows; do not silently discard edits.
3. **Focus the home screen.** One unified today/this-week work list combining home projects, due maintenance and small wins.

## Later — consider only if needed
6. Compare multiple written repair/contractor quotes side-by-side and save vendor documents.
8. Explicit, reviewed import from Holiday Display Blueprint and/or existing CSV, matching duplicates by stable IDs.
9. Optional authenticated Supabase sync for sharing across devices **only when demanded**. Must preserve local-first behavior and clear conflict resolution.
10. Offline-friendly install and phone UX audits; print/export a one-page household maintenance sheet.

## Not in scope without new user direction
Bank feeds, automatic purchases, AI estimates, fabricated retailer prices, elaborate team roles and enterprise project-management features.

## Engineering release checklist
Run `npm run check`, verify migration of v1/v2/v3 backups, test on mobile, inspect GitHub Pages deploy, and never replace user IndexedDB data from demo fixtures.


## Sync and engagement status (2026-10-29)
- [x] Implement secure-database SQL schema and gated household sync UI; dedicated Supabase project provisioning and RLS testing remain required before anyone can enable it.
- [x] Opt-in household invites with 7-day one-time codes, safe cloud revisions and local-first behavior.
- [x] Browser-in-use reminder check and local shareable weekly recap (not unattended push/email).
- [x] Mobile camera capture on supported devices and opt-in QR equipment labels.
- [ ] Provision a dedicated Supabase project in the owner's selected organization; apply schema; verify RLS as owner/member/outsider; test two devices and conflicting offline changes.
- [ ] For future unattended reminders: implement a permissioned push/subscription server and explicit opt-in, rather than pretending browser notifications work when the PWA is closed.

- [x] Add explicit per-household, per-user device binding to prevent cross-household auto-uploads.


- [x] Owner-approved reuse of general free Supabase backend with separate `hpp_*` tables and no modifications to other apps.
- [x] Deploy hardened household schema and project publishable-key bootstrap without service credentials.
- [ ] Finish user sign-in / email confirmation in both browsers; create a household, upload a verified backup, and test actual two-device round trip including conflicting offline edits.
