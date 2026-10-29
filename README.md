# Home Project Planner

**A practical, local-first PWA for household projects, repairs, vehicle maintenance, DIY work and purchase decisions.**

Focus on your next action, record what you've actually spent, and compare options without a maze of enterprise project-management features.

## Features

- **Projects:** create, edit and delete projects; category, status, target date, notes, next action, hours, and photos/PDFs.
- **Work-next dashboard:** transparent automatic priority score, manual **Do first** / **Do later** overrides, and filters for short, inexpensive, overdue, waiting, and monthly-planned work.
- **Simple checklists:** phases, step due dates and completion tracking.
- **Cost planning:** budgets; purchased/unpurchased material estimates; actual cash expenses; explicitly committed but unpaid expenses; other future estimates; labor estimate and contingency. Displays budget headroom and total forecast.
- **Quotes:** manual written quote comparison with supplier and source links. Quotes never automatically count as purchases.
- **Repair vs. replace:** manual scenario builder, cash/financed cost breakdown, nominal APR, amortizing payments and total-of-payments. Safety and financial assumptions are visible.
- **Maintenance:** selectable household starter checklist, calendar-month/day/usage intervals, first due dates, quick **Done today** logs, warranties and service history. No external notifications.
- **Attachments:** on-device compressed photos and small PDF receipts. Included in JSON export.
- **Backup:** full versioned JSON export and validated replace-only restore, plus optional fictional sample projects.
- **Installable PWA:** browser installation and offline caching after a successful first online load.


## Household maintenance starter checklist

Open **Maintenance → Household checklist** and choose the tasks appropriate for your home. Monthly HVAC filter checks/changes, four-month refrigerator drinking-water filter changes, monthly smoke/CO alarm tests and other essentials are preselected; optional equipment is NOT assumed. Confirm the list before adding. No dates or service completions are invented. Set a **First due date** or log the real **last completed service** before alerts begin. **Done today** starts a new interval from today's actual work; an accidental entry can be deleted in Service history. Existing records are preserved and duplicate presets are skipped.

Intervals are editable and need to follow equipment instructions. ENERGY STAR recommends checking HVAC filters monthly and replacing when dirty, at least every three months ([ENERGY STAR](https://www.energystar.gov/saveathome/heating-cooling)). GE commonly recommends refrigerator water-filter replacement after six months or earlier for low flow; the four-month preset is a user preference, NOT a GE specification ([GE](https://products.geappliances.com/appliance/gea-support-search-content?contentId=21284)). Test smoke alarms monthly ([USFA](https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/smoke-alarms/index.html)). Clean dryer lint screens every load, regardless of the scheduled vent check ([CPSC](https://www.cpsc.gov/s3fs-public/5022.pdf)).

Optional version-1 maintenance fields are backward-compatible with existing local IndexedDB data and older backup files. Browser data is not automatically replaced by a GitHub Pages update.

## Local development

Requires Node.js 22+ and npm.

```bash
npm install
npm run dev
npm run test
npm run build
```

Open the Vite local URL (normally `http://localhost:5173`). The project ships with **no actual private home, repair, budget or vehicle data**. To see illustrative projects, use **Backup & data → Load demo workspace**. All demo projects and amounts are fictional, not verified prices.

## Deploy and run

The full MVP has been committed to [this repository](https://github.com/jacobmgoodnight/home-project-planner). No manual ZIP upload, `git init`, or `git push` is needed for this release.

**GitHub Pages:** This repository is public and the app is deployed through GitHub Actions. The public repository contains source code and fictional examples only; personal data stays in each browser's local storage.

1. Open **Settings → Pages → Build and deployment** and select **GitHub Actions**.
2. The included `.github/workflows/verify-deploy.yml` workflow installs dependencies, runs tests, checks TypeScript, builds the site, and deploys the `dist` directory from `main`.
3. Open `https://jacobmgoodnight.github.io/home-project-planner/` **after** the Actions deployment has completed successfully.

If the repository's private Pages option is unavailable, either use the local development/preview instructions above or explicitly decide to make the repository public. Do not publish any JSON exports or personal expense, repair, vehicle, or household details in the repository. The source contains fictional demo data only.

To create a local production build, run `npm install` and `npm run build`. For a GitHub Pages-subpath preview, set `GITHUB_PAGES=true` while building.

## Money model and important limitations

All money is stored as **integer USD cents**, with no external prices or bank access.

- **Actual spent** = sum of recorded expenses only.
- **Unpaid materials** = sum of quantity × unit price for materials **not** marked purchased.
- **Committed** = future costs marked as agreed to but not paid.
- **Future estimates** = unpaid materials + labor estimate + future items that aren't committed.
- **Contingency** = configured percentage of unpaid committed and estimated amounts.
- **Forecast** = spent + committed + future estimates + contingency.
- **Budget remaining (cash)** = budget − spent; **forecast headroom** = budget − forecast.
- **This month's planned spending** = dated future costs (including commitments) due during the current calendar month. Undated materials and labor are not included.
- **Quotes** are references, not expenses. **Marking a material purchased does not create an expense**; record it once in Actual expenses.

### Repair/purchase comparisons

`payment = principal × (APR/12) / (1 − (1 + APR/12)^(-months))`, with APR expressed as a decimal rate. A zero-APR loan uses `principal/months`. Monthly payments are rounded to cents for display and total; lender final-payment corrections may vary by a few cents. Total = cash paid today + upfront fees + other estimated future costs + all scheduled loan payments. Do **not** enter the financed principal again as cash today.

These estimates are **not** safety advice, vehicle valuation, financing approval, or a complete discounted lifetime cost comparison. Get written scope, actual loan terms, warranty and safety guidance from qualified professionals. No postponement is automatically recommended.

## Priority model

Explainable points:

| Factor | Points |
| --- | --- |
| Urgency (0–4) | 10 per level |
| Financial impact (0–4) | 4 per level |
| Importance (0–4) | 5 per level |
| Overdue / due within 7 days / within 30 days | +20 / +15 / +8 |
| Each active project blocked by this one | +5, capped at +15 |
| Budget ≤ $100 / ≤ $500 | +6 / +4 |
| Work estimate ≤ 2 hours / ≤ 8 hours | +6 / +3 |

Manual Do first / Automatic / Do later ranking groups take precedence over calculated scores. Projects are sortable by priority; the score is never generated by AI. The project dependency checkbox indicates another unfinished project is a prerequisite; it doesn't automatically change a project's completion state.

## Data safety and storage

Projects and attachment bytes are stored in browser **IndexedDB**; no server receives them. Different browsers and devices **do not sync**. IndexedDB can be cleared by browser/site-data cleanup, and on iOS PWA/browser storage may be evicted. **Export JSON backups regularly and before browser/device changes.** Restores validate version 1 shape and prompt before replacing your workspace. There is currently no automated merge or automatic backups.

Photos are resized to JPEG at up to 1400 pixels on the longest side; PDFs are limited to 2 MB. Larger image uploads may be rejected to protect local storage. Exports embed attachments as base64 and therefore can be sizable. Uploaded files should not be placed in the public Git repository.

PWA offline support caches the frontend after first successful load. On-device data is separate from that cache. If storage fails, the app visibly reports it rather than claiming a save succeeded.

## Architecture

- React 19, TypeScript, Vite 6; no component framework, state management package, backend, analytics, or shopping service.
- `src/types.ts`: version 1 data model for future schema migrations/import mapping.
- `src/logic.mjs`: independently testable calculation/policy logic.
- `src/storage.ts`: IndexedDB persistence, JSON validation/export/restore and attachment processing.
- `src/App.tsx`: compact screens and inline project editors.
- `src/demo.ts`: fictional, user-opt-in sample projects.
- `public/sw.js`: bounded same-origin offline cache.
- `tests/logic.test.mjs`: Node built-in test runner.
- `.github/workflows/verify-deploy.yml`: test/build/deploy pipeline.

No dependency on Holiday Display Blueprint; potential future import could map inventory item IDs, images and prices into materials without making Blueprint mandatory.

## Deferred

Optional Supabase synchronization, multiuser roles, banking connections, affiliate/shopping APIs, AI prioritization, push notifications, and automatic purchases. No direct integration with the user's other apps.

## Verification and data model notes

See [QA and browser acceptance checklist](docs/QA.md) and [data model for future imports](docs/DATA_MODEL.md). If you host multiple apps on `jacobmgoodnight.github.io`, remember that subpaths share a browser origin; local IndexedDB is not encrypted isolation from JavaScript hosted at other paths on that same origin.


## Replacement parts & maintenance shopping (v2)

Open Maintenance → a task → Replacement parts to save the equipment model, filter dimensions, cartridge part number/SKU, quantity per service, on-hand stock, preferred store, price and product URL. A shopping panel lists due/soon shortages, with an option to include later tasks and copy a list. Amounts are user-entered planning estimates, never actual project spending or commitments. No purchases are made.

Database snapshots now use schema version 2. Existing version-1 browser data and JSON backups are migrated in place on load/import; project information, service histories, and expenses are preserved. The IndexedDB database name is unchanged. Export a backup before major edits.


## Equipment inventory & restock (v3)

Under **Maintenance → Equipment**, save the location, manufacturer, model/serial, purchase/warranty dates and up to five compressed label photos for each appliance. The same equipment entry can be linked to multiple maintenance tasks. Equipment is not prepopulated as if owned.

Filter/service tasks keep their previous free-text equipment description and optional standalone model number. Link a task to an equipment entry in its schedule editor to reuse label photos and exact model details.

In **Replacement parts**, choose **Record restock +N** to confirm that N additional items are physically on hand. This only changes the inventory count; no expense, quote, purchase or bank transaction is generated. A completed service still does not automatically reduce inventory.

Schema v3 migrates valid v1 and v2 browser snapshots and JSON backups without dropping parts, costs, history, or dates. Equipment photos are stored locally and embedded in exported JSON (therefore backups can be larger). Export a backup before changing browsers or clearing site data.
