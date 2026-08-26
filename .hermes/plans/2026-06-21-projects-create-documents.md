# Rencana: Perekaman Multi-File per Header Dokumen di Halaman Tambah Proyek

**Tanggal**: 2026-06-21
**Tujuan**: Halaman `/projects/create` (form tambah proyek) dilengkapi section perekaman dokumen per-header-dengan-multi-file, sehingga user bisa submit proyek + header dokumen + lampiran file dalam satu kali submit, dengan UX yang relevan dengan `/projects/prj-001` dan konsisten dengan halaman `/projects/[id]/documents`.

---

## 1. Analisis Kebutuhan

### 1.1 Permintaan User
- Lanjutkan pekerjaan frontend di `http://127.0.0.1:5173/projects/create`.
- Buat halaman tambah proyek **relevan seperti detail proyek** di `http://127.0.0.1:5173/projects/prj-001`.
- Fokuskan **fitur pencatatan tiap dokumen proyek berupa multiple file tiap header dokumen** seperti di `http://127.0.0.1:5173/projects/prj-001/documents`.

### 1.2 Halaman yang Direferensi
- **`/projects/prj-001`** (detail proyek) → read-only, ringkasan + timeline + dokumen list + pembayaran + asset link.
- **`/projects/prj-001/documents`** (manajemen dokumen) → halaman penuh untuk multi-file interaktif per header dokumen, dengan mock upload + verify.

### 1.3 Alur Final (Hasil Diskusi dengan User)
- **Inline di halaman create**: section dokumen & file picker interaktif ada di halaman yang sama dengan form proyek.
- **Auto-seed 5 header standar**: 5 row default ter-isi otomatis mengikuti stage proyek (planning/in_progress/dst), user bisa tambah/hapus row header sebelum submit.
- **Submit sekaligus**: simpan proyek → seed header → seed file mock → redirect ke `/projects/[id]/documents` agar user melihat hasilnya di halaman dokumen standar.

---

## 2. Pemetaan Kode yang Sudah Ada

### 2.1 File yang Akan Dimodifikasi
- `frontend/src/routes/projects/create/+page.svelte` — utama; tambah section dokumen & file picker, integrasi submit.
- `frontend/src/lib/services/api/projects.ts` — tambah helper `createProjectWithDocuments` (atau composer dari fungsi existing) yang menulis proyek + dokumen + file ke mock arrays atomically dalam satu envelope.
- `frontend/src/lib/mocks/projects.ts` — tidak ada perubahan struktur; data seeded baru masuk via `documents.push(...)` & `documentFiles.push(...)` dari service baru (in-memory).

### 2.2 Pola Existing yang Diikuti
- **API envelope** — semua service wajib `ok<T>(...)` / `err(...)` (lihat `shared/src/envelope.ts`).
- **`saveProject`** (`projects.ts:205-241`) — pola mock create proyek: `projects.unshift(created)`, return `ok(created, 'PROJECT_CREATED')`. Real mode: `POST /projects`.
- **`createProjectDocumentFiles`** (`projects.ts:346-378`) — pola mock create file: push ke `documentFiles`, naikkan `document.version`, set `verificationStatus: 'submitted'` jika sebelumnya `'incomplete'`. Real mode: tidak ada (helper internal mock-only dengan envelope). Untuk konsistensi real-mode parity, real branch harus `realFetch` `POST /projects/:id/documents/:docId/files` dengan payload yang sama.
- **Permission gating** — `canWriteProjectDocumentForProject` (`permissions.ts:90-92`) → `canForProject(user, 'project:document_write', projectId)`. Pada saat create, proyek baru belum ada → pakai `canWriteProjectDocument(user)` (`permissions.ts:86-88`) saja; setelah proyek tercipta, permission `project:document_write` All sudah cukup untuk menu multi-file.
- **Async race-guard** — `lib/async-race-guard.ts` sudah ada; create page tidak punya race condition berarti (single submit), tidak perlu di-inject.
- **Mock vs real parity** — `apiMode` di `client.ts`; kedua branch harus ada dan envelope shape identik.
- **Toast & audit** — `toastStore.success/error/warning`; `recordDocumentDownloadBlocked`/`Verify` di `audit.ts` (audit tidak wajib di create, hanya di verify & download).

### 2.3 Tipe yang Dipakai
- `Project` (`shared/src/schemas/project.ts:4-34`).
- `ProjectDocument` (`shared/src/schemas/project.ts:36-51`).
- `ProjectDocumentFile` (`shared/src/schemas/project.ts:53-70`).
- Enum: `ProjectStage`, `ProjectDocumentKind`, `ProjectDocumentFileLabel`, `ProjectDocumentVerificationStatus` (lihat `shared/src/enums.ts:16-26`).
- 5 base docs di `frontend/src/lib/mocks/projects.ts:18-24` adalah referensi stage+kind default.

---

## 3. Rancangan Implementasi

### 3.1 Helper Service Baru di `projects.ts`

Tambah satu fungsi exported baru (mock + real parity), reused dari helper yang sudah ada:

```ts
export async function createProjectWithDocuments(
  projectPayload: Partial<Project>,
  documentsPayload: Array<{
    stage: ProjectStage;
    kind: ProjectDocumentKind;
    title: string;
    isSensitive: boolean;
    documentNumber?: string;
    documentDate?: string;
    files: Array<{ filename: string; fileLabel: ProjectDocumentFileLabel; sizeBytes: number; fileOrder: number }>;
  }>
)
```

- **Real branch**: `realFetch('/projects?include=documents,files', { method: 'POST', body: JSON.stringify({ project: projectPayload, documents: documentsPayload }) })`. Backend contract: satu endpoint yang atomic. PRD §7.x saat ini masih split per-resource; untuk MVP real branch bisa juga kompos 2-call (POST /projects, lalu loop POST /projects/:id/documents + /files), dengan envelope `ok({ project, documents, files }, 'PROJECT_WITH_DOCUMENTS_CREATED')`.
- **Mock branch**:
  1. Panggil logika `saveProject(projectPayload)` (versi inline, refactor internal saja — tidak menambah envelope baru untuk proyek saja).
  2. Untuk tiap `documentsPayload[i]`: push ke `documents` array dengan field default (`documentNumber: projectCode + '/NN'`, `documentDate: today`, `verificationStatus: 'incomplete'`, `version: 1`, `createdBy: currentUser.name`, `createdAt/updatedAt: now`).
  3. Panggil `createProjectDocumentFiles(projectId, docId, files)` per dokumen.
  4. Return `ok({ project, documents, files }, 'PROJECT_WITH_DOCUMENTS_CREATED', { path: '/api/v1/projects?include=documents,files' })`.

### 3.2 Struktur Halaman `+page.svelte` Create

Layout baru dalam satu `<div class="space-y-4">`:

1. **Header (existing)** — kicker "Administrasi Proyek GIS", H1 "Tambah Proyek GIS", deskripsi.
2. **Form Proyek (existing)** — sama persis dengan saat ini (kode, nama, tahun, vendor, kontrak, nilai, tanggal, status, deskripsi).
3. **Section Dokumen & Multi-File (BARU)** — kartu terpisah di bawah form proyek:
   - Sub-header: "Header dokumen standar (auto-seed)" dengan badge jumlah row.
   - Tabel editor 5 row default: kolom `Stage` (select dari `ProjectStage` enum), `Kind` (select dari `ProjectDocumentKind` enum), `Title` (input teks), `Sensitif` (checkbox). Nilai default = 5 base docs dari mock (`KAK/TOR planning, HPS planning sensitive, Kontrak contract sensitive, Laporan progres implementation, Invoice termin payment`).
   - Tombol "Tambah header" (membuat row baru dengan default `kind='other' stage='planning' isSensitive=false`).
   - Tombol "Hapus" per row (selama masih > 0 row tersisa).
   - Untuk setiap header, **sub-section multi-file picker** (collapsed / detail terbuka) — pola persis dari `/projects/[id]/documents:147-179`:
     - Input `type="file" multiple` → tambah ke `pendingFilesByDocId[docId]`.
     - List baris pending: `filename | fileLabel (select) | fileOrder (number)` (sama persis pattern dengan dokumen page).
     - Tombol "Commit upload mock" per doc — memanggil `createProjectDocumentFiles` secara langsung (real-time feedback sebelum submit proyek? **Tidak**: karena proyek belum ada, file picker di create hanya **state lokal**; commit final terjadi saat submit form. Untuk konsistensi UX dengan halaman dokumen, hilangkan tombol "Commit" per-doc dan ganti jadi tombol "Hapus" per row + counter "X file mock diantrikan").
4. **Footer Aksi (existing)** — tombol "Kembali" (ke `/projects`) + tombol "Simpan proyek + dokumen" (BARU label) yang menjalankan `createProjectWithDocuments(...)` lalu `goto('/projects/' + newId + '/documents')` jika `success`.

### 3.3 Behavior State Lokal (Svelte 5–friendly dengan Svelte 4 `$:` reactivity)

```ts
type HeaderRow = {
  id: string;                 // local uuid for keyed each
  stage: ProjectStage;
  kind: ProjectDocumentKind;
  title: string;
  isSensitive: boolean;
};
type PendingFileRow = {
  filename: string;
  fileLabel: ProjectDocumentFileLabel;
  fileOrder: number;
};

let headers: HeaderRow[] = DEFAULT_HEADERS.map(...);
let pendingFilesByHeader: Record<string, PendingFileRow[]> = {};
let statusMessage = '';
let isSubmitting = false;
```

- Default headers mengikuti 5 base docs tapi fieldnya mengambil dari mapping `kind → title, stage, isSensitive`:
  ```ts
  const DEFAULT_HEADERS = [
    { kind: 'kak_tor', stage: 'planning', title: 'KAK/TOR', isSensitive: false },
    { kind: 'hps', stage: 'planning', title: 'HPS', isSensitive: true },
    { kind: 'contract', stage: 'contract', title: 'Kontrak', isSensitive: true },
    { kind: 'progress_report', stage: 'implementation', title: 'Laporan progres', isSensitive: false },
    { kind: 'invoice', stage: 'payment', title: 'Invoice termin', isSensitive: true }
  ];
  ```
- `addHeader()` → push satu row dengan `kind='other', stage='planning', title='Dokumen lainnya', isSensitive=false`.
- `removeHeader(headerId)` → filter out, juga drop key dari `pendingFilesByHeader`.
- `onFiles(headerId, event)` → append `Array.from(files).map(...)` ke `pendingFilesByHeader[headerId]` (sama persis dengan `documents/+page.svelte:47-60`).
- `removePending(headerId, idx)` → splice dari array.

### 3.4 Alur Submit

```ts
async function submit() {
  isSubmitting = true;
  statusMessage = '';
  const response = await createProjectWithDocuments(form, headers.map(h => ({
    stage: h.stage, kind: h.kind, title: h.title, isSensitive: h.isSensitive,
    files: pendingFilesByHeader[h.id] ?? []
  })));
  if (response.success) {
    toastStore.success('PROYEK + DOKUMEN + FILE tercipta (mock).');
    await goto(`/projects/${response.data.project.id}/documents`);
  } else {
    statusMessage = `${response.code}: ${response.message}`;
    isSubmitting = false;
  }
}
```

### 3.5 Toast & Error UX
- Tambah `<div role="status">` hijau untuk success inline, dan `<div role="alert">` merah untuk error envelope.
- Import `toastStore` dari `$lib/stores/toast` (pola existing).
- Permission gate: jika `!canWriteProjectDocument($currentUser)` → tampilkan banner "Hanya role dengan `project:document_write` yang dapat menambahkan dokumen mock saat create" + disable tombol submit (atau sembunyikan section file picker, tampilkan section header saja sebagai read-only draft).

### 3.6 Style
- Pakai class global: `.card`, `.input`, `.btn`, `.btn-primary`, `.btn-secondary`, `.badge`, `.table`, `.kicker` (lihat `frontend/src/app.css:71-124`).
- Sub-section file per header menggunakan `<details>` + `<summary>` untuk collapse/expand agar halaman tetap ringkas dengan 5 row default.
- Setiap row file menggunakan `grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_80px_60px]` (filename | fileLabel | fileOrder | remove).

### 3.7 Mock Data Baru Saat Submit
- Tiap `documents.push(...)` dibuat dengan `id: 'doc-' + projectNumber + '-' + (i+1)`, `documentNumber: projectCode + '/' + String(i+1).padStart(2,'0')`, `documentDate: today`, `verificationStatus: 'incomplete'`, `version: 1`, `createdBy/At/updatedBy/At` sekarang.
- Tiap `documentFiles.push(...)` dibuat mengikuti pola `createProjectDocumentFiles` (`'file-' + Date.now() + '-' + i`, scan `pending`, checksum mock).

---

## 4. Berkas yang Berubah / Bertambah

| File | Aksi | Ringkasan |
|------|------|-----------|
| `frontend/src/routes/projects/create/+page.svelte` | Modify | Tambah section dokumen + multi-file picker, ganti handler submit pakai helper baru. |
| `frontend/src/lib/services/api/projects.ts` | Modify | Tambah `createProjectWithDocuments()` dengan mock + real branch. |
| `frontend/src/lib/mocks/projects.ts` | (tidak berubah struktur) | — data baru disuntik via service baru. |
| `shared/src/schemas/project.ts` | (tidak berubah) | — tipe sudah cukup. |

---

## 5. Risiko & Mitigasi

- **Mock-mode volume growth**: tiap submit akan menambah 5 row di `documents` + N row di `documentFiles`. Karena in-memory, tidak ada kebocoran persistensi, tapi bila form disubmit 10x di sesi yang sama, `documentSummary.total` proyek baru akan naik. **Mitigasi**: ini sesuai dengan sifat mock — user paham. Tidak perlu filter.
- **Race submit double-click**: tombol submit di-disable (`isSubmitting=true`) saat `await` berjalan. **Mitigasi**: dengan satu global flag, tidak perlu `async-race-guard.ts`.
- **Real-mode parity**: helper real branch perlu komposisi 3 call (POST /projects, loop POST /projects/:id/documents, loop POST /files). **Mitigasi**: bila backend real nanti menyediakan satu endpoint atomic (`POST /projects?include=documents,files`), real branch akan switch ke single call. Untuk MVP, simpan saja komposisi 3-call.
- **Permission gate**: proyek baru belum ada saat create, jadi `canWriteProjectDocumentForProject` tidak applicable. Pakai `canWriteProjectDocument(user)` global. **Mitigasi**: sesuai PRD, role `Editor/Admin/Super Admin` punya `project:document_write` All. Viewer/Auditor akan dapat banner "tidak punya akses" + section read-only.
- **`statusMessage` tidak ke-reset saat edit form lagi**: di-reset pada `submit` dan saat user mulai ubah input (opsional). **Mitigasi**: bind ke `on:input` event atau `tick` listener.

---

## 6. Acceptance Criteria

1. Halaman `/projects/create` menampilkan form proyek (existing) + section "Dokumen & Multi-File (mock)" dengan 5 row default.
2. User bisa edit / tambah / hapus row header. Setiap row header punya sub-section multi-file picker (collapse via `<details>`).
3. User bisa pilih multi-file dari file input → list baris file mock muncul dengan field `fileLabel` (select) + `fileOrder` (number) + tombol "Hapus" per row.
4. Tombol "Simpan proyek + dokumen" melakukan satu submit atomik (mock): `saveProject` + 5 header push + N file push per header. Real mode: 3-call compose dengan envelope identik.
5. Setelah success, redirect ke `/projects/{newId}/documents`; halaman detail dokumen standar menampilkan 5 header + file yang baru di-attach.
6. Toast success muncul; error envelope muncul inline sebagai alert.
7. Untuk role tanpa `project:document_write`, section file picker disembunyikan/di-disable dan banner penjelasan muncul.
8. `npm run check`, `npm run test`, dan `npm run test:e2e` di `frontend/` tetap hijau (tidak ada regresi pada test existing).

---

## 7. Out of Scope (Tidak Diubah)

- Backend real branch atomic (3-call compose cukup untuk MVP real).
- Validasi sensitive-vs-payment gating otomatis (di halaman dokumen saja).
- Download placeholder untuk file mock (hanya di halaman `/projects/[id]/documents`).
- Audit event untuk `PROJECT_CREATED`/`PROJECT_DOCUMENT_FILES_CREATED` di create page (audit sudah ada di `verify` & `download`; create tidak wajib karena ini halaman entry-point).
- E2E test baru untuk halaman create (cukup smoke manual; test existing di `frontend-mvp.spec.ts` & `a11y.spec.ts` tidak boleh regresi).
