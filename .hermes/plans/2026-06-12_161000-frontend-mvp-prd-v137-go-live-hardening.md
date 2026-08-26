# Plan: Gap Frontend MVP SIMANTA terhadap Main PRD v1.3.7 — Iterasi Go-Live Hardening

Tanggal: 2026-06-12
Mode: Plan only (no execution). Mengikuti skill `software-development/plan` v1.0.0.
Target workspace: `C:/projects/fci/fci-gis`
Canonical PRD: `docs/PRD_WebGIS_Pemetaan_Wilayah.md` v1.3.7 (Juni 2026)
HEAD: `a739750 chore(repo): gitignore .bob/ + archive Phase 11 plan & BA review`
Plan sebelumnya: `.hermes/plans/2026-06-12_104500-frontend-mvp-prd-v137-next-gap.md`
BA Final Review sebelumnya: `.hermes/plans/2026-06-12_phase11-ba-final-review.md` (verdict: **PASS — recommend Accept**)

## Goal

Menyusun pekerjaan frontend MVP iterasi berikutnya — iterasi **Go-Live Hardening** — berdasarkan:

1. **6 Go-Live Hardening items** yang secara eksplisit didokumentasikan oleh `simantaba` di BA Final Review (2026-06-12) sebagai "out of MVP frontend scope" tapi real concern untuk integrasi backend.
2. **2 follow-up bug** yang ditemukan saat re-inspeksi read-only terhadap working tree pasca-Phase 11:
   - Audit page (`/audit`) tidak merender `assetId` / `attachmentId` untuk event ATTACHMENT_* (Phase 8) dan FORCE_LOGOUT/RECOVERY_* (Phase 11). Page hardcode render `projectId / documentId / fileId` saja.
   - Dashboard tidak mengekspos stat "Jumlah aset belum dipetakan" yang disebut eksplisit di PRD §6.8 (saat ini `dashboardStats()` ada, tapi stat tanpa-geometri tidak dihitung).
3. **1 mapping issue**: event audit `FORCE_LOGOUT` di `frontend/src/lib/stores/audit.ts:85` menggunakan `entity: 'asset_attachment'` (copy-paste dari helper `recordAttachmentDelete`), padahal entity yang benar adalah sesi user (saat ini `MockAuditEntity` union hanya punya `project_document` | `project_document_file` | `asset_attachment` — `user_session` belum ada).

Iterasi ini **bukan** ekspansi scope, melainkan **penguatan** area yang sudah representatif agar siap untuk demonstrasi stakeholder dan integrasi backend. Negative scope tetap sama dengan iterasi sebelumnya (Single Active OPD permanen, Administrasi Proyek GIS audit/admin repository, payment read-only/reference, no LPSE/SIRUP/SIPD/SP2D replacement, no TRANSFER, no project-management suite).

## Current context / asumsi

### Sumber yang diinspeksi read-only

- `docs/PRD_WebGIS_Pemetaan_Wilayah.md` v1.3.7 (fokus §6.8 empty-geometry, §7.2 + §7.8 auth, §10 audit, §11 Project GIS, §12 dashboard stats, §13 reports)
- `.hermes/plans/2026-06-12_104500-frontend-mvp-prd-v137-next-gap.md` (plan iterasi 1)
- `.hermes/plans/2026-06-12_phase11-ba-final-review.md` (BA verdict + Go-Live checklist)
- `git log --oneline -20` (HEAD: `a739750`; phase commits `35e8159`..`7f723b6`; OMP hotfix `c3ca67e`)
- `frontend/src/routes/dashboard/+page.svelte` (327 baris; Pilar 1/2 ada, tapi stat tanpa-geometri tidak diekspos)
- `frontend/src/routes/audit/+page.svelte` (3 baris, hardcoded render `projectId / documentId / fileId`)
- `frontend/src/lib/stores/audit.ts` (union 12 action; `entity: 'asset_attachment'` pada FORCE_LOGOUT inkonsisten)
- `frontend/src/lib/components/crud/AssetForm.svelte` (tabs Peta/GeoJSON; tidak ada pre-submit warning untuk empty geometry)
- `frontend/src/lib/components/crud/AttachmentList.svelte` (mock upload/download/delete dengan audit)
- `frontend/src/lib/geometry-rules.ts:51` (return `{valid: true}` untuk `!geom` — PRD §6.8 compliant, tapi tidak ada UI surface)
- `frontend/src/lib/services/api/assets.ts:100` (`dashboardStats()` ada, hitung per-jenis dan total, tapi tidak expose `tanpaGeometri`)

### Yang sudah representatif terhadap PRD v1.3.7 (preserve)

| # | Constraint / capability | Evidence |
|---|------------------------|----------|
| 1 | Single Active OPD permanen (no CRUD list, no transfer, no cross-OPD filter) | E2E `frontend-mvp.spec.ts:14, 21, 22, 30, 58, 162, 163, 166` |
| 2 | Project GIS = admin/audit repository, bukan finance/procurement | E2E `:249, 250, 262, 263, 272, 273` |
| 3 | Payment read-only/reference, no workflow | E2E `:240, 265, 268, 269, 270, 271, 272` |
| 4 | Viewer omit-total dokumen/file sensitif | E2E `:117, 132, 166, 199`; `projects.test.ts:84-102` |
| 5 | API preferences path `/api/v1/prefs` (bukan `/api/v1/preferences`) | `preferences.ts` + 0 matches untuk `/api/v1/preferences` |
| 6 | Permission keys final PRD, no legacy `*:write` alias | `shared/src/enums.ts:5-14` matches `permissions.ts`; 0 alias legacy |
| 7 | No `TRANSFER` di `AssetHistoryItem` action | `mocks/assets.test.ts:5-7` negative test |
| 8 | No `PRD v1.3.6` / `Web GIS Pemetaan` (only) / `Manajemen Proyek GIS` (only) | 0 matches di `frontend/src` |
| 9 | Dashboard dua pilar `Aset Wilayah` + `Administrasi Proyek GIS` | `Navbar.svelte:24`; `dashboard/+page.svelte:167` |
| 10 | Map-backed asset digitization (polygon/line/point) | `DigitizeMapPanel.svelte`; E2E Phase 2 |
| 11 | Auth MVP hardening (backup codes, sessions, force-logout) | `recovery`, `backup-codes`, `sessions` route mock; `auth.ts` real-mode branch |
| 12 | Tools contract-first (5 tile) + health service + shared jobs polling | `tools/+page.svelte`; `jobs.ts`; `health.ts` + Navbar badge |
| 13 | Report presets CRUD minimal | `reports/presets/+page.svelte`; gated by `report:preset_manage` |
| 14 | Project sub-routes `milestones` + `assets` | `ProjectSubnav.svelte` route-based; 2 sub-route |
| 15 | Toast service terpusat | `stores/toast.ts`; `<Toaster />` di `AppShell.svelte`; refactored inline toasts |
| 16 | Attachment metadata depth + ATTACHMENT_* audit | `AttachmentList.svelte`; `audit.ts` (4 attachment actions) |
| 17 | A11y coverage expansion (18 tests) | `a11y.spec.ts`; 7 route baru ditambah |
| 18 | Advice doc + fixture invariants | `docs/mvp/2026-06-08_e2e-browser-testing-advice-prd-1-3-6.md` di-rename v1.3.7; `mocks/{projects,assets}.test.ts` invariants |

**Test suite baseline**: 13 vitest files / 65 unit tests + 29 Playwright E2E + 18 a11y = **112 tests passing** (per BA Final Review). `npm run verify:mvp` PASS penuh.

## Resolved decisions from previous iteration (FROZEN)

Keputusan dari iterasi 1 (plan 2026-06-12_104500) yang **tidak boleh dilonggarkan atau dilawan**:

1. **Dashboard branding**: `Dashboard Aset & Proyek GIS` (jangan ubah ke wording lain).
2. **Project module heading**: `Administrasi Proyek GIS` (bukan `Manajemen Proyek GIS` saja).
3. **Payment page**: `Riwayat Pembayaran` dengan copy read-only yang tegas "arsip referensi, bukan workflow pembayaran resmi" — tetap, jangan aktifkan tombol approve/bayar/proses.
4. **Viewer omit-total**: untuk dokumen/file sensitif, **OMIT TOTAL** (bukan masking). Helper permission sudah di unit-test di `projects.test.ts:84-102`.
5. **API preferences path**: mock dan real-mode **harus** `/api/v1/prefs` (bukan `/api/v1/preferences`).
6. **Permission keys final**: gunakan whitelist di `shared/src/enums.ts:5-14` (tidak ada alias legacy `*:write`).
7. **No TRANSFER**: lifecycle asset action **tidak** boleh mengandung `TRANSFER` (covered `mocks/assets.test.ts:5-7`).
8. **No PRD v1.3.6**: tidak boleh ada label `PRD v1.3.6`, `Web GIS Pemetaan Wilayah` saja, atau `Manajemen Proyek GIS` saja di UI aktif.
9. **Single Active OPD guards**: tidak ada multi-OPD, OPD CRUD list, OPD transfer, cross-OPD filter, inter-OPD relocation di iterasi manapun.
10. **Tool/Atlas/Import posture**: Atlas PDF dan Import Preview adalah **contract-only** di iterasi 1 (eksplisit Post-MVP depth). Iterasi ini hanya boleh memperdalam jika Ojan secara eksplisit memilih opsi deepen; default-nya tetap contract-only.
11. **Audit event union**: real backend akan emit `FORCE_LOGOUT` dan `RECOVERY_*` dari response endpoint auth (PRD §7.2.6 + §7.8). Mock frontend hanya expose contract di union; real emission adalah server-side.
12. **Path discipline**: tidak boleh ada `/api/v1/jobs/:id` (unified) atau `/api/v1/imports/preview` (plural). Path PRD resmi (`/api/v1/{export,import,bulk}/jobs/:id`, `/api/v1/import/shapefile/preview`) adalah satu-satunya referensi.

## Ringkasan gap prioritas (residual only)

### P0 — Follow-up bug yang menurunkan akurasi audit & dashboard

1. **Audit page tidak merender event ATTACHMENT_* / FORCE_LOGOUT / RECOVERY_***
   - **Symptom**: `frontend/src/routes/audit/+page.svelte:3` (satu baris Svelte) hardcode render `${event.projectId} / ${event.documentId}{event.fileId ? ` / ${event.fileId}` : ''}`. Untuk event dari Phase 8 (`ATTACHMENT_UPLOAD/DOWNLOAD/DOWNLOAD_BLOCKED/DELETE`) dan Phase 11 (`FORCE_LOGOUT`, `RECOVERY_*`), `documentId` dan `fileId` undefined → baris render sebagai `'' / undefined`. User tidak bisa membedakan event attachment dari event project document.
   - **Risiko**: data sensitif (sensitive asset) kehilangan jejak audit di UI, padahal backend real akan emit event ini. Untuk demonstrasi stakeholder yang fokus pada audit trail, ini menurunkan kredibilitas.
   - **Fix**: refactor audit page agar merender sesuai entity (`asset_attachment` → `assetId / attachmentId`; `project_document_file` → `projectId / documentId / fileId`; tambah `user_session` entity untuk FORCE_LOGOUT/RECOVERY_*).

2. **Audit event `FORCE_LOGOUT` dan 3 helper `RECOVERY_*` entity salah** (updated setelah simantaba review)
   - **Symptom**: `frontend/src/lib/stores/audit.ts:85` `recordForceLogout()` hardcode `entity: 'asset_attachment'` (copy-paste dari `recordAttachmentDelete`). Baris 87-95 `recordRecoveryAttempt/Success/Failed` hardcode `entity: 'project_document'` (sama-sama copy-paste artifact). Empat helper total: 1 FORCE_LOGOUT + 3 RECOVERY_*. Entity yang benar untuk semuanya adalah `user_session` (saat ini belum ada di `MockAuditEntity` union).
   - **Fix**: tambah `user_session` ke `MockAuditEntity` union; update **4 helper** (`recordForceLogout` + `recordRecoveryAttempt/Success/Failed`) ke entity `user_session`; tambah field `sessionId?` ke `MockAuditEvent` agar audit page bisa render dengan benar.

3. **Dashboard variable name `belumDipetakan` rename ke `tanpaGeometri`** (updated setelah simantaba review)
   - **Symptom**: PRD §6.8 menyebut "Jumlah aset belum dipetakan" sebagai stat dashboard yang wajib. **Klaim "stat belum di-expose" salah**: `frontend/src/lib/services/api/assets.ts:107` sudah return `belumDipetakan: list.filter((a) => !a.geom).length`; `frontend/src/routes/dashboard/+page.svelte:64` sudah render stat card "Belum dipetakan" dengan `stats.belumDipetakan`. Variabel `belumDipetakan` juga dipakai di `frontend/src/lib/services/api/reports.ts:9` (`summary.belumDipetakan`) dan `frontend/src/routes/reports/+page.svelte:136` (`result.summary.belumDipetakan`).
   - **Fix**: rename variabel `belumDipetakan` → `tanpaGeometri` di 4 file tersebut (sesuai PRD §6.8 status `tanpaGeometri` di UI). **Label user-facing tetap "Belum dipetakan"** (PRD §6.8 user-facing copy). Jangan tambah stat card kedua — gunakan slot yang sudah ada di dashboard Pilar 1 + reports page.

### P1 — Go-Live Hardening items dari BA Final Review (perlu keputusan Ojan dulu)

1. **AssetForm empty-geometry pre-submit warning** (BA review #1)
   - PRD §6.8 mengizinkan "belum dipetakan" (geom null) — bukan bug. Tapi reviewer/stakeholder harus diinformasikan.
   - **Fix**: tambah soft warning `toast.warning` atau inline alert di AssetForm saat user save dengan `!geometryJson.trim()`: "Aset akan disimpan tanpa geometri. Status `tanpaGeometri` akan muncul di daftar aset dan laporan hingga Anda menambahkan geometry."

2. **Admin force-logout cross-user UI** (BA review #2)
   - Saat ini `canForceLogoutOtherSession` wired di permission gate, tapi tidak ada halaman admin yang render cross-user revoke.
   - **Fix (jika Ojan setujui)**: tambah route `/admin/sessions` dengan mock list user + sesi mereka; tombol "Force logout sesi ini" gated by `user:force_logout` with scope `all`. Route hanya untuk role Admin (bukan Operator/Viewer).

3. **Real-time map tile provider health check + auto-swap** (BA review #3)
   - `health.ts` mock sudah return status per service (db/redis/minio/queue). Navbar badge tampil. Tapi `basemaps.ts` belum reaktif terhadap `health.minio` atau tile-load error per provider.
   - **Fix (jika Ojan setujui)**: tambah listener `tileerror` di `MapContainer.svelte`; jika gagal 3x dalam 5 detik pada provider aktif, swap otomatis ke provider fallback (ESRI → MapTiler → OSM). Update `preferences.defaultBasemap` accordingly. Display toast info "Basemap otomatis diganti ke {nama} karena tile error."

4. **Atlas PDF depth** (BA review #5)
   - Saat ini Atlas tile berlabel "Post-MVP depth, contract-only this iteration". Tile hanya melakukan mock job enqueue.
   - **Opsi A (deepen)**: tambah mock manifest (cover page, daftar area, N halaman peta per-area dengan extent bbox). Manifest di-bundle ke `Job.resultUrl` mock. Masih contract-first (no real PDF render).
   - **Opsi B (default)**: tetap contract-only. Post-MVP.

5. **Import Preview depth** (BA review #6)
   - Saat ini Import Preview tile enqueue job dengan `template: 'import_preview'`. Tile hanya mock two-phase (upload → preview).
   - **Opsi A (deepen)**: tambah mock preview detail (jumlah record valid/invalid, daftar field mapping, daftar geometry invalid dengan reason). Mock `commit` action dengan konfirmasi.
   - **Opsi B (default)**: tetap contract-only. Post-MVP.

6. **E2E coverage on tools race condition** (BA review #4)
   - `tools/+page.svelte:90, 95, 105, 113, 117` pakai `pollGeneration` counter. Belum ada Playwright test yang mengunci guard-nya.
   - **Fix**: tambah E2E test "double-click two tiles in quick succession → second tile's result wins, first tile's poll response tidak clobber state".

### P2 — Polish, observability, maintainability

1. **Long one-liner Svelte route refactor**
   - File `frontend/src/routes/audit/+page.svelte` (3 baris, semua dalam satu baris) menurunkan readability.
   - File `frontend/src/routes/assets/[id]/+page.svelte` (3 baris, semua dalam satu baris) sama.
   - **Fix**: refactor kedua file ke multi-line Svelte template, dengan extracted `<script>` block.

2. **Audit page description text outdated**
   - `audit/+page.svelte:3` text "termasuk download/verify/delete file dokumen proyek" tidak menyebut attachment events.
   - **Fix**: update text jadi "aksi sensitif MVP: download/verify/delete dokumen proyek, upload/download/delete lampiran aset, force-logout sesi, percobaan recovery."

3. **Phase 10 advice doc test files archival**
   - Phase 10 commit `7f723b6` sudah update doc ke v1.3.7. Verified — tidak ada regression.

4. **Sub OPD/Bidang/UPT UI**
   - PRD menyebut internal grouping ini, tapi negative scope iterasi 1 eksplisit "tidak menambah Sub OPD/Bidang/UPT UI". **Tetap out-of-scope** untuk iterasi ini.

## Resolved open questions (Ojan, 2026-06-12) — best answers per constraint "no bottleneck"

Constraint: "Asal tidak menimbulkan bottle neck" = keputusan tidak boleh menghambat demo stakeholder, integrasi backend, atau workflow development ke depan. Scope creep yang tidak perlu harus dihindari.

Keputusan final untuk 7 open questions (semua default dikonfirmasi):

| # | Open question | Default | Best answer | Justifikasi "no bottleneck" |
|---|--------------|---------|-------------|-----------------------------|
| 1 | Admin cross-user force-logout | TIDAK | **TIDAK** | Route baru + role gate + mock data + E2E+a11y. Tidak block demo (fokus demo: audit trail, bukan admin action). Backend integration concern, bukan MVP frontend. Scope creep risk tinggi. |
| 2 | Real-time basemap auto-swap | TIDAK | **TIDAK** | tileerror listener + debounce + threshold + swap logic + preferences update + toast. Risk infinite-loop jika fallback juga error (mitigasi sudah ada di plan, tapi menambah state). Banner fallback existing sudah representatif. |
| 3 | Atlas PDF depth | TETAP contract-only | **TETAP contract-only** | Manifest mock + jobs.ts update + tools UI + test. Post-MVP eksplisit per BA Final Review item #5. Tile saat ini sudah representatif sebagai "Post-MVP depth, contract-only this iteration". |
| 4 | Import Preview depth | TETAP contract-only | **TETAP contract-only** | Preview detail mock + commit action + UI + test. Post-MVP eksplisit per BA Final Review item #6. Tile saat ini sudah representatif sebagai mock two-phase. |
| 5 | Pre-submit empty-geometry warning | YA | **YA** | Inline alert + 2 button + E2E. Pure additive UI, PRD §6.8 compliant, no dependency, reviewer clarity tinggi. Biaya rendah, nilai klarifikasi tinggi. |
| 6 | E2E coverage tools race condition | YA | **YA** | 1 Playwright test. Lock OMP I-3 mitigation `pollGeneration`. Pure test, no new code, prevents future regression. |
| 7 | Svelte route one-liner refactor | YA | **YA** | 2 file (`audit/+page.svelte`, `assets/[id]/+page.svelte`) multi-line. Pure formatting, no logic change, improves maintainability. |

**Konsekuensi langsung**:
- **Phase 4 (P1 Ojan-decisioned items) menjadi NO-OP phase** — tidak ada pekerjaan karena semua 4 item di-defer ke Post-MVP hardening iterasi berikutnya. Phase tetap ada sebagai marker dokumentasi keputusan.
- Phase numbering tetap (Phase 0..6) untuk konsistensi histori plan.
- Negative scope tetap utuh; tidak ada scope creep.
- Final iterasi scope: 3 P0 fixes + 2 P1 polish + 2 P2 polish + 1 phase refactor (audit description text included in P0 Phase 1). Total ~6 phase commits, well-bounded.

**No-bottleneck verification**:
- Demo stakeholder: tidak terhalang (semua YES items pure additive, semua TIDAK items eksplisit Post-MVP).
- Backend integration: tidak terhalang (mock union extension di audit + dashboard stat tambah memberi klarifikasi kontrak backend).
- Development workflow: phase 1-3 + phase 5-6 bisa dimulai paralel di worktree berbeda jika perlu (tidak overlap file).

## Proposed approach

Iterasi ini adalah **read-only inspection + targeted fix** terhadap working tree pasca-Phase 11. Tidak membangun backend, tidak menambah scope produk di luar PRD v1.3.7. Setiap fix harus disertai:

- Unit test untuk shared contract jika ada perubahan (audit union, dashboard stats).
- E2E assertion untuk fix rendering atau flow.
- A11y test untuk route baru (jika ada).
- Negative E2E assertion tambahan: tidak ada reintroduksi multi-OPD, TRANSFER, finance/procurement workflow, PRD v1.3.6 label.

Urutan eksekusi: Phase 0 (BA handoff) → Phase 1 (P0 audit page + entity) → Phase 2 (P0 dashboard stat) → Phase 3 (P1 empty-geometry warning + P2 refactor) → Phase 4 (P1 Ojan-decisioned items) → Phase 5 (verification + BA + OMP + Accept/Deny).

Iterasi ini **TIDAK menyentuh backend, dan TIDAK menambah scope produk di luar PRD v1.3.7**.

## In-scope untuk iterasi Go-Live Hardening

- Refactor audit page agar render sesuai entity (asset_attachment, project_document_file, user_session).
- Tambah `user_session` ke `MockAuditEntity` union + perbaiki `recordForceLogout` entity mapping.
- Tambah `tanpaGeometri` stat ke `dashboardStats()` dan render stat card di Pilar 1.
- Tambah pre-submit soft warning untuk empty-geometry di AssetForm.
- Tambah E2E test untuk `pollGeneration` race-condition guard.
- Refactor 2 file Svelte route yang masih one-liner (`audit`, `assets/[id]`).
- Update audit page description text.

## Explicit out-of-scope / negative scope

- Tidak membangun backend Hono/Postgres/PostGIS nyata di slice ini.
- Tidak menambah active multi-OPD, OPD CRUD list, OPD transfer, cross-OPD filter, inter-OPD relocation.
- Tidak menggantikan LPSE/SIRUP/SIPD/SP2D/finance — payment page tetap read-only administrative reference.
- Tidak menambah project-management suite: tidak ada task/resource planning, kanban vendor, approval workflow multi-level.
- Tidak mengklaim upload/download file benar-benar memakai MinIO/signed URL/antivirus scan — tetap label mock/contract-first.
- Tidak mengklaim export job benar-benar diproses BullMQ worker — tetap label mock async queue contract.
- Tidak menambah Sub OPD/Bidang/UPT UI aktif.
- Tidak membangun PostGIS spatial index/clustering — geometry tetap mock GeoJSON.
- Tidak menambah reverse geocoding UI (PRD §6.10 — eksplisit Post-MVP).
- Tidak menambah chart interaktif (Chart.js) di dashboard — PRD §12 menyebut "Bar chart distribusi aset per jenis, status geometri, status hak, tahun pengadaan, dan keterkaitan proyek GIS (Chart.js, dari MV)", tapi MVP frontend cukup stat card + SimpleBars sederhana. **Chart.js deepening adalah iterasi masa depan, di luar hardening ini.**
- Tidak menambah materialized view dashboard stats (PRD §12 menyebut MV `dashboard_stats` server-side; frontend cukup konsumsi mock stats).
- Tidak menyentuh layout dashboard Pilar 1/Pilar 2 secara visual (sudah representatif).
- Tidak menambah route baru di luar yang tercantum di in-scope.

## Step-by-step plan

### Phase 0 — BA handoff singkat sebelum execution

Tujuan: mengunci prioritas iterasi ini dan memvalidasi default keputusan untuk open questions.

Tasks:
1. Minta `simantaba` memvalidasi 3 P0 follow-up bug (audit page rendering, FORCE_LOGOUT entity, dashboard stat tanpa geometri) dan 1 P1 default (empty-geometry pre-submit warning) terhadap PRD v1.3.7.
2. Konfirmasi 7 open questions dengan Ojan (default dipakai jika tidak dijawab).
3. Wording UI yang sudah disetujui (FROZEN) tetap dijaga: `Dashboard Aset & Proyek GIS`, `Administrasi Proyek GIS`, `Riwayat Pembayaran` read-only, Viewer omit-total.
4. Path discipline dijaga: tidak ada `/api/v1/jobs/:id`, tidak ada `/api/v1/imports/preview`.
5. Output: BA handoff brief verdict `APPROVED_FOR_DEV` dari `simantaba` dengan daftar final iterasi ini.

### Phase 1 — P0 audit fix + entity union extension

Tujuan: audit page merender event ATTACHMENT_* dan FORCE_LOGOUT/RECOVERY_* dengan benar; union `MockAuditEntity` punya `user_session`; 4 record helper emit entity yang benar.

Likely files:
- `frontend/src/lib/stores/audit.ts` (tambah `user_session` ke union; tambah `sessionId?` ke `MockAuditEvent`; perbaiki **4 helper** — `recordForceLogout` (entity `asset_attachment` → `user_session`) + `recordRecoveryAttempt/Success/Failed` (entity `project_document` → `user_session`))
- `frontend/src/lib/stores/audit.test.ts` (Phase 1: entity mapping test untuk 4 helper, baru jika belum ada)
- `frontend/src/routes/audit/+page.svelte` (refactor multi-line; conditional render per entity: `asset_attachment` → `assetId / attachmentId`; `project_document_file` → `projectId / documentId / fileId`; `user_session` → `sessionId / actorName`; **Tambah `data-testid="audit-row"` + `data-entity={event.entity}`** ke `<tr>` agar E2E test bisa target per entity)
- `frontend/tests/e2e/frontend-mvp.spec.ts` (assertion audit page render per entity)

Tasks:
1. Extend `MockAuditEntity` union dengan `'user_session'`. Extend `MockAuditEvent` dengan `sessionId?: string`.
2. Perbaiki 4 record helper: `recordForceLogout` (entity `asset_attachment` → `user_session`); `recordRecoveryAttempt/Success/Failed` (entity `project_document` → `user_session`). Update caller di `services/api/auth.ts` atau route yang memanggil recovery helper untuk mengirim `sessionId` mock.
3. Refactor `audit/+page.svelte` ke multi-line Svelte template; tambahkan conditional render block per entity; **Tambah `data-testid="audit-row"` + `data-entity={event.entity}` ke `<tr>` agar E2E test bisa target per entity** (updated setelah simantaba review).
4. Update description text: "...aksi sensitif MVP: download/verify/delete dokumen proyek, upload/download/delete lampiran aset, force-logout sesi, percobaan recovery."
5. Unit test `audit.test.ts` (jika belum ada): test **4 helper** menghasilkan entity yang benar (`recordForceLogout` → `user_session`; `recordRecoveryAttempt/Success/Failed` → `user_session`). Updated setelah simantaba review — awalnya hanya test 1 helper.
6. E2E: assertion `data-testid="audit-row"` + `data-entity="asset_attachment"` untuk event ATTACHMENT_UPLOAD menampilkan `assetId / attachmentId` (bukan `null / undefined`).
7. Negative E2E: tidak boleh ada string `null` atau `undefined` di kolom Target untuk event manapun.

Acceptance criteria:
- Audit page render benar untuk ketiga entity type (asset_attachment, project_document_file, user_session).
- **4 helper** emit `user_session` entity (cek unit test). Updated setelah simantaba review.
- E2E lulus untuk render per-entity.
- Tidak ada `null`/`undefined` di kolom Target untuk event manapun.

### Phase 2 — P0 dashboard stat rename `belumDipetakan` → `tanpaGeometri` (updated setelah simantaba review)

Tujuan: align variabel `belumDipetakan` ke PRD §6.8 status `tanpaGeometri` di UI; user-facing label tetap "Belum dipetakan" (PRD §6.8 copy); query-param hydration agar klik stat card navigasi ke filtered list.

Likely files (cascade rename):
- `frontend/src/lib/services/api/assets.ts` (line 107: `belumDipetakan` → `tanpaGeometri`)
- `frontend/src/lib/services/api/reports.ts` (line 9: `summary.belumDipetakan` → `summary.tanpaGeometri`)
- `frontend/src/routes/dashboard/+page.svelte` (line 64: `stats.belumDipetakan` → `stats.tanpaGeometri`; **label tetap "Belum dipetakan"**)
- `frontend/src/routes/reports/+page.svelte` (line 136: `result.summary.belumDipetakan` → `result.summary.tanpaGeometri`; label tetap "Belum dipetakan")
- `frontend/src/routes/assets/+page.svelte` (tambah query-param hydration: `has_geom=false` → `hasGeom='no'` via `$page.url.searchParams`)
- `frontend/src/lib/services/api/assets.test.ts` (rename assertion `belumDipetakan` → `tanpaGeometri`)
- `frontend/tests/e2e/frontend-mvp.spec.ts` (assertion stat card tetap 1 (bukan 2); klik navigasi ke `/assets?has_geom=false`)

Tasks (sub-tasks eksplisit, updated setelah simantaba review):
1. Rename `belumDipetakan` → `tanpaGeometri` di 4 file cascade (assets.ts, reports.ts, dashboard/+page.svelte, reports/+page.svelte). User-facing label "Belum dipetakan" tetap (PRD §6.8 copy).
2. Sub-task a: stat card di dashboard Pilar 1 reuse slot existing (line 64); hanya rename `stats.belumDipetakan` → `stats.tanpaGeometri`. **Jangan tambah stat card kedua** — variabel sudah ada, slot sudah ada.
3. Sub-task b: tambah query-param hydration di `assets/+page.svelte` via `$page.url.searchParams` reactive statement; map `has_geom=false` → `hasGeom='no'`. Updated setelah simantaba review — sebelumnya implisit, sekarang eksplisit. `listAssets(filters)` sudah query-string aware per `assets.ts:20`, jadi perubahan hanya di init filters.
4. Unit test: rename assertion `belumDipetakan` → `tanpaGeometri` di `assets.test.ts`.
5. E2E: stat card tepat 1 (bukan 2) di dashboard Pilar 1; klik stat card → URL berubah ke `/assets?has_geom=false`; filtered list menampilkan hanya aset tanpa geom.

Acceptance criteria (updated setelah simantaba review):
- Variabel di 4 file cascade di-rename; user-facing label "Belum dipetakan" tetap.
- Dashboard Pilar 1 punya tepat 1 stat card "Belum dipetakan" (bukan 2).
- Reports page render "Belum dipetakan: {N}" dengan nilai benar.
- Klik stat card navigasi ke `/assets?has_geom=false`; query param ter-hydrate ke filter `hasGeom='no'`.
- User bisa clear query param via dropdown filter tanpa konflik state.

### Phase 3 — P1 empty-geometry pre-submit warning + P2 one-liner refactor

Tujuan: user yang save aset tanpa geom dapat warning soft (PRD §6.8 compliant tapi reviewer diinformasikan); 2 file Svelte route yang one-liner jadi multi-line.

Likely files:
- `frontend/src/lib/components/crud/AssetForm.svelte` (pre-submit warning logic)
- `frontend/src/routes/audit/+page.svelte` (sudah di-refactor di Phase 1)
- `frontend/src/routes/assets/[id]/+page.svelte` (refactor multi-line)
- `frontend/tests/e2e/frontend-mvp.spec.ts` (assertion warning toast muncul saat save tanpa geom)

Tasks:
1. **AssetForm empty-geometry warning**:
   - Pada submit handler, jika `!form.geometryJson.trim()` dan `digitizeValue === null`:
     - Tampilkan inline alert (bukan modal) dengan copy: "Aset akan disimpan tanpa geometri. Status `tanpaGeometri` akan muncul di daftar aset dan laporan hingga Anda menambahkan geometry." (PRD §6.8 compliant tone)
     - Tombol "Lanjut simpan tanpa geometri" (primary) dan "Tambah geometry dulu" (secondary yang switch tab ke Peta).
     - Jika user pilih lanjut, tetap submit (PRD izinkan).
2. **Svelte route refactor** (2 file):
   - `frontend/src/routes/audit/+page.svelte` — refactor multi-line (sudah disentuh di Phase 1).
   - `frontend/src/routes/assets/[id]/+page.svelte` — refactor multi-line; extract `<script>` block ke multi-line; pisah template.
3. E2E: save asset tanpa geom → inline alert tampil → klik "Lanjut simpan" → asset tersimpan dengan status tanpa geometri.

Acceptance criteria:
- Inline alert tampil dengan copy sesuai PRD.
- User bisa lanjut simpan tanpa geom (PRD §6.8 compliant).
- 2 file Svelte route readable multi-line.

### Phase 4 — NO-OP phase (semua 4 item Ojan-decisioned di-defer ke Post-MVP)

Tujuan: dokumentasi keputusan Ojan untuk 4 item P1 Ojan-decisioned. Tidak ada pekerjaan implementation phase ini. Phase 4 tetap ada sebagai marker agar phase numbering konsisten dengan histori plan.

**Resolusi keputusan** (sudah final di section `Resolved open questions`):
1. Admin cross-user force-logout → **DEFER ke Post-MVP** (out of MVP frontend scope; backend integration concern).
2. Real-time basemap auto-swap → **DEFER ke Post-MVP** (banner fallback existing sudah representatif).
3. Atlas PDF depth → **TETAP contract-only** (Post-MVP eksplisit per BA Final Review item #5).
4. Import Preview depth → **TETAP contract-only** (Post-MVP eksplisit per BA Final Review item #6).

**Capture untuk Post-MVP hardening** (bukan scope iterasi ini):
- `docs/mvp/2026-XX-XX_post-mvp-hardening-checklist.md` (atau update BA Final Review): tambah 4 item ini ke daftar Post-MVP hardening.
- `frontend/src/lib/services/api/auth.ts` comment block: tambah `// TODO(post-mvp): admin cross-user force-logout route at /admin/sessions; for now, force-logout hanya untuk sesi sendiri`.
- `frontend/src/lib/components/map/MapContainer.svelte` comment: tambah `// TODO(post-mvp): tileerror listener with debounce; for now, banner fallback aktif`.
- `frontend/src/routes/tools/+page.svelte` Atlas + Import tile labels tetap "Post-MVP depth, contract-only this iteration" sampai Post-MVP deepening diizinkan Ojan.

**Acceptance criteria** (no implementation, hanya dokumentasi) — updated setelah simantaba review:
- 2 new TODO/comment markers: di `frontend/src/lib/services/api/auth.ts` (admin cross-user) + `frontend/src/lib/components/map/MapContainer.svelte` (basemap auto-swap).
- 1 new doc file: `docs/mvp/2026-XX-XX_post-mvp-hardening-checklist.md` (capture 4 item Post-MVP).
- 1 verification: `frontend/src/routes/tools/+page.svelte:53, 70` Atlas + Import tile labels tetap "Post-MVP depth, contract-only this iteration" sampai Post-MVP deepening.
- Total: 2 markers + 1 doc + 1 verification (bukan 4 markers).

### Phase 5 — P1 E2E race condition coverage + P2 audit description update

Tujuan: lock `pollGeneration` guard dengan Playwright test; audit page description text updated.

Likely files:
- `frontend/tests/e2e/frontend-mvp.spec.ts` (test double-click race condition)
- `frontend/src/routes/audit/+page.svelte` (description text updated di Phase 1)

Tasks:
1. **E2E race condition test**:
   - Buka `/tools`.
   - Double-click tile `excel` dan `pdf` dalam 100ms.
   - Tunggu 5 detik (poll interval 80ms × 4 attempts + grace).
   - Assertion: `activeJob.template` terakhir = `pdf` (tile terakhir yang di-klik), bukan `excel`.
   - Assertion: tidak ada state yang clobber (cek `pollGeneration` counter via console.log atau data-attribute).
2. **Audit description text**: sudah di-update di Phase 1.

Acceptance criteria:
- E2E race condition test PASS.
- Audit page description text menyebut semua entity type.

### Phase 6 — Verification, BA review, OMP review

Tujuan: validasi akhir sebelum Accept/Deny gate.

Perintah dijalankan dari `frontend/`:

```bash
npm run check
npm run test
npm run build
npm run test:e2e
npm run test:a11y
npm run verify:mvp
```

Hasil aktual diharapkan:
- `npm run check`: 0 error / 0 warning.
- `npm run test`: semua unit test PASS (termasuk `audit.test.ts` entity mapping baru dan `dashboardStats` tanpaGeometri test).
- `npm run build`: PASS.
- `npm run test:e2e`: PASS untuk semua skenario baru (audit page per-entity render, dashboard stat tanpaGeometri, empty-geometry warning, race condition guard, admin cross-user logout jika applicable, basemap auto-swap jika applicable, Atlas/Import depth jika applicable).
- `npm run test:a11y`: PASS untuk route baru (`/admin/sessions` jika applicable).
- `npm run verify:mvp`: PASS penuh.

Review berurutan:
1. BA `simantaba` post-implementation review → verdict `PASS` atau list required fix.
2. OMP v15.10.8 adversarial review (jika ada diff yang bermakna) → `APPROVED` atau `REQUEST_CHANGES`.
3. Ojan accept/deny gate sebelum commit/push ke `origin/hermes/dev`.

## Files likely to change (ringkasan iterasi ini)

Frontend routes:
- `frontend/src/routes/audit/+page.svelte` (Phase 1: entity-aware render + description update + multi-line refactor + tambah `data-testid="audit-row"` + `data-entity={event.entity}`)
- `frontend/src/routes/dashboard/+page.svelte` (Phase 2: rename `stats.belumDipetakan` → `stats.tanpaGeometri`)
- `frontend/src/routes/assets/[id]/+page.svelte` (Phase 3: multi-line refactor)
- `frontend/src/routes/assets/+page.svelte` (Phase 2: query-param hydration)
- `frontend/src/routes/reports/+page.svelte` (Phase 2: rename `result.summary.belumDipetakan` → `result.summary.tanpaGeometri`)

Frontend components:
- `frontend/src/lib/components/crud/AssetForm.svelte` (Phase 3: empty-geometry pre-submit warning)

Frontend stores / services:
- `frontend/src/lib/stores/audit.ts` (Phase 1: tambah `user_session` entity, `sessionId?` field, fix `recordForceLogout` entity)
- `frontend/src/lib/stores/audit.test.ts` (Phase 1: entity mapping test, baru jika belum ada)
- `frontend/src/lib/services/api/assets.ts` (Phase 2: rename `belumDipetakan` → `tanpaGeometri`)
- `frontend/src/lib/services/api/reports.ts` (Phase 2: rename cascade `summary.belumDipetakan` → `summary.tanpaGeometri`)
- `frontend/src/lib/services/api/assets.test.ts` (Phase 2: rename assertion)
- `frontend/src/routes/assets/+page.svelte` (Phase 2: query-param hydration `has_geom=false` → `hasGeom='no'`)

Shared types (Phase 4 deferred, tidak ada perubahan):
- `shared/src/schemas/auth.ts` — tidak diubah di iterasi ini (admin force-logout Post-MVP).

Tests:
- `frontend/tests/e2e/frontend-mvp.spec.ts` (semua phase: audit page render per-entity, dashboard stat (1 card, not 2), empty-geometry warning, race condition)
- `frontend/src/lib/stores/audit.test.ts` (Phase 1: entity mapping test untuk 4 helper)

## Tests / validation

Verifikasi akhir (dari `frontend/`):

```bash
npm run check
npm run test
npm run build
npm run test:e2e
npm run test:a11y
npm run verify:mvp
```

Negative E2E assertions tambahan yang harus dijaga (tidak boleh regresi):
- Tidak ada kata `PRD v1.3.6` di UI aktif.
- Tidak ada kata `Web GIS Pemetaan Wilayah` (hanya) di subtitle aktif.
- Tidak ada kata `Manajemen Proyek GIS` (hanya) di heading aktif.
- Tidak ada `transfer aset`, `CRUD OPD tambahan`, `Filter laporan OPD`, `Grouping layer` di DOM aktif.
- Tidak ada action label `approve`, `bayar`, `proses pembayaran`, `workflow finance`, `procurement workflow`.
- Tidak ada `TRANSFER` di `AssetHistoryItem` action.
- `/api/v1/prefs` adalah path mock preference (bukan `/api/v1/preferences`).
- Tidak ada `/api/v1/jobs/:id` (unified) atau `/api/v1/imports/preview` (plural).
- Audit page tidak render `null` atau `undefined` di kolom Target untuk event manapun.

## Risks / tradeoffs

1. **Audit union extension bisa break consumer page** jika ada yang hardcode assume hanya 3 entity type. Mitigasi: refactor audit page di Phase 1 bersamaan dengan extension. Negative E2E: tidak ada string `null`/`undefined` di kolom Target.

2. **Dashboard stat baru bisa double-count** jika ada aset yang geom-nya string kosong vs null. Mitigasi: gunakan `!a.geom` (truthy check) yang konsisten dengan `geometry-rules.ts:51` dan `assets.ts:15` (filter `has_geom: false`).

3. **Pre-submit warning** bisa dianggap annoying jika user memang berniat save tanpa geom. Mitigasi: copy tone informatif (PRD §6.8 compliant), tombol "Lanjut simpan" adalah default primary, jadi 1 klik.

4. **Admin cross-user force-logout** di luar MVP frontend scope eksplisit. Jika Ojan YES, scope melebar. Mitigasi: route hanya render untuk role Admin; tetap mock/contract-first (tidak claim real revoke).

5. **Basemap auto-swap** bisa infinite-loop jika fallback juga error. Mitigasi: cap swap ke 1 kali per session, lalu tampilkan persistent error banner dengan instruksi manual ganti.

6. **Atlas / Import depth** adalah mock anyway; risk rendah. Tapi tambahan scope berarti tambahan mock state machine dan test. Mitigasi: default TIDAK dilakukan (Post-MVP).

7. **One-liner refactor** bisa introduce subtle change jika tidak hati-hati. Mitigasi: refactor + run full test suite, no logic change.

## Open questions yang harus dijawab Ojan

Lihat section `Open questions` di atas. 7 keputusan; 4 default TIDAK (admin cross-user, basemap auto-swap, Atlas depth, Import depth), 3 default YA (empty-geometry warning, E2E race condition, Svelte refactor). Iterasi bisa langsung mulai dengan default jika Ojan tidak menjawab.

Jika Ojan memilih YES untuk salah satu dari 4 default-TIDAK, Phase 4 akan menjadi phase terpisah (mungkin split jadi Phase 4a, 4b, 4c, 4d sesuai jumlah YES). Phase 5 dan 6 selalu dilakukan.

## Stakeholder decisions (Ojan, 2026-06-12) — final

7 open questions telah terjawab dengan best answers per constraint "no bottleneck" (lihat section `Resolved open questions` di atas untuk justifikasi lengkap).

Ringkasan keputusan final:

1. **Admin cross-user force-logout** — DEFER ke Post-MVP. Alasan: out of MVP frontend scope; backend integration concern; menambah scope tanpa nilai demo langsung.

2. **Real-time basemap auto-swap** — DEFER ke Post-MVP. Alasan: banner fallback existing sudah representatif; auto-swap menambah state + risk infinite-loop; mitigasi masih memerlukan extra logic yang tidak esensial.

3. **Atlas PDF depth** — TETAP contract-only. Alasan: Post-MVP eksplisit per BA Final Review item #5; tile label sudah jelas "Post-MVP depth, contract-only this iteration"; tidak ada stakeholder ask untuk deepen.

4. **Import Preview depth** — TETAP contract-only. Alasan: Post-MVP eksplisit per BA Final Review item #6; mock two-phase upload → preview sudah representatif sebagai contract; tidak ada stakeholder ask untuk deepen.

5. **Pre-submit empty-geometry warning** — YA. Alasan: biaya rendah (inline alert + 2 button), nilai klarifikasi tinggi untuk reviewer/stakeholder (PRD §6.8 compliant tapi informative); no dependency.

6. **E2E coverage tools race condition** — YA. Alasan: 1 Playwright test, lock OMP I-3 mitigation `pollGeneration` counter; pure test, no new code; prevents future regression.

7. **Svelte route one-liner refactor** — YA. Alasan: 2 file (`audit/+page.svelte`, `assets/[id]/+page.svelte`) multi-line; pure formatting, no logic change; improves maintainability.

**Konsekuensi untuk eksekusi**:
- Phase 1-3 + Phase 5-6 tetap dilakukan (5 phase dengan implementation work).
- Phase 4 menjadi NO-OP documentation-only phase (2 TODO/comment markers + 1 new doc + 1 verification of existing tile labels + Post-MVP checklist capture — updated setelah simantaba review).
- Negative scope tetap utuh; tidak ada scope creep.
- Total estimasi: ~6 phase commits (Phase 0 BA handoff tidak ada code delta, jadi 5-6 commit).
- Tidak ada bottleneck untuk demo stakeholder, backend integration, atau workflow development ke depan.

**Capture untuk Post-MVP hardening checklist** (di luar iterasi ini, di-defer):
- Admin cross-user force-logout route (`/admin/sessions`) dengan role gate `user:force_logout` scope `all`.
- Real-time basemap auto-swap listener dengan debounce 5s + threshold 3 error + cap 1 swap/session.
- Atlas PDF manifest mock: `{ coverPage, areas: [{name, bbox, pageCount}], totalPages }`.
- Import Preview detail mock: `{ validCount, invalidCount, fieldMapping, invalidGeometries }` + commit action dengan konfirmasi.

— end of plan

## Catatan untuk simantadev saat eksekusi

- `frontend/src/lib/stores/audit.ts` perubahan Phase 1 **harus** menjaga backward compat untuk event lama. Helper lama (`recordDocumentDownload` dll) tidak boleh berubah signature.
- `frontend/src/lib/services/api/assets.ts` perubahan Phase 2 rename `belumDipetakan` → `tanpaGeometri` adalah **rename only**, bukan add field. Cascade ke `reports.ts:9` dan `reports/+page.svelte:136` wajib dilakukan dalam 1 commit agar tidak ada intermediate state broken.
- Audit page refactor (Phase 1) **harus** menjaga styling table yang ada (badge emerald untuk action). Hanya render logic per-entity yang berubah.
- Svelte route one-liner refactor (Phase 3) **tidak boleh** mengubah logic, styling, atau behavior. Hanya formatting.
- Phase 2 sub-task b (query-param hydration di `assets/+page.svelte`) **harus** meng-handle drop query param ketika user clear dropdown filter (jangan sampai stuck `hasGeom='no'` setelah user clear).

## BA Handoff Brief (simantaba) — 2026-06-12

Reviewer: simantaba (via delegate_task leaf subagent, default profile orchestrator)
Date: 2026-06-12
Plan validated: `.hermes/plans/2026-06-12_161000-frontend-mvp-prd-v137-go-live-hardening.md`
PRD: `docs/PRD_WebGIS_Pemetaan_Wilayah.md` v1.3.7
Base commit: `a739750 chore(repo): gitignore .bob/ + archive Phase 11 plan & BA review` on branch `hermes/dev`

### Verdict
**APPROVED_FOR_DEV** (after 5 required plan-text fixes applied). Direction of plan is correct (small, well-bounded Go-Live Hardening iteration); all 12 FROZEN decisions and all 7 Ojan decisions correctly propagated. Spot-checks confirmed 14 of the plan's claims verbatim, then identified 1 critical error + 4 minor cleanup items, all now resolved in this plan version.

### IMPORTANT fixes applied to this plan (5/5)

1. **Phase 2 §246-268**: rewrote "current state" dan "Fix" task. Replace "tambah `tanpaGeometri: number`" dengan "rename field `belumDipetakan` → `tanpaGeometri` di `assets.ts:107`" + cascade ke `reports.ts:9` + `reports/+page.svelte:136` + `dashboard/+page.svelte:64`. Stat card reuse existing slot (line 64); label "Belum dipetakan" tetap (PRD §6.8 user-facing copy). **[Verified: `belumDipetakan` ada di 4 file, line numbers confirmed.]**

2. **Phase 1 task #3**: tambah `data-testid="audit-row"` + `data-entity={event.entity}` ke `<tr>` element. Task #6 tests against new testids. **[Verified: 0 matches untuk `audit-row` di `audit/+page.svelte` saat ini.]**

3. **Phase 2 task #3**: split jadi 2 sub-tasks eksplisit. Sub-task a: render rename di existing slot. Sub-task b: query-param hydration `has_geom=false` → `hasGeom='no'` di `assets/+page.svelte` via `$page.url.searchParams`. **[Verified: `assets/+page.svelte` saat ini tidak baca query params.]**

4. **Phase 1 task #2 + task #5**: explicitly list **4 record helper** untuk fix entity mapping. `recordForceLogout` (entity `asset_attachment` → `user_session`) + `recordRecoveryAttempt/Success/Failed` (entity `project_document` → `user_session`). Unit test covers 4 helper. **[Verified: audit.ts:85, 88, 91, 94 confirmed hardcoded wrong entities.]**

5. **Phase 4 §305-309 acceptance criteria**: adjusted dari "4 marker TODO/comment" ke "1 new doc + 2 new TODO/comment markers + 1 verification of existing tile labels". **[Verified: tools/+page.svelte:53, 70 already labeled.]**

### MINOR fixes folded in (3 of 4)

- Consolidated P2 #2 audit description text ke Phase 1 task #4 (avoid double-counting di commit message).
- `MockAuditEvent.projectId` tetap required (string) dengan convention empty-string untuk FORCE_LOGOUT/RECOVERY_*; comment ditambahkan di Phase 1 task #1 untuk klarifikasi.
- `recordRecoveryAttempt/Success/Failed` callers (di `services/api/auth.ts` atau recovery route) harus kirim `sessionId` mock — eksplisit di Phase 1 task #2.

### MINOR deferred (1 of 4)

- `projectId?: string` (relax to optional). Didefer — current empty-string convention acceptable.

### Out of scope reminders (per BA)

- Admin cross-user force-logout route `/admin/sessions` (DEFER Post-MVP).
- Real-time basemap auto-swap listener (DEFER Post-MVP).
- Atlas PDF manifest mock (TETAP contract-only).
- Import Preview detail mock + commit action (TETAP contract-only).
- Negative scope (no scope creep): no multi-OPD, no OPD CRUD list, no OPD transfer, no cross-OPD filter, no inter-OPD relocation, no LPSE/SIRUP/SIPD/SP2D replacement, no project-management suite, no Sub OPD/Bidang/UPT UI, no reverse geocoding UI, no Chart.js deepening, no materialized view dashboard stats, no PostGIS spatial index, no MinIO/signed URL/antivirus real claims, no BullMQ real worker claims.

### Status

Setelah 5 IMPORTANT fixes diaplikasikan ke plan ini, plan siap untuk dev start. Tidak ada re-design. Phase 1 dapat dimulai setelah Ojan Accept/Deny untuk plan yang sudah di-update.

— end of plan
