# ADR-002: Leaflet sebagai engine peta default, MapLibre GL sebagai opsi eskalasi

- **Status:** Superseded by MapLibre GL migration (2026-06-26)
- **Tanggal:** Mei 2026
- **Pemrakarsa:** Tim Engineering
- **Konteks PRD:** §3.4

## Konteks

Peta interaktif adalah inti SIMANTA. Pilihan engine peta utama:

- **Leaflet 1.9.x** — open source, ringan, ekosistem plugin matang (leaflet-draw, leaflet-search, leaflet-measure, leaflet-markercluster), Canvas/SVG-based.
- **MapLibre GL JS** — fork open source dari Mapbox GL, WebGL-based, mendukung vector tile native, performa lebih tinggi untuk dataset besar dan styling kompleks.

Karakteristik dataset awal:
- Jumlah aset diperkirakan 5.000–50.000 dalam 1–2 tahun pertama.
- Pengguna konkuren puncak ~200 (capacity baseline §4.2.1).
- Mayoritas device pengguna: laptop kantor / desktop dengan browser modern, beberapa Android Chrome.

## Keputusan Awal (Mei 2026)

1. **MVP & fase awal:** gunakan **Leaflet** karena ekosistem plugin (leaflet-draw, leaflet-search, leaflet-measure) sangat matang dan biaya integrasi rendah.
2. **Abstraksi engine peta:** seluruh interaksi peta di-encapsulate di `MapContainer.svelte`. Tidak ada komponen lain yang langsung menyentuh `L.*`.
3. **Roadmap eskalasi** (lihat PRD §3.4) — naik fase saat trigger terpenuhi:
   - BBox + zoom-aware loading + simplification (sejak hari pertama)
   - Clustering point + Canvas renderer
   - Vector tile via `Leaflet.VectorGrid` + `ST_AsMVT`
   - Migrasi MapLibre GL bila kebutuhan styling/3D/heatmap kompleks atau data > ~10.000 polygon konkuren
4. **Migrasi MapLibre** akan menjadi swap tunggal di `MapContainer.svelte` tanpa rewrite halaman.

## Resolusi: Migrasi ke MapLibre GL (2026-06-26)

### Trigger yang Terpenuhi

Kebutuhan baru: **drawing presisi** (polygon, polyline, point) dengan kemampuan zoom-out/in sejauh mungkin untuk menggambar lebih akurat.

- **Leaflet raster tiles blur di zoom tinggi (z19+)** — batas maksimal presisi digitasi.
- **Leaflet SVG/Canvas renderer lag** saat polygon kompleks dengan banyak vertex (>200–500).
- **MapLibre WebGL + vector tile** mendukung overscale ke z22+ tanpa blur, dan render tetap smooth dengan vertex banyak.

### Hasil Migrasi

- **Engine**: `leaflet@1.9.4` → `maplibre-gl@5.24.0`
- **Bundle size**: ~40 KB → ~200 KB gzip (acceptable trade-off untuk WebGL capability)
- **API**: `L.map()` → `new maplibregl.Map()`, `L.geoJSON()` → `map.addSource() + addLayer()` dengan paint expressions (data-driven styling)
- **Coordinate order**: diperbaiki dari `[lat, lng]` (Leaflet convention) → `[lng, lat]` (GeoJSON spec)
- **Max zoom**: 18 (raster) → 22 (vector overscale)
- **DOM access**: SVG/Canvas per-feature elements → WebGL canvas (E2E test hooks via `queryRenderedFeatures`)

### File yang Berubah

- `frontend/package.json` — deps swap
- `frontend/src/app.css` — `@import 'maplibre-gl/dist/maplibre-gl.css'`
- `frontend/src/lib/components/map/MapContainer.svelte` — full rewrite
- `frontend/src/lib/components/map/DigitizeMapPanel.svelte` — full rewrite
- `frontend/src/lib/components/map/basemaps.ts` — style spec migration
- `frontend/src/lib/components/map/basemaps.test.ts` — test updates
- `frontend/src/lib/components/crud/AssetForm.svelte` — help text update
- `frontend/tests/e2e/frontend-mvp.spec.ts` — popup selector + feature count via test hooks

## Konsekuensi

### Positif
- Time-to-market cepat dengan plugin Leaflet siap pakai (historical).
- Tidak butuh investasi WebGL skill di awal (historical).
- Ringan untuk device kantor sederhana (historical).
- **Sekarang**: zoom presisi sampai z22 untuk digitasi yang akurat.
- **Sekarang**: WebGL rendering — smooth untuk polygon dengan banyak vertex.
- **Sekarang**: data-driven paint expressions — styling lebih maintainable.

### Negatif
- Performa pan/zoom turun saat fitur tampak > 2.000 (Canvas/SVG limit) — **resolved via WebGL**.
- Migrasi MapLibre nanti butuh rewrite styling (sprite + style spec) — **resolved via current migration**.
- Bundle size naik ~160 KB gzip (acceptable).
- WebGL dependency — modern browser required (target device all modern).

## Alternatif yang Dipertimbangkan

- **MapLibre dari hari pertama**: dulu dianggap overkill — biaya integrasi plugin tinggi (draw/search tidak setara plugin Leaflet). Custom digitizer terbukti cukup.
- **OpenLayers**: API powerful tapi steeper learning curve, ekosistem plugin kurang.
- **Mapbox GL JS (proprietary)**: lisensi & quota komersial, tidak cocok untuk pemerintahan.
- **ArcGIS Maps SDK**: vendor lock-in (Esri), API key wajib, bundle 3–5 MB — overkill untuk kebutuhan ini.

## Referensi

- PRD §3.4 Strategi Peta
- PRD §14 Risiko: "Browser tidak support WebGL"
- PRD §11 Sprint 3: implementasi MapContainer
- Plan file: `C:\Users\Ojan\.claude\plans\jaunty-swimming-globe.md` (2026-06-26)
- Spec: `docs/superpowers/specs/2026-06-28-hybrid-map-digitize-design.md` (hybrid map digitize)

## Amendemen: Draw mode opt-in (2026-06-28)

### Latar Belakang

Sebelumnya, `MapContainer` digunakan murni untuk read-only basemap rendering. Untuk fitur "Digitasi Cepat" di dashboard, ada kebutuhan agar user bisa menggambar polygon/garis/titik **langsung di basemap** yang sudah ada, tanpa instance MapLibre kedua (mini-map di dalam panel).

### Perubahan

`MapContainer.svelte` sekarang menerima prop `editMode?: 'view' | 'draw' = 'view'`:

- **`'view'` (default)** — read-only behavior seperti sebelumnya. Tidak ada perubahan untuk call site existing (`/assets`, dll).
- **`'draw'`** — mount `<MapDrawController>` sebagai child dari instance MapLibre yang sama. Controller menambahkan satu GeoJSON source (`draft-shape`) + 3 layer (fill, outline, vertices) ke map yang sudah ada, plus click/dblclick handlers.

Prop baru lain:
- `mapInstance: maplibregl.Map | null` — bindable, agar parent bisa terima instance untuk hybrid flow.
- `drawMode: DrawMode` — saat ini `'point' | 'line' | 'polygon'`; default `'polygon'`.
- `onGeometryChange: (detail) => void` — callback prop (Svelte 5 idiom) menggantikan `createEventDispatcher`. Forwarded dari `MapDrawController` ke parent.

Cursor map menjadi `crosshair` saat `editMode='draw'` (via CSS class, tidak mengganggu default behavior di mode `'view'`).

### Mengapa opt-in (bukan global)

- `MapContainer` punya 4 mode render: `'asset' | 'project'` (data) × `'view' | 'draw'` (interaksi). `mode` prop sudah dipakai untuk yang pertama, jadi rename ke `editMode` untuk yang kedua.
- Read-only invariant tetap berlaku untuk semua call site yang tidak secara eksplisit set `editMode='draw'`.
- `/projects/create` tetap pakai `DigitizeMapPanel` (full editor) — `MapContainer` di sana tidak diubah.
- ADR ini hanya melunakkan read-only invariant di dashboard; bukan menghapusnya.

### File Terkait

- `frontend/src/lib/components/map/MapContainer.svelte` — tambah `editMode` prop, mount `MapDrawController`
- `frontend/src/lib/components/map/MapDrawController.svelte` — komponen baru (Svelte 5 runes)
- `frontend/src/lib/components/map/drawing-controller.ts` — pure module untuk vertex state
- `frontend/src/lib/components/dashboard/DashboardDrawSheet.svelte` — bottom sheet UI
- `frontend/src/routes/dashboard/+page.svelte` — wire sheet ke MapContainer + add/reset handlers
- Tests: 5 jsdom test di `MapDrawController.test.ts` (layer lifecycle + dblclick suppression + mode reset)
