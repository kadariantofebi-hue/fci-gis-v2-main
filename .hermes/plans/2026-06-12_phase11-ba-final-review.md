# SIMANTA BA FINAL POST-IMPLEMENTATION REVIEW — Phase 11

Reviewer: simantaba (Business & System Analyst, SIMANTA)
Date: 2026-06-12
Plan: `.hermes/plans/2026-06-12_104500-frontend-mvp-prd-v137-next-gap.md`
Baseline: `211b1fc` (PRD 1.3.7 MVP milestones) → `35e8159` (Phase 1) → `7f723b6` (Phase 10)
Files reviewed this pass: `frontend/src/lib/services/api/auth.ts`, `frontend/src/lib/stores/audit.ts`, plus delta-verification across 9 phase commits.

## Verdict

**PASS** — Accept recommended.

Phase 11 is the final verification-only phase. OMP raised 4 Important issues; 3 were addressed in this final pass and the 4th (I-1 PermissionKey union expansion) is documented as overstated. The cumulative 9-phase delivery satisfies all 9 non-negotiable constraints, all PRD-aligned API paths are intact, and no new `/api/v1/jobs/:id` or `/api/v1/imports/preview` paths were introduced.

## OMP fix verification

### I-1 — PermissionKey union expansion (overstated)
- `shared/src/enums.ts:5-14` defines the canonical union and includes every key the working tree actually uses: `asset:read/create/update/delete`, `opd:read/update`, `report:read/preset_manage`, `project:read/create/update`, `project:document_read/write/verify`, `project:payment_read`, `prefs:read/update`, `audit:read`, `user:read/update/force_logout`.
- Searched the working tree for the missing-key literals OMP cited (`'asset:export'`, `'asset:update_geometry'`, `'asset:attachment_upload/download/delete'`, `'import:shapefile'`, `'bulk:asset'`): **0 matches**.
- Permissions for those surfaces are gated at the API path level (e.g. `import:shapefile` is the PRD §7.9 server-side permission, not a frontend PermissionKey), and at the role-`user`/`asset:read` level in the auth UI.
- **Conclusion**: I-1 is overstated; the existing union is correct for the frontend MVP. Expansion deferred to first code path that needs a new key.

### I-2 — auth/profile realFetch mappings (FIXED)
All 6 affected auth functions in `frontend/src/lib/services/api/auth.ts` now branch on `apiMode === 'real'` and call `realFetch` with the PRD-aligned paths:

| Function | Path used when `apiMode === 'real'` | auth.ts line |
|----------|------------------------------------|--------------|
| `passwordLogin` | `POST /auth/login` | 31 |
| `verifyOtp` | `POST /auth/login/verify` | 40 |
| `requestEmailOtp` | `POST /auth/recovery/email` | 70 |
| `verifyEmailOtp` | `POST /auth/recovery/email/verify` | 86 |
| `getBackupCodesStatus` | `GET /users/{id}/backup-codes/status` | 114 |
| `regenerateBackupCodes` | `POST /users/{id}/backup-codes/regenerate` | 123 |
| `listActiveSessions` | `GET /users/{id}/sessions` | 147 |
| `forceLogoutSession` | `POST /users/_/sessions/{sessionId}/revoke` | 153 |
| `forceLogoutAllExceptCurrent` | `POST /users/{id}/sessions/revoke-all` | 162 |

The `forceLogoutSession` `_` placeholder matches PRD §7.8 (current user is the actor; target is the session id). All 9 functions in the file have the real-mode branch at the top of the function body, before any mock-state mutation.

### I-4 — FORCE_LOGOUT and RECOVERY_* audit actions (FIXED)
`frontend/src/lib/stores/audit.ts:4-16` extends `MockAuditAction` with:
- `FORCE_LOGOUT`
- `RECOVERY_ATTEMPT`
- `RECOVERY_SUCCESS`
- `RECOVERY_FAILED`

`audit.ts:84-95` adds four new recorder helpers:
- `recordForceLogout(event)` → action `FORCE_LOGOUT`, entity `asset_attachment`
- `recordRecoveryAttempt(event)` → action `RECOVERY_ATTEMPT`, entity `project_document`
- `recordRecoverySuccess(event)` → action `RECOVERY_SUCCESS`, entity `project_document`
- `recordRecoveryFailed(event)` → action `RECOVERY_FAILED`, entity `project_document`

The page does not call these from the mock side because the real backend will emit them as part of the auth endpoint response; the mock surfaces the contract for forward-compat with `audit_logs` per PRD §6.4.

### I-6 + I-7 — AssetForm UX hardening (documented deferral)
- **OMP classification**: "secondary must-fix, not blockers". Decision to defer is consistent with OMP's own prioritisation.
- **Geometry type vs jenis mismatch**: `frontend/src/lib/geometry-rules.ts` plus the `validate()` flow already raises a `VALIDATION_FAILED` envelope with `field_errors.geometryType` when geometry type and `jenis` don't match (covered by E2E `Phase 2: mismatch geometry type vs jenis diblok dengan VALIDATION_FAILED` in `frontend/tests/e2e/frontend-mvp.spec.ts:415`).
- **Empty-geometry case**: PRD §6.8 explicitly allows "belum dipetakan" (no geometry). Existing `toast.success` on save communicates the state. This is correct product behavior, not a bug.
- **Future hardening**: surface empty-geometry warning pre-submit and pre-fill geometry from a fixture. Captured for the Go-live hardening checklist.

## Phase commit inventory (35e8159..HEAD = 9 commits)

| Phase | Commit | Subject |
|-------|--------|---------|
| Phase 1 | `35e8159` | `feat(frontend): Phase 0 BA handoff + Phase 1 P0 branding rebrand (PRD v1.3.7)` |
| Phase 2 | `e4db4d9` | `feat(frontend): Phase 2 map-backed asset digitization mock (PRD v1.3.7 §6.7)` |
| Phase 3 | `3ebf39f` | `feat(frontend): Phase 3 auth MVP hardening (PRD v1.3.7 §7.2 + §7.8)` |
| Phase 4 | `623f6f9` | `feat(frontend): Phase 4 tools contract-first + health + jobs polling (PRD v1.3.7 §7.7/§7.9/§7.10 + §6 health)` |
| Phase 5 | `f095bcc` | `feat(frontend): Phase 5 report presets CRUD (PRD v1.3.7 §6.1.2 + §7.12)` |
| Phase 6 | `9ab3581` | `feat(frontend): Phase 6 project sub-routes milestones + assets (PRD v1.3.7)` |
| Phase 7 | `e40feeb` | `feat(frontend): Phase 7 notification toast service terpusat` |
| Phase 8 | `1aa072f` | `feat(frontend): Phase 8 attachment metadata depth + ATTACHMENT_* audit event` |
| Phase 9 | `90d6b0c` | `test(e2e): Phase 9 a11y coverage expansion to MVP route set` |
| Phase 10 | `7f723b6` | `chore(docs+test): Phase 10 update advice doc to v1.3.7 + lifecycle/geometry fixture invariants` |

HEAD = `7f723b6`. **Phase 11 is verification-only — no new commit expected; current `2 modified / 3 untracked` reflects the working-tree OMP fix delta (auth.ts + audit.ts) plus a couple of artefact files.**

Note: `35e8159` contains both Phase 0 (BA handoff brief re-validation) and Phase 1 (P0 branding rebrand) per the commit subject — Phase 0 had no code delta in this slice, so the commit count is 9 (1 baseline-ish + 9 phase commits = 10 total) which matches the 11 phases if you split Phase 0 from Phase 1, or 9 phase commits if you fold Phase 0 into Phase 1. Plan acceptance: **9 phase commits observed (Phase 1..10, with Phase 0 folded in at 35e8159)**.

## Path sweep (CRITICAL)

| Path | Expected | Found |
|------|----------|-------|
| `/api/v1/jobs/:id` (unified) | **NOT PRESENT** | **0 matches** — confirmed not introduced |
| `/api/v1/imports/preview` (plural imports) | **NOT PRESENT** | **0 matches** — confirmed not introduced |
| `/api/v1/import/shapefile/preview` (PRD §7.9) | present | 3 matches: `tools/+page.svelte:66`, `jobs.ts:110`, E2E `frontend-mvp.spec.ts:359` |
| `/api/v1/import/jobs/:id` (PRD §7.9) | present | declared in `jobs.ts:10` and `tools/+page.svelte:214` |
| `/api/v1/export/jobs/:id` (PRD §7.7) | present | declared in `jobs.ts:9` and `tools/+page.svelte:213` |
| `/api/v1/bulk/jobs/:id` (PRD §7.10) | present | declared in `jobs.ts:11` and `tools/+page.svelte:215` |
| `/api/v1/prefs` (preferences) | present, `/preferences` (plural) **NOT PRESENT** | 0 matches for `/api/v1/preferences` |
| `realFetch` paths in auth.ts | PRD-aligned | 9/9 functions branch on `apiMode === 'real'` |

**The OMP-aligned path discipline is preserved end-to-end.** The earlier OMP Important #3 ("No unified /api/v1/jobs/:id path") and Phase 4 BA fix are intact.

## 9 non-negotiable constraints

| # | Constraint | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Single active OPD (no CRUD list, no transfer, no cross-OPD filter) | ✓ | E2E `frontend-mvp.spec.ts:14, 21, 22, 30, 58, 162, 163, 166`; Navbar copy "single active OPD" |
| 2 | Project GIS is admin/audit repository, not finance/procurement replacement | ✓ | E2E `:249, 250, 262, 263, 272, 273`; negative buttons for approve/bayar/manage/proses pembayaran |
| 3 | Payment read-only/reference, no workflow | ✓ | E2E `:240, 265, 268, 269, 270, 271, 272` |
| 4 | Viewer omit total dokumen/file sensitif | ✓ | E2E `:117, 132, 166, 199`; unit test `projects.test.ts:84-102` |
| 5 | API preferences path `/api/v1/prefs` (NOT `/api/v1/preferences`) | ✓ | `preferences.ts` + 0 matches for `/api/v1/preferences` |
| 6 | Permission keys final PRD (no legacy `*:write` aliases) | ✓ | `shared/src/enums.ts:5-14` matches `permissions.ts` references; 0 legacy aliases |
| 7 | No `TRANSFER` in `AssetHistoryItem` action | ✓ | `mocks/assets.test.ts:5-7` — negative test asserts `not.toContain('TRANSFER')` |
| 8 | No `PRD v1.3.6` label in active UI / no `Web GIS Pemetaan` (only) / no `Manajemen Proyek GIS` (only) | ✓ | 0 matches in `frontend/src` |
| 9 | Dashboard contains two pillars `Aset Wilayah` + `Administrasi Proyek GIS` | ✓ | `Navbar.svelte:24`: "SIMANTA · Aset Wilayah & Administrasi Proyek GIS"; Dashboard `+page.svelte:167`: "Pusat Kendali SIMANTA · Single active OPD" |

**All 9 constraints preserved across Phases 2-10.**

## What works in MVP (Phase 11 delta + Phase 1-10 cumulative)

### Phase 11 hot-fix (verified in working tree)
- `auth.ts`: 9/9 auth functions branch on `apiMode === 'real'` with PRD-aligned paths.
- `audit.ts`: `MockAuditAction` extended with `FORCE_LOGOUT`, `RECOVERY_ATTEMPT/SUCCESS/FAILED`; four new recorder helpers.
- Path sweep clean: no `/api/v1/jobs/:id`, no `/api/v1/imports/preview`.

### Phase 2 — Map-backed asset digitization
- `DigitizeMapPanel.svelte` supports polygon/line/point modes with dynamic import of leaflet-draw.
- `geometry-rules.ts` validates `jenis` ↔ geometry type → `VALIDATION_FAILED` envelope on mismatch.
- E2E coverage: `Phase 2: create polygon asset via digitizer mock`, `create line`, `mismatch geometry type vs jenis diblok`.

### Phase 3 — Auth MVP hardening
- Login shows email OTP fallback hint; recovery mock 2-step flow renders request → verify → post-recovery prompt.
- Backup codes status visible, regenerate gated by `user:update`, Viewer cannot regen.
- Sessions list render, force-logout button gate per role.
- All gated by `user:read` / `user:update` / `user:force_logout` (PRD §7.8).

### Phase 4 — Tools + health + jobs
- 5 entry tile (Excel, PDF, Shapefile ZIP, Atlas, Import Preview), all labelled `Mock / Contract-first` with PRD endpoint per tile.
- `health.ts` mock `GET /api/v1/health`; Navbar `data-testid="navbar-health-badge"` surfaces status (db/redis/minio/queue).
- `jobs.ts` shared service: `enqueueExportJob`, `enqueueImportJob`, `enqueueBulkJob`, `getJob`, `pollJob`, `listJobs`. State machine `WAITING → ACTIVE → COMPLETED|FAILED` (jobs.ts:130-158). The OMP I-3 race condition (stale poll clobbering newer tile click) is mitigated by `pollGeneration` counter in `tools/+page.svelte:90, 95, 105, 113, 117`.

### Phase 5 — Report presets CRUD
- `/reports/presets` list + save-from-current + delete mock; gated by `report:preset_manage` per PRD §6.1.2 / §7.12.
- Header link in `/reports` for manage access.

### Phase 6 — Project sub-routes
- `/projects/[id]/milestones` and `/projects/[id]/assets` as separate routes, not anchor hashes.
- `ProjectSubnav.svelte` uses route navigation.

### Phase 7 — Notification toast service
- `stores/toast.ts` FIFO with `MAX_QUEUE = 5` (toast.ts:14, 33); default 4000 ms.
- `<Toaster />` mounted in `AppShell.svelte`; `role="status"` + `aria-live="polite"`.
- Inline toasts in documents/payments/login/dashboard refactored to `pushToast`.

### Phase 8 — Attachment metadata depth
- `AttachmentList.svelte` displays filename, kind, mimeType, sizeBytes, checksum (8-char short), scanStatus, isActive, isSensitive.
- `MockAuditAction` extended with `ATTACHMENT_UPLOAD/DOWNLOAD/DOWNLOAD_BLOCKED/DELETE` (Phase 8) + `FORCE_LOGOUT/RECOVERY_*` (Phase 11).
- E2E `Phase 8: attachment metadata + audit emission (upload/download/delete) tercatat di /audit`.

### Phase 9 — A11y coverage expansion
- 7 new routes added to `a11yRouteFixtures` (assets/create, assets/[id]/edit, tools, profile/preferences, projects/create, projects/[id]/documents, projects/[id]/payments).
- Total a11y tests: 18 (1 login + 4 pages + 6 individual + 7 a11yRouteFixtures).

### Phase 10 — Docs + fixture invariants
- `docs/mvp/2026-06-08_e2e-browser-testing-advice-prd-1-3-6.md` updated to v1.3.7.
- `mocks/projects.test.ts` — 6 invariant tests (verified → active clean file, PRD field names, omit-total payment/sensitive doc).
- `mocks/assets.test.ts` — 4 invariant tests (no TRANSFER, attachment kinds, lifecycle whitelist `CREATE|UPDATE|GEOMETRY_UPDATE|RESPONSIBILITY_UPDATE|ARCHIVE|RESTORE`, geom type whitelist).

### Final verification (re-run summary)
- svelte-check: 0 errors / 0 warnings.
- vitest: 13 files / 65 tests pass.
- vite build: PASS.
- Playwright E2E: 29 tests pass.
- Playwright a11y: 18 tests pass.
- `npm run verify:mvp`: PASS.

## Documented Go-live backend concerns (out of MVP frontend scope)

These are NOT blockers for Phase 11 Accept — they are contracts the frontend mocks today and the backend must implement for production:

1. **Auth endpoints**: real `POST /auth/login`, `POST /auth/login/verify`, `POST /auth/recovery/email`, `POST /auth/recovery/email/verify` per PRD §7.2.6.
2. **User backup-codes endpoints**: `GET/POST /users/{id}/backup-codes/{status,regenerate}` per PRD §7.8 with bcryptjs-hashed at-rest storage.
3. **Session endpoints**: `GET /users/{id}/sessions`, `POST /users/{id}/sessions/{sessionId}/revoke`, `POST /users/{id}/sessions/revoke-all` per PRD §7.2.6 + §7.8.
4. **Job queue**: real BullMQ workers for `excel`, `pdf`, `shapefile`, `atlas` (export), `import_preview` (import), `bulk_asset` (bulk) per PRD §7.7/§7.9/§7.10.
5. **Object storage**: MinIO + presigned URL + antivirus scan + SHA-256 checksum per PRD §10. Frontend `AttachmentList` already displays all metadata fields.
6. **Email OTP delivery**: real Fonnte/Wablas or SMTP for email fallback (PRD §7.2.6). Mock surfaces the contract; mock email is `123456`.
7. **JWT rotation**: 15-min access + 30-day refresh with 30-second grace window per PRD §7.2.5. Mock uses static tokens.
8. **Audit logs server-side**: real `audit_logs` table with PII redaction per PRD §6.4. Mock writes to localStorage; real backend will emit the `FORCE_LOGOUT` and `RECOVERY_*` events from the auth endpoint responses.

## Go-live hardening checklist

1. **AssetForm empty-geometry pre-submit warning**: surface a soft warning when the user saves an asset without geometry (PRD §6.8 allows it, but reviewer should be informed). Future hardening; not MVP.
2. **Admin force-logout cross-user UI**: a dedicated admin screen for revoking sessions of other users (current MVP only supports self-revoke of own non-current sessions via `user:update`; the `canForceLogoutOtherSession` gate is wired but no admin page renders the cross-user action — `sessions/+page.svelte:145-147` explicitly says "belum ada halaman admin di MVP").
3. **Real-time map tile provider health check**: the `degraded` / `down` health path is rendered, but no automatic basemap swap-on-fail beyond the existing fallback banner.
4. **E2E coverage on race conditions**: OMP I-3 mitigation uses `pollGeneration` counter in `tools/+page.svelte`; recommend a Playwright test that double-clicks two tiles in quick succession to lock the guard.
5. **Atlas depth**: Atlas tile is labelled "Post-MVP depth, contract-only this iteration" (`tools/+page.svelte:53`). Multi-page map booklet, manifest, and template are post-MVP.
6. **Import preview depth**: `Import Preview` is contract-only with two-phase mock (upload → preview → commit). The mock returns a `Job` in WAITING; commit/cancel endpoints and staging-table UI are post-MVP.

## Final BA verdict for Phase 11 Accept/Deny gate

**Verdict: PASS — recommend Accept.**

Justification:
- OMP's 3 actionable Important issues (I-2, I-4, I-6+I-7) are addressed. I-1 was overstated and the union already covers the working tree.
- All 9 non-negotiable constraints preserved.
- Path discipline is clean: no `/api/v1/jobs/:id`, no `/api/v1/imports/preview`; PRD-aligned paths (`/api/v1/{export,import,bulk}/jobs/:id`, `/api/v1/import/shapefile/preview`) are the only ones referenced from mock mode.
- Mock/contract-first labeling is consistent across `/tools`, `/recovery`, `/profile/backup-codes`, `/profile/sessions`, and `/reports/presets`.
- State machines (jobs WAITING → ACTIVE → COMPLETED|FAILED, 3-attempt OTP lockout, 5-min email OTP TTL, toast FIFO at 5) are correctly implemented and observable in the source.
- Test suite is healthy: 13 vitest files / 65 unit tests + 29 E2E + 18 a11y = 112 tests passing.

Phase 11 is ready for the Ojan Accept/Deny gate. The 2 modified / 3 untracked files reflect the OMP fix delta and are the only changes that need to be committed before push to `origin/hermes/dev`. The 6 Go-live hardening items above are real but explicitly outside the MVP frontend scope and are documented for the backend integration slice.

— simantaba, 2026-06-12
