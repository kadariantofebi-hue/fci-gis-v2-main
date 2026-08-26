# Vector Native Basemap — MapTiler streets-v2

- **Tanggal:** 2026-06-28
- **Status:** Approved
- **Pemrakarsa:** Tim Engineering
- **Related ADR:** ADR-002 (MapLibre migration, drawing presisi trigger)
- **Related spec:** `2026-06-28-hybrid-map-digitize-design.md` (hybrid map draw mode)

## Konteks

Dashboard SIMANTA saat ini default ke `maptiler_satellite` (MapTiler `satellite-v4` style). Style ini adalah **raster + label vector overlay** (hybrid): background adalah raster tile `.jpg`, label/jalan adalah vector. Saat user zoom-in ke z22 (presisi digitasi), background raster blur karena hanya ada tile sampai z19 di upstream.

Kebutuhan user (2026-06-28): "presisi vector native (z22 tanpa rasterization)" — style vector murni (pbf + sprite) yang support overscale z22 tanpa blur.

MapTiler free tier menyediakan beberapa style vector:
- `streets-v2` — lengkap dengan jalan, bangunan, label, POI
- `basic-v2` — minimalist, hanya jalan
- `topo-v2` — topografi

User memilih **`streets-v2`** karena paling lengkap untuk konteks digitasi (nama jalan sebagai referensi spasial).

## Keputusan

1. **Ganti default basemap** dari `maptiler_satellite` (raster hybrid) ke `maptiler_streets` (vector native via `streets-v2`).
2. **Hapus `maptiler_satellite`** dari `BasemapKey` union type. Style `satellite-v4` tidak memenuhi kebutuhan presisi z22.
3. **Style URL**: `https://api.maptiler.com/maps/streets-v2/style.json?key=${PUBLIC_MAPTILER_API_KEY}`.
4. **Tetap pertahankan** OSM Standard dan ESRI Satellite sebagai fallback gratis (untuk developer tanpa MapTiler key).
5. **Backward-compat note**: existing user yang punya preference `maptiler_satellite` di localStorage akan otomatis fallback ke `osm_standard` karena `basemaps[configured]` resolve ke `undefined`.

## Implementation Surface

### File yang Berubah

1. **`frontend/src/lib/components/map/basemaps.ts`**
   - Hapus `maptiler_satellite` dari `BasemapKey` union type.
   - Hapus entry `maptiler_satellite` dari `basemaps` object.
   - Update `maptiler_streets.style` dari `openstreetmap` style URL ke `streets-v2` style URL.

2. **`frontend/.env`**
   - `PUBLIC_DEFAULT_BASEMAP=maptiler_satellite` → `PUBLIC_DEFAULT_BASEMAP=maptiler_streets`.

3. **`frontend/.env.example`**
   - Sama seperti di atas, dengan dokumentasi.

4. **`frontend/src/lib/components/map/basemaps.test.ts`**
   - Hapus test yang assert `maptiler_satellite` di `basemaps`.
   - Update test untuk `maptiler_streets` style URL → `streets-v2`.
   - Assert `maptiler_streets.maxzoom === 22` (vector support overscale).
   - Assert `DEFAULT_BASEMAP === 'maptiler_streets'` saat `PUBLIC_MAPTILER_API_KEY` ter-set.
   - Assert `DEFAULT_BASEMAP === 'osm_standard'` saat `PUBLIC_MAPTILER_API_KEY` kosong.

### File yang TIDAK Berubah

- `MapContainer.svelte` — sudah wire `maxZoom: provider.maxzoom` dari fix sebelumnya.
- `DigitizeMapPanel.svelte` — sama, sudah wire dengan benar.
- `lib/stores/preferences.ts` — sudah baca `DEFAULT_BASEMAP` dari env.

## Data Flow

1. Vite boot → resolve `$env/static/public` → `PUBLIC_DEFAULT_BASEMAP=maptiler_streets`, `PUBLIC_MAPTILER_API_KEY=<key>`.
2. `lib/stores/preferences.ts:initial()` → `defaultBasemap: DEFAULT_BASEMAP` (= `maptiler_streets`, karena `hasToken=true`).
3. `dashboard/+page.svelte:60` → `let basemap = $preferences.defaultBasemap;` → `maptiler_streets`.
4. `MapContainer.svelte` → resolve `basemaps[basemap]` → provider dengan `style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=...'` dan `maxzoom: 22`.
5. `maplibregl.Map` → fetch style JSON → pbf vector tile + sprite + glyphs → WebGL render.
6. User zoom-in ke z22 → MapLibre request vector tile z22 (overscale) → render presisi tanpa rasterization.

## Test Plan

### Unit Tests (`basemaps.test.ts`)

- `maptiler_streets.style` mengandung substring `streets-v2` (bukan `openstreetmap`).
- `maptiler_streets.style` mengandung substring `key=` (MapTiler API key embedded).
- `maptiler_streets.maxzoom === 22` (vector support overscale).
- `maptiler_satellite` tidak ada di `basemaps` object (dihapus).
- `DEFAULT_BASEMAP === 'maptiler_streets'` saat MapTiler key ter-set.
- `DEFAULT_BASEMAP === 'osm_standard'` saat MapTiler key kosong (auto-fallback).

### E2E / Visual Verification

- `npm run dev` dengan `PUBLIC_MAPTILER_API_KEY` ter-set.
- Login sebagai user terautentikasi (admin/viewer, role apapun yang bisa akses `/dashboard`), navigate ke `/dashboard`.
- Map render dengan MapTiler Streets vector (visible: jalan, bangunan, label nama jalan).
- Zoom-in ke z22 (menggunakan `_simantaSetZoom` test hook atau MapLibre NavigationControl).
- Konfirmasi: tidak ada "Map data not yet available" placeholder, tile vector render presisi, nama jalan tetap terbaca di z22.

## Error Handling

- **MapTiler API error** (network/5xx): `handleTileError` di `MapContainer.svelte:313` sudah handle — set `tileError` dan fallback ke OSM. Tidak perlu tambahan.
- **MapTiler key invalid/expired** (401/403): MapLibre akan render "Map data not yet available" untuk tile yang gagal. Sama seperti kondisi existing (sebelum fix ini, ESRI raster juga menampilkan placeholder).
- **Missing `PUBLIC_MAPTILER_API_KEY`**: `DEFAULT_BASEMAP` auto-fallback ke `osm_standard` (lihat `basemaps.ts#DEFAULT_BASEMAP` resolver).
- **Existing localStorage preference `maptiler_satellite`**: akan resolve ke `undefined` di `basemaps[configured]`, lalu fallback ke `osm_standard` (atau ke `maptiler_streets` baru jika user refresh dengan env baru). Behavior konsisten dengan resolver existing.

## Out of Scope

- Migrasi ke MapTiler style vector lain (`basic-v2`, `topo-v2`) — bisa di iterasi berikut.
- Tile server hosting sendiri (PostGIS vector tile via `ST_AsMVT`) — out of MVP scope per PRD, sudah deferred.
- Menambah basemap dropdown option di MapContainer UI — sudah ada pattern di `getActiveBasemaps()`, otomatis nampilkan semua basemap aktif.

## Rollback

Jika ada masalah dengan `streets-v2`:
1. Update `basemaps.ts` style URL ke MapTiler `openstreetmap` style URL (vector juga, free tier, fallback), atau revert ke `osm_standard` raster.
2. Atau restore `maptiler_satellite` dari git history.
3. Default env bisa di-revert via `.env` (sudah ada di repo).
