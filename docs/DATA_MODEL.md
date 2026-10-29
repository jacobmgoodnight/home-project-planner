# Data model — current v3

The browser stores a **single version 3 snapshot** in IndexedDB under database name `home-project-planner-v1` (the IDB name intentionally stays constant through data migrations).

```ts
interface Database {
  version: 3;
  demo: boolean;
  projects: Project[];
  maintenance: MaintenanceItem[];
  equipment: EquipmentItem[];
}
```

## Projects

Each project has a stable UUID, category, status, timestamps, priority scoring factors/override, target date, dependency IDs, next action, estimated hours, budget/forecast inputs, and arrays of tasks, materials, actual expenses, future costs, quotes, repair/replace options and attachments.

Money values are stored as **integer USD cents**. An entered expense is actual spending; a quote, unpurchased material or future cost is not actual spending. Project and maintenance cost logs are independent and may refer to the same payment.

## Maintenance

Each maintenance record has a stable ID, optional `equipmentId` and `projectId`, a category and free-text asset/model, a configurable day/month/hour interval, optional user-entered first due date, warranty date, optional starter-template key, and service entries.

A service entry stores the actual date, optional hours/mileage, recorded cost, notes, and optionally selected used supplies, whether on-hand stock was deducted, and a local photo/PDF receipt.

Replacement supplies track name, dimensions, SKU, quantity per service, on-hand stock, optional user-selected minimum stock, entered unit price, store, product link and notes. No service automatically logs purchase spending; inventory deduction is a separate explicit choice.

## Equipment

Equipment entries carry stable IDs, name, room/location, manufacturer, model, serial number, purchase date, warranty expiry, notes, up to five compressed label photos, and optional locally saved PDF/image manuals. Maintenance tasks refer to equipment by ID and are unlinked (not deleted) when an equipment entry is removed.

All attachment records contain an ID, display name, MIME type, data URL and date. Embedded attachment content can increase JSON/cloud snapshot size considerably.

## Migration and transfer

`src/maintenance-support.mjs` upgrades valid **v1 → v2 → v3** and **v2 → v3** snapshots. Current imports validate the resulting v3 snapshot, including links to existing equipment IDs. JSON backups can be up to 60 MB at import; current cloud snapshots are limited to around 20 MB.

Manual JSON transfer supports **replace all** or **merge only records with new root IDs**. Existing records with matching IDs are not automatically merged or overwritten; conflicts are reported. This is not a full record-level reconciliation algorithm.

## Optional household sync

The Supabase database has a separate, owner-approved `hpp_*` namespace inside an existing shared project:
- `hpp_households`: household ID and owner
- `hpp_members`: explicit authenticated members with owner/member roles
- `hpp_snapshots`: **one JSON snapshot per household** with revision and update metadata
- `hpp_invites`: hashed one-use invite codes with expiry

Row-level security protects reads. Authenticated clients **cannot directly INSERT/UPDATE** these tables; checked RPCs create homes, redeem owner-created invitations, list/revoke member access and write snapshots using expected-revision compare-and-swap. Only the **publishable key** is present in frontend source.

After explicit household binding, the browser tracks the cloud revision/hash locally and checks for remote changes while the app is open. It automatically downloads when local is unchanged; uploads when cloud revision is unchanged; and **pauses for review if both changed**. This is household snapshot sync, not row-by-row conflict resolution or a full historical backup service.

**Browser-origin caveat:** the other apps on the same `jacobmgoodnight.github.io` origin share a web security origin. Local IndexedDB and stored sessions are not a cryptographically isolated vault from any other script served under that origin.

Potential external imports (e.g., Holiday Display Blueprint) require explicit user approval and provenance/deduplication; they do not occur automatically.

## Local recovery and synchronization reliability (October 29, 2026)

The IndexedDB `snapshots` object store continues to hold the primary v3 record under key `main`. One optional local **recovery checkpoint** (the same validated v3 shape) is saved under `previous-workspace` before a destructive restore, workspace clear, demo load or incoming cloud replacement. No schema version change or extra database is required. Restoring this previous copy also pauses cloud sync; on restoration the formerly current copy replaces the recovery slot. A checkpoint isn't a historical revision log and may be unavailable if storage is full.

`src/save-queue.mjs` serializes writes to `main` and tracks the latest enqueued/committed revision. Older completions cannot display a misleading latest-save status; errors leave an unsaved warning until a newer write succeeds. `src/sync-diff.mjs` analyzes existing root records only and does not merge diverged records. The actual cloud JSON is written locally before its revision is accepted. Cloud and local backup size limits remain unchanged.
