# Plan: Gap Frontend MVP terhadap Main PRD SIMANTA v1.3.7

Tanggal: 2026-06-09
Mode: Plan updated with Ojan decisions — Milestone 1 + Milestone 2 authorized for execution; no commit/push before Accept/Deny gate
Target workspace: `C:/projects/fci/fci-gis`
Canonical PRD: `docs/PRD_WebGIS_Pemetaan_Wilayah.md` v1.3.7

## Goal

Menyusun pekerjaan frontend MVP berikutnya berdasarkan kondisi aplikasi saat ini dibandingkan dengan main PRD v1.3.7.

Fokus rencana ini adalah:

1. Mengidentifikasi gap frontend MVP yang paling berisiko terhadap PRD v1.3.7.
2. Mengurutkan pekerjaan frontend berikutnya dalam prioritas P0/P1/P2.
3. Menjaga batas produk: Single Active OPD permanen, Project GIS sebagai administrasi/audit repository, bukan pengganti LPSE/SIRUP/SIPD/SP2D/finance dan bukan full project-management suite.
4. Tetap contract-first: frontend MVP boleh memakai mock/in-memory, tetapi nama route, API path, response envelope, permission, dan copy UI harus sesuai PRD.

## Current context / asumsi

### Sumber yang diinspeksi read-only

- `docs/PRD_WebGIS_Pemetaan_Wilayah.md`
- `frontend/package.json`
- `frontend/src/lib/components/layout/Sidebar.svelte`
- `frontend/src/routes/dashboard/+page.svelte`
- `frontend/src/routes/assets/+page.svelte`
- `frontend/src/lib/components/crud/AssetForm.svelte`
- `frontend/src/routes/projects/+page.svelte`
- `frontend/src/routes/projects/[id]/+page.svelte`
- `frontend/src/routes/projects/[id]/documents/+page.svelte`
- `frontend/src/routes/projects/[id]/payments/+page.svelte`
- `frontend/src/routes/reports/+page.svelte`
- `frontend/src/routes/tools/+page.svelte`
- `frontend/src/routes/opd/+page.svelte`
- `frontend/src/routes/login/+page.svelte`
- `frontend/src/routes/recovery/+page.svelte`
- `frontend/src/lib/services/api/*.ts`
- `frontend/src/lib/mocks/*.ts`
- `shared/src/enums.ts`
- `shared/src/schemas/*.ts`
- `frontend/tests/e2e/frontend-mvp.spec.ts`
- `frontend/tests/e2e/a11y.spec.ts`
- `docs/mvp/2026-06-08_e2e-browser-testing-advice-prd-1-3-6.md`

### Kondisi frontend MVP saat ini

Frontend MVP sudah cukup kuat untuk demo PRD v1.3.6 sebelumnya, tetapi sekarang perlu realignment ke PRD v1.3.7:

- SvelteKit static SPA dengan scripts validasi:
  - `npm run check`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e`
  - `npm run test:a11y`
  - `npm run verify:mvp`
- Mock API/service layer sudah ada.
- Envelope success/error sudah ada di `shared/src/envelope.ts`.
- Single Active OPD sudah banyak dijaga di UI dan E2E.
- Project GIS sudah punya model header dokumen + banyak file/lampiran.
- Viewer masking untuk dokumen/payment sensitif sudah ada, tetapi keputusan terbaru Ojan/BA mengubah policy menjadi omit total keberadaan header/file sensitif untuk Viewer.
- Payment reference sudah read-only dan tidak menjadi workflow pembayaran.

Namun PRD utama sudah naik ke v1.3.7 dengan positioning dua pilar:

1. Aset/tata wilayah berbasis Web GIS.
2. Administrasi Proyek GIS yang auditable.

Karena itu pekerjaan frontend MVP berikutnya harus memindahkan MVP dari “cukup untuk PRD v1.3.6” menjadi “representatif terhadap PRD v1.3.7”.

## Resolved decisions from Ojan + BA handoff

Keputusan Ojan untuk update plan ini:

1. Eksekusi langsung `Milestone 1 + Milestone 2`.
2. Dashboard label: `Dashboard Aset & Proyek GIS`.
3. Heading modul proyek: `Administrasi Proyek GIS`.
4. Payment page tetap `Riwayat Pembayaran` karena lebih friendly untuk user, dengan disclaimer read-only/reference.
5. Viewer harus omit total keberadaan header/file sensitif; tidak boleh masking placeholder/cardinality.
6. Export/Atlas ke depan perlu review manifest/template detail.

BA handoff simantaba: `APPROVED_FOR_DEV` untuk Milestone 1+2. Constraint utama: Single Active OPD permanen, Administrasi Proyek GIS sebagai repository administrasi/audit, tidak ada finance/procurement workflow, dan RBAC dokumen sensitif harus permission-based dengan omit-total policy untuk Viewer.

## Ringkasan gap prioritas

### P0 — Harus dibereskan lebih dulu karena bisa menyesatkan stakeholder / kontrak PRD

1. Stale branding dan versi PRD v1.3.6 masih muncul di UI, mocks, tests, dan report.
2. Istilah lama “Web GIS Pemetaan Wilayah” dan “Manajemen Proyek GIS” masih dominan di UI, belum mengikuti positioning v1.3.7 sebagai dua pilar Aset Wilayah + Administrasi Proyek GIS.
3. Legacy transfer masih muncul di shared contract `AssetHistoryItem` sebagai action `TRANSFER`, padahal transfer antar-OPD bukan scope aktif.
4. API preferences mock masih memakai `/api/v1/preferences`, sementara PRD mendefinisikan `/api/v1/prefs`.
5. Permission aliases lama seperti `asset:write`, `project:write`, `opd:write` masih dipakai di frontend guard/helper; PRD aktif memakai permission lebih spesifik seperti `asset:create`, `asset:update`, `project:create`, `project:update`, `opd:update`.

### P1 — Required untuk frontend MVP v1.3.7 agar terlihat sesuai nilai produk utama

1. Dashboard masih terlalu “Dashboard WebGIS”, belum menampilkan dua pilar SIMANTA dan ringkasan Administrasi Proyek GIS.
2. Sidebar belum menunjukkan struktur Proyek GIS sesuai PRD v1.3.7: Ringkasan Proyek, Timeline & Milestone, Dokumen & Checklist, Invoice/Termin Referensi, Output ke Aset GIS.
3. Asset taxonomy belum lengkap terhadap PRD: `JenisAset` belum mencakup `lapangan` dan `makam`; warna/palette/map fixtures juga belum mencakup semuanya.
4. Asset attachment contract masih terlalu tipis: `legal|photo|sp2d|other`; PRD membutuhkan metadata/lifecycle lebih lengkap seperti `sertifikat`, `foto`, `sp2d`, `berita_acara`, `sk_transfer`, `dokumen_legal`, `dokumen_pendukung`, `lainnya`, scan status, checksum, active flag, signed-download guard, dan audit action.
5. Create/Edit Asset masih memakai JSON textarea untuk geometry; PRD MVP membutuhkan digitasi langsung di peta untuk polygon/polyline/point. Untuk frontend MVP, minimal perlu Map-backed digitization mock, bukan hanya textarea.
6. MapContainer belum menyediakan controls PRD seperti draw/search/measure sebagai komponen peta; sebagian search ada di dashboard luar peta, tetapi Leaflet draw/measure/search belum menjadi affordance peta yang representatif.
7. Laporan masih “Laporan Dasar” dengan contract ringkas; PRD meminta Laporan Interaktif dengan table/chart/peta tematik, filters, report presets, async export PDF/Excel, dan response contract yang lebih lengkap.
8. Export/Import/Atlas route masih placeholder. Export Excel/PDF/Shapefile adalah MVP/Go-live required; import preview dan atlas bisa staged, tetapi frontend harus punya contract-first flow yang jelas.
9. Auth recovery, backup codes, dan sessions masih placeholder; PRD auth/recovery membutuhkan UI yang setidaknya contract-accurate untuk OTP, backup codes, session visibility, dan fallback email setelah password valid.

### P2 — Polish / demo-hardening / confidence

1. A11y coverage baru mencakup halaman utama tertentu; belum mencakup project document/payment, asset create/edit, profile recovery/session/backup codes, tools/export.
2. Mock audit untuk blocked download masih toast string, belum event terstruktur untuk failure metadata.
3. Viewer sensitive policy sudah diputuskan: harus omit total keberadaan header/file sensitif untuk Viewer; pekerjaan implementasi/test ada di Milestone 1+2.
4. Dokumentasi MVP lama masih v1.3.6; perlu report baru atau update status v1.3.7 agar tidak membingungkan reviewer.
5. Form dan beberapa route Svelte masih sangat padat satu baris sehingga maintainability rendah meskipun functionally OK.

## Proposed approach

Gunakan pendekatan contract-first frontend MVP:

- Tidak membangun backend nyata pada slice ini.
- Tidak menambah scope produk di luar PRD.
- Service layer tetap menjadi satu-satunya pintu data mock/real; komponen tidak boleh import fixture mentah kecuali test/mock-layer.
- Semua mock response harus mengikuti envelope PRD: `success`, `message`, `data`, `meta`, `request_id`, `timestamp`, dan error code seperti `FORBIDDEN`, `CONFLICT_VERSION`, `VALIDATION_ERROR`, `RATE_LIMITED`.
- Perubahan UI harus disertai E2E negative assertions untuk mencegah kembalinya multi-OPD, transfer OPD, finance workflow, atau branding lama.

## In-scope untuk pekerjaan frontend MVP berikutnya

- Rebaseline UI/copy/tests dari PRD v1.3.6 ke v1.3.7.
- Penguatan positioning dua pilar di dashboard/sidebar/copy utama.
- Penyelarasan shared types, mock services, and route guards terhadap PRD v1.3.7.
- Kontrak frontend untuk asset digitization, asset attachments, reports/export, project administration, recovery/backup/session.
- Test unit/E2E/a11y untuk gap yang dibenahi.

## Explicit out-of-scope / negative scope

- Tidak membangun backend Hono/Postgres/PostGIS nyata di slice ini.
- Tidak membuat active multi-OPD, OPD CRUD tambahan, OPD transfer, cross-OPD filter/statistik, atau inter-OPD relocation.
- Tidak membuat LPSE/SIRUP/SIPD/SP2D/finance workflow resmi.
- Tidak membuat project-management suite penuh: tidak ada task/resource planning, kanban pekerjaan vendor, approval workflow multi-level kecuali placeholder Post-MVP yang jelas.
- Tidak mengklaim upload/download file benar-benar memakai MinIO/signed URL/antivirus scan; untuk frontend MVP harus diberi label mock/contract-first.

## Step-by-step plan

### Phase 0 — BA handoff singkat sebelum execution

Tujuan: mengunci prioritas agar pekerjaan frontend tidak melebar.

Tasks:

1. Minta simantaba memvalidasi daftar gap P0/P1/P2 terhadap PRD v1.3.7.
2. Keputusan Ojan: next sprint langsung Milestone 1 + Milestone 2.
3. Wording UI yang disetujui:
   - Dashboard: `Dashboard Aset & Proyek GIS`.
   - Heading modul proyek: `Administrasi Proyek GIS`.
   - Payment page tetap `Riwayat Pembayaran` karena lebih friendly, dengan copy read-only/reference yang jelas.
4. Viewer sensitive policy: omit total keberadaan header/file sensitif; tidak ada masking placeholder/cardinality untuk Viewer.
5. Export/Atlas nanti membutuhkan review manifest/template detail, tetapi bukan scope Milestone 1+2.

Output:

- BA handoff brief: simantaba memberikan verdict `APPROVED_FOR_DEV` untuk Milestone 1+2 dengan constraint Single Active OPD, Administrasi Proyek GIS sebagai audit/admin repository, payment tetap `Riwayat Pembayaran` read-only/reference, dan Viewer omit total dokumen/file sensitif.

### Phase 1 — P0 rebaseline v1.3.7 branding/copy/tests

Tujuan: tidak ada UI/test aktif yang masih mengklaim PRD v1.3.6 atau branding lama.

Likely files:

- `frontend/src/lib/components/layout/Sidebar.svelte`
- `frontend/src/routes/dashboard/+page.svelte`
- `frontend/src/routes/opd/+page.svelte`
- `frontend/src/routes/projects/+page.svelte`
- `frontend/src/routes/projects/create/+page.svelte`
- `frontend/src/routes/projects/[id]/edit/+page.svelte`
- `frontend/src/routes/reports/+page.svelte`
- `frontend/src/lib/components/crud/AssetForm.svelte`
- `frontend/src/lib/mocks/projects.ts`
- `frontend/tests/e2e/frontend-mvp.spec.ts`
- `frontend/tests/e2e/a11y.spec.ts`
- `docs/mvp/*` if Ojan wants frontend MVP report updated to v1.3.7

Tasks:

1. Replace visible `PRD v1.3.6` with `PRD v1.3.7` where active UI/test copy references the current PRD.
2. Replace sidebar subtitle `Web GIS Pemetaan Wilayah` with v1.3.7 two-pillar wording.
3. Rename active UI headings where appropriate:
   - `Manajemen Proyek GIS` -> `Administrasi Proyek GIS` or `Proyek GIS` with administrasi/audit subtitle.
   - `Laporan Dasar` -> `Laporan Interaktif` if the route is intended to be the MVP report module.
   - `Dashboard WebGIS` -> `Dashboard Aset & Proyek GIS` sesuai keputusan Ojan.
4. Keep negative assertions for old out-of-scope terms, but avoid showing scary out-of-scope terms in active user copy.
5. Update E2E/a11y expected headings/titles accordingly.

Acceptance criteria:

- No active app UI shows `PRD v1.3.6`.
- No active app UI uses `Web GIS Pemetaan Wilayah` as the only subtitle/positioning.
- Project GIS is visible as a product pillar, not only a small add-on.
- E2E confirms no multi-OPD affordance reappears.

### Phase 2 — P0/P1 contract cleanup: shared enums, permissions, API paths

Tujuan: frontend contracts align dengan PRD before more UI work.

Likely files:

- `shared/src/enums.ts`
- `shared/src/schemas/asset.ts`
- `shared/src/schemas/project.ts`
- `shared/src/schemas/report.ts`
- `shared/src/envelope.ts`
- `frontend/src/lib/auth/permissions.ts`
- `frontend/src/lib/auth/route-guards.ts`
- `frontend/src/lib/mocks/users.ts`
- `frontend/src/lib/services/api/assets.ts`
- `frontend/src/lib/services/api/projects.ts`
- `frontend/src/lib/services/api/preferences.ts`
- `frontend/src/lib/services/api/reports.ts`
- Unit tests under `frontend/src/lib/**/*.test.ts`

Tasks:

1. Remove legacy `TRANSFER` from `AssetHistoryItem`; replace with active lifecycle actions such as `CREATE`, `UPDATE`, `GEOMETRY_UPDATE`, `RESPONSIBILITY_UPDATE`, `ARCHIVE`, `RESTORE` if needed.
2. Align permission helper aliases:
   - Prefer `asset:create`, `asset:update`, `project:create`, `project:update`, `opd:update`.
   - Keep backward-compatible alias only if explicitly documented as mock transitional, but tests should assert final PRD permission keys.
3. Change preferences API mock path from `/api/v1/preferences` to `/api/v1/prefs`.
4. Expand `JenisAset` to include PRD asset types used in UI/demo: `lapangan`, `makam`, plus existing `tanah`, `bangunan`, `jalan`, `saluran`, `taman`, `lainnya`.
5. Expand asset attachment schema toward PRD contract:
   - kind/type enum aligned with PRD.
   - objectKey/mockObjectKey.
   - mimeType.
   - sizeBytes.
   - checksum.
   - scanStatus: `pending | clean | blocked`.
   - isActive.
   - uploadedBy/uploadedAt.
   - version if optimistic locking needed for metadata update.
6. Add unit tests to prevent regression:
   - no `TRANSFER` in active frontend shared type/fixtures.
   - `/api/v1/prefs` path used by preference service.
   - role fixtures use final permission keys.
   - asset kind palettes cover every `JenisAset`.

Acceptance criteria:

- Shared contracts no longer contradict permanent Single Active OPD.
- Service metadata path aligns with PRD `/api/v1/prefs`.
- Unit tests protect PRD contract names.

### Phase 3 — Two-pillar Dashboard and Sidebar UX

Tujuan: first impression aplikasi mencerminkan PRD v1.3.7.

Likely files:

- `frontend/src/lib/components/layout/Sidebar.svelte`
- `frontend/src/lib/components/layout/Navbar.svelte`
- `frontend/src/routes/dashboard/+page.svelte`
- `frontend/src/lib/components/dashboard/SimpleBars.svelte`
- New optional components:
  - `frontend/src/lib/components/dashboard/ProjectSummaryCards.svelte`
  - `frontend/src/lib/components/dashboard/DomainEntryCards.svelte`

Tasks:

1. Make dashboard hero explicitly show two domains:
   - Aset Wilayah.
   - Administrasi Proyek GIS.
2. Add Project GIS summary cards from existing mock project bundle:
   - proyek aktif.
   - dokumen incomplete/submitted/verified.
   - file pending/blocked/clean.
   - payment reference total/read-only count.
   - output project linked to asset.
3. Keep map/asset cards, but present them as one pillar, not entire product.
4. Update Sidebar footer and subtitle to v1.3.7.
5. Add E2E assertion that dashboard contains both `Aset Wilayah` and `Administrasi Proyek GIS` domain signals.

Acceptance criteria:

- Stakeholder opening `/dashboard` can immediately understand SIMANTA is not only Web GIS map, but Aset Wilayah + Administrasi Proyek GIS.
- No finance/procurement management wording appears.

### Phase 4 — Asset GIS MVP hardening: map-backed digitization and taxonomy

Tujuan: PRD MVP requires direct map digitization; JSON textarea alone is not enough for next frontend MVP.

Likely files:

- `frontend/src/lib/components/map/MapContainer.svelte`
- `frontend/src/lib/components/map/styles.ts`
- `frontend/src/lib/components/crud/AssetForm.svelte`
- `frontend/src/routes/assets/create/+page.svelte`
- `frontend/src/routes/assets/[id]/edit/+page.svelte`
- `frontend/src/lib/mocks/assets.ts`
- `shared/src/geojson.ts`
- `shared/src/enums.ts`
- `frontend/src/lib/components/map/styles.test.ts`
- `frontend/tests/e2e/frontend-mvp.spec.ts`

Tasks:

1. Add a frontend-only digitization component for create/edit:
   - polygon for tanah/bangunan/lapangan/taman/makam.
   - polyline/multiline for jalan/saluran.
   - point for `lainnya`/POI.
2. If full `leaflet-draw` integration is too large, provide a staged `DigitizeMapPanel` mock that writes valid GeoJSON and clearly labels mock mode. But do not leave only raw textarea as primary UI.
3. Add map controls/UX affordances for:
   - draw.
   - search.
   - measure.
   - basemap attribution.
4. Expand map style palette to every active `JenisAset`.
5. Add fixtures for `lapangan` and `makam` so reports/map/tests cover them.
6. Validate geometry type mapping before save and simulate `VALIDATION_FAILED` for mismatch.

Acceptance criteria:

- Create/edit asset has map-backed digitization affordance.
- Geometry remains source of truth; no lat/lng fields become active source.
- E2E covers creating/editing at least one polygon, line, and point-like asset in mock mode.

### Phase 5 — Administrasi Proyek GIS UX completion

Tujuan: Project GIS feels like a full product pillar, but still archive/admin only.

Likely files:

- `frontend/src/routes/projects/+page.svelte`
- `frontend/src/routes/projects/[id]/+page.svelte`
- `frontend/src/routes/projects/[id]/documents/+page.svelte`
- `frontend/src/routes/projects/[id]/payments/+page.svelte`
- Optional new route/components:
  - `frontend/src/routes/projects/[id]/milestones/+page.svelte`
  - `frontend/src/routes/projects/[id]/assets/+page.svelte`
  - `frontend/src/lib/components/projects/ProjectSubnav.svelte`
  - `frontend/src/lib/components/projects/ProjectChecklistSummary.svelte`
  - `frontend/src/lib/components/projects/ProjectAssetLinks.svelte`

Tasks:

1. Rename visible labels to v1.3.7 framing:
   - `Administrasi Proyek GIS` for module/page title.
   - Payment page tetap `Riwayat Pembayaran`, tetapi subtitle/body harus menegaskan bahwa ini hanya referensi invoice/termin/SP2D read-only.
2. Add project subnavigation matching PRD v1.3.7:
   - Ringkasan Proyek.
   - Timeline & Milestone.
   - Dokumen & Checklist.
   - Riwayat Pembayaran.
   - Output ke Aset GIS.
3. Add a clearer project summary page with:
   - project metadata.
   - document completeness by stage/header.
   - milestone timeline.
   - payment reference disclaimer.
   - linked asset/layer list.
4. Strengthen blocked download audit mock:
   - create structured audit event for denied/blocked downloads, not only toast string.
   - include `project_id`, `document_id`, `file_id`, `scanStatus`, and failure reason.
5. Keep Viewer masking/permission tests.

Acceptance criteria:

- Project GIS page reads as “administrative control/audit repository”, not finance/procurement workflow.
- Viewer never receives sensitive document/header/file existence in UI or service data; sensitive project documents/files must be omitted entirely, not masked as placeholders.
- Tests assert no action labels like `approve`, `bayar`, `proses pembayaran`, `workflow finance`, `procurement workflow`.

### Phase 6 — Laporan Interaktif and Export contract-first MVP

Tujuan: move reports/tools from basic/placeholder toward PRD MVP contract.

Likely files:

- `shared/src/schemas/report.ts`
- `frontend/src/lib/services/api/reports.ts`
- `frontend/src/routes/reports/+page.svelte`
- `frontend/src/routes/reports/presets/+page.svelte`
- `frontend/src/routes/tools/+page.svelte`
- Optional new components:
  - `frontend/src/lib/components/reports/ReportFilterPanel.svelte`
  - `frontend/src/lib/components/reports/ReportMapPreview.svelte`
  - `frontend/src/lib/components/reports/ExportJobPanel.svelte`

Tasks:

1. Rename/reshape Reports page to `Laporan Interaktif`.
2. Align `ReportResult` with PRD response contract:
   - rows.
   - pagination.
   - summary.
   - groups.
   - charts.
   - map_layer or map preview endpoint metadata.
   - filters_applied.
   - scope_applied.
3. Add mock export job flows for:
   - Excel.
   - PDF.
   - Shapefile ZIP.
   - Atlas/print map if included as Tools/Hardening placeholder.
4. Add download button only after mock job `done/completed` and make retention/disclaimer visible.
5. Keep OPD active/default implicit; no OPD filter.
6. Reports presets route should show CRUD-like UI only if contract supports permission; otherwise clear placeholder.

Acceptance criteria:

- `/reports` no longer feels like “basic table only”.
- Export flow demonstrates async queue behavior, not sync browser generation.
- E2E tests cover job status transition and no cross-OPD filter.

### Phase 7 — Auth/account MVP hardening

Tujuan: reduce obvious placeholders in auth/recovery/profile flows.

Likely files:

- `frontend/src/routes/login/+page.svelte`
- `frontend/src/routes/recovery/+page.svelte`
- `frontend/src/routes/profile/backup-codes/+page.svelte`
- `frontend/src/routes/profile/sessions/+page.svelte`
- `frontend/src/lib/services/api/auth.ts`
- `frontend/src/lib/mocks/users.ts`
- `shared/src/schemas/auth.ts`
- `frontend/tests/e2e/frontend-mvp.spec.ts`

Tasks:

1. Add mock UI flow for invalid OTP, rate limit, and email OTP fallback explanation after password valid.
2. Make backup codes page show contract-accurate status and regenerate placeholder with one-time display warning.
3. Make active sessions page show mock refresh token/session list and force logout placeholder if permission allows.
4. Ensure login form has labels/aria for accessibility and E2E stability.
5. Keep all claims clear as mock/contract-first.

Acceptance criteria:

- Auth MVP does not look like unfinished placeholder on key PRD flows.
- E2E covers invalid OTP/rate limit and backup code status route.

### Phase 8 — Verification, BA review, and optional OMP review

Commands to run from `frontend/` after implementation:

```bash
npm run check
npm run test
npm run build
npm run test:e2e
npm run test:a11y
npm run verify:mvp
```

Additional targeted checks:

```bash
npm run test -- src/lib/auth/permissions.test.ts src/lib/mocks/projects.test.ts src/lib/components/map/styles.test.ts src/lib/services/api/client.test.ts
npm run test:e2e -- --grep "PRD v1.3.7|Administrasi Proyek GIS|single active OPD|Laporan Interaktif|export job|digitasi"
```

Recommended negative assertions:

- No active UI text `PRD v1.3.6`.
- No active UI text `Web GIS Pemetaan Wilayah` as main subtitle.
- No `Filter laporan OPD`, `Semua OPD`, `Distribusi OPD`, `Grouping OPD`, `OPD selector`.
- No `transfer antar-OPD`, `relokasi antar-OPD`, `asset:transfer`.
- No `Finance` role in role switcher.
- No payment/procurement actions: `approve`, `bayar`, `proses pembayaran`, `workflow finance`, `e-procurement`.
- No real-upload claim unless actually integrated with object storage/signed URL/scan.

Review loop:

1. simantadev implements approved slice.
2. Run verification above.
3. simantaba reviews scope/wording against PRD v1.3.7.
4. For meaningful diff, run OMP adversarial review.
5. Fix blockers.
6. Ask Ojan Accept/Deny before commit/push.

## Files likely to change by category

### Branding and layout

- `frontend/src/lib/components/layout/Sidebar.svelte`
- `frontend/src/lib/components/layout/Navbar.svelte`
- `frontend/src/routes/dashboard/+page.svelte`
- `frontend/tests/e2e/frontend-mvp.spec.ts`
- `frontend/tests/e2e/a11y.spec.ts`

### Shared contracts

- `shared/src/enums.ts`
- `shared/src/geojson.ts`
- `shared/src/envelope.ts`
- `shared/src/schemas/asset.ts`
- `shared/src/schemas/project.ts`
- `shared/src/schemas/report.ts`
- `shared/src/schemas/auth.ts`

### Services and mocks

- `frontend/src/lib/services/api/client.ts`
- `frontend/src/lib/services/api/assets.ts`
- `frontend/src/lib/services/api/projects.ts`
- `frontend/src/lib/services/api/reports.ts`
- `frontend/src/lib/services/api/preferences.ts`
- `frontend/src/lib/services/api/auth.ts`
- `frontend/src/lib/mocks/assets.ts`
- `frontend/src/lib/mocks/projects.ts`
- `frontend/src/lib/mocks/users.ts`

### Asset GIS

- `frontend/src/lib/components/map/MapContainer.svelte`
- `frontend/src/lib/components/map/styles.ts`
- `frontend/src/lib/components/crud/AssetForm.svelte`
- `frontend/src/routes/assets/+page.svelte`
- `frontend/src/routes/assets/create/+page.svelte`
- `frontend/src/routes/assets/[id]/edit/+page.svelte`
- `frontend/src/routes/assets/[id]/history/+page.svelte`

### Project GIS

- `frontend/src/routes/projects/+page.svelte`
- `frontend/src/routes/projects/create/+page.svelte`
- `frontend/src/routes/projects/[id]/+page.svelte`
- `frontend/src/routes/projects/[id]/edit/+page.svelte`
- `frontend/src/routes/projects/[id]/documents/+page.svelte`
- `frontend/src/routes/projects/[id]/payments/+page.svelte`
- New optional components/routes under `frontend/src/lib/components/projects/` and `frontend/src/routes/projects/[id]/...`

### Reports/tools

- `frontend/src/routes/reports/+page.svelte`
- `frontend/src/routes/reports/presets/+page.svelte`
- `frontend/src/routes/tools/+page.svelte`
- New optional components under `frontend/src/lib/components/reports/`

### Auth/profile

- `frontend/src/routes/login/+page.svelte`
- `frontend/src/routes/recovery/+page.svelte`
- `frontend/src/routes/profile/backup-codes/+page.svelte`
- `frontend/src/routes/profile/sessions/+page.svelte`
- `frontend/src/routes/profile/preferences/+page.svelte`

### Documentation/status reports

- `docs/mvp/2026-06-08_e2e-browser-testing-advice-prd-1-3-6.md` should not be rewritten as history unless Ojan asks.
- Prefer creating a new report after implementation, e.g. `docs/mvp/YYYY-MM-DD_frontend-mvp-prd-1-3-7-gap-closure.md`.

## Recommended sequencing / milestones

### Milestone 1 — P0 v1.3.7 realignment

Scope:

- Update branding/version/copy/tests to v1.3.7.
- Remove active legacy transfer contract from frontend shared types/fixtures.
- Align `/api/v1/prefs`.
- Align permission helper/test names with PRD keys.

Why first:

- Smallest high-confidence slice.
- Removes stakeholder confusion immediately.
- Creates a clean base for bigger UI work.

Validation:

```bash
cd frontend
npm run check
npm run test
npm run test:e2e -- --grep "single active OPD|PRD v1.3.7|Administrasi Proyek GIS"
npm run test:a11y
```

### Milestone 2 — Two-pillar dashboard + Project GIS UX

Scope:

- Dashboard two-pillar summary.
- Sidebar/nav/subnav update.
- Project GIS module labels and summary route polish.
- Keep payment label `Riwayat Pembayaran` while tightening read-only/reference copy.

Validation:

```bash
cd frontend
npm run verify:mvp
```

### Milestone 3 — Asset GIS contract completion

Scope:

- Asset taxonomy expansion.
- Map-backed digitization mock.
- Attachment metadata mock model.
- Map controls/search/measure UX.

Validation:

```bash
cd frontend
npm run test -- src/lib/components/map/styles.test.ts
npm run test:e2e -- --grep "asset|digitasi|map|attachment"
npm run verify:mvp
```

### Milestone 4 — Reports/export + auth/account hardening

Scope:

- Laporan Interaktif response shape.
- Export job mock for Excel/PDF/Shapefile with manifest/template detail review.
- Tools page upgraded from placeholder.
- Recovery/backup/sessions no longer bare placeholders.

Validation:

```bash
cd frontend
npm run test:e2e -- --grep "Laporan Interaktif|export job|recovery|backup codes|sessions"
npm run verify:mvp
```

## Risks, tradeoffs, and mitigations

### Risk: frontend MVP overclaims backend/security readiness

Mitigation:

- Keep “mock/contract-first” labels on upload, export, scan, signed URL, auth recovery, and audit persistence.
- Do not use wording like “tersimpan di MinIO” unless backend exists.

### Risk: v1.3.7 branding accidentally expands scope into full PM system

Mitigation:

- Use “Administrasi Proyek GIS”, “Audit-ready”, “Referensi”, “Dokumen & Checklist”.
- Avoid “task management”, “resource planning”, “approval procurement”, “finance workflow”.
- Keep E2E negative assertions.

### Risk: map digitization becomes too large for one slice

Mitigation:

- Stage it:
  1. `DigitizeMapPanel` mock writes valid GeoJSON.
  2. Then integrate `leaflet-draw` controls.
  3. Then add richer validation/type normalization.

### Risk: shared type cleanup breaks many compact one-line Svelte pages

Mitigation:

- Do contract cleanup first with unit tests.
- Refactor pages only as needed per slice.
- Keep changes small and verify after each milestone.

### Risk: Viewer omit-total policy changes existing UI behavior

Mitigation:

- Implement filtering at mock/service or derived data layer so Viewer does not receive sensitive header/file existence, not just CSS/UI masking.
- Encode decision in tests: no sensitive filenames, no masked placeholder text, no hidden-cardinality rows for Viewer.

## Resolved questions from Ojan / BA

1. Next sprint: langsung Milestone 1 + Milestone 2.
2. Dashboard label: `Dashboard Aset & Proyek GIS`.
3. Modul proyek heading: `Administrasi Proyek GIS`.
4. Payment page label: tetap `Riwayat Pembayaran`; mitigasi boundary lewat copy read-only/reference dan no finance actions.
5. Viewer dokumen sensitif: omit total keberadaan header/file sensitif; tidak boleh placeholder/cardinality masking.
6. Report historis v1.3.6 dibiarkan sebagai history; bila perlu setelah implementation dibuat report/status baru v1.3.7.
7. Export/Atlas ke depan: perlu preview manifest/template detail, bukan hanya job status + fake URL.
8. OMP follow-up/Ojan decision: route dokumen diblok tanpa `project:document_read`; halaman `Riwayat Pembayaran` diblok/disembunyikan tanpa `project:payment_read` termasuk Viewer; akses dokumen sensitif diturunkan dari permission dokumen + permission payment/admin/auditor-sensitive yang sudah ada, bukan role string.
9. Follow-up OMP selesai: `JenisAset` frontend/shared mencakup `lapangan`/`makam`; palet legend peta mengikuti PRD §9.2 (`assetColors`/`assetStrokeColors` sebagai single source); `StatusHak` mengikuti PRD §6.3 (`SHM/HGB/HPL/HP/HM/Pakai/Pengelolaan/Lainnya`); `AssetAttachmentKind` dan metadata opsional dasar mengikuti PRD v1.3.7; `ProjectDocumentFile` memakai field PRD `fileLabel`, `fileOrder`, `checksumSha256`; error envelope memakai `VALIDATION_FAILED` + taxonomy/meta §7.1; RBAC `assigned_project` hanya dievaluasi melalui helper project-context. Deferred Milestone 3/4 tetap hanya implementasi backend/object-storage lengkap `asset_attachments` (presigned upload, quarantine, audit download) dan digitasi peta penuh.

## Recommended first implementation slice

Keputusan Ojan: mulai langsung dengan Milestone 1 + Milestone 2:

`P0 v1.3.7 realignment` + `Two-pillar dashboard + Project GIS UX`

Rasional:

- Dampak stakeholder tinggi.
- Risiko teknis rendah.
- Menghapus kontradiksi paling jelas terhadap main PRD baru.
- Menjadi baseline bersih sebelum pekerjaan map digitization/reports/export yang lebih besar.
- Sekaligus memperbaiki first impression stakeholder agar SIMANTA tampil sebagai `Dashboard Aset & Proyek GIS` dengan pilar `Administrasi Proyek GIS` yang jelas.

Acceptance criteria Milestone 1+2:

- Active UI/test tidak lagi menampilkan PRD v1.3.6.
- Sidebar dan dashboard menunjukkan v1.3.7 two-pillar positioning.
- Project GIS copy memakai framing administrasi/audit.
- `AssetHistoryItem` tidak lagi punya action transfer aktif.
- Preference service memakai `/api/v1/prefs`.
- Permission helpers/tests tidak bergantung pada `*:write` alias lama kecuali transitional alias diberi komentar jelas.
- Dashboard memakai label `Dashboard Aset & Proyek GIS` dan menampilkan dua domain: `Aset Wilayah` + `Administrasi Proyek GIS`.
- Project module heading memakai `Administrasi Proyek GIS`.
- Payment page tetap `Riwayat Pembayaran`, tanpa action/copy finance workflow.
- Viewer sensitive document/file policy berubah dari masking menjadi omit total.
- `npm run check`, `npm run test`, targeted E2E, a11y smoke, dan bila praktis `npm run verify:mvp` lulus.

## Commit/push discipline setelah implementasi nanti

Karena rencana ini hanya planning, tidak ada commit/push.

Saat implementasi nanti selesai dan repository berubah:

1. Jalankan verification sesuai milestone.
2. Minta BA/business review jika scope-sensitive.
3. Jalankan atau siapkan OMP adversarial review untuk meaningful diff.
4. Baru minta keputusan Ojan:
   - Accept: Hermes boleh commit/push.
   - Deny: Ojan commit/push manual.
