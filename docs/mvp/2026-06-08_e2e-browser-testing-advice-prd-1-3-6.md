# E2E Browser Testing Advice — Frontend MVP SIMANTA PRD v1.3.7

Tanggal: 2026-06-08 (awalnya untuk v1.3.6), di-update ke v1.3.7 pada 2026-06-12.
Branch/commit yang diuji awal: `hermes/dev` @ `d732205` (v1.3.6 era)
Update penyelesaian: `hermes/dev` @ `1aa072f` (setelah Phase 8 attachment metadata + ATTACHMENT_* audit)
Target: Frontend MVP SIMANTA setelah realignment terhadap main PRD v1.3.7
Metode: Browser-based exploratory E2E smoke + console inspection + automated validation reference

## Perubahan v1.3.7 (per 2026-06-12 plan)

Plan eksekusi:
- Plan lokal: `.hermes/plans/2026-06-12_104500-frontend-mvp-prd-v137-next-gap.md`
- Verdict BA pre-impl: `APPROVED_FOR_DEV` (simantaba, dengan 3 IMPORTANT + 3 MINOR fixes)
- Phase 0 (BA handoff) → Phase 11 (final review) semua selesai
- Branch `hermes/dev` saat ini: v1.3.7 MVP complete dengan 11 phase delivered

## Ringkasan eksekutif v1.3.7

Frontend MVP secara umum sudah layak untuk smoke/demo PRD v1.3.6:

- Single active OPD terlihat konsisten di Dashboard, Profil OPD, Project GIS, dan Laporan.
- Affordance multi-OPD utama sudah hilang dari flow yang diuji.
- Project GIS sudah menampilkan model header dokumen + file/lampiran multi-file.
- Payment sudah menjadi Riwayat Pembayaran read-only, bukan workflow transaksi.
- Role `Finance` sudah tidak muncul di role switcher.
- Viewer masking untuk dokumen/payment sensitif bekerja pada flow yang diuji.
- Tidak ditemukan JavaScript console error pada navigasi/interaksi manual yang diuji.

Dua finding utama dari sesi browser advice sudah ditindaklanjuti pada commit `65542f9`:

1. Viewer tetap dapat membaca `/projects/prj-001/documents`, tetapi upload controls disembunyikan lewat gate permission `project:document_write`.
2. Fixture document header `verified` sekarang dijaga invariant global: minimal satu active file harus memiliki `scanStatus: 'clean'`.

## Lingkup testing browser manual

Dev server lokal:

```bash
npm run dev -- --host 127.0.0.1 --port 4174
```

Target URL:

```text
http://127.0.0.1:4174
```

Flow yang diuji:

1. Login mock dua langkah:
   - Password login
   - OTP mock
   - Redirect ke Dashboard

2. Dashboard WebGIS:
   - Single active OPD copy terlihat.
   - OPD aktif tampil sebagai `DPUBMCK`.
   - Search asset di map panel dengan query `Surabaya`.
   - Tidak ada `Distribusi OPD` / grouping lintas OPD.
   - Console bersih.

3. Profil OPD Pengguna:
   - Halaman menampilkan satu OPD aktif/default.
   - Tombol edit profil OPD tersedia untuk Admin.
   - Modal edit profil OPD terbuka.
   - Tidak terlihat tombol tambah/hapus OPD.

4. Project GIS:
   - List proyek menampilkan `OPD AKTIF` dan seluruh row memakai `DPUBMCK`.
   - Detail project dapat dibuka.
   - Link Dokumen dan Riwayat Pembayaran tersedia.

5. Dokumen Proyek:
   - Header dokumen + file/lampiran tampil.
   - Status clean/pending/blocked tampil.
   - Header sensitif mewariskan masking ke file untuk Viewer.
   - Tombol download file sensitif disabled untuk Viewer.
   - Tombol Submit/Verify tidak muncul untuk Viewer.
   - Verify incomplete sudah tersedia secara E2E automated, tetapi manual click pada Admin tidak menunjukkan perubahan snapshot; perlu pengamatan lebih spesifik bila ingin debugging interaksi tersebut.

6. Riwayat Pembayaran:
   - Halaman dapat dibuka sebagai Viewer.
   - Nilai invoice/SP2D disembunyikan untuk Viewer.
   - Tidak ada tombol manage/approve/bayar.
   - Copy menyatakan SIMANTA bukan sistem keuangan sumber utama.

7. Direct route guard:
   - Viewer direct navigation ke `/projects/create` menampilkan `Akses ditolak`.

8. Laporan Dasar:
   - Scope tampil `own_opd (DPUBMCK)`.
   - Tidak ada filter `Semua OPD`.
   - Tidak ada `Finance` di body/role switcher.
   - Title dokumen browser terdeteksi `SIMANTA - Laporan Dasar`.

## Validasi otomatis yang menjadi baseline

Validasi yang sudah berhasil sebelumnya pada implementasi yang sama:

```bash
npm run check
npm run test
npm run build
npm run test:e2e
npm run test:a11y
npm run verify:mvp
```

Hasil penting:

- `npm run check`: PASS, 0 errors/warnings.
- `npm run test`: PASS, 4 files / 8 tests.
- `npm run build`: PASS.
- `npm run test:e2e`: PASS, 8 tests.
- `npm run test:a11y`: PASS, 5 tests.
- `npm run verify:mvp`: PASS penuh.

Pada sesi browser advice ini juga dijalankan ulang:

```bash
npm run check
npm run test
```

Hasil:

- `npm run check`: PASS, 0 errors/warnings.
- `npm run test`: PASS, 4 files / 8 tests.


Update setelah perbaikan finding:

```bash
npm run test -- src/lib/auth/permissions.test.ts src/lib/mocks/projects.test.ts
npm run test:e2e -- --grep "Project GIS document headers show multi-file upload|document multi-file input commits mock uploads|document fixture verified headers"
npm run check
```

Hasil:

- `npm run test -- src/lib/auth/permissions.test.ts src/lib/mocks/projects.test.ts`: PASS, 2 files / 4 tests.
- `npm run test:e2e -- --grep "Project GIS document headers show multi-file upload|document multi-file input commits mock uploads|document fixture verified headers"`: PASS, 3 tests.
- `npm run check`: PASS, 0 errors/warnings.

## Finding 1 — Viewer masih melihat affordance upload multi-file

Status: Resolved pada commit `65542f9`
Severity awal: High
Kategori: RBAC / UX security hardening
Area: `/projects/prj-001/documents`
Role: Viewer

### Observasi awal

Saat role diganti menjadi Viewer pada halaman Dokumen Proyek:

- Masking file sensitif bekerja.
- Tombol download file sensitif disabled.
- Tombol Submit/Verify tidak muncul.
- Tetapi section berikut masih terlihat:
  - `Mock upload multi-file interaktif`
  - input/button `Pilih multi-file dokumen`

Upload dokumen adalah mutasi. Walaupun belum diuji sampai commit upload sebagai Viewer dalam sesi manual ini, affordance upload tetap terlihat untuk role read-only.

### Expected behavior

Viewer seharusnya tidak melihat atau tidak bisa memakai upload multi-file.

### Perbaikan

Implementasi saat ini memakai permission helper existing:

```ts
canWriteProjectDocument(user)
```

Di `frontend/src/routes/projects/[id]/documents/+page.svelte`, upload card `Mock upload multi-file interaktif` berada di dalam:

```svelte
{#if canUploadDocuments}
```

dengan assignment:

```ts
$: canUploadDocuments = canWriteProjectDocument($currentUser);
```

Permission literal tetap `project:document_write` melalui `frontend/src/lib/auth/permissions.ts`; tidak ada role-name check baru dan service mock `createProjectDocumentFiles(...)` tetap tidak diberi dependency session/user.

### Validasi tambahan

E2E `Project GIS document headers show multi-file upload, masking, verify rule, and audit file id` sekarang menegaskan Viewer:

- Tetap dapat membuka halaman dan melihat heading `Dokumen Proyek`.
- Tidak melihat `Mock upload multi-file interaktif`.
- Tidak memiliki control `Pilih header dokumen upload`.
- Tidak memiliki control `Pilih multi-file dokumen`.
- Tidak memiliki tombol `Commit upload mock`.

Test Admin `document multi-file input commits mock uploads` tetap membuktikan authorized upload visible dan usable.

## Finding 2 — Fixture dokumen “Kontrak” inkonsisten dengan verify rule

Status: Resolved pada commit `65542f9`
Severity awal: Medium-High
Kategori: Contract/data realism
Area: `/projects/prj-001/documents`

### Observasi awal

Header dokumen `Kontrak` sebelumnya tampil:

- `verificationStatus`: `verified`
- clean count: `0`
- blocked count: `1`
- file: `kontrak_GIS-2026-001.pdf`
- scan status: `blocked`

Ini inkonsisten dengan rule MVP/PRD yang sudah diterapkan: verify harus ditolak jika tidak ada file aktif dengan scan `clean`.

### Expected behavior

Tidak boleh ada header dokumen `verified` jika tidak memiliki minimal satu file aktif `clean`.

### Perbaikan

Fixture mempertahankan status `Kontrak` sebagai `verified`, tetapi menambahkan active clean file agar demo tetap menampilkan mixed blocked/clean file status secara realistis:

- `prj-001/doc-1-3`: `file-1-3-a` tetap `blocked`, dan `file-1-3-b` menjadi active `clean`.
- `prj-002/doc-2-1`: menambahkan `file-2-1-a` active `clean`.
- `prj-002/doc-2-3`: menambahkan `file-2-3-a` active `clean`.
- `prj-003/doc-3-3`: menambahkan `file-3-3-a` active `clean`.

### Validasi tambahan

Ditambahkan `frontend/src/lib/mocks/projects.test.ts` untuk invariant data global:

- Semua document header dengan `verificationStatus: 'verified'` harus punya minimal satu `documentFiles` row yang `isActive` dan `scanStatus === 'clean'`.

DOM smoke existing `document fixture verified headers always have active clean files` tetap dipertahankan untuk halaman `prj-001`.

## Advice tambahan untuk memperkuat E2E PRD v1.3.6

Status update implementasi: Resolved pada workspace `hermes/dev` saat update ini (belum commit/push oleh Hermes).

Implementasi tambahan ini memperkuat E2E/frontend MVP tanpa mengubah scope PRD v1.3.6:

- Permanent Single Active OPD mode tetap dipertahankan.
- Tidak ada active multi-OPD, OPD transfer, cross-OPD stats/filter, OPD CRUD, inter-OPD relocation, atau role `Finance` yang ditambahkan.
- Project GIS tetap diposisikan sebagai repositori administrasi/audit/reference proyek, bukan pengganti LPSE/SIRUP/SIPD/SP2D/finance systems.

### 1. Tambah E2E invariant single active OPD berbasis data/DOM

Status: Resolved pada update ini.

Cakupan implementasi:

- E2E baru memastikan semua row Project GIS yang tampil memakai OPD aktif/default fixture `DPUBMCK`.
- E2E baru memastikan semua row Asset yang tampil memakai OPD aktif/default fixture `DPUBMCK`.
- E2E baru memastikan Reports/Laporan menampilkan scope `own_opd (DPUBMCK)` dan tidak memiliki filter OPD.
- E2E memperkuat negative assertions terhadap active UI agar tidak menampilkan `Semua OPD`, `Distribusi OPD`, grouping/filter/selector OPD lintas organisasi, atau role `Finance`.
- Copy active UI di Assets dan Reports dinetralkan agar tidak menonjolkan istilah out-of-scope sambil tetap menyatakan scope OPD aktif/default.

File utama:

- `frontend/tests/e2e/frontend-mvp.spec.ts`
- `frontend/src/routes/assets/+page.svelte`
- `frontend/src/routes/reports/+page.svelte`

### 2. Tambah E2E matrix role dokumen proyek

Status: Resolved pada update ini.

Cakupan implementasi:

- E2E matrix Admin/Auditor/Viewer ditambahkan untuk `/projects/prj-001/documents`.
- Admin/Auditor dapat melihat metadata/file sensitif sesuai permission `project:document_read` dan hanya dapat mengunduh file aktif dengan `scanStatus === 'clean'`.
- Admin memiliki upload control; Auditor tidak memiliki upload control karena tidak memiliki `project:document_write`.
- Auditor verify mengikuti permission mock `project:document_verify`.
- Viewer tetap dapat membuka halaman secara read-only, tetapi header/file sensitif dimasking, download sensitif disabled, verify hidden, dan upload controls hidden.
- Handler download mock sekarang memblokir file sensitif tanpa permission dan file yang tidak active-clean.
- Helper RBAC `canReadSensitiveProjectDocument` tidak lagi memberikan akses sensitif hanya karena role label; permission key tetap menjadi dasar keputusan.
- Fixture dokumen diperkuat: header `submitted`/`verified` memiliki active file, dan header `verified` tetap wajib memiliki active clean file.

File utama:

- `frontend/tests/e2e/frontend-mvp.spec.ts`
- `frontend/src/routes/projects/[id]/documents/+page.svelte`
- `frontend/src/routes/projects/[id]/+page.svelte`
- `frontend/src/lib/auth/permissions.ts`
- `frontend/src/lib/auth/permissions.test.ts`
- `frontend/src/lib/mocks/projects.ts`
- `frontend/src/lib/mocks/projects.test.ts`

### 3. Tambah E2E payment history role matrix

Status: Resolved pada update ini.

Cakupan implementasi:

- E2E matrix Admin/Auditor/Viewer ditambahkan untuk `/projects/prj-001/payments`.
- Admin/Auditor melihat invoice/SP2D/value berdasarkan permission `project:payment_read`.
- Viewer melihat masking dan tidak menerima payment reference sensitif dari mock bundle default.
- Semua role diuji tidak melihat aksi transaksi seperti approve/manage/bayar/proses pembayaran/workflow finance.
- Status payment yang tampil dijaga dalam enum PRD v1.3.6: `draft`, `submitted`, `verified`, `paid`, `rejected`, `cancelled`.
- Copy payment diperjelas: SIMANTA adalah arsip referensi administrasi dan audit proyek, bukan sistem keuangan sumber utama.

File utama:

- `frontend/tests/e2e/frontend-mvp.spec.ts`
- `frontend/src/routes/projects/[id]/payments/+page.svelte`
- `frontend/src/routes/projects/[id]/+page.svelte`
- `frontend/src/lib/services/api/projects.ts`
- `frontend/src/lib/mocks/projects.test.ts`

### 4. Tambah map-control smoke yang lebih kuat

Status: Resolved pada update ini.

Cakupan implementasi:

- Dashboard dan MapContainer sekarang mengekspos state testable untuk basemap dan jumlah layer aktif.
- E2E memastikan selector basemap mengubah visible state ke `OSM Standard`.
- E2E memastikan toggle layer mengubah indikator active layer dari `6/6` ke `5/6` dan MapContainer ke `5 layer aktif`.
- Leaflet popup/link asset diuji dengan test hook stabil `data-testid="map-feature"`, bukan selector internal `.leaflet-interactive`.
- Popup HTML MapContainer sekarang meng-escape properti GeoJSON sebelum interpolasi untuk menghindari XSS dari property asset.
- Simulasi GeoJSON failure sekarang membersihkan stale layer, menampilkan alert, lalu recovery saat unchecked mengembalikan fitur peta.

File utama:

- `frontend/src/lib/components/map/MapContainer.svelte`
- `frontend/src/routes/dashboard/+page.svelte`
- `frontend/tests/e2e/frontend-mvp.spec.ts`

### 5. Hindari menyebut istilah out-of-scope terlalu eksplisit di active UI

Status: Resolved pada update ini.

Perubahan copy Profil OPD:

```text
MVP ini hanya menampilkan Profil OPD aktif/default sesuai PRD v1.3.6. Fitur lintas OPD tidak termasuk scope aktif.
```

E2E memperkuat bahwa copy lama yang terlalu eksplisit (`CRUD OPD tambahan`, `relokasi`, `transfer antar-OPD`) tidak muncul pada Profil OPD active UI.

File utama:

- `frontend/src/routes/opd/+page.svelte`
- `frontend/tests/e2e/frontend-mvp.spec.ts`

## File/test yang ditambahkan atau diubah

Repository files changed pada update ini:

- `docs/mvp/2026-06-08_e2e-browser-testing-advice-prd-1-3-6.md`
- `frontend/src/lib/auth/permissions.ts`
- `frontend/src/lib/auth/permissions.test.ts`
- `frontend/src/lib/components/map/MapContainer.svelte`
- `frontend/src/lib/mocks/projects.ts`
- `frontend/src/lib/mocks/projects.test.ts`
- `frontend/src/lib/services/api/projects.ts`
- `frontend/src/routes/assets/+page.svelte`
- `frontend/src/routes/dashboard/+page.svelte`
- `frontend/src/routes/opd/+page.svelte`
- `frontend/src/routes/projects/[id]/+page.svelte`
- `frontend/src/routes/projects/[id]/documents/+page.svelte`
- `frontend/src/routes/projects/[id]/payments/+page.svelte`
- `frontend/src/routes/reports/+page.svelte`
- `frontend/tests/e2e/frontend-mvp.spec.ts`

Test coverage baru/diubah:

- `single active OPD invariant is enforced in project, asset, reports, and role UI DOM`
- `document role matrix follows project document permissions`
- `payment history role matrix is archive-only and masks sensitive values for Viewer`
- Existing dashboard/map smoke diperkuat dengan basemap state, active-layer state, popup asset link, GeoJSON failure clear, dan recovery.
- Unit tests RBAC dan project fixtures diperkuat untuk permission-based sensitive access, redacted payment bundle, `verified` active-clean invariant, dan `submitted`/`verified` active-file invariant.

## Verification command dan hasil aktual

Perintah yang dijalankan dari `frontend/` setelah fix loop final:

```bash
npm run check
npm run test
npm run test:e2e -- --grep "document role matrix|Project GIS document headers|payment history role matrix|dashboard preferences"
npm run verify:mvp
```

Hasil aktual:

- `npm run check`: PASS — `svelte-check found 0 errors and 0 warnings`.
- `npm run test`: PASS — 5 test files / 13 tests passed.
- Targeted E2E grep: PASS — 4 tests passed.
- `npm run verify:mvp`: PASS penuh:
  - check PASS
  - unit tests PASS — 5 files / 13 tests
  - build PASS
  - E2E PASS — 12 tests
  - a11y PASS — 5 tests

Review aktual:

- `simantaba` BA handoff awal: `APPROVED_FOR_DEV`.
- Post-implementation BA review via profile `simantaba`: `PASS`. Scope PRD v1.3.6, Single Active OPD permanen, RBAC dokumen/payment, read-only payment history, dan product boundary dinyatakan compliant. Tidak ada required fix blocking dari perspektif business/PRD compliance.
- OMP external adversarial review loop:
  - Review pertama: `REQUEST_CHANGES`; finding utama terkait clean-scan-only download, XSS popup, permission-based sensitive reads, payment redaction, stale GeoJSON layer, selector map, dan fixture invariant.
  - Review kedua: `REQUEST_CHANGES`; finding utama terkait masking header dokumen sensitif, handler download permission guard, project detail payment redaction, submitted/verified active-file invariant, dan own_opd document read policy.
  - Review final: `APPROVED` dengan minor issues non-blocking.

## Sisa risiko/blocker

- Tidak ada blocker review tersisa setelah post-implementation `simantaba` review berhasil dengan verdict `PASS` dan OMP final `APPROVED`.
- Minor non-blocking dari BA/OMP:
  - Mock blocked download saat ini menampilkan toast `PROJECT_DOCUMENT_DOWNLOAD_BLOCKED`, belum membuat mock audit event terstruktur untuk failure metadata.
  - Viewer masking masih memperlihatkan placeholder/cardinality dokumen sensitif; jika policy kelak berubah menjadi omit total, bundle/UI perlu disesuaikan.
  - Endpoint mock preference masih memakai `/api/v1/preferences`, sementara PRD menyebut `/api/v1/prefs`; ini di luar scope advice E2E kali ini.

## Recommended next actions

Prioritas dari advice tambahan E2E PRD v1.3.6 pada report ini sudah selesai pada workspace saat ini.

Sebelum commit/push, lakukan review manusia terhadap diff bila diperlukan, terutama untuk keputusan policy apakah Viewer cukup melihat placeholder masking atau harus tidak melihat keberadaan header/file sensitif sama sekali.
