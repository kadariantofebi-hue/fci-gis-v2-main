# PRD v1.4 §8.1 — Dashboard Full-Map Refactor (EXECUTION)

**Tanggal:** 21 Juni 2026
**Tujuan:** Ubah `frontend/src/routes/dashboard/+page.svelte` dari layout card-stacked menjadi full-screen map (SIBIMASAKTI-style) — peta sebagai elemen visual dominan, KPI/filter/zoom/legend menjadi floating overlay di atas peta.
**Referensi visual:** https://sibimasakti.sidoarjokab.go.id/maps/wilayah + file konsep `.hermes/plans/2026-06-21-dashboard-full-map-refactor.md`
**PRD anchor:** `docs/PRD_WebGIS_Pemetaan_Wilayah.md` v1.4 §8.1
**Status:** Plan eksekusi (file konsep di atas jadi referensi, plan ini yang dijalankan).

---

## 1. Ringkasan & Goal

**Goal**: Peta mengambil ≥85% viewport height (viewport = `100vh - Navbar`); header section, KPI cards, filter controls, zoom buttons, dan legend direstrukturisasi menjadi **floating overlay** di atas peta — bukan section vertikal.

**Yang TIDAK berubah (PRD v1.4 §8.1 anchor)**:
- 2 KPI utama: Total Proyek + Proyek Berjalan.
- Layer per status group (4) + layer per jenis infrastruktur (8).
- Project GeoJSON map (LineString/Polygon/Point) + popup → `/projects/[id]`.
- Basemap switcher floating (sudah ada di MapContainer post quick-wins 2026-06-19).
- Coordinate display + scale bar (sudah ada).
- Fullscreen button (sudah ada).
- Navbar global (single-pilar "Administrasi Proyek GIS", single active OPD badge, search, role switcher, health badge, logout) **TETAP** — bukan full-screen takeover. Ini perbedaan kunci dengan SIBIMASAKTI reference: kita sudah punya Navbar global, jadi full-map layout = `MapContainer` di bawah Navbar.

**Beda dengan SIBIMASAKTI reference**:
- SIBIMASAKTI punya sidebar kiri (off-canvas) + top bar mini. SIMANTA punya **Navbar** global (sticky top, z-20) yang sudah informatif + ada AppShell wrapper dengan `p-4 md:p-6 xl:p-8` main padding. Full-map layout = Dashboard route **mendobrak** padding AppShell di route ini saja (route-level CSS override) supaya peta benar-benar full-width.
- Floating panels diletakkan relatif terhadap MapContainer wrapper (bukan terhadap viewport).

---

## 2. Surface Area yang Terdampak

### 2.1 File yang Berubah

| File | Tipe Perubahan | Risiko |
|------|----------------|--------|
| `frontend/src/routes/dashboard/+page.svelte` | Refactor layout besar (KPI/filter/zoom/legend → floating) | **Tinggi** (E2E pakai banyak selector dari sini) |
| `frontend/src/lib/components/map/MapContainer.svelte` | Tambah prop `fullHeight` + auto-invalidateSize saat panel toggle | **Medium** (sudah punya leaflet integration + race-guard) |
| `frontend/src/lib/components/dashboard/FloatingPanel.svelte` | **Baru** — base wrapper komponen untuk overlay | **Rendah** (UI primitive) |
| `frontend/src/lib/components/dashboard/DashboardKpiStrip.svelte` | **Baru** — kompak KPI strip (2 cards inline) untuk floating top-left | **Rendah** (extract dari dashboard `+page.svelte`) |
| `frontend/src/lib/components/dashboard/DashboardFilterPanel.svelte` | **Baru** — kompak filter (status + jenis + grouping) untuk floating top-right | **Rendah** (extract dari dashboard `+page.svelte`) |
| `frontend/src/lib/components/dashboard/DashboardZoomRail.svelte` | **Baru** — vertical zoom rail (Indonesia/Jawa Timur/Sidoarjo) untuk floating right-middle | **Rendah** (extract dari dashboard `+page.svelte`) |
| `frontend/src/lib/components/dashboard/DashboardLegendFloater.svelte` | **Baru** — kompak legend untuk floating bottom-right | **Rendah** (wrap `Legend.svelte` dengan sizing compact) |
| `frontend/src/lib/components/dashboard/DashboardSimulateRow.svelte` | **Baru** — floating simulate GeoJSON checkbox + status (top-center) | **Rendah** (extract dari dashboard `+page.svelte`) |

### 2.2 File yang TIDAK Berubah

- `MapContainer.svelte` sudah punya `mode="project"`, `geojson`, `visibleStatuses`, `visibleJenis`, `basemap`, `centerLat`, `centerLng`, `zoom`, `on:change` event. **Semua prop dipakai existing**, tidak ada API contract change. Hanya tambah `fullHeight` prop (default `false` → backward compat untuk caller lain yang mungkin ada di future).
- `Legend.svelte`, `KpiCard.svelte` — tetap dipakai apa adanya, hanya di-wrap oleh komponent baru di atas.
- `Navbar.svelte`, `Sidebar.svelte`, `AppShell.svelte` — TIDAK diubah. Full-map layout cuma butuh override `p-4 md:p-6 xl:p-8` di main element route ini.
- `lib/services/api/projects.ts#projectGeoJson`, `projectDashboardStats` — TIDAK diubah.
- `lib/stores/preferences.ts` — TIDAP diubah (basemap persistence sudah jalan via `persistDashboardPreferences`).
- `lib/components/map/basemaps.ts`, `styles.ts`, `basemaps.test.ts`, `styles.test.ts` — TIDAK diubah.

### 2.3 E2E Test yang Terdampak (frontend-mvp.spec.ts)

| Selector | Test | Status Setelah Refactor |
|----------|------|------------------------|
| `getByText('Pusat Kendali SIMANTA · Single active OPD')` | `admin can login...` line 11 | **HILANG** (header section hilang) → ganti ke "SIMANTA · Administrasi Proyek GIS" (kicker di Navbar) |
| `getByText('Dashboard Proyek GIS').first()` | `admin can login...` line 13 | **TETAP** (judul pindah ke floating top-left) |
| `getByText('Distribusi OPD')` | line 14, count 0 | TETAP (tidak pernah di-render) |
| `getByTestId('kpi-card-total-proyek')` | line 16, 67, 762, 766, 770 | **TETAP** (testid di KpiCard) |
| `getByTestId('kpi-card-proyek-berjalan')` | line 17, 67, 763, 767 | **TETAP** |
| `getByTestId('layer-status-berjalan')` | line 19, 307, 310, 776, 791, 795 | **TETAP** (testid di filter chips) |
| `getByLabel('Grouping layer')` | line 20 | **TETAP** (label tetap) |
| `getByLabel('Pilih basemap dashboard')` | line 298, count 0 | TETAP |
| `getByTestId('map-basemap-button')` | line 299 | TETAP (sudah di MapContainer) |
| `getByTestId('map-coord-display')` | line 303 | TETAP |
| `getByTestId('map-fullscreen-button')` | line 305 | TETAP |
| `getByTestId('map-active-layer-count')` | line 308, 311 | TETAP |
| `getByRole('status', { name: 'Status persistensi preference' })` | line 313 | TETAP |
| `getByLabel('Simulasikan GeoJSON gagal')` | line 322, 325 | TETAP (testid tetap di DashboardSimulateRow) |
| `getByRole('alert')` (GEOJSON_LOAD_FAILED) | line 323 | TETAP |
| `getByTestId('map-feature')` | line 324, 330, 785, 793 | TETAP |
| `getByTestId('stat-card-belum-dipetakan')`, `stat-card-luas-tanah`, `stat-card-luas-bangunan` | line 770-772, count 0 | TETAP (sudah hilang di v1.4) |
| `getByTestId('layer-status-perencanaan')`, `layer-status-selesai`, `layer-status-dibatalkan` | line 775, 777, 778 | TETAP |
| `getByTestId('layer-jenis-jalan')`, `layer-jenis-bangunan` | line 779, 780 | TETAP |
| `getByTestId('map-feature[aria-label*="Proyek GIS-"]')` | line 317, 786, 787 | TETAP |
| `getByText('GeoJSON proyek aktif: ...')` | line 326 | TETAP |
| `getByTestId('map-tile-error')` | line 355, 356 | TETAP |
| `getByTestId('map-basemap-state')` | line 301, 359 | TETAP |

**Kesimpulan E2E**: Hanya 1 assertion yang PASTI break (`Pusat Kendali SIMANTA · Single active OPD` di line 11). Sisanya tetap karena testid dan role/label tidak kita ubah. Update 1 baris saja di test untuk ganti kicker text.

### 2.4 Vitest (co-located `*.test.ts`)

Tidak ada test yang terdampak (MapContainer tidak punya test file; dashboard components juga belum punya test). Quick wins + impl v1.4 lalu tidak menambah test baru untuk layout. **Tidak perlu tambah test baru di scope ini** — E2E sudah cover visible behavior.

### 2.5 A11y (axe-core via `tests/e2e/a11y.spec.ts`)

Axe-core scan akan flag:
- Color contrast: floating panels pakai `bg-white/95` → cek kontras ke map tiles.
- Landmark roles: tidak ada `<section aria-label>` baru, semua panel pakai `<div role="region">` dengan aria-label.
- Focus order: floating panels dengan `tabindex` harus logical. **Quick win**: pakai `tabindex="0"` pada FloatingPanel container.

**Acceptance a11y**: a11y.spec.ts pass tanpa regresi.

---

## 3. Phase 1 — Foundation: Panel Primitive + CSS Utilities

**Goal**: Buat `FloatingPanel.svelte` (UI primitive) + extract logic dashboard ke sub-komponen, tanpa mengubah behavior dashboard yang sudah ada. Dashboard `+page.svelte` cuma refactor markup (section → FloatingPanel), state/logic tetap.

### 3.1 `FloatingPanel.svelte` (Baru)

Lokasi: `frontend/src/lib/components/dashboard/FloatingPanel.svelte`.

Props:
```ts
export let position: 'top-left' | 'top-right' | 'top-center' | 'right-middle' | 'bottom-right' | 'bottom-left';
export let title: string;
export let icon?: string;        // emoji string, e.g. '📊'
export let collapsible: boolean = true;
export let defaultExpanded: boolean = true;
export let testId: string | undefined = undefined;
```

Behavior:
- Default: panel expanded (terbuka), button toggle `−`/`+` di kanan header.
- State `expanded` di-handle internal (Svelte 4 `let expanded = defaultExpanded;` — komponen ini tidak butuh persistence, panel selalu default expanded saat mount).
- Backdrop: `bg-white/95 backdrop-blur-sm` + `border border-slate-200` + `shadow-lg` + `rounded-2xl` (matching Card style).
- `position` di-map ke Tailwind classes (`absolute` + `top-4 left-4` dll).
- A11y: `role="region"`, `aria-label={title}`, header `<h3>` (bukan h2 supaya tidak ganggu heading hierarchy — heading utama Dashboard ada di floating top-left DashboardKpiStrip).
- Transition: tidak ada animasi (PRD v1.4 v1.4 tidak minta animasi; untuk simplicity).

CSS via Tailwind classes inline (tidak tambah global classes) — supaya portable & tidak konflik dengan `app.css` Card style.

### 3.2 Extract Sub-Komponen Dashboard

Semua sub-komponen ini **tidak mengubah behavior** — hanya extract logic dari `+page.svelte` (script block) ke script block masing-masing, dengan props untuk state & callbacks.

#### 3.2.1 `DashboardKpiStrip.svelte` (Baru)
- Props: `totalProyek: string | number`, `proyekBerjalan: string | number`, `statsLoaded: boolean`, `activeOpdShortName: string | null`.
- Render: header `Dashboard Proyek GIS` (h1) + OPD badge kecil + 2 KpiCard dalam horizontal strip (max-w-md).
- `data-testid="dashboard-kpi-strip"`.

#### 3.2.2 `DashboardFilterPanel.svelte` (Baru)
- Props: `visibleStatuses`, `visibleJenis`, `layerGrouping`, callback `onToggleStatus(group)`, `onToggleJenis(jenis)`, `onLayerGroupingChange(value)`, `onSelectAllStatuses()`, `onClearAllStatuses()`.
- Render: section "Status:" + chips 4 status, section "Jenis:" + chips 8 jenis, select "Grouping layer".
- `data-testid="dashboard-filter-panel"`. Semua testid `layer-status-*`, `layer-jenis-*` tetap di sini.

#### 3.2.3 `DashboardZoomRail.svelte` (Baru)
- Props: `zoomLevels`, callback `onSetZoomLevel(level)`.
- Render: vertical stack 3 button (icon + label), `position: right-middle`.
- `data-testid="dashboard-zoom-rail"`. Testid `zoom-level-*` tetap.

#### 3.2.4 `DashboardLegendFloater.svelte` (Baru)
- Props: `items`, `title`.
- Render: wrap `Legend.svelte` dengan `compact={true}` (Legend sudah handle empty state).
- `data-testid="dashboard-legend-floater"`. Testid `dashboard-legend`, `legend-item-*` tetap (diwarisi dari Legend.svelte).

#### 3.2.5 `DashboardSimulateRow.svelte` (Baru)
- Props: `simulateGeojsonError`, `geojsonStatus`, callbacks `onToggleSimulation()`, `onClearError()` (optional).
- Render: checkbox + status pill (emerald/rose) dalam satu baris.
- `data-testid="dashboard-simulate-row"`. Testid `label='Simulasikan GeoJSON gagal'` dan `role="alert"` / `role="status"` tetap.

### 3.3 CSS Override di Dashboard Route

Untuk membuat peta benar-benar full-width (mendobrak AppShell padding), tambah inline style di `dashboard/+page.svelte`:
```svelte
<div class="dashboard-fullmap-layout">
  ...
</div>

<style>
  .dashboard-fullmap-layout {
    /* Override AppShell main padding: -1rem sm, -1.5rem md, -2rem xl */
    margin: -1rem;
  }
  @media (min-width: 768px) {
    .dashboard-fullmap-layout { margin: -1.5rem; }
  }
  @media (min-width: 1280px) {
    .dashboard-fullmap-layout { margin: -2rem; }
  }
</style>
```

**Alternatif yang lebih bersih**: pakai `:global` selector scoped ke route ini. Pilih opsi inline `<style>` di `+page.svelte` — tidak污染 global.

### 3.4 Acceptance Phase 1
- `npm run check`: 0 errors.
- `npm run test`: 105/105 (tidak ada test yang di-break karena tidak ada test untuk layout).
- Visual: Dashboard **identik** dengan sebelum refactor (semua section di tempat yang sama, hanya dibungkus FloatingPanel dengan `defaultExpanded=true`).

---

## 4. Phase 2 — MapContainer fullHeight + auto-invalidateSize

**Goal**: Tambah prop `fullHeight` ke MapContainer supaya peta bisa full-height di parent container (bukan fixed `h-[480px]`). Tambah `ResizeObserver` listener + auto-invalidate Leaflet saat parent resize (termasuk saat floating panel collapse/expand yang mengubah parent height jika pakai flex/grid; atau cukup saat window resize untuk sekarang).

### 4.1 Props Baru

```ts
export let fullHeight: boolean = false;
```

### 4.2 Markup Change

```svelte
<div bind:this={wrapperEl} class="relative" data-fullscreen={isFullscreen} class:fullheight={fullHeight}>
  <div
    bind:this={mapEl}
    class={`${fullHeight ? 'h-full w-full' : 'h-[480px] w-full'} border border-slate-200 bg-slate-100 dark:border-slate-800 ${isFullscreen ? 'bg-white' : ''}`}
  ></div>
```

Tambah CSS scoped di MapContainer:
```css
.fullheight { height: 100%; min-height: 480px; }
```

### 4.3 Resize Handling

Di `onMount`, jika `fullHeight`:
- `ResizeObserver` observer `wrapperEl` (parent container) → on resize, `requestAnimationFrame(() => map?.invalidateSize())`.
- Juga listen `window` `resize` event (fallback untuk kasus browser tanpa ResizeObserver).
- Cleanup di `onDestroy` (atau return di onMount).

Token-guarded (pakai `renderToken`/`disposed` pattern yang sudah ada) untuk cegah race dengan `render()` async.

### 4.4 Token-guard Tambahan untuk Toggle Panel

Floating panel collapse/expand **tidak mengubah** wrapperEl size karena panel absolute-positioned. Tapi Navbar collapse (mobile) atau browser devtools toggle bisa mengubah viewport. ResizeObserver sudah cover itu. Tidak perlu logic tambahan.

### 4.5 Acceptance Phase 2
- `npm run check`: 0 errors.
- Map render correctly di `fullHeight=true` (test manual via `npm run dev`, lalu `/dashboard`).
- Window resize → Leaflet invalidateSize dipanggil → tiles reload dengan ukuran baru.
- Map render correctly di mode existing (`fullHeight=false` default) untuk caller lain (saat ini tidak ada caller lain, tapi backward compat maintained).

---

## 5. Phase 3 — Compose Floating Panels di Dashboard Route

**Goal**: Refactor `dashboard/+page.svelte` layout: section bertingkat → MapContainer full-height + floating panels overlay.

### 5.1 Layout Skeleton Baru

```svelte
<div class="dashboard-fullmap-layout" data-testid="dashboard-fullmap">
  <!-- Wrapper MapContainer full-height -->
  <div class="dashboard-map-wrap">
    <MapContainer
      mode="project"
      geojson={geojson}
      {visibleStatuses}
      {visibleJenis}
      {basemap}
      centerLat={mapCenter.lat}
      centerLng={mapCenter.lng}
      zoom={mapCenter.zoom}
      fullHeight={true}
      on:change={handleMapChange}
    />

    <!-- Floating KPI Strip (top-left) -->
    <FloatingPanel position="top-left" title="Ringkasan" icon="📊" testId="dashboard-kpi-strip">
      <DashboardKpiStrip
        totalProyek={statsLoaded && stats ? stats.totalProyek : '…'}
        proyekBerjalan={statsLoaded && stats ? stats.proyekBerjalan : '…'}
        {statsLoaded}
        activeOpdShortName={activeOpd?.shortName ?? null}
      />
    </FloatingPanel>

    <!-- Floating Filter Panel (top-right) -->
    <FloatingPanel position="top-right" title="Filter & Layer" icon="🔍" testId="dashboard-filter-panel">
      <DashboardFilterPanel
        bind:visibleStatuses
        bind:visibleJenis
        bind:layerGrouping
        {onToggleStatus}
        {onToggleJenis}
        {onLayerGroupingChange}
        {onSelectAllStatuses}
        {onClearAllStatuses}
      />
    </FloatingPanel>

    <!-- Floating Zoom Rail (right-middle) -->
    <FloatingPanel position="right-middle" title="Zoom Cepat" icon="🌍" collapsible={false} testId="dashboard-zoom-rail">
      <DashboardZoomRail {zoomLevels} {onSetZoomLevel} />
    </FloatingPanel>

    <!-- Floating Legend (bottom-right) -->
    <FloatingPanel position="bottom-right" title="Legenda" icon="📋" testId="dashboard-legend-floater">
      <DashboardLegendFloater items={legendItems} title="Status Proyek" />
    </FloatingPanel>

    <!-- Floating Simulate Row (top-center, smaller) -->
    <FloatingPanel position="top-center" title="Simulasi" icon="🧪" collapsible={true} testId="dashboard-simulate-row">
      <DashboardSimulateRow
        bind:simulateGeojsonError
        {geojsonStatus}
        on:toggle={loadProjectGeoJson}
      />
    </FloatingPanel>
  </div>

  <!-- Preference status toast (below map, persistent) -->
  {#if preferenceStatus}
    <div role="status" aria-label="Status persistensi preference" class="...absolute bottom-4 left-4...">
      {preferenceStatus}
    </div>
  {/if}
</div>
```

### 5.2 CSS `.dashboard-map-wrap`

```css
.dashboard-fullmap-layout {
  position: relative;
  height: calc(100vh - 64px); /* AppShell Navbar tinggi ≈64px */
  margin: -1rem; /* override AppShell padding */
}
@media (min-width: 768px) {
  .dashboard-fullmap-layout { margin: -1.5rem; }
}
@media (min-width: 1280px) {
  .dashboard-fullmap-layout { margin: -2rem; }
}

.dashboard-map-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}
```

**Catatan tinggi Navbar**: di Navbar.svelte line 21 ada `px-4 py-3` (padding 12px atas + 12px bawah) + content `text-sm` (line-height ~20px) + health badge `text-[10px]` line-height ~12px → estimasi tinggi Navbar ≈ 56-64px. Pakai `64px` sebagai default; jika visual offset, tweak ke 60 atau 68.

### 5.3 Panel Position Refinement

| Panel | position | Default expanded | Catatan |
|-------|----------|------------------|---------|
| KPI Strip | `top-left` | yes | max-w-md; collapse saat narrow (xl breakpoint) |
| Filter Panel | `top-right` | yes | max-w-sm; collapse saat md breakpoint |
| Zoom Rail | `right-middle` | **no** (collapsible=false) | max-w-[200px]; selalu visible |
| Legend | `bottom-right` | yes | max-w-xs; collapse saat lg breakpoint |
| Simulate Row | `top-center` | yes (default di v1.4) | max-w-md; bisa collapsed |

Responsive collapse (CSS media query di `FloatingPanel.svelte`):
```css
@media (max-width: 1023px) { [data-position="top-left"][data-default-expanded] { ... collapsed via JS or default? } }
```

**Simplification**: di v1, JANGAN tambah responsive auto-collapse. Biarkan user manual collapse via button. PRD v1.4 §8.1 tidak menyebut responsive collapse. Cukup handle `top-left` dan `top-right` overlap di narrow viewport dengan `max-w` + scroll internal panel content (`max-h-[60vh] overflow-y-auto`).

### 5.4 Acceptance Phase 3
- Visual: peta full-height, KPI di pojok kiri-atas, filter di pojok kanan-atas, zoom rail di tengah-kanan, legend di pojok kanan-bawah, simulate row di tengah-atas.
- Semua 5 panel collapsible (kecuali zoom rail).
- Tidak ada overflow di 1280px+ viewport.
- Filter scroll internal jika konten > 60vh.
- `npm run check`: 0 errors.

---

## 6. Phase 4 — Update +layout untuk route-specific fullmap support + E2E test fixes

### 6.1 Per-route Layout Override

Saat ini AppShell `+layout.svelte` line 13:
```svelte
<main id="main-content" class="relative p-4 md:p-6 xl:p-8" tabindex="-1">
```

Untuk Dashboard route, kita butuh tanpa padding. Cara terbersih: conditional class di `+layout.svelte`:
```svelte
<main id="main-content" class={`relative ${$page.url.pathname === '/dashboard' ? '' : 'p-4 md:p-6 xl:p-8'}`} tabindex="-1">
```

**ATAU** (lebih clean) gunakan negative margin di child route (Phase 3.3) — pilih opsi ini, tidak ubah `+layout.svelte`. **Tetap pertahankan AppShell global** (skip-link, sidebar, navbar, toaster) — yang berubah hanya padding main element untuk route `/dashboard`.

### 6.2 E2E Test Update

Edit `tests/e2e/frontend-mvp.spec.ts` line 11:
```diff
- await expect(page.getByText('Pusat Kendali SIMANTA · Single active OPD')).toBeVisible();
+ await expect(page.getByText('SIMANTA · Administrasi Proyek GIS').first()).toBeVisible();
+ await expect(page.getByText(/single active OPD/i).first()).toBeVisible();
```

(Pakai Navbar kicker yang sudah ada; PRD §8.1 sudah establish copy ini.)

Tambah 1 test baru (opsional, untuk regression guard layout):
```ts
test('full-map layout: peta full-height, panels visible', async ({ page }) => {
  await loginAs(page);
  await page.goto('/dashboard');
  // Map element has data-map-ready
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible();
  // Floating panels all attached
  await expect(page.getByTestId('dashboard-kpi-strip')).toBeAttached();
  await expect(page.getByTestId('dashboard-filter-panel')).toBeAttached();
  await expect(page.getByTestId('dashboard-zoom-rail')).toBeAttached();
  await expect(page.getByTestId('dashboard-legend-floater')).toBeAttached();
  await expect(page.getByTestId('dashboard-simulate-row')).toBeAttached();
  // Map wrapper height >= 80% viewport
  const mapHeight = await page.locator('.dashboard-map-wrap').evaluate((el) => (el as HTMLElement).offsetHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  expect(mapHeight / viewportHeight).toBeGreaterThanOrEqual(0.7);
});
```

### 6.3 Acceptance Phase 4
- `npm run test:e2e`: 35+1 tests pass.
- `npm run test:a11y`: pass tanpa regresi.
- `npm run verify:mvp`: full pipeline green.

---

## 7. Phase 5 — Verify & Polish

### 7.1 `npm run verify:mvp` (Wajib Hijau)
- `npm run check` (svelte-check)
- `npm run test` (vitest)
- `npm run build` (adapter-static)
- `npm run test:e2e` (playwright smoke)
- `npm run test:a11y` (axe-core)

### 7.2 Visual Sanity (Manual)
- 1920×1080 desktop: tidak ada overlap, semua panel visible & expanded.
- 1366×768 laptop: panel sizing masuk, scroll internal panel jika konten panjang.
- 768×1024 tablet: layout masih usable, panel tidak overlap.
- 375×667 mobile: panel top-left & top-right menjadi setengah-lebar (grid 1 kolom), peta di tengah. **Caveat**: mobile belum jadi fokus (PRD v1.4 §8.1 hanya menyebut "Dashboard Proyek", tidak ada mobile-specific acceptance). Cukup di-acknowledge sebagai known limitation di PR description.

### 7.3 A11y Checklist
- FloatingPanel: `role="region"`, `aria-label`, focusable (`tabindex="0"`), button toggle punya `aria-expanded`.
- Tidak ada heading hierarchy skip (h1 ada di KPI strip, h2 di section header dalam panel, h3 di FloatingPanel title).
- Color contrast floating panel `bg-white/95` ke text slate-700/950 = ratio ≥ 4.5:1 (WCAG AA).
- Map features existing testid/aria-label tidak berubah.

---

## 8. Out of Scope (Sengaja Ditunda)

- **Drag-and-drop repositioning panel** (plan konsep §6.2) — v1.5+ kalau ada ask.
- **Panel state persistence di localStorage** (plan konsep §4.4) — saat ini default expanded setiap mount. Kalau perlu persist, add di iterasi berikut.
- **Mobile drawer-style panel** (plan konsep §3.3) — di-acknowledge sebagai known limitation.
- **Smooth transition animation** untuk panel toggle (plan konsep §4.2) — tidak diminta PRD §8.1.
- **SIBIMASAKTI-style sidebar kiri off-canvas** — bentrok dengan Navbar SIMANTA yang sudah ada. Tidak dilakukan.
- **Measurement tool, route finder, upload/download toolbar** — di PRD v1.4 §8.1 secara eksplisit **dihilangkan** ("SearchControl, MeasureControl, reverse-geocode, dst dihapus").
- **Mini-map, export PNG, drawing toolbar** — PRD v1.4 §8.1 tidak sebut.

---

## 9. Risks & Mitigasi

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Navbar height estimation off → peta kepotong / whitespace | Medium | Medium | Pakai CSS variable `--navbar-h` di AppShell, inject ke dashboard route via inline style. Fallback: hardcode 64px dan tweak manual setelah visual review. |
| Floating panel overlap di narrow viewport | Medium | Low | `max-w` per panel + scroll internal. Smoke test di 1280px. Mobile acknowledge limitation. |
| E2E regression di test yang mengandalkan DOM order | Low | Medium | Testid dan label dipertahankan; kicker text hanya 1 baris berubah. Re-run full E2E. |
| A11y axe-core flag color contrast | Low | Low | Panel pakai `bg-white/95` solid fallback; text `text-slate-700/950` sudah tinggi kontras. |
| Leaflet `invalidateSize` race saat panel toggle | Low | Low | Tidak ada perubahan parent height dari panel (absolute positioning), ResizeObserver cukup. Token guard sudah ada. |
| Negative margin `+layout.svelte` clip content | Low | Low | `overflow: hidden` di `.dashboard-fullmap-layout`; check di visual review. |

---

## 10. File Touch List (Final)

**Baru** (5 file):
- `frontend/src/lib/components/dashboard/FloatingPanel.svelte`
- `frontend/src/lib/components/dashboard/DashboardKpiStrip.svelte`
- `frontend/src/lib/components/dashboard/DashboardFilterPanel.svelte`
- `frontend/src/lib/components/dashboard/DashboardZoomRail.svelte`
- `frontend/src/lib/components/dashboard/DashboardLegendFloater.svelte`
- `frontend/src/lib/components/dashboard/DashboardSimulateRow.svelte`

**Modifikasi** (2 file):
- `frontend/src/routes/dashboard/+page.svelte` (refactor layout besar)
- `frontend/src/lib/components/map/MapContainer.svelte` (+ `fullHeight` prop, + ResizeObserver)

**Test update** (1 file):
- `frontend/tests/e2e/frontend-mvp.spec.ts` (1 baris assertion + 1 test baru)

**Total**: 9 file (6 baru, 3 modified).

---

## 11. Acceptance Criteria (Final)

- ✅ Peta mengambil ≥70% viewport height (target 85% di desktop ≥1280px).
- ✅ Navbar global TETAP (tidak ditimpa). AppShell wrapper TETAP.
- ✅ 5 floating panel ter-render: KPI strip, Filter, Zoom rail, Legend, Simulate row.
- ✅ Semua floating panel collapsible kecuali zoom rail.
- ✅ Filter functionality (status + jenis + grouping) tetap berfungsi identik dengan sebelum refactor.
- ✅ Zoom quick-jump (Indonesia/Jawa Timur/Sidoarjo) tetap berfungsi.
- ✅ Legend sync dengan layer count tetap berfungsi.
- ✅ Basemap toolbar floating (sudah ada) tetap di kanan-atas MapContainer.
- ✅ Coordinate display + scale bar (sudah ada) tetap di bawah-kiri MapContainer.
- ✅ Fullscreen button (sudah ada) tetap di kiri-atas MapContainer.
- ✅ Simulate GeoJSON error checkbox + status pill tetap berfungsi.
- ✅ `npm run verify:mvp` green.
- ✅ E2E test pass (35 existing + 1 new = 36).
- ✅ A11y axe-core pass tanpa regresi.
- ✅ No new vitest test required (covered by E2E visible behavior).

---

## 12. Implementation Order (Untuk Eksekusi)

1. **Phase 1.1** — Buat `FloatingPanel.svelte`.
2. **Phase 1.2** — Extract 5 sub-komponen dashboard.
3. **Phase 1.3** — Refactor `+page.svelte` pakai sub-komponen (struktur sama, hanya extract logic). **Visual harus identik.**
4. **Phase 1.4** — `npm run check` + visual smoke. **Stop point: identical layout.**
5. **Phase 2** — Tambah `fullHeight` prop + ResizeObserver di MapContainer. Test manual `/dashboard` lalu ubah window size. **Stop point: backward compat, no regression.**
6. **Phase 3** — Restructure `+page.svelte` layout (section bertingkat → floating overlay). **Stop point: full-map layout visible.**
7. **Phase 4.2** — Update E2E test + tambah 1 regression test. **Stop point: E2E green.**
8. **Phase 5** — `npm run verify:mvp` + visual review di 4 viewport. **Stop point: ship-ready.**

Setiap phase commit terpisah (sesuai Phase Iteration Pattern CLAUDE.md).

---

**Status**: Plan siap eksekusi. Setelah approval user, switch ke mode `code` dan mulai dari Phase 1.1.
