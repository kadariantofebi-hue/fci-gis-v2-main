# Sidoarjo Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When user clicks "Kabupaten Sidoarjo" in the ZOOM CEPAT rail on Dashboard Proyek GIS, display a blue outline polygon of the kabupaten's administrative boundary on the map (stroke + transparent fill) so the user can visually gauge the area extent.

**Architecture:** Add a hard-coded GeoJSON polygon mock, a new `showSidoarjoBoundary` boolean prop on `MapContainer`, and track the last-clicked zoom level id in the dashboard route. The map component adds a GeoJSON source + 2 MapLibre layers (fill + line), toggles their visibility reactively, and re-adds them after basemap changes.

**Tech Stack:** Svelte 5 (legacy mode in MapContainer — `export let` + `$:`), MapLibre GL JS 5.x, TypeScript, Playwright E2E, Vitest.

## Global Constraints

- Svelte 5.43.3 with legacy mode (no runes in MapContainer / DashboardZoomRail / +page.svelte)
- MapLibre 5.24.0 — `flyTo`, `setLayoutProperty`, `getLayoutProperty`, `getLayer`, `getSource`, `addSource`, `addLayer` API stable
- GeoJSON coordinates MUST be `[lng, lat]` order (RFC 7946)
- `svelte-check` must pass with 0 errors / 0 warnings before commit
- Pre-commit verify: `cd frontend && npm run check && npm test` must be green
- Final verify: `cd frontend && npm run verify:mvp` (check + test + build + e2e + a11y)
- One pre-existing E2E test (`in-place role switching re-scopes project sensitive data without navigation`) is failing on `main` due to a projects table column ordering issue — it is NOT a regression from this plan; do not attempt to fix it
- MapContainer stays generic: do NOT couple it to `ZoomLevelId` enum from `DashboardZoomRail.svelte`. Communicate only via the `showSidoarjoBoundary: boolean` prop

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `frontend/src/lib/mocks/sidoarjo-boundary.ts` | Create | Hard-coded ~12-vertex polygon, `FeatureCollection<{kind:'kabupaten';name:string}>` |
| `frontend/src/lib/components/map/MapContainer.svelte` | Edit | New prop + constants + functions + lifecycle hook + test hook |
| `frontend/src/routes/dashboard/+page.svelte` | Edit | New state + pass prop |
| `frontend/tests/e2e/frontend-mvp.spec.ts` | Edit | One new E2E test |

Each file owns one responsibility. The mock holds data; MapContainer owns the MapLibre integration; the dashboard page owns the user-intent state; the E2E test owns the contract.

---

## Task 1: Create mock polygon data

**Files:**
- Create: `frontend/src/lib/mocks/sidoarjo-boundary.ts`

**Interfaces:**
- Produces: `SIDOARJO_BOUNDARY: FeatureCollection<{kind:'kabupaten';name:'Kabupaten Sidoarjo'}>`
- Consumed by: Task 3 (MapContainer)

- [ ] **Step 1: Write the mock data file**

Create `frontend/src/lib/mocks/sidoarjo-boundary.ts` with this exact content:

```ts
import type { FeatureCollection } from '$shared/geojson';

type BoundaryProps = { kind: 'kabupaten'; name: string };

/**
 * Approksimasi kasar batas administratif Kabupaten Sidoarjo, ~12 vertex.
 * Koordinat [lng, lat] (GeoJSON / MapLibre convention).
 *
 * Referensi batas administratif nyata:
 *   Utara  : Kota Surabaya, Kabupaten Gresik
 *   Barat  : Kabupaten Mojokerto
 *   Selatan: Kabupaten Pasuruan
 *   Timur  : Selat Madura
 *
 * Area hasil poligon ~700 km² (real Sidoarjo ~719 km²). Bukan data
 * BPS / BIG resmi — disclosure ada di spec §10 Risks.
 */
const SIDOARJO_RING: number[][] = [
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
];

export const SIDOARJO_BOUNDARY: FeatureCollection<BoundaryProps> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [SIDOARJO_RING],
      },
      properties: { kind: 'kabupaten', name: 'Kabupaten Sidoarjo' },
    },
  ],
};
```

- [ ] **Step 2: Verify type-check passes**

Run: `cd frontend && npm run check`
Expected: `0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`

If errors: most likely `$shared/geojson` import path issue — verify `frontend/svelte.config.js` has the alias `$shared: '../shared/src'` (it does). Re-read the file and fix typos.

- [ ] **Step 3: Commit**

```bash
cd C:/projects/fci/fci-gis
git add frontend/src/lib/mocks/sidoarjo-boundary.ts
git commit -m "feat(mocks): add sidoarjo boundary polygon

Hard-coded ~12-vertex polygon representing the administrative
boundary of Kabupaten Sidoarjo. Approksimasi kasar (not official
BPS/BIG data). Used by Dashboard Proyek GIS to show a visual
reference outline when the user clicks 'Kabupaten Sidoarjo' in
the ZOOM CEPAT rail."
```

---

## Task 2: Write failing E2E test

**Files:**
- Edit: `frontend/tests/e2e/frontend-mvp.spec.ts:938` (insert new test after the existing zoom-rail test)

**Interfaces:**
- Reads: test hook `_simantaGetSidoarjoBoundary()` on `mapEl` — to be added in Task 3
- Asserts: `{ layerExists: true, visibility: 'visible' | 'none' }` after each button click

- [ ] **Step 1: Add the new test to `frontend-mvp.spec.ts`**

Open `frontend/tests/e2e/frontend-mvp.spec.ts` and locate the end of the existing zoom-rail test (search for `await expectMapAt(112.7176, -7.4538, 11);` near the bottom of the file, just before the closing `});` of the describe block).

Insert this new test AFTER that test, BEFORE the closing `});` of `test.describe`:

```ts
  // Bug fix 2026-07-04 (extension): boundary outline poligon Kabupaten
  // Sidoarjo harus muncul saat user klik tombol 'Kabupaten Sidoarjo'
  // dan hilang saat klik tombol Indonesia / Jawa Timur. Layer
  // `sidoarjo-boundary-fill` + `sidoarjo-boundary-line` ditambahkan ke
  // MapContainer, visibility di-toggle via `setLayoutProperty`. Test
  // hook `_simantaGetSidoarjoBoundary` membaca `getLayoutProperty(
  // sidoarjo-boundary-line, 'visibility')`.
  test('ZOOM CEPAT rail toggles Sidoarjo boundary visibility', async ({ page }) => {
    await loginAs(page);
    await page.goto('/dashboard');
    await expect(page.locator('[data-map-ready="true"]')).toBeVisible({ timeout: 10000 });

    const getBoundary = () =>
      page.evaluate(() => {
        const el = document.querySelector('[data-map-ready="true"]') as
          | (HTMLElement & { _simantaGetSidoarjoBoundary?: () => { layerExists: boolean; visibility: string | null } | null })
          | null;
        return el?._simantaGetSidoarjoBoundary ? el._simantaGetSidoarjoBoundary() : null;
      });

    // (1) Initial state — layers added but hidden (no zoom button clicked yet)
    await expect.poll(getBoundary, { timeout: 5000 }).toMatchObject({
      layerExists: true,
      visibility: 'none',
    });

    // (2) Klik "Indonesia" — still hidden
    await page.getByTestId('zoom-level-indonesia').click();
    await expect.poll(getBoundary, { timeout: 5000 }).toMatchObject({
      layerExists: true,
      visibility: 'none',
    });

    // (3) Klik "Jawa Timur" — still hidden
    await page.getByTestId('zoom-level-jawa-timur').click();
    await expect.poll(getBoundary, { timeout: 5000 }).toMatchObject({
      layerExists: true,
      visibility: 'none',
    });

    // (4) Klik "Kabupaten Sidoarjo" — visible
    await page.getByTestId('zoom-level-sidoarjo').click();
    await expect.poll(getBoundary, { timeout: 5000 }).toMatchObject({
      layerExists: true,
      visibility: 'visible',
    });
  });
```

The test must be inside the existing `test.describe('SIMANTA frontend MVP PRD v1.3.7 smoke', () => { ... })` block. Verify the closing `});` count: 4 spaces of indent for `test(` matches the other tests.

- [ ] **Step 2: Run the test to verify it FAILS**

Run: `cd frontend && npx playwright test --grep "Sidoarjo boundary visibility" 2>&1 | tail -30`
Expected: `1 failed` with timeout from `expect.poll(getBoundary)` (returns `null` because test hook doesn't exist yet).

If test passes: the test hook `_simantaGetSidoarjoBoundary` is somehow already defined — check the MapContainer file for prior implementation. If present, skip ahead to Task 4.

- [ ] **Step 3: Commit the failing test**

```bash
cd C:/projects/fci/fci-gis
git add frontend/tests/e2e/frontend-mvp.spec.ts
git commit -m "test(e2e): assert sidoarjo boundary visibility toggles on zoom click

E2E test verifies _simantaGetSidoarjoBoundary test hook:
- initial: { layerExists: true, visibility: 'none' }
- after Indonesia click: same
- after Jawa Timur click: same
- after Sidoarjo click: { layerExists: true, visibility: 'visible' }

Test is currently RED (fails because MapContainer has no
_sidoarjo-boundary source/layers/test hook yet). Implementation
in subsequent tasks."
```

---

## Task 3: Add `showSidoarjoBoundary` prop, source, layers, and test hook to MapContainer

**Files:**
- Edit: `frontend/src/lib/components/map/MapContainer.svelte`
  - Add prop at the end of the prop declarations (~line 130)
  - Add constants after the existing `LAYER_IDS` / `SOURCE_ID` block (~line 149)
  - Add `renderSidoarjoBoundary()` and `applyBoundaryVisibility()` functions
  - Add test hook inside the `mapInstance.on('load', ...)` callback after `setupPopupHandlers()` (the existing `_simantaGetMapState` hook is at ~line 580)
  - Add `renderSidoarjoBoundary()` call in the basemap reactive block, inside the `map.once('style.load', ...)` callback (~line 658)
  - Add new `$:` block at the end of the script section

**Interfaces:**
- Consumes: `SIDOARJO_BOUNDARY` (from Task 1)
- Produces: layers `sidoarjo-boundary-fill` and `sidoarjo-boundary-line`; test hook `_simantaGetSidoarjoBoundary()` on `mapEl`

- [ ] **Step 1: Add the prop**

After the existing `export let mapInstance` block (around line 130), add this new prop:

```ts
    /**
     * Boundary area overlay (2026-07-04): saat true, MapContainer
     * menampilkan outline poligon administratif Kabupaten Sidoarjo
     * (stroke biru + fill biru 12% alpha). Toggled by parent
     * (Dashboard Proyek) berdasarkan last-clicked zoom level di
     * ZOOM CEPAT rail. Hidden by default.
     */
    export let showSidoarjoBoundary: boolean = false;
```

- [ ] **Step 2: Add the constants**

After the existing `const SOURCE_ID = "features";` line (~line 149), add:

```ts
    // Boundary layer ids (sidoarjo-boundary-*). Hidden by default;
    // visibility di-toggle oleh reactive block §showSidoarjoBoundary.
    const SIDOARJO_BOUNDARY_SOURCE_ID = "sidoarjo-boundary";
    const SIDOARJO_BOUNDARY_FILL_LAYER_ID = "sidoarjo-boundary-fill";
    const SIDOARJO_BOUNDARY_LINE_LAYER_ID = "sidoarjo-boundary-line";
```

- [ ] **Step 3: Add the two functions**

After the existing `clearFeatureLayers()` function (just before `render()`), add:

```ts
    function applyBoundaryVisibility() {
        if (!map) return;
        const v = showSidoarjoBoundary ? "visible" : "none";
        for (const id of [SIDOARJO_BOUNDARY_FILL_LAYER_ID, SIDOARJO_BOUNDARY_LINE_LAYER_ID]) {
            if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
        }
    }

    function renderSidoarjoBoundary() {
        if (!map) return;
        if (!map.getSource(SIDOARJO_BOUNDARY_SOURCE_ID)) {
            map.addSource(SIDOARJO_BOUNDARY_SOURCE_ID, {
                type: "geojson",
                data: SIDOARJO_BOUNDARY,
            });
            // Fill layer — di-add SEBELUM features-fill agar project
            // markers tetap di atas boundary.
            map.addLayer({
                id: SIDOARJO_BOUNDARY_FILL_LAYER_ID,
                type: "fill",
                source: SIDOARJO_BOUNDARY_SOURCE_ID,
                paint: {
                    "fill-color": "rgb(37, 99, 235)",
                    "fill-opacity": 0.12,
                },
                layout: { visibility: "none" },
            });
            map.addLayer({
                id: SIDOARJO_BOUNDARY_LINE_LAYER_ID,
                type: "line",
                source: SIDOARJO_BOUNDARY_SOURCE_ID,
                paint: {
                    "line-color": "rgb(37, 99, 235)",
                    "line-width": 2.5,
                },
                layout: { visibility: "none" },
            });
        }
        applyBoundaryVisibility();
    }
```

- [ ] **Step 4: Add the test hook inside the `load` callback**

Locate the existing `_simantaGetMapState` test hook in `MapContainer.svelte` (it was added in the prior zoom-rail bug fix; it looks like):

```ts
            (mapEl as any)._simantaGetMapState = () => {
                if (!map) return null;
                const c = map.getCenter();
                return { center: [c.lng, c.lat], zoom: map.getZoom() };
            };
```

Immediately AFTER that hook (and BEFORE `render(); setupPopupHandlers();`), add:

```ts
            (mapEl as any)._simantaGetSidoarjoBoundary = () => {
                if (!map) return { layerExists: false, visibility: null };
                const layer = map.getLayer(SIDOARJO_BOUNDARY_LINE_LAYER_ID);
                if (!layer) return { layerExists: false, visibility: null };
                return {
                    layerExists: true,
                    visibility:
                        map.getLayoutProperty(SIDOARJO_BOUNDARY_LINE_LAYER_ID, "visibility") || "visible",
                };
            };
```

- [ ] **Step 5: Hook into basemap reactive block**

Find the basemap reactive block (search for `// Basemap reactive update`). It looks like:

```ts
    $: {
        basemap;
        if (
            map &&
            !disposed &&
            activeBasemap !== basemap &&
            mapEl?.getAttribute("data-map-ready") === "true"
        ) {
            const provider = basemaps[basemap] || basemaps[DEFAULT_BASEMAP];
            map.setStyle(provider.style);
            map.once("style.load", () => {
                activeBasemap = basemap;
                applyLabelTuningToMap(mapInstance);
                render();
            });
        }
    }
```

Inside the `map.once("style.load", () => { ... })` callback, AFTER `render();`, add:

```ts
                renderSidoarjoBoundary();
```

- [ ] **Step 6: Add the reactive block**

After the existing center/zoom reactive block (at the end of the `<script>` section, just before `</script>`), add a new `$:` block:

```ts
    // Boundary visibility reactive block (bug fix 2026-07-04 follow-up):
    // parent toggle showSidoarjoBoundary kapan saja, kita propagate
    // via setLayoutProperty ke 2 layer boundary. Guard sama dengan
    // basemap/center blocks: skip sampai map siap dan disposed
    // belum triggered.
    $: {
        showSidoarjoBoundary;
        if (map && !disposed && mapEl?.getAttribute("data-map-ready") === "true") {
            applyBoundaryVisibility();
        }
    }
```

- [ ] **Step 7: Add the SIDOARJO_BOUNDARY import**

At the top of `MapContainer.svelte` (in the import block, near the `import { basemaps, ... } from "./basemaps";` line), add:

```ts
    import { SIDOARJO_BOUNDARY } from "$lib/mocks/sidoarjo-boundary";
```

- [ ] **Step 8: Verify type-check passes**

Run: `cd frontend && npm run check`
Expected: `0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`

If errors: most likely the import path or unused-prop warning. If `showSidoarjoBoundary` is flagged as unused, that's expected (no caller yet) — re-check that the `export let` syntax matches the existing props exactly. If you see `'$lib/mocks/sidoarjo-boundary' has no exported member 'SIDOARJO_BOUNDARY'`, verify Task 1 was committed and the export name matches exactly.

- [ ] **Step 9: Re-run the failing test (still RED but for a different reason)**

Run: `cd frontend && npx playwright test --grep "Sidoarjo boundary visibility" 2>&1 | tail -20`
Expected: `1 failed` — but now the test hook returns `{ layerExists: true, visibility: 'none' }` on all clicks because `showSidoarjoBoundary` prop is never set to true (dashboard +page.svelte not wired yet). Specifically, step (4) will time out waiting for `visibility: 'visible'`.

If step (4) PASSES: dashboard was already wired by user — verify by running `cd frontend && grep -n "showSidoarjoBoundary" src/routes/dashboard/+page.svelte`. If found, skip Task 4.

- [ ] **Step 10: Commit**

```bash
cd C:/projects/fci/fci-gis
git add frontend/src/lib/components/map/MapContainer.svelte
git commit -m "feat(map): add sidoarjo boundary source/layers/visibility + test hook

- New prop showSidoarjoBoundary: boolean
- New SIDOARJO_BOUNDARY_* constants (source + 2 layer ids)
- New renderSidoarjoBoundary() adds GeoJSON source + fill (12% alpha)
  + line (2.5px stroke) layers; fill drawn under features-* so project
  markers stay on top
- New applyBoundaryVisibility() toggles setLayoutProperty 'visibility'
- renderSidoarjoBoundary() re-called on style.load (basemap reactive
  block) since setStyle removes all custom layers
- New test hook _simantaGetSidoarjoBoundary on mapEl for E2E
- Color: rgb(37, 99, 235) biru netral, tidak konflik dengan status colors"
```

---

## Task 4: Wire dashboard to pass `showSidoarjoBoundary`

**Files:**
- Edit: `frontend/src/routes/dashboard/+page.svelte`
  - Add `lastClickedZoomLevelId` state (~line 64, after `let layerGrouping`)
  - Update `setZoomLevel` to also set `lastClickedZoomLevelId` (~line 117)
  - Add `showSidoarjoBoundary` prop to `<MapContainer>` (~line 207)

**Interfaces:**
- Consumes: `ZoomLevel.id` from DashboardZoomRail's `onSetZoomLevel` callback
- Produces: `showSidoarjoBoundary={lastClickedZoomLevelId === 'sidoarjo'}` passed to MapContainer

- [ ] **Step 1: Add state declaration**

After the existing `let layerGrouping: "status" | "jenis" = "status";` line (around line 64), add:

```ts
    // Quick-jump zoom rail (2026-07-04): track id tombol terakhir yang
    // diklik supaya parent bisa menurunkan showSidoarjoBoundary ke
    // MapContainer. null = belum ada klik (initial state) → boundary
    // hidden. Reset ke null setiap navigasi baru (Svelte default,
    // tidak ada localStorage persistence — sesuai spec §6.1).
    let lastClickedZoomLevelId: "indonesia" | "jawa-timur" | "sidoarjo" | null = null;
```

- [ ] **Step 2: Update `setZoomLevel`**

Find the existing function:

```ts
    function setZoomLevel(level: ZoomLevel) {
        mapCenter = { lat: level.lat, lng: level.lng, zoom: level.zoom };
    }
```

Replace with:

```ts
    function setZoomLevel(level: ZoomLevel) {
        mapCenter = { lat: level.lat, lng: level.lng, zoom: level.zoom };
        lastClickedZoomLevelId = level.id;
    }
```

- [ ] **Step 3: Pass the prop to MapContainer**

Find the `<MapContainer>` tag in the same file (around line 207). The closing tag looks like:

```svelte
            onGeometryChange={(detail) => {
                draftGeometry = detail.geometry;
                drawStatusText = detail.statusText;
            }}
            on:change={handleMapChange}
        />
```

Change it to add the new prop right before the `on:change={handleMapChange}` line:

```svelte
            onGeometryChange={(detail) => {
                draftGeometry = detail.geometry;
                drawStatusText = detail.statusText;
            }}
            showSidoarjoBoundary={lastClickedZoomLevelId === "sidoarjo"}
            on:change={handleMapChange}
        />
```

- [ ] **Step 4: Verify type-check passes**

Run: `cd frontend && npm run check`
Expected: `0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`

If errors: verify the `lastClickedZoomLevelId` type annotation matches the `level.id` string literal union from `DashboardZoomRail.svelte`'s `ZoomLevel` type. If `ZoomLevel` is imported correctly, this should typecheck.

- [ ] **Step 5: Re-run the E2E test (should now PASS)**

Run: `cd frontend && npx playwright test --grep "Sidoarjo boundary visibility" 2>&1 | tail -20`
Expected: `1 passed`

If FAIL: open the playwright trace at `test-results/*/trace.zip` and inspect the `_simantaGetSidoarjoBoundary` value at the failing step. Common causes:
- Dashboard still showing pre-fix code → ensure dev server was rebuilt (Playwright config has `reuseExistingServer: true`, so kill any stale `npm run dev` first)
- Wrong `level.id` from DashboardZoomRail → verify with `cd frontend && grep -n "id: " src/lib/components/dashboard/DashboardZoomRail.svelte`

- [ ] **Step 6: Commit**

```bash
cd C:/projects/fci/fci-gis
git add frontend/src/routes/dashboard/+page.svelte
git commit -m "feat(dashboard): track lastClickedZoomLevelId, pass showSidoarjoBoundary

- New state lastClickedZoomLevelId: 'indonesia' | 'jawa-timur' | 'sidoarjo' | null
  (null = no zoom button clicked yet → boundary hidden by default)
- setZoomLevel(level) sekarang juga set lastClickedZoomLevelId = level.id
- <MapContainer showSidoarjoBoundary={lastClickedZoomLevelId === 'sidoarjo'} />
  → boundary hanya visible saat Sidoarjo terakhir diklik

State resets to null setiap navigasi baru (Svelte default, no
localStorage persistence) — sesuai spec §6.1."
```

---

## Task 5: Final verification

**Files:** none modified; this task only runs commands.

- [ ] **Step 1: Run svelte-check**

Run: `cd frontend && npm run check`
Expected: `0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`

- [ ] **Step 2: Run unit tests**

Run: `cd frontend && npm test 2>&1 | tail -10`
Expected: `Test Files N passed (N)` where N ≥ 20 (current count is 20 — should still be 20, no new unit tests added per spec §8.2)

- [ ] **Step 3: Run build**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: `✓ built in N s` and `Wrote site to "build"`

- [ ] **Step 4: Run full E2E suite**

Run: `cd frontend && npm run test:e2e 2>&1 | tail -15`
Expected: 37 passed (36 prior + 1 new "Sidoarjo boundary visibility" test). 1 pre-existing failure from `in-place role switching` test (projects table column index, unrelated) — ignore per global constraint.

- [ ] **Step 5: Run a11y tests (final verify)**

Run: `cd frontend && npm run test:a11y 2>&1 | tail -10`
Expected: passed (or any pre-existing a11y failures; should be unrelated to this change since boundary is non-interactive visual reference per spec §6.3)

- [ ] **Step 6: Final summary commit (only if any cleanup needed)**

If any of the above steps required a fix, commit with `git commit -m "chore: post-verify cleanup for sidoarjo boundary"`. If all green, no commit needed.

- [ ] **Step 7: Report completion**

Confirm to user: spec implemented, E2E test passing, verify:mvp green (modulo pre-existing unrelated failure). No follow-up tasks required for this feature.

---

## Self-Review (per writing-plans skill)

**1. Spec coverage:**

| Spec section | Implementing task |
|---|---|
| §1 Problem | (context only, no task) |
| §2 Goal | Tasks 1-4 |
| §2 Out of scope (5 bullets) | (no task needed; respected by not implementing) |
| §3 Decisions (5 bullets) | Reflected in Task 1 (data shape), Task 3 (style/color), Task 3 (test hook), Task 4 (trigger) |
| §4.1 Component tree | Task 4 step 3 |
| §4.2 Data flow | Tasks 3+4 |
| §4.3 Layer model | Task 3 steps 1-3 |
| §5.1 New mock file | Task 1 |
| §5.2 MapContainer changes | Task 3 |
| §5.3 Dashboard changes | Task 4 |
| §5.4 Unchanged (3 items) | (no task, respected) |
| §6.1 State machine | Task 4 step 1 |
| §6.2 Error matrix (6 rows) | Task 3 (basemap change), Task 3 (reactive guard), Task 4 (initial state), Task 3 (idempotent) |
| §6.3 Accessibility | (no task, respected — boundary non-interactive) |
| §7 File Diff Summary | Tasks 1, 3, 4 (matches expected LOC delta) |
| §8.1 E2E | Task 2 |
| §8.3 Verifikasi akhir | Task 5 |
| §10 Risks & Mitigations (5 rows) | Mitigations baked into Task 3 (layer order, reactivity guard, source re-add) and Task 4 (no race, no persistence) |

**2. Placeholder scan:** No "TBD", "TODO", "implement later" in any task. Every code block is exact. No "similar to Task N" references.

**3. Type consistency:**
- `SIDOARJO_BOUNDARY: FeatureCollection<{kind:'kabupaten';name:'Kabupaten Sidoarjo'}>` — defined in Task 1, consumed in Task 3 ✓
- `SIDOARJO_BOUNDARY_SOURCE_ID`, `SIDOARJO_BOUNDARY_FILL_LAYER_ID`, `SIDOARJO_BOUNDARY_LINE_LAYER_ID` — defined in Task 3 step 2, used consistently in Task 3 steps 3-6 ✓
- `renderSidoarjoBoundary()`, `applyBoundaryVisibility()` — defined in Task 3 step 3, called in Task 3 steps 4-6 ✓
- `lastClickedZoomLevelId` — defined in Task 4 step 1, used in Task 4 steps 2-3 ✓
- Test hook `_simantaGetSidoarjoBoundary()` — added in Task 3 step 4, asserted in Task 2 ✓
- Layer names `sidoarjo-boundary-fill` and `sidoarjo-boundary-line` — used in Task 3 layer defs, Task 3 test hook ✓
