# Home Project Planner — instructions for coding agents

This is a **usable, independent local-first personal app**. Do not retrofit it into the user's other GitHub repositories. Keep UX friendly on iPhone and preserve existing saved data.

## Mission / guardrails
- Core flows: project CRUD, obvious next action, phases/tasks, transparent priority, actual vs future costs, materials, quotes, decision calculator, maintenance, JSON export/restore.
- No bank account integrations, automated purchases, invented retailer prices, or required backend.
- Use fictional demo data only. Do not commit private user budgets, vehicle details, receipts, or home information.
- If you change the DB schema, bump `version`, implement an explicit migration and test older snapshots before changing `validateBackup`. Never silently reset unexpected data.
- Never count an item as both actual spending and future forecast: purchased materials are excluded from unpaid estimates and must be entered as expenses for cash tracking. Quotes don't count in budgets.
- Financing must explicitly separate cash today, principal financed, upfront fees, APR, months and future additional costs. No unsupported safety/finance recommendations.
- Avoid excessive knobs or overengineering, and keep mobile navigation/task workflows concise.

## Verification
- Node.js 22+, `npm install`, `npm run test`, `npm run build`.
- CI deploy workflow uses `GITHUB_PAGES=true`, base `/home-project-planner/`.
- Test project/finance calculations for rounding, $0 APR, no double count and dependency scores.
- Manually verify on iPhone-sized viewport: editing, checklist taps, budget input, quote comparison, add attachment, exporting/restoring a backup, offline reload after first visit.
- IndexedDB autosave failures should be visible, and users should still be able to export memory data on errors.

## Repo patterns reviewed
Inspired by the user's existing GlowRoute/Goodnights responsive GitHub Pages apps, their clear README/AGENTS.md and lightweight static deploy. Deliberately not copying their large app.js or their cloud Supabase model. Do not modify any other repository.

## Later integration
Future inventory import may use a mapping `{sourceApp, sourceId, projectId, materialId}` and explicit user imports. It must not require another app, credentials or cloud services.

## Maintenance starter checklist
- `src/maintenance-presets.ts` contains opt-in templates; never seed real browser records silently on deploy.
- `intervalMonths`, `firstDueDate`, and `templateKey` are optional version-1 fields for compatibility with existing exports and IndexedDB; never invent last service dates, costs or equipment ownership.
- Monthly recurrence uses calendar months; first due dates are not completed services. Check scheduling and duplicate detection tests before merging changes.


## Maintenance replacement parts (v2)

- Database.version is now 2. Use the pure upgradeSnapshot function in src/maintenance-support.mjs to migrate valid v1 snapshots; validate after upgrade before any save. Preserve the IndexedDB name and key so prior browser data remains available.
- Maintenance supplies record manually entered part identifiers, size, quantity, stock, store, URL and optional price; never invent compatible products or amounts. They are NOT actual expense or purchase records.
- The maintenance shopping view uses due/soon scheduling and stock shortages, with an optional all-tasks filter. No automatic buying or deductions from on-hand stock.


## Equipment and restock (v3)

- Version 3 adds equipment[] and maintenance.equipmentId. Migrate v1→v2→v3 or v2→v3 via upgradeSnapshot. Preserve past service history, inventory and finance fields. Reject unsupported or damaged snapshots.
- Equipment label photos stay in IndexedDB and JSON exports, compressed using attachmentFromFile. Never upload to external servers and never seed real appliance identifiers or personal photos in the repository.
- Deleting equipment must unlink matching maintenance tasks, not erase those tasks. Restock confirmations update only onHand via stockAfterRestock, never create spending or auto-consume stock.
- Keep four navigation tabs; equipment lives in Maintenance. Mobile usability and simple workflows are essential.


## Guided maintenance and seasonal maintenance

- Never silently log completion when tapping Done today. Record a reviewed actual service date, cost, usage, optional receipt and parts used; subtract on-hand inventory only with an explicit checkbox and enough stock. Maintenance paid amount stays in service history, NOT in project spending.
- ServiceEntry.usedSupplies, stockDeducted and receipt are optional v3 additions. Legacy v1/v2/v3 export validation must preserve records. Validate attachment MIME/data URL as with equipment photos.
- Agenda uses actual dueMaintenance dates and 30/60-day windows. Do not derive a false due date for unscheduled templates.
- Low-stock alert is based only on user-entered minOnHand (optional) and independent of due dates. No automatic shopping/bank integrations.
- Seasonal templates use annual calendar-month intervals and start unscheduled. Avoid duplicating Holiday Display Blueprint installation and wiring tasks.


## Cross-device manual transfers and equipment insights

- 'Sync' currently means explicit JSON sharing/import. PreviewMerge skips conflicting existing IDs and reports conflicts; never represent this as automatic cloud synchronization. Validate incoming JSON with readBackup before merging. A replace action is deliberately destructive and needs explicit confirmation.
- Last-export reminders are localStorage metadata, advisory only. Do not infer that a download/share was actually saved on another device; IndexedDB remains the authoritative data.
- Warranty dates are user-entered and may be expired. Equipment search includes linked maintenance part numbers; do not index serials remotely or prefill personal identifiers.
- Maintenance service summaries count ONLY dated costCents entries from Maintenance. Those may overlap user-entered project expenses; never merge totals automatically.


## Tidy product experience

- Keep the four primary navigation tabs. Today surfaces only actionable work; the earlier budget and project overview remains accessible in a collapsed section.
- Quick capture must never invent a service completion or schedule; a project step must belong to an explicitly selected existing project.
- Guided setup adds only user-selected equipment/routine presets, with no guessed appliance ownership, model, price, or service due date.
- Calendar export is a user-triggered .ics snapshot of current due dates with one-day alerts, not a live subscription. No duplicate automated entries or external calendar APIs.
- Home reference reuses local existing equipment photos, optional manuals, warranties, service receipts, replacement part links and project attachments. It never uploads personal data.
- Equipment documents?: Attachment[] is optional for prior v3 snapshots; preserve v1-v3 backup restoration and validation.


## Household backend security and implementation notes
- New optional backend in supabase/home-project-planner.sql. DO NOT run against other user apps' Supabase projects. SQL has not been applied; require explicit dedicated project selection and complete RLS tests.
- Never expose service_role, secret keys or session tokens in public GitHub. Browser accepts only Supabase publishable keys from a real HTTPS Supabase host. Verified users become household members via a private one-use invite.
- Cloud snapshot writes must be optimistic CAS revision-gated. An offline conflict pauses sync; no auto-merge or overwrite of changed shared records. Autosync only while app open. Local IndexedDB remains canonical until user opts in.
- Browser notifications are device permission controlled, on demand and foreground only. Weekly recap stays local or manually shared.
- Opt-in QR uses an external API on click; only a public app URL and opaque equipment ID are transferred. Model numbers, names and serials must never be included in the QR service request.
