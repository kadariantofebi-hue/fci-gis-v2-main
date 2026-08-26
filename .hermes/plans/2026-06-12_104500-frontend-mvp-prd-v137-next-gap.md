# Plan: Gap Frontend MVP SIMANTA terhadap Main PRD v1.3.7 — Iterasi Berikutnya

Tanggal: 2026-06-12
Mode: Plan only (no execution). Mengikuti skill `software-development/plan` v1.0.0.
Target workspace: `C:/projects/fci/fci-gis`
Canonical PRD: `docs/PRD_WebGIS_Pemetaan_Wilayah.md` v1.3.7 (Juni 2026)
Status commit terakhir: `211b1fc feat(frontend): complete PRD 1.3.7 MVP milestones` (2026-06-11)
Plan sebelumnya: `.hermes/plans/2026-06-09_102337-frontend-mvp-prd-gap-next.md`

## Goal

Menyusun pekerjaan frontend MVP iterasi berikutnya berdasarkan kondisi aplikasi sekarang terhadap main PRD v1.3.7. Iterasi ini dimulai SETELAH:

- Commit `211b1fc` menyelesaikan Milestone 1+2 plan sebelumnya: P0 branding v1.3.7, contract cleanup (`/api/v1/prefs`, permission keys final, no `TRANSFER`), two-pillar dashboard, project subnavigation, viewer-omit-total, asset taxonomy penuh, attachment contract penuh, map palette, Laporan Interaktif, document/payment role matrix, audit event blocked download.
- BA handoff `simantaba`: `APPROVED_FOR_DEV` (plan 2026-06-09), dengan constraint Single Active OPD permanen, Administrasi Proyek GIS sebagai audit/admin repository, payment read-only/reference, viewer omit total.
- OMP v15.10.8 review final: `APPROVED` dengan minor non-blocking.
- Verifikasi terakhir (`docs/mvp/2026-06-08_e2e-browser-testing-advice-prd-1-3-6.md`): `npm run verify:mvp` PASS penuh (check 0/0, unit 5/13, build, E2E 12, a11y 5).

Iterasi berikutnya harus menutup gap yang masih menjadi MVP/Go-live requirement PRD v1.3.7 yang belum sepenuhnya di-cover, sambil menjaga invariant product (Single Active OPD, Project GIS audit/admin repository, geometry PostGIS source of truth).

## Current context / asumsi

### Sumber yang diinspeksi read-only

- `docs/PRD_WebGIS_Pemetaan_Wilayah.md` (v1.3.7)
- `docs/mvp/2026-06-08_e2e-browser-testing-advice-prd-1-3-6.md` (status verifikasi terakhir)
- `docs/mvp/2026-06-05_hasil-e2e-frontend-mvp.md` (referensi)
- `frontend/package.json`, `frontend/README.md`
- `frontend/src/lib/components/layout/Sidebar.svelte`
- `frontend/src/lib/components/layout/Navbar.svelte`, `AppShell.svelte`
- `frontend/src/routes/dashboard/+page.svelte` (327 baris, dua pilar sudah ada)
- `frontend/src/routes/assets/+page.svelte`, `create/+page.svelte`, `[id]/+page.svelte`
- `frontend/src/lib/components/crud/AssetForm.svelte`
- `frontend/src/lib/components/crud/AttachmentList.svelte`
- `frontend/src/lib/components/map/MapContainer.svelte`, `styles.ts`, `basemaps.ts`
- `frontend/src/lib/components/projects/ProjectSubnav.svelte`
- `frontend/src/routes/projects/+page.svelte`, `[id]/+page.svelte`, `[id]/documents/+page.svelte`, `[id]/payments/+page.svelte`
- `frontend/src/routes/reports/+page.svelte` (Laporan Interaktif)
- `frontend/src/routes/tools/+page.svelte` (masih placeholder)
- `frontend/src/routes/opd/+page.svelte` (Profil OPD Pengguna)
- `frontend/src/routes/login/+page.svelte` (password + OTP 2 langkah)
- `frontend/src/routes/recovery/+page.svelte` (placeholder)
- `frontend/src/routes/profile/backup-codes/+page.svelte` (placeholder)
- `frontend/src/routes/profile/sessions/+page.svelte` (placeholder)
- `frontend/src/lib/services/api/{auth,preferences,assets,projects,reports,opd,client}.ts`
- `frontend/src/lib/stores/{auth,preferences,audit}.ts`
- `frontend/src/lib/auth/{permissions,route-guards}.{ts,test.ts}`
- `frontend/src/lib/mocks/{assets,projects,users,opd}.ts`
- `shared/src/enums.ts`, `shared/src/schemas/{asset,project,report,auth,opd}.ts`
- `shared/src/envelope.ts`
- `frontend/tests/e2e/{frontend-mvp.spec.ts, a11y.spec.ts, helpers.ts}`

### Kondisi frontend MVP saat ini (pasca-commit 211b1fc)

Yang sudah representatif terhadap PRD v1.3.7:

- Branding dan version label: `PRD v1.3.7`, `Aset Wilayah + Administrasi Proyek GIS`, dua pilar di dashboard, sidebar/footer rebrand.
- Single Active OPD dijaga: tidak ada OPD CRUD list, tidak ada transfer/relokasi, tidak ada cross-OPD filter di laporan/proyek, edit hanya untuk OPD aktif, E2E negative assertion untuk `Distribusi OPD`, `Grouping layer`, `Filter laporan OPD`, `Hapus OPD`, `transfer aset`, `CRUD OPD tambahan|relokasi|transfer antar-OPD`.
- Shared contract: `JenisAset` lengkap (tanah, bangunan, jalan, saluran, lapangan, makam, taman, lainnya), `StatusHak`, `RoleName`, `PermissionScope`, `PermissionKey` final, project document kind/stage/scan/verification status, project document file label/scan/checksum/version, project payment status, `AssetAttachment` dengan kind enum PRD + scan status + checksum + isSensitive + isVersioned + uploadedAt.
- Mock services: preferences path `/api/v1/prefs`, project bundle include-sensitive flags, omit-total Viewer untuk sensitive project document/file, permission helper tanpa alias legacy.
- Dashboard dua pilar: Pilar 1 Aset Wilayah (stat cards, map), Pilar 2 Administrasi Proyek GIS (proyek aktif, checklist dokumen, file dokumen, payment reference, output ke aset). GeoJSON failure mode ada, basemap tile error fallback ada.
- Project subnav: Ringkasan Proyek, Timeline & Milestone (`#timeline`), Dokumen & Checklist (permission-gated), Riwayat Pembayaran (payment-read-gated), Output ke Aset GIS (`#output-assets`).
- Laporan Interaktif: filters lengkap (jenis, hak, hasGeom, tahun, hasAttachment, hasSp2d), pagination, summary, groups, thematic map preview, async export job mock (Excel/Shapefile/Atlas PDF) dengan state WAITING→ACTIVE→COMPLETED.
- Auth login: 2 langkah (password → OTP), OTP rate-limit 3x → RATE_LIMITED, OTP code 123456, struktur envelope success/error.
- Audit log mock: `PROJECT_DOCUMENT_DOWNLOAD`, `PROJECT_DOCUMENT_DOWNLOAD_BLOCKED`, `PROJECT_DOCUMENT_VERIFY`, `PROJECT_DOCUMENT_FILE_DELETE` di localStorage dengan metadata terstruktur.
- E2E: 12 tests (admin smoke, viewer mutation blocked, OPD edit no CRUD, project create no OPD selector, document headers multi-file, document fixture invariants, single active OPD invariants, document role matrix, in-place role switch re-scope, payment role matrix, payment read-only/Finance absent, dashboard preferences/GeoJSON/search/export, basemap tile fallback).
- A11y: 5 tests untuk login + primary pages (login, dashboard, assets, projects, opd).

### Gap yang masih ada terhadap PRD v1.3.7

Dibagi menjadi tiga kategori: (A) PRD MVP/Go-live requirement yang belum di-cover, (B) quality/hardening yang menurunkan demo confidence, (C) docs/observability.

## Stakeholder decisions (Ojan, 2026-06-12) — all open questions resolved

Plan ini di-update berdasarkan jawaban Ojan terhadap 8 open questions. Keputusan final:

1. **Map-backed digitization** — WAJIB iterasi ini (Phase 2 mengeksekusi DigitizeMapPanel + geometry validation + E2E).
2. **Auth MVP hardening** (backup codes UI, sessions UI, email OTP fallback mock, recovery regen) — IKUT iterasi ini (Phase 3 mengeksekusi semua sub-task).
3. **Report presets CRUD** — IKUT iterasi ini (Phase 5 mengeksekusi route `/reports/presets` minimal CRUD mock).
4. **Tools route contract-first** (5 entry tile) — IKUT iterasi ini (Phase 4 mengeksekusi 5 entry tile: Excel, PDF, Shapefile ZIP, Atlas PDF, Import Preview).
5. **Mock `health` service** di frontend untuk demo readiness probe — PERLU (Phase 4 menambah `frontend/src/lib/services/api/health.ts` mock `GET /api/v1/health`).
6. **Mock export/import job polling `/api/v1/jobs/:id`** di `tools` (terkait export di `reports`) — PERLU (Phase 4 menambah mock job polling service yang dipakai baik `/reports` maupun `/tools`, dengan shared service `jobs.ts`).
7. **Sub-route baru `/projects/[id]/milestones` dan `/projects/[id]/assets`** (linked asset) — PERLU (Phase 6 menambah dua sub-route dengan mock data milestone dan project-asset link, plus perluasan `ProjectSubnav.svelte`).
8. **Mock UI notifikasi toast** — PERLU (Phase 7 membuat toast service terpusat `frontend/src/lib/stores/toast.ts` dengan komponen `<Toaster />` di layout, menggantikan inline toast di documents page).

Konsekuensi langsung:

- Negative scope tetap sama (Single Active OPD permanen, no finance/procurement, no real backend, no multi-OPD, no TRANSFER, no LPSE/SIRUP/SIPD/SP2D replacement, no project-management suite).
- Section `Open questions` lama dihapus dan diganti dengan sub-section `Resolved open questions` di akhir plan.
- Phase numbering di-revisi karena ada 2 phase baru (Phase 6 sub-routes project, Phase 7 toast service), dan Phase 4 diperluas dengan health + jobs polling.

## BA Handoff Brief (simantaba) — 2026-06-12

Verdict: **APPROVED_FOR_DEV** dengan 3 IMPORTANT fixes yang sudah diaplikasikan ke plan (lihat catatan `(updated setelah simantaba review)` di Phase 3, 4, 5) dan 5 MINOR fixes yang sebagian sudah difold-in.

### IMPORTANT fixes (sudah diaplikasikan)

1. **Phase 3 task 3** — backup-codes regenerate permission diubah ke `user:update` (view-status tetap `user:read`) sesuai PRD §7.8 (`POST /api/v1/users/:id/backup-codes/regenerate` butuh `user:update` dengan scope `self`/`own_opd`/`all`). Hedge "atau permission baru" dihapus.

2. **Phase 5 task 3** — report preset write permission diubah ke `report:preset_manage` sesuai PRD §6.1.2 dan §7.12. Deferral "BA putuskan" dihapus; PRD sudah menyelesaikan.

3. **Phase 4 task 3** — `jobs.ts` di-reword sebagai shared TypeScript wrapper yang membungkus tiga PRD-aligned job path (`/api/v1/export/jobs/:id`, `/api/v1/import/jobs/:id`, `/api/v1/bulk/jobs/:id`) dengan API surface `getExportJob`, `getImportJob`, `getBulkJob`, `pollJob(kind, id)`, `listJobs(kind)`. **Tidak ada path baru `/api/v1/jobs/:id`** — path PRD resmi dipakai. State FAILED di-handle dengan retry guidance (bukan dead-end).

### MINOR fixes (di-fold-in)

1. **Phase 4 Atlas PDF tile** — label tile diubah menjadi `Atlas PDF (Post-MVP depth, contract-only this iteration)` agar tidak kontradiksi dengan keputusan Ojan #4 yang memasukkan Atlas dalam 5 tile iterasi ini.
2. **Phase 2 task list** — tambah eksplisit "use dynamic import for leaflet/draw optional" sebagai acceptance item agar mitigasi bundle size tidak hanya di Risks.
3. **Phase 9 a11y list** — `<Toaster />` dari Phase 7 ditambahkan ke list a11y test target.

### Catatan untuk simantadev saat eksekusi

`shared/src/enums.ts` saat ini belum mencantumkan `user:update` dan `report:preset_manage` di `PermissionKey`. Simantadev harus menambahkan keduanya di awal Phase 3 (sebelum task backup codes regenerate) dan Phase 5 (sebelum task report preset write). Penambahan ini adalah **shared contract update** yang juga harus menambah unit test untuk whitelist (supaya tidak ada permission baru di luar PRD yang lolos).

## Ringkasan gap prioritas

### P0 — Kontrak/positioning yang berisiko menyesatkan stakeholder

1. PRD v1.3.7 menyebut `Administrasi Proyek GIS` sebagai pilar setara Aset Wilayah, tetapi Navbar (`frontend/src/lib/components/layout/Navbar.svelte`) masih memakai kicker `Frontend MVP SIMANTA` dan tagline `Contract-first prototype dengan mock persistence lokal/in-memory` yang tidak merepresentasikan nilai produk dua pilar. Pengunjung pertama aplikasi belum melihat narasi produk di posisi paling atas.
2. E2E sudah memvalidasi single active OPD invariant, tetapi halaman `/login` (route publik) belum punya E2E yang memastikan copy PRD v1.3.7 tampil, fallback email OTP message ada, dan rate limit ditunjukkan ke user. Login adalah first-impression stakeholder; risk terbesar branding/positioning ada di sini.
3. Halaman `/tools` (`frontend/src/routes/tools/+page.svelte`) masih satu paragraf placeholder `Import / Export / Atlas` yang kontras dengan sub-temap PRD MVP export Excel/PDF/Shapefile/Atlas (sudah ada mock di `/reports`). Sidebar entry `Import/Export/Atlas` menunjuk ke placeholder kosong.
4. `frontend/README.md` masih menyebut `frontend-only/mock until stakeholder review` tanpa status eksekusi iterasi berikutnya; reviewer baru bisa salah paham status MVP.

### P1 — MVP/Go-live requirement PRD v1.3.7 yang belum di-cover

1. **Map-backed asset digitization (PRD MVP)**: `AssetForm.svelte` masih memakai `geometryJson` textarea dengan placeholder `{"type":"Polygon","coordinates":[...]}`. PRD v1.3.7 §6 (geometry as source of truth) dan MVP behavior menghendaki digitasi langsung di peta (polygon untuk tanah/bangunan/lapangan/makam/taman, polyline untuk jalan/saluran, point untuk lainnya/POI). Mock `DigitizeMapPanel` yang menulis GeoJSON valid dengan leaflet-draw sudah masuk scope plan sebelumnya tetapi belum diimplementasikan.
2. **Map affordances PRD** (draw/search/measure): `MapContainer.svelte` sudah render basemap + GeoJSON + popup, tetapi belum punya kontrol `leaflet-draw`, `leaflet-search`, `leaflet-measure` sebagai affordance peta. Search ada di dashboard search bar (di luar peta), tetapi search-by-name di dalam peta belum ada.
3. **Auth MVP hardening**: `/login` 2-langkah sudah ada, tetapi:
   - Email OTP fallback message belum ada di UI.
   - Backup codes (`/profile/backup-codes`) masih placeholder card tanpa status regenerasi/one-time display warning.
   - Active sessions (`/profile/sessions`) masih placeholder tanpa mock refresh token list/force logout placeholder.
   - Recovery (`/recovery`) masih placeholder.
   - PRD §7.2 menghendaki email fallback aktif setelah password valid, backup codes 8 kode, active session list dengan device/IP/created_at, refresh token rotation dengan grace window 30s, force-logout per user.
4. **Tools/Export/Atlas route contract-first**: Export job mock sudah ada di `/reports`, tetapi `/tools` (sidebar entry) belum memuat contract-first mock untuk Shapefile ZIP, Atlas PDF (multi-page map booklet), dan import preview (two-phase: preview → commit). Untuk MVP, minimal perlu entry tile yang sama-sama jelas-jelas mock/contract-first dan menjelaskan status Post-MVP.
5. **Report presets CRUD (PRD §13)**: belum ada route `/reports/presets`; mock preset list di reports sudah inline. PRD menyebutkan report preset sebagai fitur MVP (saved query + share).
6. **Attachment contract depth di UI**: `AssetAttachment` schema sudah lengkap (kind enum PRD, scan status, checksum, isActive, isVersioned, quarantineObjectKey), tetapi UI `AttachmentList.svelte` masih minimal: tampilkan filename + kind + uploadedAt + badge Sensitif. PRD v1.3.7 metadata lain (objectKey, mimeType, sizeBytes, scanStatus, checksum, audit/download guard) belum ditampilkan di mock UI; tidak ada mock audit event `ATTACHMENT_UPLOAD`/`ATTACHMENT_DOWNLOAD`/`ATTACHMENT_DELETE` di frontend (audit store `audit.ts` hanya memuat event project document).
7. **A11y coverage expansion**: 5 tests a11y saat ini untuk login + dashboard + assets + projects + opd. Belum di-cover: `/projects/[id]/documents`, `/projects/[id]/payments`, `/assets/create`, `/assets/[id]/edit`, `/profile/backup-codes`, `/profile/sessions`, `/recovery`, `/tools`. PRD a11y target Lighthouse ≥95 dan axe-core CI.
8. **Geometry validation flow**: PRD §6 menulis `ST_IsValid` + `ST_MakeValid` pada write; untuk frontend MVP, validasi geometri vs jenis (Polygon vs LineString vs Point) belum diformalkan di `AssetForm` mock; tidak ada mock error envelope `VALIDATION_FAILED` dengan field errors untuk mismatch geometry.
9. **Maintenance/observability MVP**: belum ada mock route `/api/v1/health` (readiness probe) dan `/api/v1/jobs/:id` (export job status) di services; PRD §15 (operational) menghendaki health endpoint dan job status poll.

### P2 — Polish / maintainability / docs

1. **Code maintainability**: beberapa file Svelte route (mis. `assets/+page.svelte`, `reports/+page.svelte`) masih satu-baris panjang yang menurunkan readability. Iterasi berikutnya dapat melakukan refactor kecil per file dengan tes lulus.
2. **Document fixture integrity**: `frontend/src/lib/mocks/projects.ts` sudah punya invariant verified-header→active-clean-file, tetapi belum ada unit test yang mengunci invariant ini di level fixture (ada E2E test, belum ada unit test di `mocks/projects.test.ts`).
3. **Asset history unit test**: sudah ada test `do not expose legacy TRANSFER lifecycle actions`, tetapi belum ada test yang mengunci lifecycle actions yang BOLEH muncul (CREATE, UPDATE, GEOMETRY_UPDATE, RESPONSIBILITY_UPDATE, ARCHIVE, RESTORE).
4. **PRD v1.3.7 MVP report**: `docs/mvp/2026-06-08_e2e-browser-testing-advice-prd-1-3-6.md` masih menyebut PRD v1.3.6 di judul. Reviewer akan bingung apakah advice ini masih berlaku. Perlu minor update judul/body menjadi PRD v1.3.7.
5. **Mock audit untuk attachment upload/download/delete**: PRD v1.3.7 §10 audit action termasuk `ATTACHMENT_UPLOAD`/`ATTACHMENT_DOWNLOAD`/`ATTACHMENT_DELETE`; saat ini mock audit store belum memuat action itu.

## Proposed approach

Tetap contract-first frontend MVP. Tidak membangun backend Hono/Postgres/PostGIS nyata pada iterasi ini. Mock service layer adalah single source of truth untuk data, semua perubahan mock response mengikuti envelope PRD. Setiap gap UI harus disertai:

- Negative E2E assertion yang mencegah kembalinya out-of-scope (multi-OPD, finance/procurement workflow, TRANSFER legacy, PRD v1.3.6 label).
- Unit test untuk shared contract jika ada perubahan.
- A11y test untuk halaman baru/yang dipersenjatai.

Urutan eksekusi disarankan (lihat Step-by-step plan). Iterasi ini TIDAK menyentuh backend, dan TIDAK menambah scope produk di luar PRD v1.3.7.

## In-scope untuk pekerjaan frontend MVP berikutnya

- Rebrand kecil Navbar/login/tools agar konsisten dengan positioning dua pilar.
- Map-backed asset digitization (mock DigitizeMapPanel) untuk create/edit, dengan validasi geometri vs jenis.
- Auth MVP hardening: backup codes, active sessions, email OTP fallback, recovery code regeneration (semua mock/contract-first).
- Tools route contract-first entry tiles: Excel, PDF, Shapefile ZIP, Atlas, Import Preview.
- Report presets route minimal (list mock + simpan preset mock).
- Attachment UI metadata lengkap (mime, size, checksum, scan status) + mock audit event.
- A11y test expansion ke route baru/kritis.
- PRD v1.3.7 MVP report update judul/body.
- Unit test kecil untuk fixture invariant (lifecycle actions, verified→active-clean).

## Explicit out-of-scope / negative scope

- Tidak membangun backend Hono/Postgres/PostGIS nyata di slice ini.
- Tidak menambah active multi-OPD, OPD CRUD list, OPD transfer, cross-OPD filter, inter-OPD relocation.
- Tidak menggantikan LPSE/SIRUP/SIPD/SP2D/finance — payment page tetap read-only administrative reference.
- Tidak menambah project-management suite: tidak ada task/resource planning, kanban vendor, approval workflow multi-level.
- Tidak mengklaim upload/download file benar-benar memakai MinIO/signed URL/antivirus scan — tetap label mock/contract-first.
- Tidak mengklaim export job benar-benar diproses BullMQ worker — tetap label mock async queue contract.
- Tidak menambah Sub OPD/Bidang/UPT UI (PRD v1.3.6 menyebut ini internal grouping, bukan fitur UI aktif).
- Tidak membangun PostGIS spatial index/clustering — geometry tetap mock GeoJSON.

## Step-by-step plan

### Phase 0 — BA handoff singkat sebelum execution

Tujuan: mengunci prioritas dan batasan scope, dengan merujuk pada keputusan Ojan yang sudah final.

Tasks:
1. Minta `simantaba` memvalidasi daftar gap P0/P1/P2 di plan ini terhadap PRD v1.3.7, dengan keputusan Ojan pada 2026-06-12 (lihat section `Stakeholder decisions` di awal plan) sebagai constraint.
2. Wording UI yang sudah disetujui sebelumnya (tidak boleh diubah):
   - Dashboard: `Dashboard Aset & Proyek GIS`.
   - Heading modul proyek: `Administrasi Proyek GIS`.
   - Payment page: `Riwayat Pembayaran` read-only.
3. Viewer omit total dokumen/file sensitif tetap kebijakan final (sudah implemented di 211b1fc, tidak boleh dilonggarkan).
4. Export/Atlas/Import nanti membutuhkan review manifest/template detail (sudah disepakati sebelumnya, bukan scope iterasi ini).
5. Karena semua open question sudah terjawab, BA handoff hanya memastikan scope yang sudah final dapat dieksekusi tanpa drift. Tidak ada lagi pertanyaan open yang menunggu jawaban Ojan.

Output: BA handoff brief verdict `APPROVED_FOR_DEV` dari `simantaba` dengan constraint scope di atas dan keputusan 8 poin Ojan.

### Phase 1 — P0 branding/positioning rebrand kecil

Tujuan: konsistensi narasi dua pilar di titik masuk aplikasi.

Likely files:
- `frontend/src/lib/components/layout/Navbar.svelte` (kicker/subtitle, hint dua pilar)
- `frontend/src/routes/login/+page.svelte` (subtitle dan rate-limit copy)
- `frontend/src/routes/tools/+page.svelte` (contract-first placeholder dengan daftar entry tile)
- `frontend/README.md` (status MVP + link plan ini)
- `frontend/tests/e2e/frontend-mvp.spec.ts` (assertion Navbar/login/tools copy)

Tasks:
1. Navbar: kicker `Frontend MVP SIMANTA` → `SIMANTA · Aset Wilayah & Administrasi Proyek GIS` (atau wording setara yang disetujui BA). Subtitle menjelaskan mock persistence.
2. Login: subtitle `Login mock dua langkah: password lalu OTP WhatsApp` → tetap, tapi tambahkan hint read-only administrative reference.
3. Tools route: ganti paragraf placeholder dengan grid entry tile (Excel, Shapefile, PDF, Atlas, Import Preview), masing-masing berlabel mock/contract-first dan menunjuk endpoint produksi.
4. README: tambah bagian "Iteration status" dengan referensi ke plan ini.
5. E2E assertion untuk Navbar dua pilar dan Tools entry tile.

Acceptance criteria:
- Navbar mengandung wording dua pilar (Aset Wilayah + Administrasi Proyek GIS).
- Tools route punya entry tile dengan label mock/contract-first; bukan paragraf placeholder.
- E2E lulus untuk copy baru.

### Phase 2 — Map-backed asset digitization mock

Tujuan: PRD MVP behavior "digitasi langsung di peta", walaupun mock.

Likely files:
- `frontend/src/lib/components/map/MapContainer.svelte` (perlu export mode opsional)
- `frontend/src/lib/components/map/DigitizeMapPanel.svelte` (baru)
- `frontend/src/lib/components/crud/AssetForm.svelte` (embed DigitizeMapPanel)
- `frontend/src/routes/assets/create/+page.svelte`
- `frontend/src/routes/assets/[id]/edit/+page.svelte`
- `shared/src/geojson.ts` (tidak diubah, dipakai apa adanya)
- `frontend/src/lib/components/map/digitize.test.ts` (baru)
- `frontend/tests/e2e/frontend-mvp.spec.ts` (test create polygon/line/point mock)

Tasks:
1. `DigitizeMapPanel` adalah mock `MapContainer` extended dengan mode `digitize-{polygon,line,point}`:
   - polygon: tombol tambah vertex, double-click close ring, output GeoJSON Polygon/MultiPolygon.
   - line: tombol tambah vertex, double-click end, output GeoJSON LineString/MultiLineString.
   - point: klik pada peta, output GeoJSON Point.
   - tombol undo/clear/save (simpan ke state form).
2. `AssetForm.svelte` menambah tab: `Peta (digitasi)` dan `GeoJSON (raw)`. Default tab `Peta`. Raw GeoJSON tetap tersedia untuk power user/import.
3. Validasi geometry vs jenis:
   - tanah/bangunan/lapangan/makam/taman → Polygon/MultiPolygon.
   - jalan/saluran → LineString/MultiLineString.
   - lainnya → Point.
   - Mismatch → mock envelope `VALIDATION_FAILED` dengan `field_errors.geometryType`.
4. Mock `leaflet-draw` opsional: gunakan **dynamic import** untuk leaflet/draw dari `DigitizeMapPanel.svelte` agar bundle map tidak membengkak. Sediakan mode mock fallback dengan klik-tambah-vertex saja; tetap catat di UI sebagai `mock digitizer (MVP)`. Dynamic import ini adalah acceptance item, bukan hanya mitigasi di Risks.
5. E2E: create polygon (tanah), edit line (jalan), validasi mismatch geometry untuk jenis `lainnya` (point) yang diberi polygon → blok + tampilkan error.

Acceptance criteria:
- Create/edit asset punya tab Peta yang bisa menghasilkan GeoJSON valid untuk polygon, line, point.
- Mismatch jenis→geometri menghasilkan UI error yang konsisten dengan envelope error.
- E2E lulus untuk create polygon, create line, validasi mismatch.

### Phase 3 — Auth MVP hardening (mock/contract-first)

Tujuan: halaman auth/recovery/profile punya mock UI yang merepresentasikan kontrak PRD, bukan paragraf placeholder.

Likely files:
- `frontend/src/routes/login/+page.svelte` (email OTP fallback hint, rate-limit copy)
- `frontend/src/routes/recovery/+page.svelte` (mock flow)
- `frontend/src/routes/profile/backup-codes/+page.svelte` (status, regenerate placeholder, one-time display warning)
- `frontend/src/routes/profile/sessions/+page.svelte` (mock session list + force-logout placeholder)
- `frontend/src/lib/services/api/auth.ts` (mock `requestEmailOtp`, `regenerateBackupCodes`, `listSessions`, `forceLogoutSession`)
- `shared/src/schemas/auth.ts` (jika ada tambahan tipe: `EmailOtpRequest`, `BackupCodesResponse`, `SessionDevice`)
- `frontend/src/lib/mocks/users.ts` (fixture backup codes + sessions)
- `frontend/src/lib/auth/permissions.ts` (permission `user:read` untuk list sessions; permission `user:force_logout` untuk force logout — sudah ada di `PermissionKey` sesuai PRD §9)
- `frontend/tests/e2e/frontend-mvp.spec.ts` dan `a11y.spec.ts`

Tasks:
1. **Login**: tambah blok info kecil di bawah form OTP yang menjelaskan fallback email OTP aktif setelah password valid (PRD §7.2) — copy contract-first, tidak klaim pengiriman email nyata.
2. **Recovery**: ubah dari placeholder card menjadi mock flow 2 langkah: (a) masukkan email → mock response dengan rate-limit; (b) masukkan kode fallback → mock success. Tetapkan label mock/contract-first.
3. **Backup codes** (updated setelah simantaba review): tampilkan status "8 kode tersedia / 0 tersisa", tombol `Regenerasi (mock)` dengan modal konfirmasi one-time display warning; hasil regen menampilkan 8 kode mock satu kali dengan peringatan "salin sekarang, hanya ditampilkan sekali". Permission gate eksplisit per PRD §7.8: status view `user:read`; tombol regenerate `user:update` (scope `self` / `own_opd` / `all` sesuai PRD §7.8).
4. **Active sessions**: tampilkan mock list 2-3 sesi (device, IP mock, created_at, last_seen_at). Tombol "Force logout sesi ini" placeholder permission-gated (`user:force_logout`). Tombol "Logout semua sesi" placeholder global.
5. Mock API: tambahkan `requestEmailOtp(email)`, `regenerateBackupCodes()`, `listSessions()`, `forceLogoutSession(id)`, `forceLogoutAll()` dengan envelope success/error PRD dan audit event opsional.
6. E2E: alur backup codes regenerate placeholder, sessions list tampil, force-logout button gate (Viewer tidak melihat tombol).
7. A11y: route baru (backup-codes, sessions, recovery) punya test a11y.

Acceptance criteria:
- Semua halaman auth/recovery/profile punya mock UI kontrak-akurat dengan label jelas mock.
- Permission gate mencegah Viewer dari action mutation.
- E2E + a11y lulus.

### Phase 4 — Tools route contract-first + health service + jobs polling

Tujuan: ubah placeholder `/tools` menjadi entry tile yang merepresentasikan MVP export/import/atlas sebagai mock contract, plus mock `health` readiness probe dan shared job polling service `/api/v1/jobs/:id`.

Likely files:
- `frontend/src/routes/tools/+page.svelte`
- `frontend/src/lib/services/api/tools.ts` (baru: mock endpoint `excel`, `shapefile`, `pdf`, `atlas`, `import-preview`)
- `frontend/src/lib/services/api/jobs.ts` (baru: shared `getJob(id)`, `pollJob(id)`, `listJobs()`)
- `frontend/src/lib/services/api/health.ts` (baru: mock `GET /api/v1/health`)
- `frontend/src/routes/reports/+page.svelte` (refactor export job panel untuk pakai `jobs.ts` shared service)
- `shared/src/schemas/tools.ts` (baru: mock job schema)
- `shared/src/schemas/jobs.ts` (baru: `Job`, `JobState`, `JobTemplate`)
- `frontend/tests/e2e/frontend-mvp.spec.ts`

Tasks:
1. **Tools entry tile** (5 jenis, keputusan Ojan #4):
   - `Export Excel` (mock job queue, integrasi ke `jobs.ts`).
   - `Export Shapefile ZIP` (mock job; per geometri dipisah sesuai PRD §13).
   - `Export PDF` (mock job).
   - `Atlas PDF` (mock multi-page map booklet, contract-only this iteration; Post-MVP depth).
   - `Import Preview` (mock two-phase: upload → preview → commit).
2. **Health service** (keputusan Ojan #5):
   - `frontend/src/lib/services/api/health.ts` mock `GET /api/v1/health` mengembalikan `{status, services: {db, redis, minio, queue}, version, buildTime}`.
   - Badge kecil di Navbar (mode mock) menampilkan status ringkas + tooltip detail.
   - Unit test `health.test.ts` untuk envelope dan fallback mode.
3. **Jobs polling service** (keputusan Ojan #6, updated setelah simantaba review):
   - `frontend/src/lib/services/api/jobs.ts` adalah **shared TypeScript wrapper** yang membungkus tiga PRD-aligned job path: `/api/v1/export/jobs/:id`, `/api/v1/import/jobs/:id`, `/api/v1/bulk/jobs/:id`. API surface: `getExportJob(id)`, `getImportJob(id)`, `getBulkJob(id)`, `pollJob(kind, id)`, `listJobs(kind)`. State machine `WAITING → ACTIVE → COMPLETED`/`FAILED` dengan progress dan error metadata.
   - **Tidak ada path baru `/api/v1/jobs/:id`** — semua endpoint mock merujuk ke path PRD resmi. Saat runtime API mode real, mock URL helper akan mengarah ke path PRD; mock mode akan ke localStorage-backed state machine.
   - Halaman `/tools` dan `/reports` sama-sama memakai `jobs.ts` (refactor `reports/+page.svelte` inline `queueExportJob`/`pollExportJob` ke shared service). `/reports` hanya memakai `getExportJob`; `/tools` memakai `getExportJob` (Excel, PDF, Shapefile, Atlas) dan `getImportJob` (Import Preview).
   - Modal/polling UI di `/tools` menampilkan job yang dibuat dari entry tile, dengan tombol `Buka di /reports` atau `Download mock` saat COMPLETED. State FAILED menampilkan retry guidance action (bukan dead-end).
4. Setiap tile menampilkan: deskripsi singkat, label `Mock / Contract-first`, endpoint produksi yang dituju (`/api/v1/reports/exports`, `/api/v1/imports/preview`, dst).
5. Tidak ada active CRUD import — hanya preview mock dengan disclaimer.
6. E2E: tile tampil, klik Excel/PDF membuka job state mock dan polling menampilkan transisi state.

Acceptance criteria:
- `/tools` punya 5 entry tile dengan label mock/contract-first.
- `/api/v1/health` mock service ada dan dipakai di Navbar badge.
- Shared `jobs.ts` service dipakai baik `/reports` maupun `/tools`; tidak ada duplikasi state machine.
- E2E lulus.

### Phase 5 — Report presets route minimal

Tujuan: PRD §13 menyebut report preset MVP. Cukup route minimal list + simpan preset mock.

Likely files:
- `frontend/src/routes/reports/presets/+page.svelte` (baru)
- `frontend/src/lib/services/api/reports.ts` (`saveReportPreset`, `listReportPresets`, `deleteReportPreset` mock)
- `shared/src/schemas/report.ts` (`ReportPreset`)
- `frontend/src/lib/auth/permissions.ts` (permission `report:read` + tulis placeholder)
- `frontend/tests/e2e/frontend-mvp.spec.ts` dan `a11y.spec.ts`

Tasks:
1. Tambah menu `Presets` di halaman `/reports` (link kecil ke `/reports/presets`).
2. Route `/reports/presets`:
   - List preset mock (3 preset: `Aset Tanah Belum Dipetakan`, `Saluran + Jalan Koridor`, `Aset per Jenis`).
   - Tombol `Simpan preset dari filter saat ini` (mock: simpan ke localStorage dengan envelope).
   - Tombol `Hapus` mock.
3. Permission: route gate `report:read`; tulis action gate `report:preset_manage` (updated setelah simantaba review, per PRD §6.1.2 dan §7.12; tidak perlu BA putuskan atau permission baru). PRD endpoint references: `POST/PUT/DELETE /api/v1/reports/presets` dan `.../presets/:id`.
4. A11y test untuk route baru.

Acceptance criteria:
- Route presets render dengan list mock, tombol simpan/hapus mock.
- A11y + E2E lulus.

### Phase 6 — Project sub-routes (milestones, linked assets)

Tujuan: PRD §11 menyebut sub-navigation proyek GIS (Ringkasan, Timeline & Milestone, Dokumen & Checklist, Riwayat Pembayaran, Output ke Aset GIS). Anchor hash `#timeline` dan `#output-assets` di ringkasan proyek adalah placeholder visual; untuk MVP, dua sub-route baru ini diekstrak menjadi route terpisah dengan mock data.

Likely files:
- `frontend/src/routes/projects/[id]/milestones/+page.svelte` (baru)
- `frontend/src/routes/projects/[id]/assets/+page.svelte` (baru)
- `frontend/src/lib/components/projects/ProjectSubnav.svelte` (anchor → route)
- `frontend/src/lib/components/projects/ProjectMilestoneList.svelte` (baru)
- `frontend/src/lib/components/projects/ProjectAssetLinkList.svelte` (baru)
- `shared/src/schemas/project.ts` (cek tipe `ProjectMilestone` dan `ProjectAssetLink` sudah ada)
- `frontend/src/lib/services/api/projects.ts` (jika perlu pemisahan mock fetcher)
- `frontend/tests/e2e/frontend-mvp.spec.ts`
- `frontend/tests/e2e/a11y.spec.ts`

Tasks:
1. **`/projects/[id]/milestones`** (keputusan Ojan #7):
   - Mock list `ProjectMilestone` (plannedDate, actualDate, notes) dengan grouping by stage atau sort by date.
   - Timeline visual sederhana (vertical timeline: planned, actual, deviation marker).
   - Status badge: `Selesai`, `Terjadwal`, `Tertunda` berdasarkan `actualDate` vs `plannedDate`.
   - Permission read: `project:read`. Tidak ada action tulis (milestone adalah data referensi dari procurement/implementation, bukan user-created di MVP frontend).
2. **`/projects/[id]/assets`** (keputusan Ojan #7):
   - Mock list `ProjectAssetLink` dengan link ke detail aset (`/assets/[id]`).
   - Tampilan: nama aset, ID Pemda, jenis, relation (`updated`, `surveyed`, `migrated`, `created`, `linked`).
   - Counter output ke aset GIS di dashboard sudah ada; sub-route ini adalah deep dive.
   - Permission read: `project:read` + `asset:read` (gate di route guard).
3. **`ProjectSubnav.svelte`**: anchor `#timeline` → route `/projects/[id]/milestones`; anchor `#output-assets` → route `/projects/[id]/assets`. Permission gate yang sama (semua role dengan `project:read` boleh lihat).
4. E2E: navigasi dari `/projects/[id]` ke sub-route baru; Viewer boleh read tapi tidak boleh edit (tidak ada action edit, otomatis PASS).
5. A11y test untuk route baru.

Acceptance criteria:
- 2 sub-route baru berfungsi dengan mock data.
- ProjectSubnav menggunakan route, bukan anchor.
- E2E + a11y lulus.

### Phase 7 — Notification toast service terpusat

Tujuan: PRD tidak secara eksplisit menyebut toast service, tetapi MVP frontend membutuhkan pola notifikasi terpusat agar konsisten (saat ini hanya inline toast di documents page). Keputusan Ojan #8 memastikan ini mock/contract-first.

Likely files:
- `frontend/src/lib/stores/toast.ts` (baru: `Toast` writable, helpers `pushToast`, `dismissToast`, auto-dismiss timer)
- `frontend/src/lib/components/layout/Toaster.svelte` (baru: komponen yang subscribe `toast` store, render di pojok kanan atas)
- `frontend/src/lib/components/layout/AppShell.svelte` (mount `<Toaster />`)
- `frontend/src/routes/projects/[id]/documents/+page.svelte` (refactor inline `auditToast` ke `pushToast`)
- `frontend/src/routes/projects/[id]/payments/+page.svelte` (jika ada inline toast)
- `frontend/src/routes/login/+page.svelte` (error message → toast)
- `frontend/src/routes/dashboard/+page.svelte` (preferenceStatus → toast)
- `frontend/src/lib/stores/toast.test.ts` (baru)
- `frontend/tests/e2e/frontend-mvp.spec.ts` (toast muncul lalu auto-dismiss)

Tasks:
1. `toast.ts` store: `Toast = {id, kind: 'info' | 'success' | 'warning' | 'error', message, durationMs}`; default `durationMs=4000`; auto-dismiss via `setTimeout`; queue max 5 (FIFO drop oldest).
2. `<Toaster />` komponen: posisi fixed top-right, `role="status"` dan `aria-live="polite"` untuk a11y; tombol close manual; warna mengikuti `kind` (info=cyan, success=emerald, warning=amber, error=rose); ikon lucide-svelte.
3. Refactor `documents/+page.svelte` dari inline `{#if auditToast}<div ...>` ke `pushToast({kind: 'info', message: auditToast})`.
4. A11y: `aria-live`, keyboard dismissible (Escape).
5. Unit test `toast.test.ts`: push, auto-dismiss, queue max 5.
6. E2E: trigger action di documents → toast muncul di pojok kanan atas → auto-dismiss.

Acceptance criteria:
- Toast service terpusat ter-mount di `AppShell.svelte`.
- Semua inline toast/notifikasi di-refactor menggunakan `pushToast`.
- Unit + E2E + a11y lulus.

### Phase 8 — Attachment metadata depth + audit event

Tujuan: `AttachmentList.svelte` menampilkan metadata PRD lengkap dan ada mock audit event `ATTACHMENT_UPLOAD/DOWNLOAD/DELETE`.

Likely files:
- `frontend/src/lib/components/crud/AttachmentList.svelte`
- `frontend/src/lib/stores/audit.ts` (tambah action attachment)
- `frontend/src/routes/assets/[id]/+page.svelte` (kaitkan mock upload/download/delete dengan audit)
- `frontend/src/lib/mocks/assets.ts` (fixture attachment dengan checksum + scanStatus varied)
- `frontend/src/lib/stores/audit.test.ts` (baru)
- `frontend/tests/e2e/frontend-mvp.spec.ts`

Tasks:
1. `AttachmentList` menampilkan: filename, kind, mimeType, sizeBytes (KB/MB formatted), checksum (short 8 char), scanStatus badge, isActive flag, isSensitive badge.
2. Mock tombol `Download` dan `Hapus` di tiap attachment; klik → audit event baru (`ATTACHMENT_DOWNLOAD` / `ATTACHMENT_DELETE`).
3. Mock tombol `Upload` (multi-file mock) di halaman detail aset → audit event `ATTACHMENT_UPLOAD`.
4. Permission gate: `asset:update` untuk upload/delete, `asset:read` untuk download (Viewer bisa download non-sensitive; blocked untuk sensitive).
5. E2E: upload mock → audit entry; download blocked untuk sensitive → audit `ATTACHMENT_DOWNLOAD_BLOCKED` (bukan project document blocked, tapi attachment blocked dengan field `isSensitive`).

Acceptance criteria:
- UI menampilkan metadata PRD lengkap.
- Audit event attachment ada di store dan tampil di `/audit`.
- E2E lulus.

### Phase 9 — A11y coverage expansion

Tujuan: axe-core pass untuk route baru/kritis.

Likely files:
- `frontend/tests/e2e/a11y.spec.ts`

Tasks:
1. Tambah a11y test untuk:
   - `/projects/[id]/documents`
   - `/projects/[id]/payments`
   - `/projects/[id]/milestones` (Phase 6, baru)
   - `/projects/[id]/assets` (Phase 6, baru)
   - `/assets/create`
   - `/assets/[id]/edit`
   - `/profile/backup-codes`
   - `/profile/sessions`
   - `/recovery`
   - `/tools`
   - `/reports/presets`
   - `<Toaster />` (Phase 7, komponen global — validasi `aria-live="polite"` dan `role="status"` benar)
2. Untuk halaman dengan tabel kompleks (documents, payments, milestones, project asset links), tambahkan skip-link/landmark check.
3. Untuk halaman baru, validasi `aria-label`, heading levels, kontras, dan `<Toaster />` (Phase 7) punya `aria-live` yang benar.

Acceptance criteria:
- axe-core tidak ada critical violation untuk seluruh route MVP.
- `npm run test:a11y` PASS.

### Phase 10 — Docs update dan fixture invariant unit tests

Tujuan: menurunkan risiko salah paham reviewer.

Likely files:
- `docs/mvp/2026-06-08_e2e-browser-testing-advice-prd-1-3-6.md` (rename atau update judul menjadi v1.3.7)
- `docs/mvp/2026-06-12_iteration-gap-plan-v1-3-7.md` (ringkasan hasil iterasi, opsional, hanya jika BA minta)
- `frontend/src/lib/mocks/projects.test.ts` (tambah invariant unit test)
- `frontend/src/lib/mocks/assets.test.ts` (tambah lifecycle action whitelist test)
- `frontend/src/lib/services/api/health.ts` (opsional mock `GET /api/v1/health`)

Tasks:
1. Update judul/header laporan E2E agar merepresentasikan v1.3.7.
2. Unit test: `verified` document header harus punya `active` file `clean`; lifecycle actions yang muncul hanya dari whitelist PRD.
3. Mock `health` service sudah masuk Phase 4 (keputusan Ojan #5), tidak diulang di phase ini.

Acceptance criteria:
- Laporan v1.3.7 mudah ditemukan, tidak lagi berjudul v1.3.6.
- Unit test fixture invariant PASS.

### Phase 11 — Verification, BA review, OMP review

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
- `npm run test`: semua unit test PASS (termasuk fixture invariant baru).
- `npm run build`: PASS.
- `npm run test:e2e`: PASS untuk semua skenario baru (digitization, auth MVP, tools, presets, attachment audit, viewer omit, role matrix).
- `npm run test:a11y`: PASS untuk route baru.
- `npm run verify:mvp`: PASS penuh.

Review berurutan:
1. BA `simantaba` post-implementation review → verdict `PASS` atau list required fix.
2. OMP v15.10.8 adversarial review (jika ada diff yang bermakna) → `APPROVED` atau `REQUEST_CHANGES`.
3. Ojan accept/deny gate sebelum commit/push.

## Files likely to change (ringkasan)

Frontend Svelte routes & components:

- `frontend/src/lib/components/layout/Navbar.svelte` (Phase 1: kicker dua pilar, health badge dari Phase 4)
- `frontend/src/lib/components/layout/AppShell.svelte` (Phase 7: mount `<Toaster />`)
- `frontend/src/lib/components/layout/Toaster.svelte` (Phase 7, baru)
- `frontend/src/lib/components/map/MapContainer.svelte` (Phase 2: support mode opsional)
- `frontend/src/lib/components/map/DigitizeMapPanel.svelte` (Phase 2, baru)
- `frontend/src/lib/components/crud/AssetForm.svelte` (Phase 2: tab Peta + validasi)
- `frontend/src/lib/components/crud/AttachmentList.svelte` (Phase 8: metadata lengkap)
- `frontend/src/lib/components/projects/ProjectSubnav.svelte` (Phase 6: anchor → route)
- `frontend/src/lib/components/projects/ProjectMilestoneList.svelte` (Phase 6, baru)
- `frontend/src/lib/components/projects/ProjectAssetLinkList.svelte` (Phase 6, baru)
- `frontend/src/routes/login/+page.svelte` (Phase 1, 3, 7: copy, email OTP fallback hint, error → toast)
- `frontend/src/routes/recovery/+page.svelte` (Phase 3: mock flow 2 langkah)
- `frontend/src/routes/tools/+page.svelte` (Phase 1, 4: entry tile 5 jenis + job polling UI)
- `frontend/src/routes/reports/+page.svelte` (Phase 4: refactor ke shared `jobs.ts`)
- `frontend/src/routes/reports/presets/+page.svelte` (Phase 5, baru)
- `frontend/src/routes/profile/backup-codes/+page.svelte` (Phase 3: status + regen + one-time display)
- `frontend/src/routes/profile/sessions/+page.svelte` (Phase 3: list + force-logout)
- `frontend/src/routes/assets/create/+page.svelte` (Phase 2: tab Peta)
- `frontend/src/routes/assets/[id]/edit/+page.svelte` (Phase 2: tab Peta)
- `frontend/src/routes/assets/[id]/+page.svelte` (Phase 8: kaitkan audit attachment)
- `frontend/src/routes/projects/[id]/milestones/+page.svelte` (Phase 6, baru)
- `frontend/src/routes/projects/[id]/assets/+page.svelte` (Phase 6, baru)
- `frontend/src/routes/projects/[id]/documents/+page.svelte` (Phase 7: refactor inline toast)
- `frontend/src/routes/projects/[id]/payments/+page.svelte` (Phase 7: refactor inline toast jika ada)
- `frontend/src/routes/dashboard/+page.svelte` (Phase 7: preferenceStatus → toast)

Frontend services, stores, auth:

- `frontend/src/lib/services/api/auth.ts` (Phase 3: mock email OTP, backup codes, sessions, force logout)
- `frontend/src/lib/services/api/tools.ts` (Phase 4, baru)
- `frontend/src/lib/services/api/jobs.ts` (Phase 4, baru: shared job polling)
- `frontend/src/lib/services/api/health.ts` (Phase 4, baru: mock readiness probe)
- `frontend/src/lib/services/api/reports.ts` (Phase 5: tambah preset CRUD mock)
- `frontend/src/lib/services/api/health.test.ts` (Phase 4, baru)
- `frontend/src/lib/stores/audit.ts` (Phase 8: tambah action attachment)
- `frontend/src/lib/stores/audit.test.ts` (Phase 8, baru)
- `frontend/src/lib/stores/toast.ts` (Phase 7, baru)
- `frontend/src/lib/stores/toast.test.ts` (Phase 7, baru)
- `frontend/src/lib/mocks/users.ts` (Phase 3: fixture backup codes + sessions)
- `frontend/src/lib/auth/permissions.ts` (Phase 3: permission gate backup/sessions; Phase 5: report preset write)

Shared types:

- `shared/src/schemas/auth.ts` (Phase 3: tipe sesi, backup codes, email OTP request)
- `shared/src/schemas/report.ts` (Phase 5: `ReportPreset`)
- `shared/src/schemas/tools.ts` (Phase 4, baru)
- `shared/src/schemas/jobs.ts` (Phase 4, baru: `Job`, `JobState`, `JobTemplate`)

Tests:

- `frontend/tests/e2e/frontend-mvp.spec.ts` (semua phase: digitization, auth MVP, tools, presets, jobs, attachment audit, role matrix baru, sub-routes, toast)
- `frontend/tests/e2e/a11y.spec.ts` (Phase 9: route baru/kritis)
- `frontend/src/lib/components/map/digitize.test.ts` (Phase 2, baru)
- `frontend/src/lib/mocks/projects.test.ts` (Phase 10: invariant unit test)
- `frontend/src/lib/mocks/assets.test.ts` (Phase 10: lifecycle whitelist unit test)

Docs:

- `docs/mvp/2026-06-08_e2e-browser-testing-advice-prd-1-3-6.md` (Phase 10: judul/body update v1.3.7)
- `frontend/README.md` (Phase 1: status MVP + link plan ini)

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

Kriteria pass per phase sudah ditulis di tiap phase. Negative E2E assertions tambahan yang harus dijaga:

- Tidak ada kata `PRD v1.3.6` di UI aktif.
- Tidak ada kata `Web GIS Pemetaan Wilayah` (hanya) di subtitle aktif.
- Tidak ada kata `Manajemen Proyek GIS` (hanya) di heading aktif.
- Tidak ada `transfer aset`, `CRUD OPD tambahan`, `Filter laporan OPD`, `Grouping layer` di DOM aktif.
- Tidak ada action label `approve`, `bayar`, `proses pembayaran`, `workflow finance`, `procurement workflow`.
- Tidak ada `TRANSFER` di `AssetHistoryItem` action.
- `/api/v1/prefs` adalah path mock preference (bukan `/api/v1/preferences`).
- Permission keys menggunakan PRD final (`asset:create`, `asset:update`, `project:create`, `project:update`, `opd:update`, `project:document_read`, `project:document_write`, `project:document_verify`, `project:payment_read`, `prefs:read`, `prefs:update`, `audit:read`).
- Viewer omit total dokumen/file sensitif (sudah ada, dijaga).
- Dashboard mengandung dua pilar `Aset Wilayah` + `Administrasi Proyek GIS`.

## Risks, tradeoffs, open questions

### Risks

1. **Bundle size Leaflet + leaflet-draw/measure/search**: stack Leaflet sudah di-import dinamis di `MapContainer.svelte`. Jika `DigitizeMapPanel` menambah `leaflet-draw` dll., bundle map bisa membengkak. Mitigasi: dynamic import di `DigitizeMapPanel`; tetap sediakan mode mock tanpa leaflet-draw sebagai fallback.
2. **Time-to-implement map-backed digitization**: merupakan pekerjaan non-trivial. Jika Ojan memilih defer ke iterasi setelah, Phase 2 dan sebagian dari Phase 1/6 (geometry mismatch validation) ikut tertunda.
3. **Auth MVP scope creep**: backup codes/sessions/email OTP fallback bisa melebar ke permission/recovery flow. Mitigasi: tetapkan mock/contract-first, label jelas, tidak klaim backend nyata.
4. **Attachment audit event new**: menambah tipe event ke `MockAuditEvent` union type; butuh konsistensi dengan `audit_logs` action PRD (`ATTACHMENT_UPLOAD`, `ATTACHMENT_DOWNLOAD`, `ATTACHMENT_DELETE`).
5. **A11y axe-core false positive**: rute baru dengan tabel kompleks bisa memunculkan violation yang tidak critical. Mitigasi: prioritas critical-only, lalu perbaiki.

### Tradeoffs

- **Mock vs real Leaflet.draw**: mock digitizer lebih cepat dan ringan, tetapi tidak menunjukkan UX riil `leaflet-draw`. Pilih mock dulu, leaflet-draw di iterasi Go-live integration.
- **Report presets CRUD mock vs placeholder**: route minimal lebih banyak usaha, tetapi merepresentasikan kontrak PRD; placeholder hanya paragraf menurunkan kredibilitas.
- **Auth MVP hardening mock vs real flow**: mock lebih cepat, tetapi flow TOTP/email-OTP nyata adalah concern Go-live. Pilih mock label-jelas di iterasi ini.

### Resolved open questions (Ojan, 2026-06-12)

Semua 8 open question sudah terjawab:

1. **Map-backed digitization** — WAJIB iterasi ini (Phase 2). Plan tadinya punya risiko defer; keputusan Ojan memastikan Phase 2 dieksekusi penuh, termasuk DigitizeMapPanel + geometry validation + E2E.
2. **Auth MVP hardening** (backup codes UI, sessions UI, email OTP fallback mock, recovery regen) — IKUT iterasi ini (Phase 3). Semua sub-task auth dieksekusi, bukan placeholder lagi.
3. **Report presets CRUD** — IKUT iterasi ini (Phase 5). Route `/reports/presets` minimal CRUD mock dibangun, bukan Post-MVP.
4. **Tools route contract-first** (5 entry tile) — IKUT iterasi ini (Phase 4). Placeholder paragraf di `/tools` diganti 5 entry tile (Excel, PDF, Shapefile ZIP, Atlas PDF, Import Preview).
5. **Mock `health` service** di frontend untuk demo readiness probe — PERLU (Phase 4 menambah `health.ts` + Navbar badge).
6. **Mock export/import job polling `/api/v1/jobs/:id`** di `tools` — PERLU (Phase 4 menambah shared `jobs.ts` service yang dipakai `/reports` dan `/tools`).
7. **Sub-route baru `/projects/[id]/milestones` dan `/projects/[id]/assets`** (linked asset) — PERLU (Phase 6). Anchor hash di `ProjectSubnav.svelte` dipromosikan menjadi route terpisah dengan mock data penuh.
8. **Mock UI notifikasi toast** — PERLU (Phase 7). Toast service terpusat (`stores/toast.ts` + `<Toaster />`) menggantikan inline toast di documents page, dipakai konsisten di seluruh app.

Risiko dan tradeoff dari keputusan ini (lihat section `Risks, tradeoffs, open questions` di atas) sudah diakomodasi:

- Bundle size Leaflet: DigitizeMapPanel di Phase 2 akan dynamic import leaflet/draw opsional.
- Time-to-implement: tersebar di 11 phase dengan verifikasi per phase.
- Auth MVP scope creep: tetap mock/contract-first, tidak klaim backend nyata.
- Attachment audit event baru: tipe `MockAuditEvent` union diperluas dengan `ATTACHMENT_UPLOAD/DOWNLOAD/DELETE` di Phase 8.
- A11y axe-core false positive: prioritas critical-only.
- Toast refactor blast radius: Phase 7 mencakup refactor 4 route (documents, payments, login, dashboard) yang sebelumnya inline toast.

Tidak ada lagi open question yang menunggu jawaban Ojan untuk plan ini. Iterasi tinggal menunggu:

1. BA handoff `simantaba` dengan verdict `APPROVED_FOR_DEV` (Phase 0).
2. Accept/Deny gate Ojan sebelum commit/push di akhir iterasi (Phase 11).

## Keputusan yang sudah final (dari plan sebelumnya, tidak boleh dilanggar)

- Single Active OPD permanen (tidak ada active multi-OPD, OPD transfer, cross-OPD stats/filter, OPD CRUD, inter-OPD relocation).
- Project GIS adalah repositori administrasi/audit, bukan LPSE/SIRUP/SIPD/SP2D/finance replacement, bukan project-management suite.
- Payment read-only/reference; tidak ada workflow approve/proses.
- Viewer omit total dokumen/file sensitif (sudah implemented, dijaga).
- API preferences path `/api/v1/prefs` (bukan `/api/v1/preferences`).
- Permission keys final PRD (bukan alias legacy `*:write`).
- Tidak ada `TRANSFER` di shared types aktif.

## Ringkasan eksekusi yang diharapkan

Setelah plan ini disetujui Ojan + BA handoff, eksekusi mengikuti 11 phase (Phase 0 sampai Phase 11) di section `Step-by-step plan`. Verifikasi akhir dengan `npm run verify:mvp` harus PASS. Setelah itu BA review (`simantaba`) + OMP v15.10.8 review (untuk diff yang bermakna) + Accept/Deny gate Ojan sebelum commit/push. Tidak ada perubahan di luar `frontend/`, `shared/`, dan `docs/mvp/` (kecuali bila BA minta `docs/adr/` baru).

Fase eksekusi ringkas:

- Phase 0: BA handoff dengan 8 keputusan Ojan sebagai constraint.
- Phase 1-2: rebranding P0 + map-backed digitization.
- Phase 3: auth MVP hardening.
- Phase 4: tools contract-first + health + jobs polling.
- Phase 5: report presets CRUD.
- Phase 6: project sub-routes (milestones, linked assets).
- Phase 7: notification toast service.
- Phase 8: attachment metadata + audit event.
- Phase 9: a11y coverage expansion.
- Phase 10: docs + fixture invariants.
- Phase 11: verifikasi + BA + OMP + Accept/Deny gate.
