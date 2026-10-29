# Acceptance checklist

## Automated checks

`npm run test` covers integer-cents costs, avoiding double-counting, fixed-rate/zero-rate payments, missing financing terms, priority overrides, deadline/dependency factors, local-day behavior and maintenance history/due dates.

`npm run typecheck:logic` validates TypeScript domain, storage and demo modules.

`npm run build` checks full React/TypeScript types and produces the GitHub Pages app. It must be run with dependencies installed; the source package was prepared without access to the npm registry, so this step is a required verification on GitHub Actions.

## Browser/device manual QA

- [ ] Fresh install opens empty; sample records appear only after loading demo workspace.
- [ ] Create and edit projects on iPhone-sized viewport; reload and verify values persist.
- [ ] Change project priority sliders and override; verify ranking explanation and filters.
- [ ] Block project A on project B and verify A is withheld from actionable overview until B completes.
- [ ] Add tasks, dates, phases, check tasks off; verify progress and next action.
- [ ] Add material, mark purchased, log actual expense, ensure no double count.
- [ ] Enter future costs with dates, verify current-month spending and commitments.
- [ ] Add quotes and decision options, verify 0% and nonzero APR and disclosures.
- [ ] Add small photo and PDF, export JSON; restore and verify file downloads work.
- [ ] Reject invalid JSON backup; cancel restore leaves current data unchanged.
- [ ] Add maintenance, log service date/usage, check due date and warranty.
- [ ] Test standalone PWA and offline reload after a successful first online visit.
- [ ] Test empty data, 320px viewport, VoiceOver navigation and keyboard focus.

## Known boundaries

No cross-device sync, external reminders, permission model, live price checks or automation. Data stored in the shared `jacobmgoodnight.github.io` browser origin: code served from other paths under the same origin has browser-origin access to IndexedDB, so only host trusted apps there and do not treat this as encrypted vault storage.
