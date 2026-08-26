# Post-MVP Hardening Checklist — SIMANTA Frontend MVP

> Captured: 2026-06-12, by Phase 4 NO-OP documentation (Go-Live Hardening iteration)
> Source: BA Final Review 2026-06-12 (`docs/mvp/2026-06-12_phase11-ba-final-review.md`)
> Plan: `.hermes/plans/2026-06-12_161000-frontend-mvp-prd-v137-go-live-hardening.md`

## Purpose

Daftar item yang secara eksplisit di-defer dari MVP frontend setelah Phase 11 (BA verdict PASS). Item-item ini **di luar scope** iterasi Go-Live Hardening saat ini (2026-06-12) per keputusan Ojan: "asal tidak menimbulkan bottle neck" — iterasi MVP frontend sudah cukup representatif; deepening 4 item ini memerlukan effort + scope yang tidak sebanding dengan nilai langsung untuk demo stakeholder.

Iterasi berikutnya (Post-MVP) dapat mengambil checklist ini sebagai starting point.

## 4 Item Post-MVP

### 1. Admin cross-user force-logout route (`/admin/sessions`)

**Saat ini**: Tidak ada route admin untuk force-logout sesi user lain. Mock mendukung self-revoke of actor's own sessions via `forceLogoutSession(sessionId)` dan `forceLogoutAllExceptCurrent(userId)`. `canForceLogoutOtherSession` permission gate sudah di-wire di `permissions.ts:139-144` tetapi tidak ada UI page yang render cross-user revoke.

**Post-MVP scope**:
- Route baru `frontend/src/routes/admin/sessions/+page.svelte`
- Mock list semua user + sessions mereka
- Tombol "Force logout sesi ini" per session, gated by `user:force_logout` scope `all`
- Route guard: hanya role `admin_pusat` (atau sesuai PRD §7.8)
- Real-mode contract: `POST /api/v1/users/:id/sessions/:sessionId/revoke` dengan permission gate server-side

**Acceptance criteria** (Post-MVP):
- Route render dengan role gate yang benar
- Admin bisa revoke sesi user lain
- Viewer tidak bisa akses route
- Audit event `FORCE_LOGOUT` di-emit dengan `entity: 'user_session'` dan `sessionId` terisi
- E2E coverage: admin can revoke; viewer blocked; non-admin operator blocked

**Marker lokasi**: `frontend/src/lib/services/api/auth.ts:145-154` (TODO comment block)

**Mengapa di-defer (per BA Final Review #2)**:
- Out of MVP frontend scope
- Backend integration concern, bukan MVP frontend
- Menambah scope tanpa nilai demo langsung (fokus demo: audit trail, bukan admin action)
- Scope creep risk tinggi

---

### 2. Real-time basemap auto-swap on tile error

**Saat ini**: `MapContainer.svelte` punya listener `tileerror` yang memanggil `handleTileError(provider.key)` — hanya menampilkan one-time warning banner. Tidak ada debounce, threshold, atau automatic swap ke fallback provider.

**Post-MVP scope**:
- `tileerror` listener dengan debounce 5 detik
- Threshold 3 errors
- Cap 1 swap per session
- Swap ke fallback provider chain: ESRI → MapTiler → OSM
- Update `preferences.defaultBasemap` via `savePreferences` mock
- Display toast info: "Basemap otomatis diganti ke {nama} karena tile error."

**Acceptance criteria** (Post-MVP):
- Tile error 3x dalam 5 detik → swap ke fallback
- Preferences ter-update
- Toast muncul dengan copy sesuai
- Cap 1 swap/session (no infinite loop)
- E2E coverage: simulasi tile error → basemap swap + toast + preferences update

**Marker lokasi**: `frontend/src/lib/components/map/MapContainer.svelte:53-62` (TODO comment block)

**Mengapa di-defer (per BA Final Review #3)**:
- Banner fallback existing sudah representatif
- Auto-swap menambah state + risk infinite-loop jika fallback juga error
- Mitigasi masih memerlukan extra logic yang tidak esensial untuk demo

---

### 3. Atlas PDF depth (multi-page map booklet)

**Saat ini**: Atlas tile berlabel "Atlas PDF (Post-MVP depth, contract-only this iteration)" di `tools/+page.svelte:53`. Tile hanya melakukan mock job enqueue. Tidak ada mock manifest, tidak ada multi-page booklet, tidak ada per-area rendering.

**Post-MVP scope**:
- Mock manifest di `JobTemplate = 'atlas'` result: `{ coverPage, areas: [{name, bbox, pageCount}], totalPages }`
- Update `jobs.ts` mock Atlas result
- Update `tools/+page.svelte` Atlas card untuk tampilkan ringkasan manifest
- Tetap contract-first (no real PDF render) — sampai backend real PDF generation
- Frontend hanya consume manifest + tampilkan; real PDF render adalah backend concern (BullMQ + PDF library)

**Acceptance criteria** (Post-MVP):
- Manifest mock tampil di job result card
- Areas + bbox + pageCount ter-display
- Tetap no real PDF render (mock/contract-first)

**Marker lokasi**: `tools/+page.svelte:53,64-72` (existing Atlas title + Import tile block preserved as Post-MVP markers)

**Mengapa di-defer (per BA Final Review #5)**:
- Post-MVP eksplisit per BA Final Review item #5
- Tile label sudah jelas "Post-MVP depth, contract-only this iteration"
- Tidak ada stakeholder ask untuk deepen Atlas
- Real PDF generation adalah backend concern

---

### 4. Import Preview depth (multi-phase import UI)

**Saat ini**: Import Preview tile di `tools/+page.svelte:64` hanya mock two-phase (upload → preview). Tidak ada preview detail (validCount/invalidCount/fieldMapping/invalidGeometries). Tidak ada commit action dengan konfirmasi. Tidak ada staging table UI.

**Post-MVP scope**:
- Mock preview detail: `{ validCount, invalidCount, fieldMapping: [{source, target, required}], invalidGeometries: [{index, reason}] }`
- Mock `commit` action dengan konfirmasi
- Update `tools/+page.svelte` Import tile untuk tampilkan preview + commit
- Tetap contract-first (no real staging table UI)
- Frontend consume preview + tampilkan; real commit adalah backend concern (BullMQ + staging table)

**Acceptance criteria** (Post-MVP):
- Preview detail tampil (validCount, invalidCount, fieldMapping, invalidGeometries)
- Commit action dengan konfirmasi dialog
- Setelah commit, navigasi atau refresh list

**Marker lokasi**: `tools/+page.svelte:64-72` (existing Import tile block preserved as Post-MVP markers; `label: 'Mock / Contract-first'` di line 70)

**Mengapa di-defer (per BA Final Review #6)**:
- Post-MVP eksplisit per BA Final Review item #6
- Mock two-phase upload → preview sudah representatif sebagai contract
- Tidak ada stakeholder ask untuk deepen Import
- Real commit + staging table adalah backend concern

---

## Negative Scope (selalu dijaga, tidak berubah di Post-MVP)

- Tidak menambah active multi-OPD, OPD CRUD list, OPD transfer, cross-OPD filter, inter-OPD relocation
- Tidak menggantikan LPSE/SIRUP/SIPD/SP2D/finance
- Tidak menambah project-management suite: tidak ada task/resource planning, kanban vendor, approval workflow multi-level
- Tidak menambah Sub OPD/Bidang/UPT UI
- Tidak menambah reverse geocoding UI
- Tidak menambah Chart.js deepening atau materialized view dashboard stats
- Tidak membangun PostGIS spatial index/clustering
- Tidak mengklaim MinIO/signed URL/antivirus real claims
- Tidak mengklaim BullMQ real worker claims
- Tidak membangun backend Hono/Postgres/PostGIS di slice ini

## Acuan PRD

- PRD v1.3.7 §6.8 (geometry as source of truth, "belum dipetakan" state)
- PRD v1.3.7 §7.2.6 (auth endpoints)
- PRD v1.3.7 §7.8 (user management: backup codes, sessions, force-logout)
- PRD v1.3.7 §13 (Atlas export, Import)

## Prioritas iterasi Post-MVP berikutnya

Tidak ada prioritas eksplisit. 4 item dapat di-prioritaskan berdasarkan:

1. **High value, low risk**: Item 3 (Atlas) dan Item 4 (Import) — deepening mock tanpa backend integration
2. **Medium value, medium risk**: Item 1 (admin force-logout) — butuh route baru + E2E coverage
3. **Lower priority**: Item 2 (basemap auto-swap) — banner fallback sudah cukup untuk MVP

Pemilihan tergantung driver iterasi berikutnya (stakeholder ask, backend readiness, demo needs).
