# Rencana: Drag-and-Drop Reorder Header Dokumen di Halaman Tambah Proyek

**Tanggal**: 2026-06-21
**Tujuan**: Memungkinkan user mengurutkan ulang 5 (atau lebih) header dokumen di `/projects/create` dengan drag-drop mouse atau keyboard ↑/↓, sehingga urutan akhir benar-benar fleksibel dan persist ke submit envelope.

---

## 1. Analisis Kebutuhan

### 1.1 Permintaan User
- Tambah fitur drag-and-drop untuk header dokumen di `/projects/create` agar bisa diurutkan sesuai keinginan (fleksibel).

### 1.2 Halaman yang Dimodifikasi
- `frontend/src/routes/projects/create/+page.svelte` — section "Header dokumen & lampiran file mock" (sudah ada).

### 1.3 Hasil Diskusi dengan User
| Topik | Keputusan |
|-------|-----------|
| Trigger area | **Seluruh row** (cursor `grab` saat hover, kecuali klik pada input/select/checkbox/button) |
| Keyboard fallback | **Ya**, tombol ↑/↓ di kolom "Aksi" sebelum tombol Hapus (a11y + axe-core) |
| Scope | **Hanya header**, file queue di dalam `<details>` tetap pakai field `Urutan file` (number) |
| Drop indicator | **Garis horizontal** tipis di antara dua row (insert atas/bawah berdasarkan 50% batas) |
| Persistensi order | **Implicit via array order** — `headers.map(...)` sudah mengirim sesuai urutan array |

---

## 2. Pola Code yang Sudah Ada

### 2.1 Tabel Header Saat Ini
- `<table class="table">` dengan `<thead>` 7 kolom: `#`, Stage, Kind, Title, Sensitif, File, Aksi.
- Body berisi 2 baris per header (row form utama + row `<details>` multi-file) — pola `{#each headers as header, i (header.id)}` keyed by `header.id`.
- State `headers: HeaderRow[]` di-replace pakai spread (immutable update) setiap add/remove — pattern ini dipakai untuk `removeHeader` & `addHeader`.

### 2.2 Tidak Ada Library DnD
- `package.json` dependencies tidak punya `svelte-dnd-action`, `dnd-kit`, atau library serupa. Pendekatan **HTML5 native DnD** = tanpa dependency baru, full kontrol, ukuran bundle minimal.

### 2.3 Style Tokens yang Tersedia (`app.css`)
- `.btn .btn-secondary` (ringkasan button).
- Tailwind utility bawaan (project pakai Tailwind v4 + global classes) — `cursor-grab`, `cursor-grabbing`, `bg-emerald-50`, `bg-sky-200`, `border-sky-400`, `transition`, `opacity-50` sudah tersedia.
- Tidak perlu class baru di `app.css`.

### 2.4 Konvensi A11y Existing
- Setiap kontrol sudah punya `aria-label` (mis. `Stage header ${i+1}`).
- Axe-core test di `tests/e2e/a11y.spec.ts` (lihat `CLAUDE.md`) — wajib lulus.
- Tombol "Aksi" sudah berisi tombol "Hapus" dengan `aria-label="Hapus header N"`.

---

## 3. Rancangan Implementasi

### 3.1 State Baru (Svelte 4 reactivity, sesuai style file)

```ts
let draggedHeaderId: string | null = null;
let dropIndicatorIndex: number | null = null; // index of row WHERE TO insert (0..headers.length)
```

- `draggedHeaderId` di-set saat `dragstart`, di-reset saat `dragend`/`drop`/`drag-leave-window`.
- `dropIndicatorIndex` dihitung saat `dragover` di atas row tertentu: jika `offsetY < rowHeight/2` → insert di ATAS row tersebut, else di BAWAH.

### 3.2 Handler Functions

```ts
function onDragStart(headerId: string, event: DragEvent) {
  draggedHeaderId = headerId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', headerId);
  }
}
function onDragOver(headerId: string, event: DragEvent) {
  event.preventDefault(); // required to allow drop
  const row = (event.currentTarget as HTMLElement).closest('tr.dnd-row') as HTMLElement | null;
  if (!row) return;
  const rect = row.getBoundingClientRect();
  const offsetY = event.clientY - rect.top;
  const targetIndex = headers.findIndex((h) => h.id === headerId);
  if (offsetY < rect.height / 2) {
    dropIndicatorIndex = targetIndex; // insert above this row
  } else {
    dropIndicatorIndex = targetIndex + 1; // insert below this row
  }
}
function onDragLeave() {
  // Don't clear dropIndicatorIndex on leave — would cause flicker
  // (cleared on drop / dragend instead)
}
function onDrop(headerId: string, event: DragEvent) {
  event.preventDefault();
  const draggedId = draggedHeaderId ?? event.dataTransfer?.getData('text/plain');
  if (!draggedId) return;
  const fromIndex = headers.findIndex((h) => h.id === draggedId);
  let toIndex = dropIndicatorIndex ?? headers.findIndex((h) => h.id === headerId);
  if (fromIndex < 0 || toIndex < 0) return;
  // Adjust toIndex if moving forward (splice removes the source first)
  if (fromIndex < toIndex) toIndex -= 1;
  if (fromIndex === toIndex) {
    clearDndState();
    return;
  }
  const next = [...headers];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  headers = next;
  clearDndState();
}
function onDragEnd() {
  clearDndState();
}
function clearDndState() {
  draggedHeaderId = null;
  dropIndicatorIndex = null;
}
function moveHeader(headerId: string, direction: -1 | 1) {
  const fromIndex = headers.findIndex((h) => h.id === headerId);
  if (fromIndex < 0) return;
  const toIndex = fromIndex + direction;
  if (toIndex < 0 || toIndex >= headers.length) return;
  const next = [...headers];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  headers = next;
}
```

### 3.3 Markup Row

Tambah class `dnd-row` ke `<tr>` form-utama dan `draggable={!isSubmitting}` + handler. **Hanya row form-utama** yang draggable (row `<details>` di bawahnya tidak ikut pindah, supaya layout details tetap di bawah header yang sama).

Tambah 2 tombol di kolom "Aksi" (sebelum tombol "Hapus"):

```svelte
<tr
  class="dnd-row {draggedHeaderId === header.id ? 'opacity-50' : ''} {dropIndicatorIndex === i ? 'border-t-2 border-sky-400' : ''} {dropIndicatorIndex === i + 1 ? 'border-b-2 border-sky-400' : ''}"
  draggable={!isSubmitting}
  on:dragstart={(e) => onDragStart(header.id, e)}
  on:dragover={(e) => onDragOver(header.id, e)}
  on:dragleave={onDragLeave}
  on:drop={(e) => onDrop(header.id, e)}
  on:dragend={onDragEnd}
>
```

Catatan: tailwind v4 butuh arbitrary value ditulis lengkap. Pakai `class="border-t-2 border-sky-400"` (bukan shorthand). Karena `class:` directive di Svelte, kita bisa construct string gabungan reactive.

**Caveat penting**: klik pada `<input>`, `<select>`, `<button>` di dalam row akan mulai drag karena `draggable=true` di parent. **Mitigasi**: tambah `on:mousedown={(e) => e.stopPropagation()}` di input/select/checkbox/button dalam row, ATAU lebih sederhana: hanya pasang `draggable=true` pada cell pertama (drag handle) yang berisi icon `⋮⋮` dengan `cursor-grab`. Hasil diskusi: **user memilih "seluruh row"** — maka stopPropagation di input controls adalah solusi yang tepat.

### 3.4 Tombol Keyboard ↑/↓ di Kolom Aksi

```svelte
<td>
  <div class="flex items-center gap-1">
    <button class="btn btn-secondary !px-2 !py-1 text-xs" type="button"
            on:click={() => moveHeader(header.id, -1)}
            disabled={isSubmitting || i === 0}
            aria-label={`Pindahkan header ${i + 1} ke atas`}>↑</button>
    <button class="btn btn-secondary !px-2 !py-1 text-xs" type="button"
            on:click={() => moveHeader(header.id, 1)}
            disabled={isSubmitting || i === headers.length - 1}
            aria-label={`Pindahkan header ${i + 1} ke bawah`}>↓</button>
    <button class="btn btn-secondary !px-2 !py-1 text-xs" type="button"
            on:click={() => removeHeader(header.id)}
            disabled={isSubmitting}
            aria-label={`Hapus header ${i + 1}`}>Hapus</button>
  </div>
</td>
```

### 3.5 Cursor & Visual Feedback

- Default cursor untuk row: `cursor-grab` (Tailwind utility).
- Saat drag aktif (`:active` pseudo-class via `cursor-grabbing`) — tapi karena `draggable=true` di OS level, pseudo-class ini mungkin tidak konsisten. Alternatif: pakai `draggedHeaderId === header.id` → `cursor-grabbing` via inline class.
- `opacity-50` pada row yang sedang di-drag (visual feedback sumber).
- Drop indicator: gunakan class `before:` atau `border-t-2/border-b-2` di row yang relevan. Karena pseudo `::before` mungkin bentrok dengan `<tr>` (browser limitation), pakai `border-t-2` di row di BAWAH posisi insert.

### 3.6 StopPropagation pada Form Controls

Untuk memenuhi requirement "seluruh row bisa di-drag tapi klik pada input tidak memicu drag":

```svelte
<select on:mousedown={(e) => e.stopPropagation()} ...>
<input on:mousedown={(e) => e.stopPropagation()} ...>
<button on:mousedown={(e) => e.stopPropagation()} ...>...</button>
```

Note: `mousedown` (bukan `click`) yang perlu di-stop, karena browser memulai HTML5 drag pada event `mousedown + drag threshold`. `stopPropagation()` di `mousedown` mencekal propagation ke parent, sehingga `dragstart` parent tidak terpicu.

### 3.7 A11y Tambahan
- Row `<tr draggable>` di Svelte: tetap semantik tabel; `aria-grabbed={draggedHeaderId === header.id}` (opsional, untuk screen reader).
- `aria-label` tombol ↑/↓/Hapus sudah ada.
- Visual indicator (`border-sky-400`) adalah pelengkap; state semantik ada di `disabled` button ↑/↓.

### 3.8 Lifecycle / Cleanup
- `clearDndState()` dipasang di `onDrop` dan `onDragEnd`.
- Tambah `on:dragend` di row agar state selalu bersih walaupun user drop di luar tabel.

---

## 4. Berkas yang Berubah

| File | Aksi | Ringkasan |
|------|------|-----------|
| `frontend/src/routes/projects/create/+page.svelte` | Modify | Tambah 2 state, 6 handler, 2 tombol ↑/↓ di kolom Aksi, atribut DnD di `<tr>`, class `cursor-grab` & `dnd-row`. Tidak ada perubahan service. |
| `frontend/src/lib/services/api/projects.ts` | (tidak berubah) | `headers.map(...)` sudah iterate sesuai array order. |
| `frontend/src/app.css` | (tidak berubah) | Pakai utility Tailwind bawaan. |

---

## 5. Risiko & Mitigasi

- **Native DnD + Tailwind v4 di `<tr>`**: `<tr>` adalah tabel element; HTML5 `draggable` di `<tr>` **supported di Chromium, Firefox, Safari** modern. Mitigasi: bila test e2e gagal di browser tertentu, fallback ke cell-level draggable. Validasi via `npm run test:e2e` setelah implementasi.
- **Drop indicator flicker saat drag antar row**: `dragleave` terlalu agresif bisa reset indicator. Mitigasi: `onDragLeave` tidak reset; reset hanya di `drop`/`dragend`.
- **Click pada input men-trigger drag**: Mitigasi: `on:mousedown` `stopPropagation` di semua form controls dalam row.
- **Axe-core false positive** karena `<tr draggable>`: Mitigasi: tambah `aria-grabbed` untuk semantik, `aria-label` di handle implisit via `aria-label` row (tidak wajib; tombol ↑/↓ sudah cukup).
- **State drag tidak ke-reset saat user tekan ESC atau drop di luar tabel**: Mitigasi: `on:dragend` di row + global `window.addEventListener('dragend', clearDndState)` di `onMount` dengan cleanup `onDestroy`.

---

## 6. Acceptance Criteria

1. Buka `/projects/create` sebagai Admin → 5 header default tampil.
2. Drag row header (mis. "Invoice termin") ke posisi atas (di atas "KAK/TOR") → row berpindah, list reorder terlihat real-time, `headers` array updated.
3. Drop indicator (border sky-400) muncul di antara row saat drag aktif; hilang saat drop selesai.
4. Klik tombol `↓` pada row pertama → row turun ke posisi 2; tombol `↓` di row terakhir ter-disable.
5. Klik tombol `↑` pada row terakhir → row naik ke posisi N-1; tombol `↑` di row pertama ter-disable.
6. Submit form → service menerima `documents` sesuai array order terbaru (cek via redirect ke `/projects/{id}/documents` yang menampilkan list dengan urutan sesuai).
7. Axe-core test tetap pass (tidak ada regression di `tests/e2e/a11y.spec.ts`).
8. `npm run check`, `npm run test`, `npm run build` tetap hijau.
9. Drag handle/row tidak konflik dengan klik pada input/select/button (user bisa mengetik di input Title tanpa memulai drag).

---

## 7. Out of Scope (Tidak Berubah)

- Library DnD eksternal (tetap native HTML5).
- Drag-drop untuk file queue dalam `<details>` (di luar permintaan user).
- Animasi transisi reorder (FLIP animation) — indikator drop sederhana cukup untuk MVP.
- Persistensi `displayOrder` ke schema `ProjectDocument` shared (sudah tercakup implicit via array order).
- Touch support khusus untuk mobile (HTML5 DnD terbatas di mobile Safari; untuk MVP browser desktop sudah cukup; tambahkan touch handler dengan `on:touchstart`/`touchmove` hanya bila ada permintaan eksplisit).
