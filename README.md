# Home Project Planner

**A local-first, installable home dashboard for projects, maintenance, equipment, repair decisions and household spending.**

[**Open the live app**](https://jacobmgoodnight.github.io/home-project-planner/) · [Roadmap](ROADMAP.md) · [Browser acceptance checklist](docs/QA.md) · [Data model](docs/DATA_MODEL.md)

The goal is to make the next useful household task obvious—not to build an elaborate project-management system. You can use the app without an account. **Optional, private household sync** is available if you sign in and explicitly connect your household.

## Start here

1. Open the [app](https://jacobmgoodnight.github.io/home-project-planner/) on Windows, iPhone or another supported browser. Add it to your Home Screen/desktop for an app-like experience.
2. Open **Today → Guided setup** to choose the equipment and household routines you actually use. Nothing is prepopulated as owned, serviced or due.
3. Use **Quick add** for a project, a project step or a maintenance task.
4. On **Maintenance → Equipment**, save model numbers, warranty dates, label photos and manuals. Link equipment to maintenance routines and replacement parts.
5. Create a **Backup & data → Download backup** before importing or overwriting anything.
6. For optional computer–phone sync, follow [Set up household sync](#set-up-household-sync).

The main navigation intentionally has **four destinations**: **Today**, **Projects**, **Maintenance**, and **Backup & data**. Detailed tools are grouped inside them rather than scattered across more tabs.

## What it does

| Where | Capabilities |
| --- | --- |
| **Today** | Maintenance needing attention, project steps due within a week, short unblocked projects, opt-in guided setup, device reminders and an on-demand weekly recap. Expand the older financial overview only when needed. |
| **Projects** | Category/status, due dates, priority overrides, checklists, dependencies, images/PDFs, budget/actuals/forecast, materials, quotes and repair-vs-replace financing comparisons. |
| **Maintenance → Upcoming & supplies** | Actual due dates (30/60-day view), hour/mileage triggers, low-stock thresholds, shopping list and optional iCalendar (.ics) export. |
| **Maintenance → All routines** | Recurring interval presets (including opt-in seasonal checklists), editable schedules, reviewed service completion, service costs, receipts and optional parts-stock deductions. |
| **Maintenance → History & spending** | Service history and actual recorded maintenance costs by year, month and equipment. |
| **Maintenance → Equipment / Home reference** | Model, serial, location, warranty, label photos, user-supplied manuals, replacement SKUs and receipts, searchable locally. Camera capture and printable QR equipment labels are optional. |
| **Backup & data** | Private JSON backup/export, guarded restore, merge of *new* record IDs, and optional authenticated household sync and invitation management. |

### Important behavior

- A maintenance preset does not invent a last-service date, purchase, appliance model, or initial due date. You choose the first due date. The app uses true calendar-month intervals (or day/usage intervals when configured).
- **Done today** is a guided service log: review actual date, cost, notes, usage, receipt and parts used. Stock changes **only** if you explicitly select the deduction option. Restocking is a separate confirmed action.
- A low-stock reminder requires a **minimum on-hand quantity you set**. Product URLs/stores/prices are user-entered; no orders are placed.
- An annual maintenance total shows service payments entered under Maintenance, not necessarily all household spending. You might also log the same payment as a Project expense; **do not add the two totals together**.
- Calendar export creates a **one-time .ics snapshot** of *future* scheduled maintenance dates (with a one-day reminder). It does not create a live calendar subscription or remove earlier imported events after a service is completed. Re-export and update calendar events as needed.
- With permission, supported browsers can show one due-item reminder per day **when you open the app**. There is no background push while the PWA is closed. The weekly recap is generated on the device and manually copied/shared, not automatically emailed.
- QR equipment labels request an image from the optional external goQR service and include only the public app URL and an opaque equipment ID. They **do not include** household names, serials, or model numbers. The destination device needs the corresponding data before the QR link can display the record.

## Set up household sync

**Current state:** The approved Supabase backend, app configuration and private \`hpp_*\` tables are deployed. The database permission checks and CI build passed. **A real owner/member login, two-device transfer, and offline-conflict test have not yet been completed**; don't treat production multi-device operation as field-verified until you do this.

The general Supabase project \`rwqclcpmtuebxndadkxv\` is shared with other applications by owner approval because the free organization reached its two-active-project limit. All Home Project Planner database objects have their own \`hpp_*\` names. This app includes **only a publishable browser key**—never a service-role or secret key—and does not alter the other apps' tables.

1. **On your main computer:** open **Backup & data**, download a JSON backup and verify it is saved.
2. Open **Optional household sync** (below the backup tools), create an email/password account or sign in, then create a household. Email verification may be required.
3. Choose **Review cloud → Upload this device as starting copy** for an empty new household. Review the confirmation. Enable automatic sync once the starting copy has been uploaded.
4. **On your phone:** open the same app and sign in with the *same account*. Before replacing phone-only records, export a phone backup. Select your household, review the cloud copy and choose **Use cloud copy on this device**. Then enable sync.
5. Make a small test change on one device, keep the app open and online, use **Sync now** or reopen/check the other app, and confirm the change appears. Test reversing the direction before relying on sync.
6. To share with another adult, the household owner can generate a one-use seven-day invitation under **Household sharing and invitations**. The other person signs up/signs in and redeems the code. Owners can revoke future cloud access.

**Sync is not instantaneous:** the app checks approximately once per minute while open, and when the browser becomes visible/reconnects. Offline edits stay in local IndexedDB and synchronize later. If the cloud and local copies changed independently, synchronization flags the conflict; **there is no automatic per-field conflict merge**. Export both copies and explicitly choose which to keep. Revoking household access cannot erase files already downloaded by another member.

**Safety:** Loading the fictional demo, clearing a local workspace or replacing it with a JSON backup intentionally *pauses and disconnects this device's automatic sync* so those changes cannot unexpectedly replace the shared household. Review the cloud copy again before re-enabling sync. No local records are uploaded merely by visiting the app or signing in.

If an email verification link returns to a different application, the shared Supabase project's **Authentication → URL Configuration → Redirect URLs** may need this exact entry added without removing existing app entries:

\`https://jacobmgoodnight.github.io/home-project-planner/\`

### Privacy and backup limits

- Unsynced data lives in **browser IndexedDB**; GitHub Pages only hosts static files. When you enable household sync, the household JSON snapshot (including embedded attachments) is sent over HTTPS to Supabase, visible only to authenticated household members under its access rules.
- **Export JSON regularly**, even with sync enabled. A shared live snapshot is not a historical backup or undo system. Browser cleanup and iOS storage eviction can erase the local copy.
- JSON exports contain household records, photos, receipts and potentially serial numbers. Keep exports private; **never commit exports or credentials to this public repository**.
- The import limit is **60 MB** and the cloud snapshot limit is about **20 MB** in serialized JSON. Incoming images can be up to 15 MB before resizing (up to 1400 pixels on the longest side); PDFs must be at most 2 MB. These are practical limits, not a guarantee your device has enough free storage.
- Because this app shares \`jacobmgoodnight.github.io\` with other Pages apps, scripts served on other paths share the same **browser origin** and can potentially access local site data and session tokens. Only host trusted apps there; use a dedicated origin/domain if stronger browser isolation becomes necessary.
- No bank account access, automatic purchases, analytics service, AI-generated prices, or unrequested imports from other apps.

## Cost and priority calculations

Project money is recorded in **integer USD cents**.

- **Actual spent**: entered project expenses.
- **Unpaid materials**: estimated quantity × user-entered unit price for materials not marked purchased.
- **Committed**: explicitly agreed future costs not yet paid.
- **Future estimates**: unpaid materials, labor estimate and uncommitted future costs.
- **Contingency**: a user-set percentage applied to unpaid committed and estimated amounts.
- **Forecast**: actual spent + commitments + future estimates + contingency.
- **Budget remaining (cash)**: budget − actual spent; **forecast headroom**: budget − forecast.

Quotes and "material purchased" flags are references and **do not automatically create an actual expense**. Repair/replace financing uses a standard fixed-rate amortizing payment calculation, including 0% APR handling, and keeps cash paid today separate from financed principal. Estimates are not lending offers or professional repair/safety advice.

Project prioritization uses explainable urgency, importance, financial impact, target dates, dependencies, budget and effort. The manual **Do first / Automatic / Do later** setting overrides calculated order; no AI ranking or outside data collection is required.

## Maintenance starter guidance

The app offers household checklist suggestions, not manufacturer-specific requirements. A monthly HVAC-filter check, user-preferred four-month refrigerator water-filter routine, smoke/CO tests, and seasonal tasks may be useful, but follow the actual equipment instructions. [ENERGY STAR](https://www.energystar.gov/saveathome/heating-cooling) discusses air filter checks, [GE](https://products.geappliances.com/appliance/gea-support-search-content?contentId=21284) describes common water-filter timing, and [USFA](https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/smoke-alarms/index.html) addresses smoke alarms.

## Development and deployment

Requires **Node.js 22+** and npm.

\`\`\`bash
npm install
npm run dev
npm run check
\`\`\`

Production build: \`npm run build\`. The GitHub Pages build uses \`GITHUB_PAGES=true\` (configured in \`.github/workflows/verify-deploy.yml\`).

The existing GitHub Actions workflow runs unit tests, logic type-checking, the TypeScript/Vite production build and a GitHub Pages deployment. Check the [latest Actions runs](https://github.com/jacobmgoodnight/home-project-planner/actions) for the actual published revision. The repository includes fictional demo data only; choose **Backup & data → Load demo workspace** to opt into it.

### Architecture

- **React 19 / TypeScript / Vite 6** for the static installable app; browser **IndexedDB** for local persistence.
- \`src/types.ts\` and \`src/storage.ts\`: **v3** snapshot model and validated v1/v2/v3 import migration.
- \`src/logic.mjs\`, \`src/home-insights.mjs\`, \`src/maintenance-enhancements.mjs\`, \`src/today-calendar.mjs\`: domain calculations.
- \`src/App.tsx\` and focused components: projects, Today, maintenance, equipment, reference book, backup, and household sync.
- \`src/cloud-client.ts\`, \`src/HouseholdSync.tsx\`: optional Supabase authentication, memberships, revision-guarded snapshot sync and conflict handling.
- \`supabase/home-project-planner.sql\`: approved and deployed **\`hpp_*\`** schema, with row-level security, role checks and owner-only invitation/member management.
- \`public/sw.js\`: same-origin app-shell caching for offline use. Sync and external QR image lookup still need network access.
- \`tests/*.test.mjs\`: domain tests; [docs/QA.md](docs/QA.md) tracks device and account acceptance tests.

**Current next priority:** verify real cross-device login, data round-trip, and simultaneous offline conflict handling before adding more functionality. See the [roadmap](ROADMAP.md) for the short list.