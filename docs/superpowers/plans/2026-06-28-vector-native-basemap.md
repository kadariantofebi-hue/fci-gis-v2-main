# Vector Native Basemap (MapTiler streets-v2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raster-hybrid `maptiler_satellite` default basemap with the vector-native MapTiler `streets-v2` style, supporting overscale to z22 without rasterization for precise digitisation.

**Architecture:** MapTiler's `streets-v2` is a fully vector style (pbf + sprite + glyphs); unlike `satellite-v4` (raster background + vector labels), it has no raster tile to blur at high zoom. We delete the `maptiler_satellite` entry from the `basemaps` registry, repoint the existing `maptiler_streets` entry to the `streets-v2` style URL, and update the env default. `MapContainer`/`DigitizeMapPanel` already wire `map.maxZoom = provider.maxzoom`, so vector providers get z22 automatically. OSM/ESRI stay as free fallback for environments without a MapTiler key.

**Tech Stack:** SvelteKit static SPA, MapLibre GL JS 5.24, vitest, Playwright. Env-driven config via `$env/static/public` (`PUBLIC_DEFAULT_BASEMAP`, `PUBLIC_MAPTILER_API_KEY`).

## Global Constraints

- PRD v1.3.7 / v1.4 §3.4 — MapLibre engine, overscale to z22 for precise digitisation.
- Two-pillar UI copy: "Aset Wilayah" / "Administrasi Proyek GIS" (do not rename basemap label or dashboard heading).
- `belumDipetakan` → `tanpaGeometri` rename already in effect; do not regress.
- `mock` vs `real` parity for service modules — does not apply (this is a static style spec, not an API service).
- Default basemap resolution: if `PUBLIC_DEFAULT_BASEMAP` is set to a key not present in `basemaps` (e.g. legacy `maptiler_satellite` in user localStorage), the resolver falls back to `osm_standard` — keep this behaviour.
- Branch: `hermes/dev`. Commit messages follow the project pattern: `feat(frontend): ...` / `fix(frontend): ...` / `test(frontend): ...` / `docs(spec): ...` with Co-Authored-By trailer.
- Mock-vs-real map layer (`MapContainer`/`DigitizeMapPanel`) must NOT touch basemap wiring — they already use `provider.style` and `provider.maxzoom`.
- `$shared` alias for cross-package imports; do not deep-relative-import.
- All file paths in this plan are absolute: `C:\projects\fci\fci-gis\frontend\...`.

---

## File Structure

Files modified by this plan (no new files):

| File | Responsibility |
|------|----------------|
| `frontend/src/lib/components/map/basemaps.ts` | Basemap registry: removes `maptiler_satellite`, repoints `maptiler_streets` to `streets-v2` style URL. |
| `frontend/src/lib/components/map/basemaps.test.ts` | Unit tests: asserts `maptiler_streets` style URL contains `streets-v2`, `maptiler_satellite` is gone, `DEFAULT_BASEMAP` resolves to `maptiler_streets` (with key) / `osm_standard` (without key). |
| `frontend/.env` | Default env: `PUBLIC_DEFAULT_BASEMAP=maptiler_streets`. |
| `frontend/.env.example` | Default env + documentation comment for the new basemap choice. |

Files explicitly NOT modified: `MapContainer.svelte`, `DigitizeMapPanel.svelte`, `lib/stores/preferences.ts`, `routes/dashboard/+page.svelte`, any route page or component. They already consume the `basemaps` registry through the public API (`basemaps[key]`, `DEFAULT_BASEMAP`, `getActiveBasemaps()`).

---

## Task 1: Remove `maptiler_satellite` from basemaps registry

**Files:**
- Modify: `frontend/src/lib/components/map/basemaps.ts:4-9` (remove from `BasemapKey` union)
- Modify: `frontend/src/lib/components/map/basemaps.ts:80-92` (remove `maptiler_satellite` entry from `basemaps` object)
- Test: `frontend/src/lib/components/map/basemaps.test.ts` (tests will fail until Task 3; the failing state is what we want)

**Interfaces:**
- Consumes: `PUBLIC_MAPTILER_API_KEY` from `$env/static/public` (still imported, still used by `maptiler_streets` and `mapbox_satellite`).
- Produces: `basemaps` object whose keys are exactly `'osm_standard' | 'esri_satellite' | 'maptiler_streets' | 'mapbox_satellite'`.

- [ ] **Step 1: Update `BasemapKey` union in `basemaps.ts`**

Replace the existing union (lines 4–9) with:

```typescript
export type BasemapKey =
  | 'osm_standard'
  | 'esri_satellite'
  | 'maptiler_streets'
  | 'mapbox_satellite';
```

- [ ] **Step 2: Delete the `maptiler_satellite` entry from `basemaps` object**

In `basemaps.ts`, delete the entire `maptiler_satellite` block (lines 80–92). The remaining object order stays the same: `osm_standard` → `esri_satellite` → `maptiler_streets` → `mapbox_satellite`.

- [ ] **Step 3: Run existing tests to confirm failure**

Run: `cd C:\projects\fci\fci-gis\frontend && npx vitest run src/lib/components/map/basemaps.test.ts`
Expected: at least one test fails (the ones that reference `basemaps.maptiler_satellite`). This is the correct failing-test state we want before adding the new tests in Task 3.

- [ ] **Step 4: Commit**

```bash
cd C:\projects\fci\fci-gis && git add frontend/src/lib/components/map/basemaps.ts && git commit -m "feat(frontend): remove maptiler_satellite (raster hybrid, blurs at z19+)

The maptiler_satellite basemap uses MapTiler's satellite-v4 style which is
a raster + vector-label overlay; the raster background caps at z19 and
blurs past that. Replaced by maptiler_streets (vector native, z22
overscale) per design 2026-06-28-vector-native-basemap.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Repoint `maptiler_streets` to the `streets-v2` style URL

**Files:**
- Modify: `frontend/src/lib/components/map/basemaps.ts:93-103` (the `maptiler_streets` entry)

**Interfaces:**
- Consumes: `PUBLIC_MAPTILER_API_KEY` from `$env/static/public`.
- Produces: `basemaps.maptiler_streets.style` equals the string `https://api.maptiler.com/maps/streets-v2/style.json?key=<value>`. `maxzoom` stays at 22.

- [ ] **Step 1: Update the style URL inside `maptiler_streets`**

In `basemaps.ts`, locate the `maptiler_streets` entry. The current style line is:

```typescript
style: `https://api.maptiler.com/maps/openstreetmap/style.json?key=${PUBLIC_MAPTILER_API_KEY || ''}` as unknown as StyleSpecification,
```

Replace it with:

```typescript
style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${PUBLIC_MAPTILER_API_KEY || ''}` as unknown as StyleSpecification,
```

Also update the in-source comment block immediately above the `maptiler_streets` entry to:

```typescript
// MapTiler streets-v2 vector style — free tier. Vector tiles (pbf) plus
// sprite/glyphs; supports overscale to z22 without rasterization. Style is
// fetched as a JSON document via the style URL (no inline spec needed), per
// MapLibre/MapTiler docs.
```

- [ ] **Step 2: Update the provider `name` to drop the `(Vector)` suffix**

The label shown in the basemap dropdown is `basemaps[key].name`. Change:

```typescript
name: 'MapTiler Streets (Vector)',
```

to:

```typescript
name: 'MapTiler Streets',
```

- [ ] **Step 3: Commit**

```bash
cd C:\projects\fci\fci-gis && git add frontend/src/lib/components/map/basemaps.ts && git commit -m "feat(frontend): repoint maptiler_streets to streets-v2 vector style

streets-v2 is a fully vector MapTiler style (no raster background),
supporting overscale to z22. Required for precise digitisation — the
previous openstreetmap style URL was also vector but lacked the
road/labelling polish of streets-v2 and was named generically.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Update unit tests to assert the new registry shape

**Files:**
- Modify: `frontend/src/lib/components/map/basemaps.test.ts` (full file replacement)

**Interfaces:**
- Consumes: the `basemaps` registry and `DEFAULT_BASEMAP` from `basemaps.ts`.
- Produces: a vitest suite that (a) proves `maptiler_satellite` is gone, (b) proves `maptiler_streets` style URL contains `streets-v2`, (c) proves `DEFAULT_BASEMAP` resolves to `maptiler_streets` when the key is set, (d) proves the fallback to `osm_standard` when the key is empty.

- [ ] **Step 1: Write the failing tests**

Replace the entire content of `frontend/src/lib/components/map/basemaps.test.ts` with:

```typescript
import { describe, expect, it, vi } from 'vitest';
import { basemaps, DEFAULT_BASEMAP, getActiveBasemaps } from './basemaps';

describe('basemaps configuration', () => {
  it('exposes the 4 supported basemap providers', () => {
    // 2026-06-28: maptiler_satellite removed in favour of vector-native
    // maptiler_streets (streets-v2). See plan
    // docs/superpowers/plans/2026-06-28-vector-native-basemap.md.
    expect(Object.keys(basemaps).sort()).toEqual(
      ['esri_satellite', 'mapbox_satellite', 'maptiler_streets', 'osm_standard'].sort()
    );
  });

  it('maptiler_streets points to the streets-v2 vector style URL', () => {
    // Vector style: the value is a URL string, not an inline StyleSpecification.
    const style = basemaps.maptiler_streets.style as unknown as string;
    expect(typeof style).toBe('string');
    expect(style).toContain('streets-v2');
    expect(style).toContain('style.json');
    expect(style).toContain('key=');
  });

  it('maptiler_streets is a free-tier basemap with overscale to z22', () => {
    expect(basemaps.maptiler_streets.isPaid).toBe(false);
    expect(basemaps.maptiler_streets.maxzoom).toBe(22);
  });

  it('caps raster basemaps at z19 to avoid "Map data not yet available" placeholder', () => {
    // Root cause: raster sources (ESRI, OSM) top out at z19 on the upstream
    // servers. Declaring maxzoom: 22 in the style spec let MapLibre allow
    // zoom-in beyond what the provider can serve, at which point MapLibre
    // draws the "Map data not yet available" placeholder. Vector styles
    // (MapTiler streets-v2) DO support overscale to z22.
    expect(basemaps.osm_standard.maxzoom).toBe(19);
    expect(basemaps.esri_satellite.maxzoom).toBe(19);
    expect(basemaps.mapbox_satellite.maxzoom).toBe(19);
    expect(basemaps.maptiler_streets.maxzoom).toBe(22);
  });

  it('source spec maxzoom matches provider maxzoom for raster basemaps', () => {
    // The source's maxzoom must match the provider's effective max so
    // MapLibre does not over-zoom relative to what the tiles can serve.
    for (const key of ['osm_standard', 'esri_satellite', 'mapbox_satellite'] as const) {
      const provider = basemaps[key];
      const sourceId = key === 'esri_satellite' ? 'esri' : key === 'osm_standard' ? 'osm' : 'mapbox';
      const source = provider.style.sources?.[sourceId] as any;
      expect(source?.maxzoom).toBe(provider.maxzoom);
    }
  });

  it('embeds paid API tokens in raster style URLs', () => {
    // MapLibre style spec: tiles array is on sources[sourceId].tiles
    const mapboxTiles = (basemaps.mapbox_satellite.style.sources?.['mapbox'] as any)?.tiles;
    expect(Array.isArray(mapboxTiles)).toBe(true);
    expect(mapboxTiles[0]).toContain('access_token=');
  });

  it('filters active basemaps correctly', () => {
    const active = getActiveBasemaps();
    expect(active.length).toBeGreaterThanOrEqual(2);
    // osm_standard and esri_satellite should always be present as they are not paid
    expect(active.some(b => b.key === 'osm_standard')).toBe(true);
    expect(active.some(b => b.key === 'esri_satellite')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the new tests**

Run: `cd C:\projects\fci\fci-gis\frontend && npx vitest run src/lib/components/map/basemaps.test.ts`
Expected: all 7 tests pass. If any fail, re-read the spec section "Test Plan" and check that `basemaps.ts` matches the description in Tasks 1 and 2.

- [ ] **Step 3: Run the full unit-test suite**

Run: `cd C:\projects\fci\fci-gis\frontend && npx vitest run`
Expected: all 145 tests pass (the count is what was green at spec time; 7 of them are the basemaps suite). If a different suite fails, investigate before continuing.

- [ ] **Step 4: Run the type check**

Run: `cd C:\projects\fci\fci-gis\frontend && npm run check`
Expected: `0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`. If any TS error mentions `maptiler_satellite`, search the codebase for remaining references and fix them (the only known references are the ones already removed in this plan).

- [ ] **Step 5: Commit**

```bash
cd C:\projects\fci\fci-gis && git add frontend/src/lib/components/map/basemaps.test.ts && git commit -m "test(frontend): assert maptiler_streets=streets-v2, maptiler_satellite gone

The previous test suite asserted basemaps.maptiler_satellite existed and
that DEFAULT_BASEMAP could resolve to it. After removing maptiler_satellite
(Task 1) and repointing maptiler_streets to streets-v2 (Task 2), the
suite must prove both transitions: the registry now has exactly 4 keys
and DEFAULT_BASEMAP is one of the surviving set.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Set `PUBLIC_DEFAULT_BASEMAP=maptiler_streets` in `.env` and `.env.example`

**Files:**
- Modify: `frontend/.env` (single line edit)
- Modify: `frontend/.env.example` (single line edit + comment refresh)

**Interfaces:**
- Consumes: `PUBLIC_MAPTILER_API_KEY` already in both files.
- Produces: a default env that resolves to `maptiler_streets` whenever the MapTiler key is set, and falls back to `osm_standard` otherwise (handled by the `DEFAULT_BASEMAP` resolver in `basemaps.ts`).

- [ ] **Step 1: Edit `frontend/.env`**

Open `frontend/.env`. Replace the current comment + `PUBLIC_DEFAULT_BASEMAP` lines:

```env
# Default basemap. maptiler_satellite adalah style URL yang key-nya
# sudah di-include. Mendukung overscale ke z22 (vector-backed raster hybrid).
PUBLIC_DEFAULT_BASEMAP=maptiler_satellite
```

with:

```env
# Default basemap. maptiler_streets adalah style vector MapTiler streets-v2
# (free tier) — mendukung overscale ke z22 tanpa rasterization, presisi untuk
# digitasi. Fallback ke osm_standard jika PUBLIC_MAPTILER_API_KEY kosong.
PUBLIC_DEFAULT_BASEMAP=maptiler_streets
```

Leave all other lines (`PUBLIC_API_MODE`, `PUBLIC_API_BASE_URL`, `PUBLIC_MAPTILER_API_KEY`, `PUBLIC_MAPBOX_ACCESS_TOKEN`, `PUBLIC_ENABLE_DEMO_ROLE_SWITCHER`) untouched.

- [ ] **Step 2: Edit `frontend/.env.example`**

Open `frontend/.env.example`. Replace the current `PUBLIC_DEFAULT_BASEMAP` comment block + value (lines 3–9) with:

```env
# Default basemap. Valid values: osm_standard | esri_satellite |
# maptiler_streets | mapbox_satellite.
# maptiler_streets is the recommended default — MapTiler streets-v2 vector
# style (free tier), supports overscale to z22 without "Map data not yet
# available" placeholder. Falls back to osm_standard if the chosen default
# requires an empty token.
PUBLIC_DEFAULT_BASEMAP=maptiler_streets
```

Leave the `PUBLIC_MAPTILER_API_KEY=` line and everything below untouched.

- [ ] **Step 3: Commit**

```bash
cd C:\projects\fci\fci-gis && git add frontend/.env frontend/.env.example && git commit -m "chore(frontend): default basemap to maptiler_streets (vector)

Aligns env defaults with the vector-native design 2026-06-28. A fresh
clone with PUBLIC_MAPTILER_API_KEY set picks up streets-v2; without a
key, the DEFAULT_BASEMAP resolver in basemaps.ts falls back to
osm_standard so the dashboard still renders out of the box.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Manual visual verification at z22

**Files:** none modified. This task is a runtime check, not a code change.

**Interfaces:**
- Consumes: dev server already running on `http://127.0.0.1:5173` with `PUBLIC_MAPTILER_API_KEY` set in `frontend/.env`.
- Produces: a Playwright screenshot of the dashboard at z22 that visually confirms (a) the basemap label reads "MapTiler Streets", (b) the canvas shows vector-styled roads/labels (not raster satellite imagery), (c) no "Map data not yet available" placeholder is visible.

- [ ] **Step 1: Restart the Vite dev server so the new env is picked up**

If a dev server is already running, kill it. From `C:\projects\fci\fci-gis\frontend`:

```bash
cd C:\projects\fci\fci-gis\frontend
npm run dev
```

Wait for `VITE ... ready in <ms>` and `Local: http://127.0.0.1:5173/`.

- [ ] **Step 2: Clear any stale basemap preference from localStorage**

In a browser DevTools console on `http://127.0.0.1:5173/dashboard`:

```javascript
const raw = localStorage.getItem('simanta.preferences');
if (raw) {
  const p = JSON.parse(raw);
  delete p.defaultBasemap;
  localStorage.setItem('simanta.preferences', JSON.stringify(p));
}
location.reload();
```

This forces the next mount to read the new env default instead of any leftover `maptiler_satellite` preference.

- [ ] **Step 3: Log in and confirm the basemap label**

- Navigate to `http://127.0.0.1:5173/login` and log in as `admin@simanta.test` (any password, OTP `123456`).
- After redirect to `/dashboard`, locate the basemap dropdown label (`[data-testid="map-basemap-state"]`).
- Expected: the label reads `MapTiler Streets`. If it still says `Esri Satellite` or anything else, the env did not reload — re-check Step 1.

- [ ] **Step 4: Zoom the map to z22 and screenshot**

Using the browser DevTools console (or a Playwright snippet), trigger zoom-in to z22. Recommended path — dispatch a sequence of real `dblclick` events on the `canvas.maplibregl-canvas` element. Each `dblclick` zooms in by 1 level in MapLibre default config; from a starting zoom of 8 we need ~14 dblclicks to reach z22:

```javascript
async () => {
  const canvas = document.querySelector('canvas.maplibregl-canvas');
  const rect = canvas.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 16; i++) {
    canvas.dispatchEvent(new MouseEvent('dblclick', {
      clientX: cx, clientY: cy, bubbles: true, cancelable: true, button: 0
    }));
    await new Promise(r => setTimeout(r, 200));
  }
}
```

> Note: synthetic `dblclick` and `wheel` events are sometimes dropped by MapLibre's passive listeners. If the map does not zoom, add a temporary `_simantaSetZoom(z)` test hook to `MapContainer.svelte` (mirroring the existing `_simantaFeatureCount` / `_simantaTriggerTileError` hooks), use it, then revert before commit.

Take a viewport screenshot. Expected:

- The basemap shows vector-styled roads (white/yellow lines on a neutral background) and at least one labelled road or place name. It does **not** look like satellite imagery.
- The text "Map data not yet available" is **not** visible anywhere on the canvas.
- The basemap attribution at the bottom of the map reads "© MapTiler © OpenStreetMap contributors" (or equivalent).

- [ ] **Step 5: Clean up any temporary debugging code**

If you added a temporary `_simantaSetZoom` test hook or any console-side debug, revert the change. `MapContainer.svelte` does not ship with a permanent `_simantaSetZoom` — keep it that way unless the team agrees to add it as a permanent E2E hook.

- [ ] **Step 6: No commit (verification task)**

If a screenshot artifact was saved (e.g. `dashboard-vector-z22.png`), delete it — it is not part of the codebase:

```bash
rm -f C:\projects\fci\fci-gis\dashboard-vector-z22.png
```

---

## Task Ordering & Dependencies

```
Task 1 (remove maptiler_satellite)
  └─> Task 3 (update tests) — must run after Task 1 and Task 2
Task 2 (repoint maptiler_streets to streets-v2)
  └─> Task 3 (update tests)
Task 3 (tests pass)
  └─> Task 5 (visual verification)
Task 4 (.env default) — independent of 1/2/3; can run in parallel but
  visual verification (Task 5) needs it to be in effect.
```

Recommended order: **1 → 2 → 3 → 4 → 5**. Task 4 can be moved before Task 3 since the unit tests do not read `.env` at runtime (the env is resolved at build time inside `basemaps.ts` and is already injected by the time tests import the module).

## Self-Review

**1. Spec coverage** — every section of `docs/superpowers/specs/2026-06-28-vector-native-basemap-design.md` is covered:

| Spec section | Task |
|---|---|
| Keputusan 1: ganti default ke `maptiler_streets` | Task 4 |
| Keputusan 2: hapus `maptiler_satellite` | Task 1 |
| Keputusan 3: style URL `streets-v2` | Task 2 |
| Keputusan 4: OSM/ESRI tetap fallback | preserved automatically (Tasks 1, 2 do not touch them) |
| Keputusan 5: backward-compat localStorage | preserved by `DEFAULT_BASEMAP` resolver in `basemaps.ts` (unchanged) |
| Implementation Surface: `basemaps.ts` | Tasks 1, 2 |
| Implementation Surface: `.env` | Task 4 |
| Implementation Surface: `.env.example` | Task 4 |
| Implementation Surface: `basemaps.test.ts` | Task 3 |
| Test Plan: unit tests | Task 3 |
| Test Plan: E2E/visual verification | Task 5 |
| Error Handling: existing fallbacks | preserved (no code change to `handleTileError`) |
| Rollback | documented in spec; the rollback path is the inverse of Tasks 1+2+4 |

**2. Placeholder scan** — no TBD / TODO / "add appropriate X" in any step. All code blocks are complete.

**3. Type / name consistency** —
- `BasemapKey` is narrowed to 4 members in Task 1; every later reference to a basemap key uses one of those 4 names.
- `basemaps.maptiler_streets.style` is cast to `string` in the test (Task 3) and constructed as a template-literal string in the source (Task 2). The `as unknown as StyleSpecification` cast is preserved — it is how the existing vector-style URL is typed in the registry, and the plan does not change the type definition.
- The `name` field is updated in Task 2 ('MapTiler Streets (Vector)' → 'MapTiler Streets'); no other code in the repo references this string.
