# Home Project Planner — verification & device acceptance

**Automated CI:** `npm run check` runs Node domain tests, logic/storage TypeScript checks and the production React/Vite build. Check the [latest GitHub Actions run](https://github.com/jacobmgoodnight/home-project-planner/actions) for the commit that actually deployed.

**Automated verification is not a substitute for testing on actual Windows/iPhone browsers or using two real signed-in Supabase users.** Do not mark unchecked manual tests as passed.

## Fresh local install and usability

- [ ] Open without signing in; a new browser starts with no personal data. Demo workspace appears only by explicit choice.
- [ ] Add equipment, project and maintenance routines via Guided setup; repeat setup without duplicate presets.
- [ ] Quick add a project, a step to an existing project and a maintenance task; reload and check local persistence.
- [ ] At 320px/mobile widths and with keyboard/VoiceOver, navigate Today, Projects, Maintenance and Backup & data without confusing overflow.
- [ ] Install the PWA from the browser; after initial online load, reload while offline and confirm local records remain accessible.
- [ ] Confirm new and old v1/v2/v3 backups restore correctly, invalid/corrupted JSON is rejected and files/receipts survive a round trip.

## Projects, maintenance and financial accuracy

- [ ] Edit categories, status, tasks, due dates, dependencies and priorities; inspect "Do first" and filters.
- [ ] Confirm budget, material forecast, committed unpaid work, actual expense and repair-vs-replace totals without double counting.
- [ ] Add a service with cost, notes and receipt; verify actual next due date, yearly summary and receipt download.
- [ ] Confirm stock does not decrease unless "Deduct supplies" is selected; confirm restock changes only inventory.
- [ ] Check optional minimum stock alerts vs service due dates; inspect shopping quantities.
- [ ] Add appliance label photo and manual from camera/gallery/PDF. Search by model, serial and linked part SKU; check warranty summary.
- [ ] Open a printed QR label on a second device; when no matching local/cloud record exists, show a useful message.
- [ ] Export a dated .ics file and import into a calendar. Check future dates, one-day reminder and that undated/overdue items are excluded.
- [ ] Enable a device reminder; verify a prompt appears no more than once per day while the app is open. Confirm no misleading claim of background push.
- [ ] Copy/share the weekly recap; validate it includes completed service and actual costs without combining independent expense totals.

## Household sync: important before relying on it

- [ ] **Back up the main device first.** Sign up/sign in, complete confirmation email, and verify the Pages redirect works without affecting other apps.
- [ ] Create a household and inspect its initially empty cloud copy. Upload a confirmed starting snapshot only after reviewing it.
- [ ] Sign in to the **same** account on a second device. Back up any phone-only records, restore cloud copy, then enable auto-sync.
- [ ] Add a test task on Windows, use Sync now, verify on phone. Repeat phone → Windows, including after reload/session refresh.
- [ ] Disable internet on one device, change local data, reconnect, and verify it uploads without replacing newer cloud data.
- [ ] Edit the same household on two offline devices. Confirm a conflict is detected and neither side silently wins. Export both before explicitly resolving.
- [ ] Load demo, Clear local data, or Replace local backup while connected. Confirm auto-sync **pauses** and the shared household copy is not erased.
- [ ] Invite a separate authenticated adult account, redeem the one-time code, test one-use/expired behavior and confirm only joined household data is visible.
- [ ] Revoke that member. Confirm new cloud reads/writes are denied (already-downloaded local data cannot be remotely erased).
- [ ] Test long/offline sessions, phone storage eviction, attachment/cloud size ceilings, logout and reauthentication.

## Server checks already performed (October 29, 2026)

- [x] Owner-approved isolated `public.hpp_*` schema deployed into existing general Supabase project.
- [x] All four HPP tables have RLS; anonymous reads and unauthenticated direct writes denied.
- [x] Authenticated direct INSERT/UPDATE on HPP data tables denied; snapshot writes use a checked revision RPC.
- [x] Authenticated users have no direct SELECT privilege on invite hashes.
- [x] Simulated unrecognized authenticated user could not read HPP household/snapshot data or use the guarded snapshot write function.
- [x] GitHub CI production build/deploy completed for the previous integration release.

**Still pending:** two-real-user RLS/invitation flows, end-to-end browser account setup, cross-device synchronization, offline conflicts and iPhone/Windows manual testing. Static advisor warnings about intentionally authenticated `SECURITY DEFINER` RPCs need monitoring; every such RPC checks current signed-in membership/owner rights. The invite table deliberately has no SELECT policy.

## Security and storage caveats

Browser local data and auth sessions share the `jacobmgoodnight.github.io` origin with other apps. Only serve trusted code from that origin. Maintain private backup copies; sync is not a historical backup and can pause on conflict. Do not put credentials or household exports in public GitHub.

Supabase Auth redirect URLs are shared by all applications on the same Supabase project. **Add** the Home Project Planner URL if needed; never remove another app's allowed redirects.
