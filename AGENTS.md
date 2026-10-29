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
