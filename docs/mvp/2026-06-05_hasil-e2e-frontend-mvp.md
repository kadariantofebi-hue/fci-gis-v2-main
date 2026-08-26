# Hasil E2E Frontend MVP SIMANTA

Tanggal testing: 2026-06-05

Referensi:

- Plan frontend: `.hermes/plans/2026-06-04_101944-frontend-mvp-simanta.md`
- PRD current: `docs/PRD_WebGIS_Pemetaan_Wilayah.md` v1.3.3
- Target lokal: `http://127.0.0.1:5173`

## Ringkasan Eksekutif

Frontend MVP sudah layak untuk demo awal stakeholder pada value utama:

- Login mock OTP
- Dashboard peta
- Asset list/detail/create mock
- OPD list
- Project GIS + dokumen + payment reference
- RBAC masking data sensitif project untuk Viewer
- Reports dasar
- Preferences dasar

Validasi teknis build/typecheck/unit test bersih. Kekurangan utama ada pada coverage RBAC route/action, kelengkapan field PRD, automated E2E/a11y gate, dan beberapa komponen GIS advanced yang memang sebagian berada di hardening/post-MVP.

## Validasi Teknis Otomatis

Command:

```bash
npm run check && npm run test && npm run build
```

Hasil aktual:

- `svelte-check`: 0 errors, 0 warnings
- `vitest`: 3 test files passed, 5 tests passed
- `vite build`: berhasil
- Static SPA build berhasil menulis output ke `build/`

Catatan: pada saat testing awal belum ada Playwright/axe E2E otomatis sesuai target plan Phase 10. Unit test yang tersedia saat itu mencakup API client envelope, permission helper, dan map styles.

## Flow E2E yang Diuji

### 1. Auth mock + route guard

Status: Pass sebagian

Yang berhasil:

- Root redirect/render ke login.
- Login password mock lanjut ke OTP.
- OTP `123456` berhasil masuk dashboard.
- Logout berhasil.
- Setelah logout, akses langsung `/dashboard` kembali ke login.

Kekurangan:

- Recovery page masih placeholder.
- Belum ada simulasi rate-limit, invalid OTP max attempt, backup code, email OTP fallback.
- `document.title` kosong di browser, snapshot menunjukkan `untitled page`.

Advice:

- Tambahkan title per route, misalnya `SIMANTA - Dashboard WebGIS`.
- Tambahkan E2E login invalid OTP dan recovery placeholder agar stakeholder tahu batas MVP.
- Untuk production readiness nanti, jangan simpan token/refresh mock di localStorage; PRD mengharuskan access token di memori FE dan refresh via HttpOnly cookie.

### 2. Dashboard WebGIS

Status: Pass untuk MVP dasar

Yang berhasil:

- Dashboard tampil setelah login.
- Stats card tampil: total aset, luas tanah, luas bangunan, panjang jalan, panjang saluran, belum dipetakan.
- Leaflet map tampil.
- Basemap control tersedia: Esri Satellite / OSM Standard.
- Layer toggle per jenis tersedia: tanah, bangunan, jalan, saluran, taman, lainnya.
- Chart distribusi jenis dan OPD tampil.
- Console browser tidak menunjukkan JS error pada flow dashboard.

Kekurangan terhadap PRD:

- Belum ada layer control per OPD.
- Belum ada mode toggle pengelompokan layer: jenis vs OPD.
- Belum ada tombol Select All / hide all layer.
- Belum ada search asset langsung di peta.
- Belum ada measure tool.
- Belum ada reverse geocode/spatial query saat klik area kosong.
- Belum ada bookmark bbox+zoom.
- Belum ada bbox/zoom-aware loading GeoJSON.
- Belum terlihat empty/error state tile provider gagal.
- Preferensi default basemap/layer belum divalidasi sampai mempengaruhi dashboard setelah reload.

Advice:

1. Select All layer.
2. Layer by OPD.
3. Search asset di peta.
4. Empty state saat tile/GeoJSON gagal.
5. Penerapan preferensi default basemap/layer ke dashboard.

### 3. Asset list/detail/create/edit

Status: Pass untuk alur dasar, tetapi ada gap RBAC dan form PRD

Yang berhasil:

- Daftar aset tampil.
- Filter search berjalan; contoh `jember` hanya menampilkan aset Jember.
- Detail aset tampil.
- Aset tanpa geometry ditandai `Belum dipetakan`.
- Create asset mock berhasil sebagai Admin.
- Reports ikut membaca aset mock baru, menunjukkan mock persistence berjalan dalam session.

Temuan penting:

- Saat role Viewer, tombol `Tambah aset` tidak tampil di list.
- Namun jika Viewer membuka langsung URL `/assets/create`, halaman create tetap bisa diakses. Ini tidak sesuai PRD/plan karena Viewer hanya baca dashboard/peta/detail/laporan.
- Route-level guard untuk aksi create/edit belum cukup; saat ini guard lebih banyak di visibility UI list.

Gap form aset terhadap PRD:

- Field belum lengkap: Kode Barang, Register, Penggunaan, Nomor/tanggal sertifikat, Nomor/tanggal/nilai/dinas penerbit SP2D, Description, Attachment metadata detail.
- `ownerOpdId` masih bisa diedit di form edit, padahal PRD menyebut OPD pemilik hanya di create; transfer harus via endpoint/proses khusus.
- `luasSpasial` / `panjangSpasial` masih berupa input mock, belum benar-benar read-only hasil geometry.
- Digitasi masih placeholder: Leaflet Draw ditunda.
- Belum ada preview geometry existing + tombol hapus geometry.
- Belum ada validasi Zod/schema lengkap.
- Conflict version sudah ada di kode, tetapi perlu E2E otomatis untuk memastikan `CONFLICT_VERSION` benar-benar terpicu.

Advice prioritas:

1. Tambahkan route guard permission untuk `/assets/create`, `/assets/[id]/edit`, dan semua submit mutasi.
2. Pisahkan permission UI visibility dari permission route/action.
3. Buat field PRD minimal untuk SP2D, sertifikat, description.
4. Jadikan spatial calculated field benar-benar read-only.
5. Tambahkan minimal geometry JSON editor jika Leaflet Draw belum siap.
6. Tambahkan test Playwright: Viewer direct URL `/assets/create` harus forbidden/redirect.

### 4. OPD module

Status: Partial

Yang berhasil:

- OPD list tampil.
- Jumlah aset per OPD tampil.
- Ada form tambah mock.
- Ada pesan delete guard: OPD dengan aset aktif harus transfer aset dulu.

Temuan:

- Saat role Viewer, form tambah OPD dan tombol `Tambah mock` tetap terlihat.
- Belum ada modal create/edit seperti plan.
- Belum ada edit OPD.
- Belum ada delete/soft-delete action + guard nyata.
- Belum ada version/optimistic locking untuk OPD.
- Belum ada pencarian/paginasi.

Advice:

- Terapkan RBAC pada OPD create/edit/delete.
- Untuk MVP berikutnya, minimal hide form tambah dari Viewer/Auditor dan hanya tampilkan untuk Admin/Super Admin.
- Tambahkan modal edit sederhana agar sesuai plan Phase 6.

### 5. Project GIS + dokumen proyek

Status: Pass untuk display/RBAC sensitif dasar, partial untuk CRUD

Yang berhasil:

- Project list tampil.
- Disclaimer penting tampil: SIMANTA bukan pengganti LPSE/SIRUP/SIPD/SP2D.
- Sebagai Admin, nilai kontrak terlihat.
- Role switcher ke Viewer berhasil.
- Sebagai Viewer: nilai kontrak, invoice/SP2D, filename dokumen sensitif, dan download dokumen sensitif disembunyikan/disabled.
- Dokumen proyek menampilkan lifecycle lengkap sampai payment: KAK/TOR, HPS, tender, proposal vendor, kontrak, SPMK, progress, UAT, BAST, invoice, pajak, SP2D, bukti pembayaran.

Temuan/gap:

- Saat Viewer, link `Tambah proyek mock` masih terlihat di project list.
- Route `/projects/create` adalah placeholder, belum form nyata.
- Dokumen sensitif sebagai Viewer masih menampilkan jenis dokumen, nomor dokumen, dan tanggal dokumen. Ini perlu keputusan kebijakan.
- Dokumen list belum menampilkan checksum dan scan status sesuai PRD.
- Upload/download masih placeholder, sesuai scope MVP pertama.
- Belum ada audit mock untuk download/access sensitive doc.
- Belum ada permission granular per action selain hide/download disabled.

Advice:

- Hide `Tambah proyek mock` dari Viewer/Auditor jika tidak punya `project:write`.
- Untuk dokumen `isSensitive=true`, opsi aman: Viewer hanya melihat kind/stage, sedangkan nomor dokumen, tanggal, filename, dan action download disembunyikan.
- Tambahkan kolom `scanStatus`, `checksum`, `uploadedBy`, `uploadedAt` di dokumen page agar lebih dekat PRD.
- Tambahkan audit mock event saat klik download placeholder untuk peran yang boleh download.
- Buat project create/edit minimal, atau label jelas bahwa route create masih placeholder post-MVP.

### 6. Reports MVP

Status: Pass dasar

Yang berhasil:

- Reports page tampil.
- Summary card tampil.
- Tabel hasil tampil.
- Asset mock baru ikut masuk laporan.
- Export button disabled/placeholder: sesuai MVP plan, karena worker backend belum ada.

Gap terhadap PRD:

- Filter belum lengkap: tahun pengadaan/range tahun, status soft-delete admin only, SP2D dinas, ada-tidak SP2D, rentang nilai SP2D, ada/tidak lampiran, tanggal perubahan terakhir, user terakhir pengubah.
- Belum ada peta tematik laporan.
- Belum ada pagination.
- Belum ada metadata filter/template export.
- Belum ada async job simulation/polling untuk export; baru disabled button.

Advice:

- Untuk MVP berikutnya, tambahkan minimal filter tahun dan has attachment karena ini sering ditanyakan stakeholder aset.
- Export placeholder sebaiknya membuka toast/modal “akan membuat job export.<format>” agar stakeholder paham flow worker async, bukan sekadar disabled.

### 7. Preferences/profile

Status: Partial

Yang berhasil:

- Theme selector tersedia.
- Default basemap selector tersedia.
- Visible layer default tersedia.
- Ada catatan bahwa MVP memakai localStorage; production memakai `/api/v1/prefs`.
- Backup codes dan active sessions placeholder tersedia.

Gap:

- Belum dibuktikan preferensi basemap/layer mempengaruhi dashboard setelah reload.
- Backup codes dan sessions belum punya UI detail sesuai PRD security flow.
- Belum ada bookmark view bbox+zoom.

Advice:

- Tambahkan E2E yang mengubah default basemap ke OSM, reload, lalu dashboard default berubah.
- Tambahkan placeholder route/link lebih eksplisit untuk backup codes dan active sessions, bukan hanya teks di preferensi.

## Temuan Prioritas Tinggi

### 1. RBAC route/action guard belum lengkap

Severity: High

Contoh:

- Viewer bisa membuka direct URL `/assets/create`.
- Viewer masih melihat form tambah OPD.
- Viewer masih melihat link tambah proyek.

Advice:

- Buat route-level permission guard untuk semua route mutasi.
- Buat komponen `ForbiddenState` dengan error envelope `FORBIDDEN`.
- Tambahkan Playwright test direct navigation sebagai Viewer.

### 2. Belum ada automated E2E Playwright + axe

Severity: High untuk quality gate, Medium untuk demo MVP

Advice:

- Tambahkan `@playwright/test` dan `@axe-core/playwright`.
- Tambahkan scripts `test:e2e` dan `test:a11y`.
- Jadikan minimal smoke sebagai CI gate sebelum UAT.

### 3. Asset form belum cukup mengakomodir field PRD utama

Severity: Medium-High

Advice:

- Tambahkan section identitas aset, kepemilikan & OPD, fisik & geometry, sertifikat & hak, SP2D, dan lampiran placeholder.

### 4. Project document metadata sensitif perlu keputusan kebijakan

Severity: Medium

Advice:

- Untuk Viewer, sembunyikan nomor/tanggal/filename/action pada dokumen `isSensitive=true`, bukan hanya filename.

### 5. Accessibility dan metadata belum siap

Severity: Medium

Temuan:

- Browser title kosong.
- Belum ada bukti axe/WCAG AA.
- Belum terlihat skip-to-content link.
- Form belum memakai `aria-invalid` / `aria-describedby` untuk error.
- Peta belum diuji keyboard navigation.

Advice:

- Set `<svelte:head><title>...</title></svelte:head>` per route.
- Tambahkan skip link.
- Tambahkan axe E2E minimal untuk login, dashboard, assets, projects, reports.
- Pastikan control peta punya label aksesibel.

## Rencana Perbaikan Langsung

Berdasarkan temuan di atas, 5 perbaikan prioritas untuk dilanjutkan setelah laporan ini dibuat:

1. Perkuat RBAC route/action guard, terutama direct URL create/edit.
2. Tambahkan automated Playwright + axe E2E sesuai plan Phase 10.
3. Lengkapi AssetForm dengan field PRD minimal: sertifikat, SP2D, description, kode/register.
4. Perjelas dan implementasikan policy metadata dokumen sensitif untuk Viewer.
5. Tambahkan title/a11y baseline agar tidak terlihat seperti prototype mentah.

## Update terhadap 5 pekerjaan prioritas sebelumnya

Status pembaruan ini memakai hasil E2E di atas sebagai baseline dan memetakan apa yang sudah dikerjakan setelah 5 pekerjaan prioritas dipilih.

### 1. RBAC route/action guard

Status: Selesai untuk MVP smoke, masih perlu diperluas untuk mutasi backend nyata.

Perubahan yang sudah ada:

- `frontend/src/lib/auth/route-guards.ts` mendefinisikan permission route untuk `/assets/create`, `/assets/[id]/edit`, `/projects/create`, `/projects/[id]/edit`, dan route read-only utama.
- `frontend/src/routes/+layout.svelte` memakai guard route global dan menampilkan `ForbiddenState` untuk user yang sudah login tetapi tidak punya permission.
- `frontend/src/lib/components/auth/ForbiddenState.svelte` menampilkan state `FORBIDDEN` dengan CTA kembali ke dashboard.
- OPD create action di `frontend/src/routes/opd/+page.svelte` sudah dicegah pada action handler dan UI Viewer menjadi mode baca saja.
- Link `Tambah proyek mock` di `frontend/src/routes/projects/+page.svelte` hanya tampil jika user punya `project:write`.

Acceptance MVP:

- Viewer tidak melihat tombol `Tambah aset`.
- Viewer direct URL `/assets/create` melihat `Akses ditolak` + `FORBIDDEN`.
- Viewer tidak melihat tombol `Tambah mock` OPD.
- Viewer tidak melihat link `Tambah proyek mock`.
- Viewer direct URL `/projects/create` melihat `Akses ditolak`.

Catatan lanjutan:

- Guard ini masih guard frontend/mock. Saat backend mutasi aktif, endpoint API tetap wajib enforce permission server-side dengan error envelope `FORBIDDEN`.
- Route `/opd` saat ini tetap bisa dibuka Viewer untuk baca data; yang diblokir hanya form/action write. Ini sesuai kebutuhan read-only MVP.

### 2. Automated Playwright + axe E2E

Status: Selesai sebagai baseline smoke/a11y MVP.

Perubahan yang sudah ada:

- `frontend/package.json` punya script:
  - `test:e2e`: `playwright test tests/e2e/frontend-mvp.spec.ts`
  - `test:a11y`: `playwright test tests/e2e/a11y.spec.ts`
- Dependency `@playwright/test` dan `@axe-core/playwright` sudah tersedia.
- `frontend/tests/e2e/frontend-mvp.spec.ts` menguji smoke login Admin, route modul utama, title halaman, dan guard Viewer untuk direct mutation route.
- `frontend/tests/e2e/a11y.spec.ts` menguji title, landmark `main#main-content`, skip link, dan tidak ada critical axe violation pada login, dashboard, assets, projects, reports.

Acceptance MVP:

- Smoke E2E melewati login Admin dan modul utama.
- RBAC direct navigation Viewer diuji otomatis.
- A11y baseline punya gate critical axe violation untuk halaman utama MVP.

Catatan lanjutan:

- Gate axe saat ini menonaktifkan rule `color-contrast` pada halaman authenticated. Perlu audit desain warna terpisah sebelum UAT formal/WCAG AA.
- Belum ada E2E recovery, invalid OTP max attempt, preferences persistence, export job simulation, dan conflict version asset.

### 3. AssetForm field PRD minimal

Status: Selesai untuk field MVP mock, belum final untuk schema/Zod/backend.

Perubahan yang sudah ada di `frontend/src/lib/components/crud/AssetForm.svelte`:

- Section identitas aset: nama, ID Pemda, kode barang, register, penggunaan, tahun pengadaan, harga, version optimistic locking.
- Section kepemilikan & hak: jenis, Owner OPD, hak, nomor sertifikat, tanggal sertifikat.
- Owner OPD pada edit menjadi read-only; transfer OPD diberi catatan harus melalui proses khusus agar audit dan `asset_versions` tercatat.
- Section lokasi & geometry: alamat, luas sertifikat, luas/panjang spasial read-only/mock, geometry JSON editor MVP.
- Section SP2D & deskripsi: nomor SP2D, tanggal SP2D, nilai SP2D, dinas penerbit SP2D, deskripsi.
- Section lampiran menjelaskan metadata `asset_attachments` yang harus didukung: sertifikat, foto, SP2D, berita_acara, sk_transfer, dokumen_pendukung, lainnya.
- Konflik versi dapat disimulasikan via checkbox dan menampilkan pesan `CONFLICT_VERSION`.

Acceptance MVP:

- Field prioritas dari hasil E2E sudah muncul di form create/edit mock.
- Spatial calculated field tidak lagi diedit bebas karena input luas/panjang spasial dibuat read-only.
- Geometry minimal tersedia sebagai JSON editor sampai Leaflet Draw siap.

Catatan lanjutan:

- Parsing geometry JSON saat ini fallback silent ke geometry lama/null jika JSON invalid. Untuk production readiness, invalid JSON harus menjadi error form eksplisit dengan `aria-invalid` dan `aria-describedby`.
- Validasi Zod/schema lengkap belum menjadi gate form.
- Attachment upload real via presigned URL masih ditunda.

### 4. Policy metadata dokumen sensitif Viewer

Status: Selesai untuk masking frontend MVP.

Perubahan yang sudah ada di `frontend/src/routes/projects/[id]/documents/+page.svelte`:

- Untuk dokumen `isSensitive=true`, Viewer/non-privileged user hanya melihat stage dan kind.
- Nomor dokumen, tanggal dokumen, filename, scan status, checksum, dan tombol download disembunyikan/disabled.
- Tabel dokumen sudah menampilkan kolom `Scan/Checksum` agar lebih dekat ke PRD.
- Halaman menampilkan catatan bahwa metadata lengkap hanya untuk Admin/Auditor/Finance.

Acceptance MVP:

- Viewer tidak melihat filename sensitif.
- Viewer tidak melihat nomor/tanggal dokumen sensitif.
- Viewer tidak melihat scan/checksum dokumen sensitif.
- Viewer tidak bisa klik download placeholder dokumen sensitif.

Catatan lanjutan:

- Belum ada audit mock event saat user privileged klik download placeholder.
- Belum ada upload/download real, signed URL, antivirus scan, quarantine, dan retention policy.

### 5. Title dan accessibility baseline

Status: Selesai sebagai baseline MVP.

Perubahan yang sudah ada:

- Route utama sudah memakai `<svelte:head><title>SIMANTA - ...</title></svelte:head>` sehingga tidak lagi muncul `untitled page` pada halaman yang diuji.
- `frontend/src/routes/+layout.svelte` punya default title `SIMANTA - Frontend MVP`.
- Layout authenticated memakai landmark `main#main-content`.
- Skip link `Lewati ke konten utama` tersedia dan diuji dengan keyboard Tab.
- `frontend/src/app.css` menambahkan styling `.skip-link` dan focus visible global.
- Playwright + axe baseline memastikan tidak ada critical axe violation pada halaman utama MVP yang diuji.

Acceptance MVP:

- Login, dashboard, assets, projects, reports punya title spesifik.
- Skip link fokus saat Tab pertama pada halaman authenticated.
- Halaman utama MVP punya landmark konten utama.

Catatan lanjutan:

- Perlu audit keyboard detail untuk peta Leaflet, layer control, dan form kompleks.
- Perlu validasi error state form dengan `aria-invalid` / `aria-describedby` saat validasi schema sudah aktif.

## Validasi teknis setelah update 5 pekerjaan

Command yang dijalankan dari `frontend/`:

```bash
npm run check && npm run test && npm run build
npm run test:e2e && npm run test:a11y
```

Hasil aktual:

- `svelte-check`: 0 errors, 0 warnings.
- `vitest`: 4 test files passed, 8 tests passed.
- `vite build`: berhasil dan static SPA ditulis ke `build/`.
- `Playwright test:e2e`: 2 tests passed.
- `Playwright test:a11y`: 5 tests passed.

## Update implementasi P0 berikutnya - 2026-06-05

Status: P0 frontend MVP sudah dikerjakan untuk baseline UAT stakeholder formal, masih berbasis mock/frontend dan tetap perlu enforcement backend saat API mutasi aktif.

Perubahan yang sudah ada:

- `frontend/tests/e2e/frontend-mvp.spec.ts` diperluas dari 2 menjadi 5 test: smoke Admin, guard Viewer, auth negatif, validasi asset + conflict version, dan audit download dokumen.
- Auth mock sekarang mensimulasikan invalid OTP, max attempt/rate-limit `RATE_LIMITED`, recovery copy batas MVP, serta logout + direct URL protected route.
- `AssetForm` sekarang memakai validasi submit eksplisit untuk required field, nilai numerik negatif, dan geometry JSON invalid; error tampil sebagai `VALIDATION_ERROR` dengan `aria-invalid` dan `aria-describedby`.
- Conflict version asset diuji otomatis dengan checkbox `simulateConflict` dan assert pesan `CONFLICT_VERSION`.
- Download placeholder dokumen proyek oleh role privileged sekarang menulis mock audit event `AUDIT_DOCUMENT_DOWNLOAD` ke store localStorage dan halaman `/audit`.
- `frontend/package.json` punya script `verify:mvp` untuk menjalankan `check`, `test`, `build`, `test:e2e`, dan `test:a11y` berurutan sebagai gate lokal.

Validasi teknis aktual dari `frontend/`:

```bash
npm run verify:mvp
```

Hasil aktual:

- `svelte-check`: 0 errors, 0 warnings.
- `vitest`: 4 test files passed, 8 tests passed.
- `vite build`: berhasil dan static SPA ditulis ke `build/`.
- `Playwright test:e2e`: 5 tests passed.
- `Playwright test:a11y`: 5 tests passed.

Catatan lanjutan:

- Validasi form masih handcrafted di frontend; saat backend/Zod schema final aktif, logic ini sebaiknya disinkronkan dengan schema shared.
- Rate-limit OTP masih in-memory mock; production harus memakai policy server-side dan audit/security event.
- Audit download dokumen masih localStorage mock; production harus append-only audit log backend dan signed URL/download controller.

## Apa lagi yang bisa dikerjakan dari hasil E2E tersebut?

Prioritas berikutnya setelah P0 baseline di atas:

### P0 - Selesai untuk baseline UAT stakeholder formal

1. Tambahkan E2E auth negatif:
   - invalid OTP,
   - max attempt/rate-limit mock,
   - recovery placeholder dengan copy batas MVP,
   - logout lalu direct URL protected route.
2. Tambahkan validasi form asset yang benar-benar gagal saat input tidak valid:
   - required field,
   - nilai numerik negatif,
   - geometry JSON invalid,
   - error `aria-invalid` / `aria-describedby`.
3. Tambahkan E2E conflict version asset:
   - aktifkan `simulateConflict`,
   - submit,
   - assert pesan `CONFLICT_VERSION` tampil.
4. Tambahkan audit mock untuk akses/download dokumen sensitif oleh role privileged:
   - klik download placeholder sebagai Admin/Auditor/Finance,
   - event tampil di log audit mock atau toast.
5. Tambahkan gate CI lokal/remote yang menjalankan `check`, `test`, `build`, `test:e2e`, dan `test:a11y` secara berurutan.

### P1 - Menguatkan demo WebGIS

1. Dashboard map:
   - layer grouping by jenis vs OPD,
   - tombol select all/hide all,
   - search asset langsung di peta,
   - empty/error state tile atau GeoJSON gagal,
   - preferences default basemap/layer benar-benar diterapkan setelah reload.
2. Reports:
   - filter tahun pengadaan,
   - filter ada/tidak lampiran,
   - filter ada/tidak SP2D,
   - export placeholder berupa modal/toast job async, bukan tombol disabled saja.
3. OPD:
   - pencarian/paginasi,
   - modal edit sederhana,
   - delete/soft-delete mock dengan guard jumlah aset aktif.
4. Project GIS:
   - form create/edit minimal,
   - metadata `uploadedBy` dan `uploadedAt`,
   - status scan/checksum dari mock data, bukan hanya fallback placeholder.

### P2 - Hardening menuju production readiness

1. Sinkronkan semua guard frontend dengan guard backend API `/api/v1` agar UI masking tidak menjadi satu-satunya kontrol keamanan.
2. Migrasikan mock persistence ke API Hono + repository/service layer sesuai PRD.
3. Implementasikan upload lampiran via object storage/presigned URL, antivirus scan, checksum SHA-256, dan signed download URL.
4. Implementasikan Leaflet Draw atau editor geometry yang menghitung luas/panjang dari PostGIS, bukan input manual/mock.
5. Tambahkan observability frontend/API: error boundary, structured audit event, dan trace untuk export/import jobs.

## Rekomendasi urutan pekerjaan berikutnya

Urutan paling aman agar demo berikutnya terlihat meningkat dan risiko keamanan turun:

1. P0 auth negatif + form validation + conflict E2E.
2. P0 audit mock download dokumen sensitif.
3. P1 preferences persistence ke dashboard + layer select all/hide all.
4. P1 reports filter tahun/lampiran/SP2D + export job modal.
5. P1 project create/edit minimal atau label placeholder yang sangat jelas jika tetap ditunda.

## Update implementasi P1 WebGIS pertama - 2026-06-05

Status: sebagian P1 Dashboard map sudah dikerjakan untuk memperkuat demo WebGIS setelah baseline P0.

Perubahan yang sudah ada:

- `frontend/src/routes/dashboard/+page.svelte` menambahkan tombol bulk layer:
  - `Pilih semua layer`,
  - `Sembunyikan semua layer`.
- Dashboard sudah membaca default preferences `defaultBasemap` dan `visibleLayers` dari localStorage preferences saat halaman dibuka ulang.
- `frontend/tests/e2e/frontend-mvp.spec.ts` diperluas dari 5 menjadi 6 test dengan coverage:
  - ubah default basemap ke `osm_standard` dari halaman Preferences,
  - matikan sebagian default layer,
  - buka ulang Dashboard dan pastikan basemap/layer default diterapkan,
  - tombol hide all membuat layer aktif `0/6`,
  - tombol select all mengembalikan layer aktif `6/6`.

Validasi teknis aktual dari `frontend/`:

```bash
npm run test:e2e -- --grep "dashboard applies default preferences"
npm run verify:mvp
```

Hasil aktual:

- Focused Playwright P1: 1 test passed.
- `svelte-check`: 0 errors, 0 warnings.
- `vitest`: 4 test files passed, 8 tests passed.
- `vite build`: berhasil dan static SPA ditulis ke `build/`.
- `Playwright test:e2e`: 6 tests passed.
- `Playwright test:a11y`: 5 tests passed.

Sisa P1 Dashboard map yang belum dikerjakan:

- layer grouping by jenis vs OPD,
- search asset langsung di peta,
- empty/error state tile atau GeoJSON gagal,
- persist perubahan layer/basemap langsung dari Dashboard ke preferences backend/API produksi.

## Update implementasi P1 Dashboard search - 2026-06-05

Status: sebagian P1 Dashboard map berikutnya sudah dikerjakan untuk membuat pencarian aset langsung dari panel peta tersedia di demo.

Perubahan yang sudah ada:

- `frontend/src/routes/dashboard/+page.svelte` menambahkan panel `Search asset di peta` pada sidebar Dashboard.
- Search membaca daftar aset mock via `listAssets()` dan mencari berdasarkan nama aset, ID Pemda, alamat/wilayah, dan OPD pemilik.
- Hasil search menampilkan maksimal 5 aset dengan link langsung ke detail aset.
- Empty state `Tidak ada aset cocok` tampil saat query tidak punya hasil.
- `frontend/tests/e2e/frontend-mvp.spec.ts` diperluas dari 7 menjadi 8 test dengan coverage:
  - search `Surabaya` menemukan `Tanah Kantor Pelayanan Terpadu Surabaya`,
  - ID Pemda `JTM-SBY-0001` tampil di hasil,
  - query tidak cocok menampilkan empty state.

Validasi teknis aktual dari `frontend/`:

```bash
npm run test:e2e -- --grep "dashboard search finds assets"
npm run verify:mvp
```

Hasil aktual:

- Focused Playwright Dashboard search P1: 1 test passed.
- `svelte-check`: 0 errors, 0 warnings.
- `vitest`: 4 test files passed, 8 tests passed.
- `vite build`: berhasil dan static SPA ditulis ke `build/`.
- `Playwright test:e2e`: 8 tests passed.
- `Playwright test:a11y`: 5 tests passed.

Sisa P1 Dashboard map yang belum dikerjakan setelah update ini:

- layer grouping by jenis vs OPD,
- empty/error state tile atau GeoJSON gagal,
- persist perubahan layer/basemap langsung dari Dashboard ke preferences backend/API produksi.

## Update implementasi P1 Reports pertama - 2026-06-05

Status: sebagian P1 Reports sudah dikerjakan agar demo laporan tidak hanya menampilkan filter dasar dan tombol export disabled.

Perubahan yang sudah ada:

- `frontend/src/routes/reports/+page.svelte` menambahkan filter P1:
  - tahun pengadaan,
  - ada/tidak lampiran,
  - ada/tidak SP2D.
- Tabel laporan menampilkan kolom tambahan:
  - `Tahun`,
  - `Lampiran`,
  - `SP2D`.
- Tombol export placeholder diubah dari disabled menjadi flow mock `Buat job export mock` yang menampilkan status `EXPORT_JOB_QUEUED` beserta filter yang diterapkan.
- `frontend/src/lib/services/api/reports.ts` memperluas query mock agar filter tahun/lampiran/SP2D benar-benar mempengaruhi rows dan summary.
- `frontend/tests/e2e/frontend-mvp.spec.ts` diperluas dari 6 menjadi 7 test dengan coverage Reports P1:
  - filter tahun `2021` menghasilkan total 2 aset,
  - filter ada lampiran mempersempit menjadi aset Surabaya,
  - filter ada SP2D menampilkan nomor `SP2D/2021/0045`,
  - klik export mock menampilkan `EXPORT_JOB_QUEUED` dan filter tahun.

Validasi teknis aktual dari `frontend/`:

```bash
npm run test:e2e -- --grep "reports support P1 filters"
npm run verify:mvp
```

Hasil aktual:

- Focused Playwright Reports P1: 1 test passed.
- `svelte-check`: 0 errors, 0 warnings.
- `vitest`: 4 test files passed, 8 tests passed.
- `vite build`: berhasil dan static SPA ditulis ke `build/`.
- `Playwright test:e2e`: 7 tests passed.
- `Playwright test:a11y`: 5 tests passed.

Sisa P1 Reports yang belum dikerjakan:

- pagination,
- metadata filter/template export,
- peta tematik laporan,
- simulasi polling status export job yang lebih dekat ke BullMQ worker produksi.


## Update implementasi sisa P1 - 2026-06-05

Status: sisa P1 yang disebutkan sudah dikerjakan untuk frontend/mock demo. Implementasi tetap berbasis SPA/mock service, tetapi copy UI dan service path sudah mengarah ke kontrak produksi `/api/v1` agar transisi ke Hono/BullMQ/backend nyata lebih jelas.

Perubahan Dashboard:

- Menambahkan `Grouping layer` dengan pilihan `Jenis` dan `OPD` pada Dashboard.
- Menambahkan status GeoJSON dashboard:
  - state sukses `GeoJSON aktif`,
  - simulasi gagal `GEOJSON_LOAD_FAILED` lewat kontrol `Simulasikan GeoJSON gagal`.
- Perubahan basemap/layer dari Dashboard sekarang memanggil service `savePreferences()` yang pada mode mock menyimpan ke kontrak metadata `/api/v1/preferences`, dan pada mode real akan `PUT /preferences` sesuai `PUBLIC_API_BASE_URL` + `/api/v1`.

Perubahan OPD:

- Menambahkan search OPD berdasarkan kode, nama, singkatan, dan kepala OPD.
- Menambahkan pagination dengan pilihan 2/5/10 baris per halaman.
- Menambahkan modal edit OPD sederhana.
- Menambahkan soft-delete mock dengan guard jumlah aset aktif; OPD yang masih punya aset aktif menampilkan `OPD_DELETE_BLOCKED_ACTIVE_ASSETS`.

Perubahan Project GIS:

- Route `/projects/create` bukan placeholder lagi; sudah menjadi form create minimal untuk kode, nama, tahun, OPD, vendor, kontrak, nilai, tanggal, status, dan deskripsi.
- Route `/projects/[id]/edit` sudah menjadi form edit minimal dengan hidden version untuk optimistic locking mock.
- Service project mock menambahkan `saveProject()` untuk create/update.
- Halaman dokumen proyek menampilkan metadata `uploadedBy` dan `uploadedAt`.
- Kolom scan/checksum sekarang memakai data mock `scanStatus` dan `checksum`, bukan fallback placeholder.

Perubahan Reports:

- Menambahkan pagination hasil laporan.
- Menambahkan metadata filter/template export dengan pilihan `Excel Rekap`, `Shapefile per geometri`, dan `Atlas PDF`.
- Menambahkan mock `Peta tematik laporan` berbasis hasil filter.
- Simulasi export job dibuat lebih dekat ke BullMQ worker produksi:
  - `WAITING`,
  - `ACTIVE`,
  - `COMPLETED`,
  - queue mock `reports-export-bullmq`,
  - tombol `Polling status export job`.

Coverage E2E baru:

- `dashboard P1 grouping, GeoJSON state, and API preference persistence are visible`
- `OPD P1 supports search, pagination, edit modal, and guarded soft delete`
- `Project GIS P1 has minimal create/edit form and real document upload metadata`
- `Reports P1 exposes pagination, export metadata/template, thematic map, and BullMQ-like polling`

Validasi teknis aktual dari `frontend/`:

```bash
npm run test:e2e -- --grep "dashboard P1 grouping|OPD P1 supports|Project GIS P1|Reports P1 exposes"
npm run verify:mvp
```

Hasil aktual:

- Focused Playwright sisa P1: 4 tests passed.
- `svelte-check`: 0 errors, 0 warnings.
- `vitest`: 4 test files passed, 8 tests passed.
- `vite build`: berhasil dan static SPA ditulis ke `build/`.
- `Playwright test:e2e`: 12 tests passed.
- `Playwright test:a11y`: 5 tests passed.

Catatan lanjutan:

- Semua fitur di atas masih mock/frontend persistence. Saat API produksi aktif, endpoint Hono tetap perlu enforcement RBAC, validasi schema, audit log append-only, transaksi DB, dan worker BullMQ nyata.
- `savePreferences()` sudah memisahkan service API agar Dashboard tidak hanya update localStorage, tetapi tetap perlu endpoint backend `/api/v1/preferences` nyata.
- OPD delete guard saat ini menghitung aset aktif dari mock `assets`; produksi harus menghitung dari database dan menjalankan soft-delete dalam transaksi.
