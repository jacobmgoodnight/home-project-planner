# Home Project Planner — roadmap

**Mission:** Help a household finish useful work, remember equipment details and avoid surprise expenses. Keep the four existing navigation destinations. Features should be opt-in, locally useful, data-preserving and inexpensive to maintain.

## Delivered

- [x] Four-part interface: Today, Projects, Maintenance, Backup & data
- [x] Transparent project priority, short tasks, dependencies, cost forecasts, quotes and repair-vs-replace comparisons
- [x] Guided household setup, Quick add, optional seasonal routines and true calendar-month maintenance schedules
- [x] Reviewed completion logs with receipts, real costs and explicit optional stock deduction
- [x] Equipment/model/serial/part-number search, warranty alerts, label photos, local manuals and QR labels
- [x] Maintenance history and year/month/equipment spending review
- [x] Stock thresholds, shortage shopping lists and manual restock confirmation
- [x] 30/60-day maintenance agenda and one-time .ics calendar export
- [x] App-open opt-in browser reminders and manual weekly recap
- [x] Versioned JSON backups, validated v1/v2/v3 imports, new-record-only merge previews and local-first offline PWA
- [x] Owner-approved deployment of private `hpp_*` Supabase schema in an existing project; no changes to other apps' tables
- [x] Signed-in household sharing, one-use invitations, owner access revocation, revision-guarded optional sync and manual conflict review
- [x] Local demo load, clear and restore pause sync to prevent unintentional shared-household overwrites

## Verify before relying on automatic sync (highest priority)

- [ ] Confirm email sign-up / confirmation and redirect behavior for the deployed Pages URL.
- [ ] Create a real household using a test account and **back up data before the initial upload**.
- [ ] Confirm a small edit round-trips Windows → phone → Windows while app is open, both via Sync now and automatic check.
- [ ] Test edits while offline on *both* devices. Confirm conflict is flagged, neither copy is silently overwritten, and exports/recovery work.
- [ ] Test owner/member/outsider role isolation with **two real authenticated test accounts**, one-use invitations, expiry and revocation. Server-side simulated outsider tests and static permission checks passed, but these do not replace real-user acceptance.
- [ ] Test large image/receipt attachments across devices, app reload, auth session renewal and storage quota limits.
- [ ] Run iPhone and desktop keyboard/screen-reader checks and PWA offline reload tests.

## Practical improvements after field testing

1. **Safer two-device conflicts:** A guided comparison of changed records, with export and explicit selection before applying anything. Preserve an undo/restore checkpoint.
2. **Simpler first-time sync:** One progress-oriented guided setup in Backup & data (sign in → create household → first upload → connect second device). Hide rare maintenance controls under details.
3. **Device/privacy isolation:** Consider a dedicated application origin to separate browser IndexedDB and auth tokens from other Pages apps on the same GitHub Pages origin.
4. **Attachment & backup health:** Warn about cloud snapshot size and attachments before hitting the limit; offer backup-health checks.
5. **Only on request:** Real push reminders while closed, recurring email summaries, Holiday Display Blueprint import and optional integrations with external apps.

## Not planned without a specific need

Bank access, automatic purchases, AI-generated prices/repair estimates, compulsory accounts, separate navigation tabs for every feature, or automatic import from other applications.

## Release requirements

Run `npm run check`, inspect the actual GitHub Pages deployment, validate v1/v2/v3 import behavior, and complete the relevant manual checks in [docs/QA.md](docs/QA.md). Never populate demo data without an explicit user action or silently overwrite existing IndexedDB or cloud records.