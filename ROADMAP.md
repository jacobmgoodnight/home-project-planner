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
- [x] Versioned JSON export/restore, local IndexedDB, offline PWA and CI

## Next — high value, low complexity
1. **Find equipment fast.** Search appliances, model/part numbers, locations and service history, plus warranty-expiry summaries.
2. **Safer mobile backup.** Make export reminders visible when a user has edited data without a recent export; keep reliable restore and attachment-size safeguards.

## Later — consider only if needed
6. Compare multiple written repair/contractor quotes side-by-side and save vendor documents.
8. Explicit, reviewed import from Holiday Display Blueprint and/or existing CSV, matching duplicates by stable IDs.
9. Optional authenticated Supabase sync for sharing across devices **only when demanded**. Must preserve local-first behavior and clear conflict resolution.
10. Offline-friendly install and phone UX audits; print/export a one-page household maintenance sheet.

## Not in scope without new user direction
Bank feeds, automatic purchases, AI estimates, fabricated retailer prices, elaborate team roles and enterprise project-management features.

## Engineering release checklist
Run `npm run check`, verify migration of v1/v2/v3 backups, test on mobile, inspect GitHub Pages deploy, and never replace user IndexedDB data from demo fixtures.
