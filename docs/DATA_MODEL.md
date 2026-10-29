# Data model v1 and future integrations

The root IndexedDB snapshot is `{version: 1, demo, projects, maintenance}`.

Project: `id`, `name`, `category`, `status`, `nextAction`, `targetDate`, `estimatedHours`, `budgetCents`, `laborEstimateCents`, `contingencyPercent`, priority fields, `blockedBy[]` project references, `tasks[]`, `materials[]`, `expenses[]`, `futureCosts[]`, `quotes[]`, `options[]`, `attachments[]`, creation/update stamps.

Money values are integer USD cents, percent values are decimal numbers, and date-only values use local `YYYY-MM-DD` strings. Stable UUIDs prevent importing order-dependent IDs.

Materials contain user-entered quantities/prices; receipts are `attachments` and actual payments are `expenses`. Future costs have `dueDate` for calendar projections and `committed` for agreed-but-unpaid obligations. Quotes are informational references and cannot silently alter forecasts. Decision options separately store borrowed principal and cash paid today.

Maintenance records can link optionally to a project, but remain independent. Each has service entries and interval days/usage. Future integration could map a Holiday Display Blueprint item to a material with an optional provenance record `{sourceApp:'holiday-display-blueprint', sourceId, importedAt}`. Do not require that application or ingest its data automatically.

Backup imports should remain versioned. Changing any required object field requires a migration path or an explicit compatible parser; never silently overwrite unsupported backups.
