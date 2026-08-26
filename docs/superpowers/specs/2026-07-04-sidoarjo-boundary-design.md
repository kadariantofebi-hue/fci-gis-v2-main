# Boundary Area Sidoarjo di ZOOM CEPAT

**Status:** Proposed
**Date:** 2026-07-04
**Author:** Claude (brainstorming session with user)
**Supersedes:** N/A
**PRD:** v1.4 §8.1 (Dashboard Proyek GIS)
**Related:** Zoom Cepat bug fix (2026-07-04) — fix sebelumnya agar tombol refocus map; spec ini extend dengan visual boundary

## 1. Problem

User di Dashboard Proyek GIS ingin tahu "seberapa luas" Kabupaten Sidoarjo saat menekan tombol "Kabupaten Sidoarjo" di panel ZOOM CEPAT. Saat ini, klik tombol hanya memindahkan kamera peta (center/zoom) ke koordinat Sidoarjo, tetapi tidak menampilkan representasi visual dari batas administratif kabupaten. Akibatnya user tidak punya cara cepat untuk membandingkan skala Sidoarjo terhadap peta di sekitarnya atau terhadap proyek-proyek yang ditampilkan.

## 2. Goal

Saat user klik tombol "Kabupaten Sidoarjo" di panel ZOOM CEPAT, peta menampilkan **outline poligon administratif Kabupaten Sidoarjo** (stroke biru + fill biru transparan) sehingga user bisa langsung melihat batas dan luasan kabupaten tersebut. Outline ini hide otomatis saat user klik tombol Indonesia / Jawa Timur, atau saat halaman di-load ulang (tidak ada persistensi).

**Out of scope (per diskusi brainstorming):**

- Data administratif resmi BPS/Pemda (cukup representasi kasar dari ~12 vertex hard-coded)
- Toggle UI terpisah (boundary muncul otomatis saat tombol diklik, tidak ada switch on/off)
- Label nama kabupaten atau tooltip interaktif
- Interaksi klik pada boundary (event handler, popup)
- Boundary untuk Indonesia / Jawa Timur (hanya Sidoarjo untuk iterasi ini)
- Animasi khusus saat boundary muncul (transisi opacity/width)

## 3. Decisions (Brainstorming)

| # | Pertanyaan | Keputusan |
|---|---|---|
| 1 | Visual style | Garis batas (stroke) + fill transparan — user bisa lihat boundary DAN area sekaligus |
| 2 | Warna | Biru netral `rgb(37, 99, 235)` (stroke + fill 12% alpha) — tidak konflik dengan project status colors (hijau/kuning/merah) |
| 3 | Sumber data | Poligon hard-coded ~12 vertex di mock file terpisah (representasi kasar, bukan data resmi) |
| 4 | Trigger behavior | Hanya aktif saat "Kabupaten Sidoarjo" adalah tombol terakhir yang diklik; hide saat klik tombol lain atau initial load |
| 5 | API contract | Boolean prop `showSidoarjoBoundary` ke MapContainer (MapContainer tetap generic, tidak coupling ke enum `ZoomLevel` dashboard) |

## 4. Architecture

### 4.1 Component tree

```
routes/dashboard/+page.svelte
├─ <MapContainer
│     ...
│     showSidoarjoBoundary={lastClickedZoomLevelId === 'sidoarjo'} />
└─ <DashboardZoomRail onSetZoomLevel={setZoomLevel} />
       └─ (emits level.id; parent sekarang track juga, bukan hanya mapCenter)
```

### 4.2 Data flow

```
User clicks "Kabupaten Sidoarjo" button in DashboardZoomRail
  → onSetZoomLevel(level) fires with level.id === 'sidoarjo'
       ↓
Parent setZoomLevel(level):
  ├─ mapCenter = { lat, lng, zoom }     (existing behavior)
  └─ lastClickedZoomLevelId = 'sidoarjo' (NEW)
       ↓
Reactive: <MapContainer showSidoarjoBoundary={lastClickedZoomLevelId === 'sidoarjo'} />
       ↓
MapContainer reactive block:
  if (map && data-map-ready) → setLayoutProperty('sidoarjo-boundary-fill', 'visibility', 'visible')
                              setLayoutProperty('sidoarjo-boundary-line', 'visibility', 'visible')
       ↓
User clicks "Indonesia" or "Jawa Timur":
  → lastClickedZoomLevelId = 'indonesia' | 'jawa-timur'
  → showSidoarjoBoundary = false
  → setLayoutProperty(..., 'visibility', 'none')
```

### 4.3 Layer model

MapContainer gains:

- **Source** `sidoarjo-boundary` (GeoJSON) — added in `onMount`, re-added after each `style.load` (basemap change)
- **Layer** `sidoarjo-boundary-fill` — fill 12% opacity, drawn under `features-*` layers
- **Layer** `sidoarjo-boundary-line` — 2.5px stroke, drawn under `features-*` layers

Both layers have `layout: { visibility: 'none' }` initially. Visibility is toggled by `setLayoutProperty` reactively, not by re-adding layers.

## 5. Components

### 5.1 New: `frontend/src/lib/mocks/sidoarjo-boundary.ts` (~30 LOC)

```ts
import type { Feature, FeatureCollection, Polygon } from '$shared/geojson';

type BoundaryProps = { kind: 'kabupaten'; name: string };

// Approksimasi kasar, ~12 vertex. Koordinat [lng, lat] (GeoJSON spec).
// Referensi batas administratif nyata Kabupaten Sidoarjo:
// - Utara: Kota Surabaya, Kabupaten Gresik
// - Barat: Kabupaten Mojokerto
// - Selatan: Kabupaten Pasuruan
// - Timur: Selat Madura
// Area ~700 km² (real ~719 km²).
const SIDOARJO_RING: Polygon['coordinates'] = [[
  [112.55, -7.32],  // NW Mojokerto border
  [112.66, -7.30],  // N
  [112.78, -7.30],  // NE Surabaya
  [112.86, -7.38],  // E Madura Strait coast
  [112.84, -7.46],  // E
  [112.78, -7.55],  // SE Waru
  [112.70, -7.58],  // S Porong
  [112.62, -7.54],  // SW
  [112.56, -7.46],  // W
  [112.55, -7.38],  // W
  [112.55, -7.32],  // close ring
]];

export const SIDOARJO_BOUNDARY: FeatureCollection<BoundaryProps> = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: SIDOARJO_RING },
    properties: { kind: 'kabupaten', name: 'Kabupaten Sidoarjo' },
  }],
};
```

### 5.2 Changed: `frontend/src/lib/components/map/MapContainer.svelte`

**New prop:**

```ts
export let showSidoarjoBoundary: boolean = false;
```

**New constants (di module scope, bersama `LAYER_IDS` di top-level `<script>`):**

```ts
const SIDOARJO_BOUNDARY_SOURCE_ID = 'sidoarjo-boundary';
const SIDOARJO_BOUNDARY_FILL_LAYER_ID = 'sidoarjo-boundary-fill';
const SIDOARJO_BOUNDARY_LINE_LAYER_ID = 'sidoarjo-boundary-line';
```

**New functions:**

```ts
function renderSidoarjoBoundary() {
  if (!map) return;
  if (!map.getSource(SIDOARJO_BOUNDARY_SOURCE_ID)) {
    map.addSource(SIDOARJO_BOUNDARY_SOURCE_ID, {
      type: 'geojson',
      data: SIDOARJO_BOUNDARY,
    });
    // Fill drawn under features-* so project markers stay on top.
    map.addLayer({
      id: SIDOARJO_BOUNDARY_FILL_LAYER_ID,
      type: 'fill',
      source: SIDOARJO_BOUNDARY_SOURCE_ID,
      paint: {
        'fill-color': 'rgb(37, 99, 235)',
        'fill-opacity': 0.12,
      },
      layout: { visibility: 'none' },
    });
    map.addLayer({
      id: SIDOARJO_BOUNDARY_LINE_LAYER_ID,
      type: 'line',
      source: SIDOARJO_BOUNDARY_SOURCE_ID,
      paint: {
        'line-color': 'rgb(37, 99, 235)',
        'line-width': 2.5,
      },
      layout: { visibility: 'none' },
    });
  }
  applyBoundaryVisibility();
}

function applyBoundaryVisibility() {
  if (!map) return;
  const v = showSidoarjoBoundary ? 'visible' : 'none';
  for (const id of [SIDOARJO_BOUNDARY_FILL_LAYER_ID, SIDOARJO_BOUNDARY_LINE_LAYER_ID]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v);
  }
}
```

**New reactive block (sejalan dengan basemap & center blocks):**

```ts
$: {
  showSidoarjoBoundary;
  if (map && !disposed && mapEl?.getAttribute('data-map-ready') === 'true') {
    applyBoundaryVisibility();
  }
}
```


**Hook into lifecycle (3 call sites):**
- `onMount` `mapInstance.on('load', ...)` handler existing — di akhir block, setelah `setupPopupHandlers()`, panggil `renderSidoarjoBoundary()`. Sama dengan pattern test hooks eksisting.
- Basemap reactive block (setelah `style.load` callback di dalam `map.once('style.load', ...)`) — panggil `renderSidoarjoBoundary()` di akhir callback. Source + layers re-add setelah `setStyle` menghapus semuanya.
- Initial mount: `renderSidoarjoBoundary()` aman dipanggil kapan saja — di dalamnya ada `if (!map) return` dan `getSource()` check, jadi idempotent. Reactive block (yang melakukan `setLayoutProperty`) di-guard `data-map-ready === 'true'`.

```ts
(mapEl as any)._simantaGetSidoarjoBoundary = () => {
  if (!map) return { layerExists: false, visibility: null };
  const layer = map.getLayer(SIDOARJO_BOUNDARY_LINE_LAYER_ID);
  if (!layer) return { layerExists: false, visibility: null };
  return {
    layerExists: true,
    visibility: map.getLayoutProperty(SIDOARJO_BOUNDARY_LINE_LAYER_ID, 'visibility') || 'visible',
  };
};
```

### 5.3 Changed: `frontend/src/routes/dashboard/+page.svelte`

**New state:**

```ts
type ZoomLevelId = 'indonesia' | 'jawa-timur' | 'sidoarjo';
let lastClickedZoomLevelId: ZoomLevelId | null = null;
```

**Updated `setZoomLevel`:**

```ts
function setZoomLevel(level: ZoomLevel) {
  mapCenter = { lat: level.lat, lng: level.lng, zoom: level.zoom };
  lastClickedZoomLevelId = level.id;  // NEW
}
```

**Updated MapContainer usage:**

```svelte
<MapContainer
  ...
  showSidoarjoBoundary={lastClickedZoomLevelId === 'sidoarjo'} />
```

State `lastClickedZoomLevelId` di-reset ke `null` di setiap navigasi baru (default Svelte behavior — tidak ada localStorage persistence).

### 5.4 Unchanged

- `DashboardZoomRail.svelte` — contract `onSetZoomLevel(level)` tetap, hanya parent yang sekarang track `level.id`
- `DigitizeMapPanel.svelte`, `MapDrawController.svelte` — tidak terkait
- Backend / API — tidak ada perubahan (data hard-coded di mock, bukan fetched)

## 6. State & Error Handling

### 6.1 State machine

`lastClickedZoomLevelId: ZoomLevelId | null` adalah single source of truth di parent. Transisi:

- `null → 'sidoarjo'` (user klik Sidoarjo): boundary visible
- `null → 'jawa-timur' | 'indonesia'`: boundary hidden (tidak berubah dari default)
- `'sidoarjo' → 'jawa-timur' | 'indonesia'`: boundary hidden
- `'sidoarjo' → 'sidoarjo'` (re-klik tombol sama): tidak ada perubahan (boundary tetap visible)

### 6.2 Error matrix

| Condition | Behavior |
|---|---|
| Basemap diganti saat boundary visible | `setStyle` hapus semua custom layer. Basemap reactive block re-call `renderSidoarjoBoundary()` setelah `style.load`. Source + 2 layer di-add ulang; `applyBoundaryVisibility()` restore visibility sesuai prop. |
| Initial load (sebelum ada klik) | `lastClickedZoomLevelId = null` → `showSidoarjoBoundary = false` → visibility `'none'`. Boundary hidden. |
| User navigasi away & kembali | Component unmount & re-mount. `lastClickedZoomLevelId` reset ke `null` (Svelte default). Boundary hidden. Tidak ada persistensi (sesuai keputusan brainstorming). |
| Map belum ready saat prop berubah | Reactive block guard `data-map-ready === 'true'` (pola sama dengan basemap/center). |
| User manual pan/zoom jauh dari Sidoarjo | Boundary tetap visible (visibility tied to `lastClickedZoomLevelId`, bukan ke current view). User bisa lihat "di mana Sidoarjo" dari jauh — sesuai dengan tujuan "tahu luasan area" bahkan dari view yang lebih luas. |
| Component unmount mid-display | `MapContainer` disposal function `map.remove()` otomatis bersihkan semua layer & source. Tidak perlu cleanup eksplisit. |

### 6.3 Accessibility

- Boundary adalah visual reference, bukan interactive element. Tidak ada aria-label, role, atau keyboard handler.
- Tooltip di tombol "Kabupaten Sidoarjo" sudah ada (`title="Kabupaten Sidoarjo (zoom 11)"`); tidak diubah.
- Tidak ada regresi a11y karena boundary tidak menambah interaksi baru.

## 7. File Diff Summary

| File | Action | LOC |
|---|---|---|
| `frontend/src/lib/mocks/sidoarjo-boundary.ts` | New | +35 |
| `frontend/src/lib/components/map/MapContainer.svelte` | Edited | +60 / -0 |
| `frontend/src/routes/dashboard/+page.svelte` | Edited | +5 / -0 |
| `frontend/tests/e2e/frontend-mvp.spec.ts` | Edited (1 new test) | +55 / -0 |
| `frontend/docs/PRD_WebGIS_Pemetaan_Wilayah.md` | Unchanged | — |
| `frontend/docs/adr/ADR-002-map-architecture.md` | Unchanged (decision masih berlaku: MapContainer generic, tidak coupled ke business logic) | — |

**Net:** ~+155 LOC, mostly additive. Tidak ada file yang dihapus.

## 8. Testing Strategy

### 8.1 E2E (Playwright)

New test di `frontend/tests/e2e/frontend-mvp.spec.ts`:

```ts
test('ZOOM CEPAT rail toggles Sidoarjo boundary visibility', async ({ page }) => {
  await loginAs(page);
  await page.goto('/dashboard');
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible({ timeout: 10000 });

  const getBoundary = () =>
    page.evaluate(() => {
      const el = document.querySelector('[data-map-ready="true"]') as any;
      return el?._simantaGetSidoarjoBoundary?.() ?? null;
    });

  // (1) Initial state — boundary hidden, layers exist
  await expect.poll(getBoundary).toMatchObject({ layerExists: true, visibility: 'none' });

  // (2) Klik "Indonesia" — still hidden
  await page.getByTestId('zoom-level-indonesia').click();
  await expect.poll(getBoundary).toMatchObject({ layerExists: true, visibility: 'none' });

  // (3) Klik "Jawa Timur" — still hidden
  await page.getByTestId('zoom-level-jawa-timur').click();
  await expect.poll(getBoundary).toMatchObject({ layerExists: true, visibility: 'none' });

  // (4) Klik "Kabupaten Sidoarjo" — visible
  await page.getByTestId('zoom-level-sidoarjo').click();
  await expect.poll(getBoundary).toMatchObject({ layerExists: true, visibility: 'visible' });
});
```

### 8.2 Unit (vitest, optional)

Tidak ada unit test baru. Poligon adalah data statis (tidak ada logic); lifecycle MapContainer sudah ter-cover pattern-nya oleh test eksisting (`MapDrawController.test.ts` dan test E2E `frontend-mvp.spec.ts`).

### 8.3 Verifikasi akhir

`cd frontend && npm run verify:mvp` (sama dengan feature sebelumnya: `check` + `test` + `build` + `test:e2e` + `test:a11y`).

Pre-existing failure (unrelated, projects table column index) akan tetap muncul — sudah dikonfirmasi bukan regression dari perubahan ini.

## 9. Out of Scope (Post-MVP)

- Boundary untuk Indonesia / Jawa Timur (mungkin di iterasi berikutnya via prop `activeZoomLevelId` atau hard-coded masing-masing)
- Label nama kabupaten di tengah poligon (MapLibre symbol layer)
- Tooltip dengan area dalam km² saat user hover
- Source data resmi BPS / BIG (saat ini mock ~12 vertex)
- Animasi fade-in/out saat visibility toggle
- Toggle UI terpisah di FloatingPanel

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Poligon hard-coded bisa misleading (bukan data resmi) | Disclose di kode dengan komentar "Approksimasi kasar, bukan data BPS resmi." Doc PRD bisa tambahkan disclaimer di iterasi berikutnya. |
| Boundary menutupi project markers di dalamnya | Fill opacity 12% sangat tipis; project markers di layer `features-circle` (Point) tetap di atas karena layer order: boundary-fill + boundary-line di-add SEBELUM `features-fill`. Verified dengan layer ordering eksisting. |
| Basemap change lupa re-add boundary | Basemap reactive block (eksisting) di-extend untuk panggil `renderSidoarjoBoundary()` di akhir `style.load` callback. Source + layers di-add ulang; `applyBoundaryVisibility()` restore visibility sesuai prop `showSidoarjoBoundary` saat ini. Test E2E tambahan di iterasi berikut bisa assert: ganti basemap, boundary masih visible. |
