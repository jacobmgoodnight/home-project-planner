# Home Project Planner — contributor / coding agent notes

## Product constraints

- Local-first, opt-in sync. **Never** create demo records, service completions, due dates, expenses, appliance model details or purchases on behalf of the user without an explicit action.
- Keep the **four** top-level destinations: Today, Projects, Maintenance, Backup & data. Prefer collapsible tools and a focused Today view over adding navigation tabs.
- Keep maintenance costs and project expenses **separate**: users may describe the same transaction in both places. Never sum them into a single alleged "actual spent" total.
- Service completion may record costs, hours/miles, notes, optional receipt and parts used; inventory deduction is off by default and must be explicitly confirmed.
- Calendar .ics export is a **snapshot**, not a live subscribed calendar. Browser notification reminders only fire while the app is open, not via background push.
- QR external service sees only the app URL plus an opaque equipment ID; no names, serial numbers, photos or other personal data.

## Versioning and persistence

- Current `Database.version = 3`; the IndexedDB name intentionally remains `home-project-planner-v1`.
- Validate/migrate old v1/v2 JSON and existing v3 snapshots, preserving old optional fields, service history, money, equipment links and attachments.
- If adding required fields or changing snapshot shape, add migrations, updated validators, backup tests and a clear changelog.
- Use stable UUIDs. Manual JSON import merges **only root records with new IDs**; same-ID conflicts are not silently resolved.
- Export/restore include local file data URLs. Photos can make cloud snapshots large. Document 60 MB local import and ~20 MB cloud snapshot restrictions.
- Loading demo, clearing workspace or replacing local data **must pause automatic sync and unlink that device**. Do not let an unintended local reset wipe the household cloud copy.

## Supabase production configuration

- Existing general Supabase project `rwqclcpmtuebxndadkxv` has **owner-approved `hpp_*` schema** from `supabase/home-project-planner.sql`. Other existing apps also use this project. **Never modify `gw_*`, `hdb_*` or unrelated tables, auth settings or redirect URLs without a specific new approval.**
- Frontend publishes only the *publishable* browser key. No service-role key, password, token, personal JSON backup or serial numbers in repo.
- Tables are protected with RLS. Authenticated browsers can SELECT their own household records, not directly INSERT/UPDATE. CAS snapshot RPC is `SECURITY DEFINER` with explicit `auth.uid()` membership, schema-shape, size and revision checks.
- Other owner-only and invite RPCs similarly check identity, membership/owner role, token expiry and one-use semantics. Authenticated SECURITY DEFINER RPCs are intentional but should be periodically audited.
- Bind local sync to the **specific Supabase project URL, auth user and household ID**; selecting a different household pauses sync. Never reuse another household's revision anchor.
- The sync component must stay **mounted at App root** across navigation, because the foreground polling loop runs only while the app is open.
- On conflict, preserve both copies and require explicit user selection; do not auto-merge divergent same-ID documents. Export backups before deliberate cloud replacement.
- Supabase email sign-up uses `redirect_to` query argument. The Pages redirect URL may need allowlisting **without deleting other apps' redirect URLs**. Do not assume two-device sign-in is already field-verified.
- Shared GitHub Pages origin means browser IndexedDB and stored credentials are accessible to trusted/compromised code hosted at other paths. Treat stronger origin isolation as a future security improvement.

## Verification

- Run `npm run check` (domain tests, TS logic check and production Vite build).
- Verify the GitHub Actions `verify` **and** `deploy` jobs both succeeded on the latest main commit.
- Review `docs/QA.md` for human tests; do not claim actual owner/member two-device testing without real signed-in accounts and recorded verification.
- Keep `README.md`, `ROADMAP.md`, `docs/DATA_MODEL.md`, and `docs/QA.md` current on any release.


## Reliability release guardrails

- Service worker prefix `hpp-home-project-planner-`; activation may remove that prefix and the exact prior `home-project-planner-v1` through `v10` caches **only**. Never call delete on all other caches on the shared GitHub Pages origin. Cache interception requires same origin AND exact app registration scope; avoid arbitrary data requests.
- `src/save-queue.mjs` is the source of truth for local save status. Only the latest successful revision may show a saved state; failed/pending writes must remain visible and trigger unload protection.
- The recovery slot `previous-workspace` is stored in the same v3 IndexedDB object store; checkpoint before local destructive operations, abort if checkpoint fails, don't advertise it as a full backup history.
- Cloud conflict UI is review-and-export only; never silently combine or discard divergent records. Persist imported cloud data locally before advancing its cloud revision.
- Today search stays local, uses existing page navigation, and preserves four top-level navigation entries. Unknown project expenses are not $0; don't create circular dependencies.
- Tests verify pure/isolated policies; manual signed-in two-device tests and visual accessibility checks remain pending.
