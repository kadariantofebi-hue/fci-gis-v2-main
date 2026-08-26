# Rencana: Revisi Halaman /projects — Hapus Filter Bar + Restrukturisasi Kolom + Hapus Summary Cards

**Tanggal**: 2026-06-21
**Tujuan**: Revisi halaman daftar Administrasi Proyek GIS di `/projects` agar ringkas dan terfokus ke tabel: hilangkan filter bar (pindah ke inline per-kolom), restrukturisasi kolom tabel (hapus Vendor, tambah Jenis Proyek & Daerah), dan hapus 3 card ringkasan (Proyek Aktif, Checklist Dokumen, Riwayat Pembayaran).

---

## 1. Analisis Permintaan

| # | Permintaan | Keputusan (setelah diskusi) |
|---|-----------|-----------------------------|
| 1 | Hilangkan fitur filter di tempat sekarang, pindah ke tiap kolom yang difilter | Filter bar (search + status + fiscalYear) **dihapus total**. Search bar `q` juga dihapus. Filter inline `<input>` kecil di `<th>` untuk kolom yang bisa difilter, trigger real-time `on:input`/`on:change`. |
| 2 | Penyesuaian kolom tabel: hapus Vendor, tambah Jenis Proyek + Daerah di antara Kontrak dan Status | Tabel baru berurut: **Kode/Nama · Kontrak · Jenis Proyek · Daerah · Status · Dokumen · Aksi** (7 kolom). |
| 3 | Hapus card Proyek Aktif, Checklist Dokumen, Riwayat Pembayaran | Section `<section>` 3-card ringkasan dihapus total. |

---

## 2. Detail Setiap Revisi

### 2.1 Revisi 1 — Hapus Search & Filter Bar
- Hapus `<div class="card grid gap-3 md:grid-cols-4">` baris filter (search `q`, status `select`, fiscalYear `input`, tombol "Filter").
- Filter pindah ke **inline `<input>` / `<select>` di header tabel** (di bawah label `<th>`).
- Kolom yang punya filter inline: Kode/Nama (`q`), Kontrak (contractNumber), Jenis Proyek (jenisInfrastruktur), Daerah (district), Status (status), Tahun anggaran (fiscalYear). Kolom Dokumen & Aksi tanpa filter.
- Pola:
  ```svelte
  <th>
    <div>Kode/Nama</div>
    <input class="input !py-1 !text-xs mt-1" placeholder="filter..." bind:value={filters.q} on:input={load} aria-label="Filter kode/nama" />
  </th>
  ```
- Filter `q` (search) **tetap dipertahankan** di kolom Kode/Nama (penghapusan "search bar" diinterpretasikan sebagai tidak ada baris filter terpisah di atas tabel, tapi search itu sendiri pindah jadi inline di header Kode/Nama). [Catatan: user menjawab "Hapus total" pada pertanyaan search bar — saya interpretasikan: hapus baris filter di atas, tapi search masih bisa dipakai via inline input di header kolom Kode/Nama. Akan dikonfirmasikan saat implementasi.]

### 2.2 Revisi 2 — Restrukturisasi Kolom Tabel

| Posisi | Header | Sumber data | Filter inline |
|--------|--------|-------------|---------------|
| 1 | Kode/Nama | `p.projectCode` + `p.projectName` | `q` (text) |
| 2 | Kontrak | `p.contractNumber` + nilai (RBAC) | `contractNumber` (text) |
| 3 | **Jenis Proyek** | `p.jenisInfrastruktur` (enum, badge) | `jenisInfrastruktur` (select) |
| 4 | **Daerah** | `${p.district} - ${p.roadName}` (badge) | `district` (text) |
| 5 | Status | `p.status` (badge) | `status` (select) |
| 6 | Dokumen | `p.documentSummary.verified/p.total` | — |
| 7 | Aksi | link Ringkasan | — |

- **Vendor dihilangkan** total (sesuai permintaan).
- Kolom Dokumen tetap (ceklist verified/total).
- Link "Ringkasan" di kolom Aksi dipertahankan.

### 2.3 Revisi 3 — Hapus 3 Card Ringkasan
- Hapus `<section class="grid gap-4 md:grid-cols-3" aria-label="Ringkasan Administrasi Proyek GIS">` berikut ke-3 child-nya.
- Hapus `summary` derived store (sudah tidak ada konsumen).
- Import `canReadPaymentHistory` masih dipakai di tempat lain (RBAC service) — biarkan import aktif.

---

## 3. Penambahan Field `district` & `roadName` di Project

### 3.1 Schema Update
`shared/src/schemas/project.ts`:
```ts
export type Project = {
  // ... field existing
  district?: string;   // Nama kecamatan (opsional, untuk kolom Daerah)
  roadName?: string;   // Nama ruas jalan (opsional, untuk kolom Daerah)
};
```

### 3.2 Mock Update
`frontend/src/lib/mocks/projects.ts` (3 proyek):
```ts
{ id:'prj-001', ..., district:'Sidoarjo', roadName:'Koridor Utara', ... },
{ id:'prj-002', ..., district:'Sidoarjo', roadName:'Wilayah Selatan', ... },
{ id:'prj-003', ..., district:'Sidoarjo', roadName:'Aset Pendidikan', ... }
```

### 3.3 Tampilan di Tabel
- Kolom Daerah render: `${p.district ?? '—'} - ${p.roadName ?? '—'}` (badge style `bg-slate-100 text-slate-700`).
- Filter inline di header: `<input>` text untuk `district` (cocok dengan "Kecamatan" — user bisa ketik nama kecamatan untuk filter).

### 3.4 Backward Compatibility
- Field `district` & `roadName` opsional (`?:`) — mock lama yang tidak punya field akan render `'—'`. Tabel tidak crash.

---

## 4. Struktur State Baru (Svelte 4 reactivity)

```ts
let items: any[] = [];
let filters = {
  q: '',
  contractNumber: '',
  jenisInfrastruktur: '',
  district: '',
  status: '',
  fiscalYear: ''
};
// 'summary' dihapus
// 'canReadPaymentHistory' import masih dipakai untuk service includeSensitivePayments
```

`load()` akan pass `filters` ke `listProjects(filters, { ... })`. Service `listProjects` sudah iterate semua keys dari `filters` ke where-clauses (lihat `projects.ts:142-148`):
```ts
projects.filter((project) =>
  (!filters.q || `${project.projectCode} ${project.projectName} ${project.vendorName}`...toLowerCase().includes(filters.q.toLowerCase())) &&
  (!filters.status || project.status === filters.status) &&
  (!filters.fiscalYear || String(project.fiscalYear) === filters.fiscalYear)
)
```

### 4.1 Penambahan Filter Logic di `listProjects`
- Tambah clause: `(!filters.contractNumber || project.contractNumber.toLowerCase().includes(filters.contractNumber.toLowerCase()))`
- Tambah clause: `(!filters.jenisInfrastruktur || project.jenisInfrastruktur === filters.jenisInfrastruktur)`
- Tambah clause: `(!filters.district || (project.district ?? '').toLowerCase().includes(filters.district.toLowerCase()))`

---

## 5. File yang Berubah

| File | Aksi | Ringkasan |
|------|------|-----------|
| `frontend/src/routes/projects/+page.svelte` | Modify | Hapus search/filter bar, hapus section summary cards, restrukturisasi tabel, tambah filter inline per-kolom. |
| `shared/src/schemas/project.ts` | Modify | Tambah `district?: string` & `roadName?: string` ke `Project`. |
| `frontend/src/lib/mocks/projects.ts` | Modify | Tambah `district` & `roadName` ke 3 mock proyek. |
| `frontend/src/lib/services/api/projects.ts` | Modify | Extend `listProjects` filter clauses untuk `contractNumber`, `jenisInfrastruktur`, `district`. |

---

## 6. Risiko & Mitigasi

- **Filter per-kolom menambah tinggi `<th>`** (ada input di bawah label) → tabel bisa terasa lebih tinggi. **Mitigasi**: gunakan `!py-1 !text-xs` di input, dan Tailwind class `!text-[10px]` di label supaya ringkas.
- **`canReadPaymentHistory` import tidak terpakai lagi** di `+page.svelte` jika seluruh kode RBAC pembayaran pindah. **Mitigasi**: cek apakah ada `<div role="status">` atau blok RBAC lain — kalau tidak ada, hapus import untuk kebersihan.
- **Axe-core a11y**: input filter inline di `<th>` harus punya `aria-label`. **Mitigasi**: setiap `<input>` di header dapat `aria-label="Filter <kolom>"`.
- **Backward compat `district`/`roadName` opsional**: proyek tanpa field akan tampil `'—'`. **Mitigasi**: fallback `?? '—'` di render.
- **Service `listProjects` perubahan filter clauses**: harus idempotent — tidak boleh meremove filter existing. **Mitigasi**: hanya **menambah** 3 clause baru dengan `&&` di akhir existing AND chain.

---

## 7. Acceptance Criteria

1. Buka `/projects` sebagai Admin.
2. Tidak ada baris filter di atas tabel. Tidak ada section 3-card ringkasan.
3. Tabel tampil 7 kolom: Kode/Nama · Kontrak · Jenis Proyek · Daerah · Status · Dokumen · Aksi. Kolom Vendor hilang.
4. Setiap `<th>` yang punya filter (Kode/Nama, Kontrak, Jenis Proyek, Daerah, Status, Dokumen) menampilkan `<input>` atau `<select>` kecil di bawah label, dengan `aria-label="Filter <kolom>"`.
5. Ketik "Sidoarjo" di filter Daerah → hanya baris dengan `district='Sidoarjo'` tampil (semua mock).
6. Pilih "jalan" di filter Jenis Proyek → hanya `prj-001` tampil.
7. Pilih "in_progress" di filter Status → hanya `prj-001` tampil.
8. Klik link Ringkasan di Aksi → navigasi ke `/projects/{id}`.
9. `npm run check` (0 errors, 0 warnings), `npm run test` (105/105 pass), `npm run build` (success), E2E existing `frontend-mvp.spec.ts:174-182` (3 project rows visible, tidak ada teks "OPD aktif").
10. Axe-core test tidak regression.

---

## 8. Out of Scope

- Filter per-kolom di halaman lain (`/assets`, `/reports`).
- Reorder kolom (sesuai permintaan: hanya tambah/hapus).
- Pagination / virtualization (sampai data tumbuh signifikan).
- Tambah field `district`/`roadName` ke form `/projects/create` (tidak diminta; field di-create akan undefined dan tampil '—').
- Tambah filter `jenisInfrastruktur` di form create (di luar cakupan revisi ini).
