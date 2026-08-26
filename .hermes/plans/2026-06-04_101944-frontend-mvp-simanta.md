# Plan Frontend MVP SIMANTA — Development Frontend Dahulu

## Goal

Menyusun langkah development **frontend MVP terlebih dahulu** untuk SIMANTA/WebGIS, berdasarkan PRD `docs/PRD_WebGIS_Pemetaan_Wilayah.md` versi **1.3.3**, dengan fokus menghasilkan UI/UX yang dapat didemokan, divalidasi stakeholder, dan siap disambungkan ke backend Hono API ketika endpoint sudah tersedia.

Frontend MVP ini bukan full production-ready implementation, tetapi harus cukup lengkap untuk:

- Menguji alur utama pengguna: login, dashboard peta, daftar/detail/form aset, OPD, laporan dasar, Manajemen Proyek GIS/Dokumen Proyek, dan preferensi.
- Memvalidasi layout, navigasi, terminology role final (`Editor`, bukan `Operator`), dan konsep data `assets` generik.
- Menyediakan kontrak mock API yang mengikuti envelope PRD agar backend nanti tinggal mengganti adapter/service.
- Menjaga agar desain frontend tetap sesuai requirement penting: RBAC/scope, geometry sebagai sumber utama, basemap, asset attachments, dokumen proyek GIS, optimistic locking, dan audit/versioning awareness.

## Current Context / Assumptions

- PRD v1.3.3 menetapkan stack frontend: **SvelteKit 2 + Svelte 5**, `adapter-static`, `ssr=false`, SPA statis di-serve Nginx. Keputusan stakeholder terbaru: repo belum punya frontend; siapkan baseline frontend memakai **SvelteKit + Tailwind CSS**, bukan Svelte standalone, agar routing, layout, route guard, build static SPA, struktur module pages, dan styling utility-first siap untuk MVP.
- Backend belum harus selesai untuk frontend MVP; frontend boleh memakai **mock API/MSW/static fixtures** selama kontraknya mengikuti `/api/v1/*` dan envelope response PRD.
- MVP frontend pertama sebaiknya tidak langsung mengejar semua fitur berat seperti import shapefile, export async, atlas, bulk operation, workflow approval dokumen proyek, integrasi LPSE/SIRUP/SIPD/SP2D, OCR/e-signature, dan role-permission management penuh.
- Fitur GIS memakai **Leaflet** untuk MVP dengan abstraksi `MapContainer.svelte` agar nanti bisa dinaikkan ke vector tile/MapLibre bila diperlukan. Mock data harus memakai konteks geografis kota/kabupaten Jawa Timur agar tampilan peta realistis untuk stakeholder.
- Semua istilah domain mengikuti PRD terbaru:
  - `assets`, bukan `outlets`.
  - `owner_opd_id`, bukan `id_opd`.
  - `Editor`, bukan `Operator`.
  - Lampiran aset lewat `asset_attachments`, bukan `file_path/file_photo` di `assets`.
  - Dokumen proyek GIS lewat `projects` + `project_documents`, bukan dicampur ke `asset_attachments` kecuali dokumen tersebut memang melekat ke aset tertentu.
  - SIMANTA adalah repositori administrasi/audit trail proyek, bukan pengganti LPSE/SIRUP/SIPD/SP2D atau sistem keuangan daerah.
- Karena frontend MVP dulu, seluruh operasi mutasi dibuat sebagai UI flow + mock persistence lokal/in-memory, bukan mutasi database riil. UI memakai bahasa Indonesia penuh untuk label, menu, helper text, empty/error state; istilah teknis seperti API, RBAC, role, permission, scope, GeoJSON, layer, basemap, OTP, invoice, BAST, SP2D tetap boleh English/akronim sesuai domain.
- Modul Manajemen Proyek GIS di frontend MVP hanya mencakup pencatatan proyek, list/detail dokumen, checklist dokumen, metadata invoice/termin/SP2D reference, dan link output proyek ke aset/layer GIS secara mock. Attachment/document list cukup placeholder terlebih dahulu; tidak perlu multi-file upload real pada MVP pertama.
- Styling frontend MVP memakai **shadcn-svelte** sebagai basis komponen/design system yang bisa dikustomisasi, dengan tema SIMANTA bernuansa GIS pemerintahan: hijau/emerald sebagai primary, biru/cyan untuk informasi spasial, amber untuk warning/status dokumen, merah untuk error, dan neutral slate untuk layout/admin surface.
- Role switcher boleh tampil di build demo/UAT dengan label jelas “Mode Demo”, tetapi tidak boleh menjadi pola production. Data sensitif proyek/pembayaran sejak awal dibatasi untuk Admin, Auditor, dan Finance-role/permission yang relevan; Viewer tidak boleh melihat nilai kontrak/invoice atau download dokumen sensitif.

## Proposed Approach

Gunakan pendekatan **contract-first frontend prototype**:

1. Buat struktur frontend sesuai PRD.
2. Definisikan shared type/schema minimum untuk envelope, user, OPD, asset, GeoJSON, role/permission, report query, project, project document, milestone, dan payment reference.
3. Buat API client yang punya dua mode:
   - `mock`: membaca fixture/mock handler.
   - `real`: fetch ke `/api/v1/*` saat backend siap.
4. Bangun halaman per prioritas demo/UAT:
   - Shell + auth mock.
   - Dashboard peta + stats.
   - Assets list/detail/create/edit/digitasi sederhana.
   - OPD list.
   - Manajemen Proyek GIS + Dokumen Proyek dasar.
   - Reports dasar.
   - Profile/preferences.
5. Pastikan seluruh UI memakai response envelope, error code, dan state yang sama dengan PRD: `CONFLICT_VERSION`, `FORBIDDEN`, `RATE_LIMITED`, `UNAUTHENTICATED`, dll.
6. Tunda fitur berat ke phase berikutnya, tetapi tetap sediakan placeholder route dan empty state agar stakeholder melihat roadmap modul.

## MVP Scope — Yang Dibangun Dahulu

### In Scope Frontend MVP

1. App shell
   - Sidebar sesuai PRD.
   - Navbar/avatar/logout.
   - Responsive layout.
   - Dark/light/system theme token dasar.

2. Auth UI mock
   - Login email/password.
   - OTP step mock.
   - Recovery page placeholder.
   - Auth store in-memory.
   - Route guard.
   - Role switcher untuk demo RBAC: Super Admin, Admin, OPD Admin, Editor, Viewer, Auditor, Finance.
   - Role switcher boleh muncul di build demo/UAT dengan badge “Mode Demo”; production build harus bisa menonaktifkannya via env/flag.

3. Dashboard
   - Leaflet map dengan basemap control.
   - Layer dummy GeoJSON per `jenis`: tanah, bangunan, jalan, saluran, taman, lainnya.
   - Stats cards terpisah: luas tanah, luas bangunan, panjang jalan/saluran, belum dipetakan.
   - Chart distribusi per jenis/OPD.
   - Popup asset detail.
   - Layer toggle per jenis.

4. Assets module
   - Daftar aset dengan filter `q`, `jenis`, `owner_opd_id`, `has_geom`.
   - Detail aset dengan map preview, atribut, lampiran list mock, version/history summary.
   - Create/edit form adaptif berdasarkan `jenis`:
     - polygon: luas sertifikat + luas spasial read-only.
     - line: panjang spasial read-only.
     - point/lainnya: koordinat/centroid.
   - Digitasi sederhana dengan Leaflet Draw atau fallback geometry JSON editor bila plugin belum dipasang.
   - Optimistic locking demo: jika version mismatch mock, tampilkan modal/alert `CONFLICT_VERSION`.

5. OPD module
   - List OPD.
   - Create/edit modal mock.
   - Count aset per OPD dari fixture.

6. Project Documents MVP
   - Daftar proyek GIS dengan filter tahun anggaran, OPD, vendor, status.
   - Detail proyek dengan metadata kontrak, timeline/milestone, checklist dokumen, dan ringkasan payment reference.
   - Attachment/document list placeholder berdasarkan stage/kind: planning, procurement, contract, implementation, handover, payment, post_project; tidak perlu upload multi-file real pada MVP pertama.
   - Contoh data mengikuti flow pengadaan lengkap sampai BAST/invoice agar stakeholder melihat end-to-end lifecycle proyek GIS.
   - Flag dokumen sensitif (`isSensitive`) untuk penawaran vendor, nilai kontrak, invoice, pajak, bukti pembayaran, dan SP2D reference; UI membatasi visibility/download/action sejak awal untuk Admin/Auditor/Finance permission saja.
   - Link output proyek ke aset/layer GIS dari fixture.

7. Reports MVP
   - Filter laporan dasar: OPD, jenis, tahun, hak, has_geom.
   - Tabel hasil.
   - Summary cards.
   - Chart sederhana.
   - Export button disabled/placeholder dengan pesan “akan diproses async worker”.

8. Preferences/Profile
   - Theme selection.
   - Default basemap.
   - Visible layers default.
   - Backup codes status placeholder.
   - Active sessions placeholder.

### Out of Scope Frontend MVP Pertama

- Backend Hono, DB, Drizzle, PostGIS migrations.
- Real OTP WhatsApp/email.
- Real MinIO upload/presigned URL.
- Real shapefile import/export.
- Real upload/download dokumen proyek via MinIO/presigned URL; MVP pertama cukup attachment/document list placeholder dan metadata dokumen.
- Real PDF/Excel/Atlas generation.
- Full role-permission editor.
- Workflow approval dokumen proyek multi-level.
- Integrasi LPSE/SIRUP/SIPD/SP2D/sistem keuangan daerah.
- OCR dokumen dan e-signature.
- Full audit log backend.
- Full asset version diff/restore.
- Vector tile/MVT.
- Production deployment/Nginx/observability.

## Step-by-Step Plan

### Phase 0 — Discovery & Project Baseline

1. Cek struktur repo saat ini.
2. Frontend belum ada; siapkan baseline **SvelteKit + Tailwind CSS** di `frontend/` dan shared package minimal di `shared/`. Styling foundation menggunakan Tailwind CSS sejak Phase 0.
3. Gunakan SvelteKit karena MVP perlu file-based routing, nested layouts, route guard, adapter-static SPA, env handling, dan struktur page/module. Svelte standalone hanya component compiler/library dan lebih cocok bila app routing/build shell sudah disediakan framework lain.
4. Konfigurasi Tailwind sejak awal sebagai styling foundation untuk shadcn-svelte: `tailwind.config.*`, `postcss.config.*`, `src/app.css`, design tokens, dark mode class, dan utility classes.
5. Tetapkan env frontend MVP:
   - `PUBLIC_API_MODE=mock|real`
   - `PUBLIC_API_BASE_URL=/api/v1`
   - `PUBLIC_DEFAULT_BASEMAP=esri_satellite`
   - `PUBLIC_MAPTILER_API_KEY=`
   - `PUBLIC_MAPBOX_ACCESS_TOKEN=`

### Phase 1 — Frontend App Skeleton

Likely files:

- `frontend/src/routes/+layout.ts`
- `frontend/src/routes/+layout.svelte`
- `frontend/src/routes/+page.svelte`
- `frontend/src/app.css`
- `frontend/src/lib/components/layout/AppShell.svelte`
- `frontend/src/lib/components/layout/Sidebar.svelte`
- `frontend/src/lib/components/layout/Navbar.svelte`
- `frontend/src/lib/components/ui/button/index.ts`
- `frontend/src/lib/components/ui/dialog/index.ts`
- `frontend/src/lib/components/ui/toast/index.ts`
- `frontend/src/lib/components/ui/skeleton/index.ts`
- `frontend/src/lib/components/ui/badge/index.ts`
- `frontend/src/lib/components/ui/card/index.ts`

Steps:

1. Configure SvelteKit SPA:
   - `ssr=false`
   - static adapter fallback `index.html`
2. Install dan konfigurasi **shadcn-svelte** sebagai sumber komponen UI dasar; komponen tetap owned/copyable sehingga bisa dikustomisasi sesuai branding SIMANTA.
3. Buat design tokens CSS/Tailwind theme:
   - primary: emerald/hijau GIS untuk aksi utama dan identitas aplikasi.
   - secondary/accent: cyan/biru untuk informasi spasial/layer/basemap.
   - warning: amber untuk dokumen belum lengkap/menunggu verifikasi.
   - destructive: red untuk error/delete/conflict.
   - neutral: slate/zinc untuk app shell, tabel, kartu admin.
   - dark mode variables.
   - map legend colors dari PRD §9.2.
4. Terapkan bahasa UI Indonesia pada menu, label, helper text, empty state, toast, dan dialog; istilah teknis yang lazim tetap dipertahankan.
5. Buat sidebar navigation sesuai PRD §9.3.
6. Buat route placeholders untuk semua modul agar navigasi lengkap.

Validation:

- `bun run check` atau `npm run check`.
- Buka halaman root dan pastikan sidebar/nav render.
- Responsive minimum 375px.

### Phase 2 — Shared Types, Envelope, Mock API

Likely files:

- `shared/src/envelope.ts`
- `shared/src/enums.ts`
- `shared/src/geojson.ts`
- `shared/src/schemas/asset.ts`
- `shared/src/schemas/opd.ts`
- `shared/src/schemas/auth.ts`
- `shared/src/schemas/project.ts`
- `frontend/src/lib/services/api/client.ts`
- `frontend/src/lib/services/api/mock.ts`
- `frontend/src/lib/services/api/assets.ts`
- `frontend/src/lib/services/api/opd.ts`
- `frontend/src/lib/services/api/auth.ts`
- `frontend/src/lib/services/api/projects.ts`
- `frontend/src/lib/mocks/assets.ts`
- `frontend/src/lib/mocks/opd.ts`
- `frontend/src/lib/mocks/users.ts`
- `frontend/src/lib/mocks/projects.ts`

Steps:

1. Define envelope types:
   - `SuccessResponse<T>`
   - `ErrorResponse`
   - `ErrorCode`
2. Define enums:
   - `JenisAset`
   - `StatusHak`
   - `RoleName`
   - `PermissionKey`
   - `PermissionScope`
   - `ProjectStatus`
   - `ProjectStage`
   - `ProjectDocumentKind`
3. Define minimal asset type:
   - id, idPemda, name, jenis, ownerOpdId, version, geom, centroid, luasSertifikat, luasSpasial, panjangSpasial, harga, hak, SP2D fields, attachment summary.
4. Define minimal project/document types:
   - `Project`: id, projectCode, projectName, fiscalYear, opdId, vendorName, contractNumber, contractValue, startDate, endDate, status, version, documentSummary, paymentSummary.
   - `ProjectDocument`: id, projectId, stage, kind, documentNumber, documentDate, filename, isSensitive, verificationStatus, scanStatus, uploadedBy, uploadedAt.
   - `ProjectMilestone`, `ProjectPayment`, `ProjectAssetLink`.
5. Implement `apiClient` abstraction:
   - reads `PUBLIC_API_MODE`.
   - returns envelope-normalized responses.
   - supports mock latency/error injection.
6. Create realistic fixtures:
   - 10–30 assets mixed geometry tersebar realistis di Jawa Timur, minimal mencakup Surabaya, Sidoarjo, Gresik, Malang, Batu, Mojokerto, Pasuruan, Probolinggo, Kediri, Madiun, Jember, Banyuwangi, dan Madura bila perlu.
   - 5 OPD dengan nama/karakteristik pemerintahan daerah Jawa Timur.
   - users for each role termasuk Finance demo user/permission untuk pembayaran.
   - 3–5 proyek GIS lintas status (`planning`, `procurement`, `in_progress`, `handover`, `completed`) dengan flow pengadaan lengkap: KAK/TOR, HPS, dokumen tender, penawaran vendor, BA evaluasi, kontrak, SPMK, laporan progres, UAT, BAST, invoice, faktur pajak, SP2D reference, bukti pembayaran.

Validation:

- Unit test envelope parsing.
- Mock asset list returns same shape as PRD `/api/v1/assets`.
- Mock geojson returns FeatureCollection matching `/api/v1/assets/geojson` expectation.
- Mock project list/detail/documents follow `/api/v1/projects/*` contract in PRD §7.14.

### Phase 3 — Auth Mock + Route Guard + RBAC Demo

Likely files:

- `frontend/src/routes/login/+page.svelte`
- `frontend/src/routes/recovery/+page.svelte`
- `frontend/src/lib/stores/auth.ts`
- `frontend/src/lib/services/api/auth.ts`
- `frontend/src/lib/auth/permissions.ts`
- `frontend/src/lib/components/auth/RoleSwitcher.svelte`

Steps:

1. Build login form:
   - email/password.
   - submit returns mock `otp_token`.
2. Build OTP step:
   - accepts any configured mock code, e.g. `123456`.
   - sets mock access token/user in auth store.
3. Add demo role switcher for development/UAT/demo build dengan badge “Mode Demo”; pastikan dapat dimatikan untuk production.
4. Implement `can(permission, scope?)` helper for conditional UI visibility.
5. Protect routes via layout guard.
6. Add recovery placeholder for backup code/email OTP.

Validation:

- Unauthenticated user redirects to `/login`.
- After OTP mock, user reaches dashboard.
- Role switch changes visible menu/actions.
- Viewer cannot see create/edit buttons.
- Viewer cannot see nilai kontrak/invoice/payment reference dan cannot download project documents marked sensitive; Admin/Auditor/Finance with permission/scope can see review/download/payment reference actions.

### Phase 4 — Dashboard WebGIS MVP

Likely files:

- `frontend/src/routes/dashboard/+page.svelte`
- `frontend/src/lib/components/map/MapContainer.svelte`
- `frontend/src/lib/components/map/BasemapControl.svelte`
- `frontend/src/lib/components/map/LayerControl.svelte`
- `frontend/src/lib/components/map/AssetGeoJsonLayer.svelte`
- `frontend/src/lib/components/map/MapPopup.svelte`
- `frontend/src/lib/components/map/styles.ts`
- `frontend/src/lib/components/dashboard/StatsCards.svelte`
- `frontend/src/lib/components/dashboard/BarChart.svelte`
- `frontend/src/lib/components/dashboard/PieChart.svelte`

Steps:

1. Install/use Leaflet and required CSS.
2. Implement `MapContainer` as single place creating Leaflet instance.
3. Implement basemap config:
   - `osm_standard`
   - `esri_satellite`
   - optional MapTiler/Mapbox hidden if token empty.
4. Render mock GeoJSON assets.
5. Style features by `jenis` using PRD color table.
6. Add layer toggle per `jenis`.
7. Add popup with key asset fields and link to detail.
8. Add stats cards and charts from mock dashboard service.
9. Add map empty/error state.

Validation:

- Map loads and can switch basemap.
- Assets appear with correct colors/geometry types.
- Popup opens and detail link works.
- Stats are separated by area/length to avoid double-count.

### Phase 5 — Assets List, Detail, Form, Geometry MVP

Likely files:

- `frontend/src/routes/assets/+page.svelte`
- `frontend/src/routes/assets/create/+page.svelte`
- `frontend/src/routes/assets/[id]/+page.svelte`
- `frontend/src/routes/assets/[id]/edit/+page.svelte`
- `frontend/src/routes/assets/[id]/history/+page.svelte`
- `frontend/src/lib/components/crud/AssetTable.svelte`
- `frontend/src/lib/components/crud/AssetFilters.svelte`
- `frontend/src/lib/components/crud/AssetForm.svelte`
- `frontend/src/lib/components/crud/AttachmentList.svelte`
- `frontend/src/lib/components/crud/TransferDialog.svelte`
- `frontend/src/lib/components/map/DrawControl.svelte`

Steps:

1. Build asset list table:
   - search.
   - filters.
   - pagination mock.
   - status `Belum dipetakan` when `geom=null`.
2. Build detail page:
   - info cards.
   - map preview.
   - attachment list mock.
   - version/history summary.
3. Build asset form:
   - adaptive fields by `jenis`.
   - version hidden field for edit.
   - geometry section.
   - SP2D structured fields.
   - attachment metadata placeholder.
4. Implement create/edit using mock service.
5. Implement delete/restore as UI only or mock state.
6. Implement conflict simulation:
   - service can return `CONFLICT_VERSION`.
   - UI shows conflict banner/modal.
7. Implement history placeholder:
   - timeline CREATE/UPDATE/GEOMETRY_UPDATE/TRANSFER from fixture.

Validation:

- Create flow can fill asset and redirect to detail.
- Edit flow updates mock asset.
- Form changes fields when `jenis` changes.
- Geometry absence is clearly displayed.
- Conflict modal appears from simulated version mismatch.

### Phase 6 — OPD Module MVP

Likely files:

- `frontend/src/routes/opd/+page.svelte`
- `frontend/src/lib/components/crud/OpdTable.svelte`
- `frontend/src/lib/components/crud/OpdForm.svelte`

Steps:

1. Render OPD table.
2. Show asset counts per OPD.
3. Add create/edit modal with validation.
4. Add delete guard message if OPD still has active assets.

Validation:

- OPD list renders.
- Modal create/edit works against mock service.
- Delete guard communicates transfer requirement.

### Phase 7 — Manajemen Proyek GIS & Dokumen Proyek MVP

Likely files:

- `frontend/src/routes/projects/+page.svelte`
- `frontend/src/routes/projects/create/+page.svelte`
- `frontend/src/routes/projects/[id]/+page.svelte`
- `frontend/src/routes/projects/[id]/edit/+page.svelte`
- `frontend/src/routes/projects/[id]/documents/+page.svelte`
- `frontend/src/routes/projects/[id]/payments/+page.svelte`
- `frontend/src/lib/components/projects/ProjectTable.svelte`
- `frontend/src/lib/components/projects/ProjectFilters.svelte`
- `frontend/src/lib/components/projects/ProjectForm.svelte`
- `frontend/src/lib/components/projects/ProjectTimeline.svelte`
- `frontend/src/lib/components/projects/ProjectDocumentChecklist.svelte`
- `frontend/src/lib/components/projects/ProjectDocumentUploader.svelte`
- `frontend/src/lib/components/projects/ProjectPaymentPanel.svelte`
- `frontend/src/lib/components/projects/ProjectAssetLinks.svelte`
- `frontend/src/lib/services/api/projects.ts`
- `frontend/src/lib/mocks/projects.ts`

Steps:

1. Build project list table:
   - filters: `fiscal_year`, `opd_id`, `vendor`, `status`, `contract_number`, `q`.
   - summary columns: project code/name, OPD, vendor, contract number/value, status, document completeness.
2. Build project detail page:
   - metadata kontrak.
   - timeline/milestone.
   - checklist dokumen per stage.
   - payment reference summary.
   - linked asset/layer GIS list.
3. Build project form mock:
   - projectCode, projectName, fiscalYear, opdId, vendorName, contractNumber, contractValue, start/end date, status, description.
   - hidden `version` field for optimistic locking.
4. Build document checklist/list placeholder, bukan upload multi-file real:
   - stage: planning, procurement, contract, implementation, handover, payment, post_project.
   - kind examples full flow: `kak_tor`, `hps`, `tender_document`, `vendor_proposal`, `evaluation_minutes`, `contract`, `spmk`, `progress_report`, `uat_document`, `bast_final`, `invoice`, `tax_invoice`, `sp2d_reference`, `payment_proof`.
   - show filename placeholder, documentNumber, documentDate, `verificationStatus`, `isSensitive`, checksum placeholder, and uploader metadata; action upload/download hanya disabled/placeholder.
5. Build payment panel mock:
   - paymentTerm, invoiceNumber/date/value, sp2dNumber/date, paymentStatus, linked document.
   - add visible disclaimer: “Referensi pembayaran; bukan sumber transaksi resmi.”
6. Implement RBAC demo:
   - `project:read`, `project:document_read`, `project:document_write`, `project:payment_read`, `project:payment_manage`.
   - hide sensitive document download, nilai kontrak, nilai invoice, pajak, bukti pembayaran, dan SP2D reference for Viewer and roles without Admin/Auditor/Finance permission/scope.
7. Implement link-to-assets mock:
   - searchable existing asset fixture.
   - relation: deliverable, updated, surveyed, migrated.

Validation:

- Project list/detail renders from mock `/api/v1/projects`.
- Checklist shows completeness by project stage.
- Document list placeholder shows complete lifecycle from tender to BAST/invoice without performing real upload/download.
- Sensitive document and payment values are hidden/disabled for Viewer and non Admin/Auditor/Finance permissions.
- Payment panel clearly labels SP2D/invoice as reference metadata, not official finance status.
- Linked asset opens `/assets/[id]`.

### Phase 8 — Reports MVP

Likely files:

- `frontend/src/routes/reports/+page.svelte`
- `frontend/src/routes/reports/presets/+page.svelte`
- `frontend/src/lib/components/reports/ReportFilters.svelte`
- `frontend/src/lib/components/reports/ReportSummary.svelte`
- `frontend/src/lib/components/reports/ReportTable.svelte`
- `frontend/src/lib/components/reports/ReportChart.svelte`

Steps:

1. Build filter form:
   - OPD.
   - jenis.
   - tahun range.
   - hak.
   - has_geom.
2. Call mock `reports/query` service.
3. Display response contract:
   - rows.
   - pagination.
   - summary.
   - groups/charts.
   - filters applied.
   - scope applied.
4. Add export Excel/PDF buttons as disabled/placeholder or mock queued job toast.
5. Add preset list placeholder.

Validation:

- Report filter updates table/chart/summary.
- Response model matches PRD §7.12.
- Export placeholder explains async job future behavior.

### Phase 9 — Preferences/Profile MVP

Likely files:

- `frontend/src/routes/profile/+page.svelte`
- `frontend/src/routes/profile/preferences/+page.svelte`
- `frontend/src/routes/profile/backup-codes/+page.svelte`
- `frontend/src/routes/profile/sessions/+page.svelte`
- `frontend/src/lib/stores/preferences.ts`

Steps:

1. Implement theme switch.
2. Implement default basemap preference.
3. Implement visible layer defaults.
4. Add backup code status placeholder.
5. Add active sessions placeholder.
6. Persist MVP preferences in local storage for demo only, with note that production uses `/api/v1/prefs`.

Validation:

- Theme changes immediately.
- Basemap preference affects dashboard default.
- Layer preferences affect default visible layers.

### Phase 10 — Testing, A11y, and Demo Polish

Likely files:

- `frontend/src/**/*.test.ts`
- `tests/e2e/frontend-mvp.spec.ts`
- `tests/e2e/a11y.spec.ts`

Steps:

1. Add unit tests for:
   - envelope parser.
   - permission helper.
   - asset form schema.
   - map style mapping.
2. Add Playwright smoke tests:
   - login mock + OTP.
   - dashboard loads.
   - asset list/detail.
   - create asset.
   - project list/detail + document checklist.
   - report query.
3. Add axe accessibility test for key pages.
4. Add basic loading/error/empty states.
5. Prepare demo script for stakeholder:
   - login as Admin.
   - view dashboard map.
   - filter asset list.
   - create/edit asset.
   - show conflict demo.
   - view project document checklist and sensitive-document RBAC.
   - view report.
   - switch role to Viewer and show restricted actions.

Validation:

- Type-check passes.
- Unit tests pass.
- Playwright smoke passes.
- No critical a11y violations on MVP pages.

## Suggested Frontend MVP Route Priority

Urutan development yang paling aman:

1. `/login`
2. `/dashboard`
3. `/assets`
4. `/assets/[id]`
5. `/assets/create`
6. `/assets/[id]/edit`
7. `/opd`
8. `/projects`
9. `/projects/[id]`
10. `/projects/[id]/documents`
11. `/reports`
12. `/profile/preferences`
13. placeholder routes untuk tools/import/export/atlas/audit/user-management dan integrasi eksternal pengadaan/keuangan

Alasannya: stakeholder biasanya paling cepat memahami sistem dari dashboard peta dan daftar aset. Auth cukup mock dulu agar flow terasa nyata. Modul berat seperti import/export/atlas serta workflow approval/integrasi proyek baru perlu setelah bentuk data dan layout utama disetujui.

## Files Likely to Change

Jika repo belum memiliki frontend, kemungkinan file/folder baru:

```txt
frontend/
  src/
    routes/
      +layout.ts
      +layout.svelte
      login/+page.svelte
      recovery/+page.svelte
      dashboard/+page.svelte
      assets/+page.svelte
      assets/create/+page.svelte
      assets/[id]/+page.svelte
      assets/[id]/edit/+page.svelte
      assets/[id]/history/+page.svelte
      opd/+page.svelte
      projects/+page.svelte
      projects/create/+page.svelte
      projects/[id]/+page.svelte
      projects/[id]/edit/+page.svelte
      projects/[id]/documents/+page.svelte
      projects/[id]/payments/+page.svelte
      reports/+page.svelte
      profile/preferences/+page.svelte
    lib/
      components/
        layout/
        ui/
        map/
        crud/
        dashboard/
        reports/
        projects/
      services/api/
      stores/
      mocks/
      auth/
      types.ts
    app.css
  svelte.config.js
  package.json

shared/
  src/
    envelope.ts
    enums.ts
    geojson.ts
    schemas/
      asset.ts
      opd.ts
      auth.ts
      report.ts
      project.ts
```

Jika frontend sudah ada, perubahan sebaiknya tetap mengikuti struktur PRD dan menghindari rename liar.

## Tests / Validation

### Manual Validation Checklist

- Login mock berhasil melewati step OTP.
- Role switcher bisa menunjukkan perbedaan akses Admin/Editor/Viewer/Auditor.
- Dashboard menampilkan peta, basemap, asset layer, popup, stats, chart.
- Daftar aset bisa search/filter/pagination.
- Detail aset menampilkan geometry preview dan lampiran mock.
- Form aset adaptif mengikuti `jenis`.
- Aset tanpa geometry ditandai “Belum dipetakan”.
- Conflict version mock menampilkan modal/bannner.
- OPD table dan modal edit berjalan.
- Reports query menampilkan rows, summary, chart, filters applied.
- Project list/detail menampilkan metadata proyek, timeline, checklist dokumen, payment reference, dan linked assets.
- Dokumen proyek sensitif tidak bisa di-download oleh Viewer pada mock RBAC.
- UI payment reference menampilkan disclaimer bahwa LPSE/SIRUP/SIPD/SP2D/sistem keuangan tetap sumber utama.
- Theme dan basemap preference tersimpan untuk demo.

### Automated Validation Targets

- `bun run check` atau command setara untuk Svelte type-check.
- `bun test` / `vitest` untuk unit tests.
- `playwright test` untuk smoke E2E.
- `playwright test a11y` atau axe-core untuk a11y.

### API Contract Validation

Walaupun backend belum ada, mock response harus mengikuti:

- Success envelope:
  - `success`
  - `message`
  - `data`
  - `meta`
  - `request_id`
  - `timestamp`
- Project endpoints mock:
  - `/api/v1/projects`
  - `/api/v1/projects/:id`
  - `/api/v1/projects/:id/documents`
  - `/api/v1/projects/:id/documents/:documentId/download`
  - `/api/v1/projects/:id/payments`
  - `/api/v1/projects/:id/assets/:assetId`
- Error envelope:
  - `success=false`
  - `code`
  - `message`
  - `errors`
  - `request_id`
  - `timestamp`

Frontend jangan mengakses mock raw data langsung dari komponen. Semua harus lewat service layer agar transisi ke backend riil mudah.

## Risks, Tradeoffs, and Mitigations

### Risk: Frontend mock terlalu jauh dari backend riil

Mitigation:

- Pakai endpoint path dan envelope persis PRD `/api/v1/*`.
- Buat service adapter `mock` vs `real`.
- Jangan hard-code fixture langsung di komponen.

### Risk: Scope frontend MVP melebar ke semua fitur PRD

Mitigation:

- Batasi MVP pertama ke dashboard, assets, OPD, project documents dasar, reports dasar, profile preferences.
- Tools/import/export/atlas/audit/user-management, workflow approval dokumen proyek, OCR, dan integrasi LPSE/SIRUP/SIPD/SP2D cukup placeholder informatif.

### Risk: GIS plugin memperlambat setup

Mitigation:

- Prioritaskan Leaflet base map + GeoJSON layer dulu.
- Draw/edit geometry boleh dimulai dengan minimal draw control atau JSON geometry editor sementara.
- Pastikan `MapContainer` diabstraksikan agar plugin dapat ditambahkan bertahap.

### Risk: RBAC terlalu kompleks untuk frontend awal

Mitigation:

- Implement permission helper minimal dan role fixture.
- Jangan buat role-permission editor dulu.
- Gunakan permission checks hanya untuk hide/show action dan route guard demo.

### Risk: Modul proyek disalahpahami sebagai sistem pengadaan/keuangan resmi

Mitigation:

- Tampilkan copy/disclaimer di ProjectPaymentPanel bahwa invoice/SP2D hanya referensi administrasi.
- Jangan tampilkan status pembayaran resmi seolah tersinkron otomatis.
- Route integrasi LPSE/SIRUP/SIPD/SP2D hanya placeholder Post-MVP.

### Risk: Dokumen tender/invoice/pajak bocor di demo RBAC

Mitigation:

- Tandai fixture sensitif dengan `isSensitive=true`.
- Permission helper wajib mengecek `project:document_read` + scope sebelum menampilkan download/action.
- Audit/download event dibuat mock log agar stakeholder paham semua akses harus tercatat.

### Risk: UI tampak selesai padahal backend belum ada

Mitigation:

- Label internal “mock mode” di dev/staging.
- Export/import/atlas/upload real diberi placeholder/queued state, bukan pura-pura sukses production.
- Demo script menjelaskan mana mock, mana siap integrasi.

## Stakeholder Decisions — Resolved Open Questions

1. Frontend belum tersedia; siapkan baseline memakai **SvelteKit 2 + Svelte 5 + Tailwind CSS**, bukan Svelte standalone. Styling foundation menggunakan Tailwind CSS.
   - Svelte adalah compiler/component framework. Cocok untuk membuat komponen UI.
   - SvelteKit adalah application framework di atas Svelte. Cocok untuk SIMANTA karena sudah menyediakan routing, layout, route guard, env handling, build static SPA, dan struktur app/module.
2. Styling memakai **shadcn-svelte** sebagai basis komponen; tema disesuaikan untuk project GIS pemerintahan dengan primary emerald/hijau, accent cyan/biru, warning amber, destructive red, dan neutral slate/zinc.
3. UI memakai bahasa Indonesia penuh sejak awal; istilah teknis tetap English/akronim bila lebih lazim: API, RBAC, role, permission, scope, GeoJSON, layer, basemap, OTP, invoice, BAST, SP2D.
4. Mock data harus meniru wilayah geografis kota/kabupaten Jawa Timur agar peta terlihat realistis.
5. Attachment/document list cukup placeholder dahulu; real upload/download multi-file ditunda.
6. Role switcher boleh tampil di build demo/UAT dengan badge “Mode Demo” dan harus bisa dimatikan untuk production.
7. Contoh data proyek harus memakai flow pengadaan lengkap sampai BAST/invoice.
8. Nilai kontrak/invoice dan dokumen/payment reference sensitif selalu dibatasi untuk Admin/Auditor/Finance permission sejak awal; Viewer tidak boleh melihat data sensitif tersebut.

## Recommended First Milestone

Milestone frontend MVP pertama yang paling bernilai adalah:

**“Dashboard + Asset List Demo”**

Deliverable:

- Login mock OTP.
- App shell.
- Dashboard Leaflet dengan asset GeoJSON mock.
- Stats + chart.
- Asset list dengan filter.
- Asset detail read-only.

Estimasi realistis: 3–5 hari kerja bila SvelteKit + Tailwind baseline sudah ada, atau 5–8 hari kerja bila baseline frontend perlu disiapkan dari nol.

Setelah milestone ini disetujui, lanjut ke:

**“Asset Form + OPD + Project Documents + Reports Demo”**

Deliverable:

- Create/edit asset mock.
- Geometry/digitasi minimal.
- OPD table/modal.
- Project list/detail + document checklist + payment reference mock.
- Reports basic.
- Preferences.

Estimasi realistis: 5–8 hari kerja tambahan.

## Final Recommendation

Untuk development frontend MVP dahulu, jangan mulai dari seluruh PRD sekaligus. Mulai dari **kontrak data + shell + dashboard peta + daftar/detail aset**, karena itu inti value WebGIS dan paling cepat divalidasi stakeholder. Setelah itu baru tambah form aset, OPD, Manajemen Proyek GIS/Dokumen Proyek, laporan, dan preferences. Fitur berat seperti export/import/atlas/bulk/audit cukup disiapkan route dan service contract-nya, tetapi implementasi riil ditunda sampai backend/worker siap.
