# Changelog

## 2026-10-29 — Reliability, data safety and practical usability

### Reliability and security
- Service-worker cache isolation and strict fetch scope; unrelated GitHub Pages apps' caches are no longer deleted.
- Serialized revision-aware IndexedDB writes with accurate save state, Retry, failure messaging and unload protection.
- Local recovery checkpoint before destructive workspace operations; guarded restore.
- Cloud conflicts pause synchronization, display root-level record differences and allow exports of both complete versions. Cloud acceptance now requires a durable local write.
- No Supabase database or Auth changes and no snapshot schema migration.

### Everyday experience
- Lightweight global search from the existing header.
- Simpler project Plan form, collapsible advanced controls and mobile editor tabs.
- Under-$100 filter uses known remaining estimated costs; dependency cycle protection.
- Today shows optional unscheduled maintenance and parts shortages without another dashboard.
- Guided setup accepts optional real first due dates, editable month intervals, equipment links and part numbers.

### Verification
- Automated Node regression tests for caches, queue failures, cloud differences, search, costs and dependencies.
- GitHub Actions validates tests, TypeScript, and production build on PR.
- **Manual testing pending:** real Windows/iPhone sync and email sign-in, simultaneous offline edits, accessibility/320px layouts and actual storage/quota failures.

### Limitations
- Sync is optional and foreground-polling, not instantaneous background push.
- Differences are displayed at the root-record level; there is no automatic per-field conflict merge.
- Local recovery is **one** checkpoint on the same device, not historical or off-device backup.
- Existing v1/v2/v3 backups remain supported.
