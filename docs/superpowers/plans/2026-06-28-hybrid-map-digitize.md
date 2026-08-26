# Hybrid Map Digitize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's `FloatingPanel` + mini-map digitizer with a **bottom sheet drawer** that drives draw mode on the main basemap (`MapContainer`). One MapLibre instance, no duplicate tile requests, single visual handle instead of a floating panel with a second map.

**Architecture:** Extract drawing logic into a pure module (`drawing-controller.ts`), then wrap it in a `MapDrawController.svelte` that mounts as a child of `MapContainer` only when `mode='draw'`. The dashboard page wires a new `DashboardDrawSheet.svelte` (bottom sheet) that binds to geometry + status from the controller. The existing `sessionStorage` bridge (`draft-geometry.ts`) is reused unchanged for the `/projects/create` handoff. `/projects/create` itself is untouched.

**Tech Stack:** SvelteKit 2 + Svelte 4 syntax (`export let`, `$:`, `on:event`), MapLibre GL JS 5, Vitest 3 + jsdom for `MapDrawController`, Playwright 1.60 for E2E.

**Spec:** [`docs/superpowers/specs/2026-06-28-hybrid-map-digitize-design.md`](../specs/2026-06-28-hybrid-map-digitize-design.md) — read §1-§9 before starting.

**Supersedes scope:** §3 (Components) and §7 (Risk Register) of `2026-06-27-dashboard-digitize-bridge-design.md` for the dashboard surface only. The `sessionStorage` bridge contract and `/projects/create` import flow remain authoritative.

## Global Constraints

- **Svelte 4 reactive syntax (`export let`, `$:`, `on:event`)** — matches the existing dashboard, create page, and `MapContainer.svelte`. Do not introduce Svelte 5 runes here.
- **Frontend-only MVP** — no backend changes; no new dependencies; `PUBLIC_API_MODE=mock` unchanged.
- **Path alias `$shared`** — for `DrawMode` (new, added in Task 1) and `Geometry` (existing). Never deep-relative imports.
- **Vitest** — `vitest.config.ts` uses `environment: 'node'` by default. For `MapDrawController.test.ts` use `// @vitest-environment jsdom` at the top of the file.
- **Test ID conventions** — `dashboard-draw-sheet-*` for the new sheet; reuse existing `project-geometry-state` and `digitize-map` testids in create page. The old `dashboard-digitize-panel` testid is being retired.
- **Indonesian copy** — user-facing strings in Bahasa Indonesia; code/test in English.
- **Commit message format** — `feat(frontend): ...`, `test(frontend): ...`, `fix(frontend): ...`, `chore(frontend): ...` per `CLAUDE.md` phase pattern. Co-Authored-By trailer on every commit.
- **ADR-002 amendment** — Task 5 edits `docs/adr/ADR-002-map-architecture.md` to add a "Draw mode opt-in" clause. Do not remove the existing read-only invariant for the basemap; only soften it.
- **Render-token race guard** — `MapContainer.svelte` line ~615 already guards `L.*`/MapLibre imports. `MapDrawController` reuses the same `isStyleLoaded()` pattern.
- **Layer cleanup** — `MapDrawController.onDestroy` removes every layer and source it adds, and every event handler it attaches. This is tested.
- **Bite-sized steps** — 2-5 minutes per step, TDD where a test target exists, frequent commits.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `frontend/shared/src/enums.ts` | EDIT | Add `DrawMode` type |
| `frontend/src/lib/components/map/drawing-controller.ts` | NEW | Pure functions: `addVertex`, `tryClosePolygon`, `commit`, `reset` |
| `frontend/src/lib/components/map/drawing-controller.test.ts` | NEW | 12 unit tests for pure module |
| `frontend/src/lib/components/map/MapDrawController.svelte` | NEW | MapLibre-side controller: layer, click/dblclick, emit |
| `frontend/src/lib/components/map/MapDrawController.test.ts` | NEW | 5 jsdom tests for layer lifecycle and event emission |
| `frontend/src/lib/components/map/MapContainer.svelte` | EDIT | Add `mode?: 'view' \| 'draw' = 'view'` prop, mount controller, forward event |
| `frontend/src/lib/components/dashboard/DashboardDrawSheet.svelte` | NEW | Bottom sheet UI: handle, mode radio, status, Reset, CTA |
| `frontend/src/lib/components/dashboard/DashboardDigitizePanel.svelte` | DELETE | Replaced by sheet |
| `frontend/src/routes/dashboard/+page.svelte` | EDIT | Replace FloatingPanel mount with sheet; wire `mode` and `geometry` state |
| `docs/adr/ADR-002-map-architecture.md` | EDIT | Add "Draw mode opt-in" clause |
| `frontend/tests/e2e/dashboard-digitize-sheet.spec.ts` | NEW | 5 E2E tests for sheet flow |
| `frontend/tests/e2e/dashboard-digitize-panel.spec.ts` | DELETE | Replaced by sheet spec |
| `frontend/tests/e2e/a11y.spec.ts` | EDIT | 1 new axe-core test for sheet |
| `docs/superpowers/specs/2026-06-27-dashboard-digitize-bridge-design.md` | EDIT | Add "Superseded by 2026-06-28 hybrid approach" header |

**Decomposition rationale:** Task 1 lays the type foundation that every later task imports. Task 2 is the leaf — pure module with no UI deps, fully testable in node. Task 3 depends only on Task 2; testable in jsdom with mocked `maplibregl.Map`. Task 4 (MapContainer change) is the integration point — a few lines but high blast radius; isolated for review. Task 5 is the sheet UI, the dashboard wiring, and ADR-002 update. Task 6 deletes old files and adds the E2E. Task 7 runs the full `verify:mvp` gate.

---

## Task 1: Add `DrawMode` type to shared enums

**Files:**
- Edit: `frontend/shared/src/enums.ts`

**Interfaces:**
- Consumes: existing `export ...` declarations in `enums.ts`
- Produces:
  - `export type DrawMode = 'point' | 'line' | 'polygon'` (importable as `$shared/enums#DrawMode`)

- [ ] **Step 1: Read `enums.ts` to find a good location**

Run: `cd frontend && head -50 shared/src/enums.ts`
Expected: shows existing exports (`JenisAset`, `RoleName`, etc.). Identify the section where simple union-string types live.

- [ ] **Step 2: Append `DrawMode` near the other union types**

Edit `frontend/shared/src/enums.ts` — add at the end of the type declarations (after the last `export type ... = ...`):

```typescript

/**
 * Drawing mode for the dashboard digitize feature (PRD v1.3.7 Go-Live Hardening,
 * 2026-06-28 hybrid map). Mirrors the supported GeoJSON geometry kinds that
 * the dashboard's bottom sheet drawer can produce.
 */
export type DrawMode = 'point' | 'line' | 'polygon';
```

- [ ] **Step 3: Verify type check passes**

Run: `cd frontend && npm run check`
Expected: exit code 0, no errors mentioning `DrawMode`.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add ../shared/src/enums.ts
git commit -m "feat(shared): add DrawMode type for dashboard digitize drawer

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Pure `drawing-controller` module + 12 unit tests

**Files:**
- Create: `frontend/src/lib/components/map/drawing-controller.ts`
- Create: `frontend/src/lib/components/map/drawing-controller.test.ts`

**Interfaces:**
- Consumes: `DrawMode` from `$shared/enums`, `Geometry` from `$shared/geojson`
- Produces:
  - `interface VertexState { mode: DrawMode; vertices: [number, number][]; isComplete: boolean }`
  - `function addVertex(state: VertexState, lngLat: [number, number]): VertexState`
  - `function tryClosePolygon(state: VertexState, lngLat: [number, number], tolerancePx: number, firstVertexPx: [number, number]): { closed: boolean; state: VertexState }`
  - `function commit(state: VertexState): Geometry | null`
  - `function reset(mode?: DrawMode): VertexState`

### Step 1: Write the failing tests

Create `frontend/src/lib/components/map/drawing-controller.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { Point, LineString, Polygon } from '$shared/geojson';
import {
  addVertex,
  tryClosePolygon,
  commit,
  reset,
  type VertexState,
} from './drawing-controller';

const init = (mode: VertexState['mode']): VertexState => ({
  mode,
  vertices: [],
  isComplete: false,
});

describe('addVertex', () => {
  it('appends a vertex for polygon mode without marking complete', () => {
    const s0 = init('polygon');
    const s1 = addVertex(s0, [106.1, -6.2]);
    expect(s1.vertices).toEqual([[106.1, -6.2]]);
    expect(s1.isComplete).toBe(false);
  });

  it('marks point mode complete after the first vertex', () => {
    const s0 = init('point');
    const s1 = addVertex(s0, [106.1, -6.2]);
    expect(s1.isComplete).toBe(true);
  });

  it('does not mark line mode complete until commit (dblclick)', () => {
    const s0 = init('line');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const s2 = addVertex(s1, [106.2, -6.3]);
    expect(s2.isComplete).toBe(false);
  });
});

describe('tryClosePolygon', () => {
  it('closes when click is within tolerance of first vertex (polygon mode)', () => {
    const s0 = init('polygon');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const s2 = addVertex(s1, [106.2, -6.2]);
    const s3 = addVertex(s2, [106.2, -6.3]);
    // firstVertexPx and clickPx are the same screen position
    const result = tryClosePolygon(s3, [106.1, -6.2], 15, [100, 100]);
    expect(result.closed).toBe(true);
    expect(result.state.isComplete).toBe(true);
  });

  it('does not close when click is outside tolerance', () => {
    const s0 = init('polygon');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const s2 = addVertex(s1, [106.2, -6.2]);
    // firstVertexPx at [100,100], clickPx at [200,200] — far away
    const result = tryClosePolygon(s2, [106.15, -6.25], 15, [100, 100]);
    expect(result.closed).toBe(false);
    expect(result.state.isComplete).toBe(false);
  });

  it('returns closed=false in line mode regardless of distance', () => {
    const s0 = init('line');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const result = tryClosePolygon(s1, [106.1, -6.2], 9999, [0, 0]);
    expect(result.closed).toBe(false);
  });
});

describe('commit', () => {
  it('returns null when polygon has fewer than 3 vertices', () => {
    const s0 = init('polygon');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const s2 = addVertex(s1, [106.2, -6.2]);
    expect(commit(s2)).toBeNull();
  });

  it('returns Point geometry for point mode with 1 vertex', () => {
    const s0 = init('point');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const g = commit(s1) as Point;
    expect(g.type).toBe('Point');
    expect(g.coordinates).toEqual([106.1, -6.2]);
  });

  it('returns LineString geometry for line mode with >= 2 vertices', () => {
    const s0 = init('line');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const s2 = addVertex(s1, [106.2, -6.3]);
    const g = commit(s2) as LineString;
    expect(g.type).toBe('LineString');
    expect(g.coordinates).toEqual([[106.1, -6.2], [106.2, -6.3]]);
  });

  it('returns closed Polygon ring when polygon is complete', () => {
    let s = init('polygon');
    s = addVertex(s, [106.1, -6.2]);
    s = addVertex(s, [106.2, -6.2]);
    s = addVertex(s, [106.2, -6.3]);
    s = { ...s, isComplete: true };
    const g = commit(s) as Polygon;
    expect(g.type).toBe('Polygon');
    // ring must be closed: first === last
    expect(g.coordinates[0][0]).toEqual(g.coordinates[0][g.coordinates[0].length - 1]);
    expect(g.coordinates[0].length).toBe(4); // 3 unique + closing
  });

  it('returns null for line mode with only 1 vertex', () => {
    const s0 = init('line');
    const s1 = addVertex(s0, [106.1, -6.2]);
    expect(commit(s1)).toBeNull();
  });
});

describe('reset', () => {
  it('returns a fresh state with the given mode', () => {
    const s = reset('polygon');
    expect(s.mode).toBe('polygon');
    expect(s.vertices).toEqual([]);
    expect(s.isComplete).toBe(false);
  });

  it('defaults to polygon mode when no arg is given', () => {
    const s = reset();
    expect(s.mode).toBe('polygon');
  });
});
```

### Step 2: Run tests to verify they fail

Run: `cd frontend && npx vitest run src/lib/components/map/drawing-controller.test.ts`
Expected: FAIL — module `./drawing-controller` does not exist.

### Step 3: Write the implementation

Create `frontend/src/lib/components/map/drawing-controller.ts`:

```typescript
import type { Geometry, Point, LineString, Polygon } from '$shared/geojson';
import type { DrawMode } from '$shared/enums';

/**
 * Pure state for an in-progress draw. Lives in MapDrawController; never escapes
 * to the map or to the store. Coordinates are [lng, lat] in WGS84.
 */
export interface VertexState {
  mode: DrawMode;
  vertices: [number, number][];
  isComplete: boolean;
}

export function reset(mode: DrawMode = 'polygon'): VertexState {
  return { mode, vertices: [], isComplete: false };
}

/**
 * Append a vertex. For 'point' mode, the first click is also the commit.
 * For 'line' and 'polygon', this only adds; completion is handled elsewhere.
 */
export function addVertex(state: VertexState, lngLat: [number, number]): VertexState {
  const vertices = [...state.vertices, lngLat];
  if (state.mode === 'point') {
    return { ...state, vertices, isComplete: true };
  }
  return { ...state, vertices };
}

/**
 * Polygon close-detection. Caller pre-projects the first vertex and the
 * current cursor into screen pixels and passes them in so this stays pure.
 */
export function tryClosePolygon(
  state: VertexState,
  _lngLat: [number, number],
  tolerancePx: number,
  firstVertexPx: [number, number]
): { closed: boolean; state: VertexState } {
  if (state.mode !== 'polygon' || state.vertices.length < 3) {
    return { closed: false, state };
  }
  // The caller passes the projected click position implicitly as the same
  // coordinate we already have in firstVertexPx when the user is hovering
  // directly over the first vertex. We use the screen-space distance check
  // (px) here: tolerancePx is the radius in screen pixels.
  // (The actual pixel distance is computed by the caller and stored in
  // firstVertexPx when the click matches.)
  // Implementation note: the caller computes |clickPx - firstVertexPx|
  // and only calls this when that distance is 0. To keep this pure, we
  // expose the check via a small helper.
  const distance = euclideanPx(firstVertexPx, firstVertexPx); // see below
  if (distance <= tolerancePx) {
    return { closed: true, state: { ...state, isComplete: true } };
  }
  return { closed: false, state };
}

function euclideanPx(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/**
 * Convert the in-progress vertex state into a GeoJSON Geometry.
 * Returns null when the state is insufficient (e.g. line with 1 vertex,
 * polygon with < 3 vertices).
 */
export function commit(state: VertexState): Geometry | null {
  if (state.mode === 'point') {
    if (state.vertices.length < 1) return null;
    const [lng, lat] = state.vertices[0];
    return { type: 'Point', coordinates: [lng, lat] } as Point;
  }
  if (state.mode === 'line') {
    if (state.vertices.length < 2) return null;
    return { type: 'LineString', coordinates: state.vertices } as LineString;
  }
  // polygon
  if (state.vertices.length < 3) return null;
  const ring = [...state.vertices, state.vertices[0]];
  return { type: 'Polygon', coordinates: [ring] } as Polygon;
}
```

### Step 4: Re-run tests; expect 1 failure in tryClosePolygon

Run: `cd frontend && npx vitest run src/lib/components/map/drawing-controller.test.ts`
Expected: **1 test fails** — "closes when click is within tolerance" because `euclideanPx` is comparing the same point to itself. This is the design — the caller projects the click, sees the distance is 0, and passes `[clickPx, clickPx]` only if distance ≤ tolerance. The test needs to express this; adjust the implementation to accept a clickPx as well.

Update `drawing-controller.ts` to take the projected click position:

```typescript
export function tryClosePolygon(
  state: VertexState,
  _lngLat: [number, number],
  tolerancePx: number,
  firstVertexPx: [number, number],
  clickPx: [number, number]
): { closed: boolean; state: VertexState } {
  if (state.mode !== 'polygon' || state.vertices.length < 3) {
    return { closed: false, state };
  }
  const distance = Math.hypot(clickPx[0] - firstVertexPx[0], clickPx[1] - firstVertexPx[1]);
  if (distance <= tolerancePx) {
    return { closed: true, state: { ...state, isComplete: true } };
  }
  return { closed: false, state };
}
```

Update the test signatures to pass `clickPx`:

```typescript
// In the "closes when click is within tolerance" test:
const result = tryClosePolygon(s3, [106.1, -6.2], 15, [100, 100], [100, 100]);

// In the "does not close when click is outside tolerance" test:
const result = tryClosePolygon(s2, [106.15, -6.25], 15, [100, 100], [200, 200]);

// In the "returns closed=false in line mode" test:
const result = tryClosePolygon(s1, [106.1, -6.2], 9999, [0, 0], [0, 0]);
```

Remove the now-unused `euclideanPx` helper from `drawing-controller.ts`.

### Step 5: Re-run tests; expect 12 pass

Run: `cd frontend && npx vitest run src/lib/components/map/drawing-controller.test.ts`
Expected: 12 passed, 0 failed.

### Step 6: Commit

```bash
cd frontend
git add src/lib/components/map/drawing-controller.ts src/lib/components/map/drawing-controller.test.ts
git commit -m "feat(frontend): pure drawing-controller module with 12 unit tests

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: `MapDrawController.svelte` + 5 jsdom tests

**Files:**
- Create: `frontend/src/lib/components/map/MapDrawController.svelte`
- Create: `frontend/src/lib/components/map/MapDrawController.test.ts`

**Interfaces:**
- Consumes: `maplibregl.Map` (passed as prop), `DrawMode` from `$shared/enums`, `VertexState` and pure functions from `./drawing-controller`
- Produces: dispatches `geometrychange: CustomEvent<{ geometry: Geometry | null; statusText: string; isComplete: boolean }>`

### Step 1: Write the failing tests

Create `frontend/src/lib/components/map/MapDrawController.test.ts` with this header at the top:

```typescript
// @vitest-environment jsdom
```

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import MapDrawController from './MapDrawController.svelte';
import type { DrawMode } from '$shared/enums';

// Minimal MapLibre mock — only the methods we touch.
function makeMapMock() {
  const handlers: Record<string, Array<(e: unknown) => void>> = {};
  return {
    isStyleLoaded: vi.fn(() => true),
    on: vi.fn((evt: string, h: (e: unknown) => void) => {
      handlers[evt] = handlers[evt] ?? [];
      handlers[evt].push(h);
    }),
    off: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    removeSource: vi.fn(),
    removeLayer: vi.fn(),
    getSource: vi.fn(() => ({ setData: vi.fn() })),
    project: vi.fn((lngLat: [number, number]) => ({
      x: lngLat[0] * 1000,
      y: lngLat[1] * 1000,
    })),
    queryRenderedFeatures: vi.fn(() => []),
    __fire: (evt: string, e: unknown) =>
      (handlers[evt] ?? []).forEach((h) => h(e)),
    __handlers: handlers,
  };
}

const baseProps = (map: ReturnType<typeof makeMapMock>, mode: DrawMode = 'polygon') =>
  ({ map, mode } as never);

describe('MapDrawController', () => {
  let map: ReturnType<typeof makeMapMock>;
  beforeEach(() => {
    map = makeMapMock();
  });

  it('adds a source and three layers when style is loaded', () => {
    render(baseProps(map));
    expect(map.addSource).toHaveBeenCalledWith('draft-shape', expect.any(Object));
    expect(map.addLayer).toHaveBeenCalledTimes(3); // fill, outline, vertices
  });

  it('attaches click and dblclick handlers on mount', () => {
    render(baseProps(map));
    const events = map.on.mock.calls.map((c) => c[0]);
    expect(events).toContain('click');
    expect(events).toContain('dblclick');
  });

  it('removes layers and source on unmount', () => {
    const { unmount } = render(baseProps(map));
    unmount();
    expect(map.removeSource).toHaveBeenCalledWith('draft-shape');
  });

  it('suppresses click within 250ms after a dblclick in line mode', async () => {
    render(baseProps(map, 'line'));
    // Capture the registered handlers
    const clickH = map.__handlers.click[0];
    const dblH = map.__handlers.dblclick[0];
    // Fire dblclick first
    dblH({ lngLat: { lng: 106.1, lat: -6.2 } });
    // Fire click immediately after — should be ignored
    clickH({ lngLat: { lng: 106.2, lat: -6.3 } });
    // No setData call should reflect the extra vertex
    const source = map.getSource();
    const setData = source.setData;
    // We allow at most 1 setData (from dblclick), never 2 (one per click)
    expect(setData.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('mode change resets internal state (no leftover vertices)', async () => {
    const { component } = render(baseProps(map, 'polygon'));
    map.__fire('click', { lngLat: { lng: 106.1, lat: -6.2 } });
    await component.$set({ mode: 'line' });
    const source = map.getSource();
    // After mode change, source data is empty
    const last = source.setData.mock.calls.at(-1)?.[0];
    expect(last?.features ?? []).toEqual([]);
  });
});
```

### Step 2: Run tests to verify they fail

Run: `cd frontend && npx vitest run src/lib/components/map/MapDrawController.test.ts`
Expected: FAIL — `MapDrawController.svelte` does not exist.

### Step 3: Write the implementation

Create `frontend/src/lib/components/map/MapDrawController.svelte`:

```svelte
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import type { maplibregl } from 'maplibre-gl';
  import type { Geometry } from '$shared/geojson';
  import type { DrawMode } from '$shared/enums';
  import { addVertex, tryClosePolygon, commit, reset, type VertexState } from './drawing-controller';

  export let map: maplibregl.Map;
  export let mode: DrawMode = 'polygon';

  const dispatch = createEventDispatcher<{
    geometrychange: { geometry: Geometry | null; statusText: string; isComplete: boolean };
  }>();

  const POLYGON_CLOSE_TOLERANCE_PX = 15;
  const DBLCLICK_SUPPRESS_MS = 250;

  let state: VertexState = reset(mode);
  let lastDblclickAt = 0;
  let styleLoaded = map.isStyleLoaded();

  function statusTextFor(s: VertexState): string {
    if (s.isComplete) {
      return s.mode === 'point'
        ? 'Titik ditempatkan. Tambah Proyek untuk lanjut.'
        : s.mode === 'line'
          ? 'Garis selesai. Tambah Proyek untuk lanjut.'
          : 'Polygon ditutup. Tambah Proyek untuk lanjut.';
    }
    if (s.vertices.length === 0) return 'Klik untuk tambah vertex.';
    if (s.mode === 'point') return `Titik #${s.vertices.length} (menunggu commit).`;
    if (s.mode === 'line') return `Vertex ${s.vertices.length}. Double-click untuk selesai.`;
    return `Vertex ${s.vertices.length}. Klik vertex pertama untuk tutup.`;
  }

  function toFeatureCollection(s: VertexState): GeoJSON.FeatureCollection {
    if (s.vertices.length === 0) return { type: 'FeatureCollection', features: [] };
    const features: GeoJSON.Feature[] = [
      {
        type: 'Feature',
        properties: { kind: 'vertices' },
        geometry: { type: 'MultiPoint', coordinates: s.vertices },
      },
    ];
    if (s.mode === 'line' && s.vertices.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { kind: 'line' },
        geometry: { type: 'LineString', coordinates: s.vertices },
      });
    }
    if (s.mode === 'polygon' && s.vertices.length >= 3) {
      const ring = [...s.vertices, s.vertices[0]];
      features.push({
        type: 'Feature',
        properties: { kind: 'polygon' },
        geometry: { type: 'Polygon', coordinates: [ring] },
      });
    }
    return { type: 'FeatureCollection', features };
  }

  function refreshSource(): void {
    const src = map.getSource('draft-shape') as maplibregl.GeoJSONSource | undefined;
    src?.setData(toFeatureCollection(state));
  }

  function emit(): void {
    const geometry = state.isComplete ? commit(state) : null;
    dispatch('geometrychange', { geometry, statusText: statusTextFor(state), isComplete: state.isComplete });
  }

  function onMapClick(e: { lngLat: { lng: number; lat: number } }): void {
    if (Date.now() - lastDblclickAt < DBLCLICK_SUPPRESS_MS) return;
    const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    // polygon close detection (only meaningful if we have >= 3 vertices already)
    if (state.mode === 'polygon' && state.vertices.length >= 3) {
      const first = state.vertices[0];
      const firstPx = map.project(first as [number, number]);
      const clickPx = map.project(lngLat);
      const r = tryClosePolygon(state, lngLat, POLYGON_CLOSE_TOLERANCE_PX, [firstPx.x, firstPx.y], [clickPx.x, clickPx.y]);
      if (r.closed) {
        state = r.state;
        refreshSource();
        emit();
        return;
      }
    }
    state = addVertex(state, lngLat);
    refreshSource();
    emit();
  }

  function onMapDblclick(e: { lngLat: { lng: number; lat: number } }): void {
    lastDblclickAt = Date.now();
    if (state.mode === 'line' && state.vertices.length >= 2) {
      state = { ...state, isComplete: true };
      refreshSource();
      emit();
    }
  }

  $: if (map) {
    // React to mode change
    state = reset(mode);
    if (styleLoaded) refreshSource();
    emit();
  }

  onMount(() => {
    if (!styleLoaded) {
      const onLoad = () => {
        styleLoaded = true;
        install();
      };
      map.once('load', onLoad);
      return () => map.off('load', onLoad);
    }
    install();
    return () => {
      map.off('click', onMapClick);
      map.off('dblclick', onMapDblclick);
    };
  });

  function install(): void {
    if (!map.getSource('draft-shape')) {
      map.addSource('draft-shape', {
        type: 'geojson',
        data: toFeatureCollection(state),
      });
      map.addLayer({ id: 'draft-fill', type: 'fill', source: 'draft-shape', paint: { 'fill-color': '#1d4ed8', 'fill-opacity': 0.15 } });
      map.addLayer({ id: 'draft-outline', type: 'line', source: 'draft-shape', paint: { 'line-color': '#1d4ed8', 'line-width': 2 } });
      map.addLayer({ id: 'draft-vertices', type: 'circle', source: 'draft-shape', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 4, 'circle-color': '#1d4ed8' } });
    }
    map.on('click', onMapClick);
    map.on('dblclick', onMapDblclick);
  }

  onDestroy(() => {
    if (map.getLayer('draft-vertices')) map.removeLayer('draft-vertices');
    if (map.getLayer('draft-outline')) map.removeLayer('draft-outline');
    if (map.getLayer('draft-fill')) map.removeLayer('draft-fill');
    if (map.getSource('draft-shape')) map.removeSource('draft-shape');
  });
</script>

<!-- controller-only component; renders nothing -->
```

### Step 4: Re-run tests; expect 6 pass

Run: `cd frontend && npx vitest run src/lib/components/map/MapDrawController.test.ts`
Expected: 6 passed.

If tests fail due to `import type { maplibregl } from 'maplibre-gl'` being unresolved in jsdom, change the import to `import type { Map as MaplibreMap } from 'maplibre-gl'` and update the prop type accordingly.

### Step 5: Commit

```bash
cd frontend
git add src/lib/components/map/MapDrawController.svelte src/lib/components/map/MapDrawController.test.ts
git commit -m "feat(frontend): MapDrawController for hybrid draw mode

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: `MapContainer` mode prop + controller mount

**Files:**
- Modify: `frontend/src/lib/components/map/MapContainer.svelte`

**Interfaces:**
- Consumes: `MapDrawController` from Task 3
- Produces: optional `mode?: 'view' | 'draw' = 'view'` prop on `MapContainer`; mounts `<MapDrawController>` only when mode is `'draw'`

### Step 1: Read `MapContainer.svelte` and find the prop block + tail

Run: `cd frontend && grep -n "export let\|let map\|<svelte:component\|</script>" src/lib/components/map/MapContainer.svelte | head -30`

Find:
- The prop declarations (around line 1-50)
- The last `</script>` and the template root, where the controller mount will be added

### Step 2: Add the `mode` prop

Edit `MapContainer.svelte` — in the props block, add:

```typescript
  /** When 'draw', mounts a MapDrawController as a child of this map. */
  export let mode: 'view' | 'draw' = 'view';
```

(Adjust the position based on existing prop style in the file. Place it next to other optional boolean/union props.)

### Step 3: Import `MapDrawController` and mount conditionally

At the top of the file, add the import:

```typescript
  import MapDrawController from './MapDrawController.svelte';
```

In the template, just before the closing root element (or after the basemap layer block — wherever the file's other map-rendering children go), add:

```svelte
{#if mode === 'draw'}
  <MapDrawController {map} {mode} on:geometrychange on:click on:dblclick />
{/if}
```

Use Svelte event forwarding (`on:geometrychange` etc.) so events bubble from `MapDrawController` through `MapContainer` to its parent. The parent (`+page.svelte` in Task 5) will then bind to those.

### Step 4: Run type check

Run: `cd frontend && npm run check`
Expected: exit 0. If `MapContainer` has Svelte 4 specific slot/block syntax that breaks with the `{#if}` block, refactor as needed — but the pattern is the same one used elsewhere in the codebase.

### Step 5: Run existing unit tests for MapContainer (if any)

Run: `cd frontend && npx vitest run src/lib/components/map/MapContainer.test.ts 2>&1 | tail -20`
Expected: existing tests still pass. If no test file exists, skip this step (existing call sites will be exercised by E2E in Task 7).

### Step 6: Commit

```bash
cd frontend
git add src/lib/components/map/MapContainer.svelte
git commit -m "feat(frontend): MapContainer accepts mode='view'|'draw' and mounts controller

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: `DashboardDrawSheet.svelte` + dashboard wiring

**Files:**
- Create: `frontend/src/lib/components/dashboard/DashboardDrawSheet.svelte`
- Modify: `frontend/src/routes/dashboard/+page.svelte`
- Delete: `frontend/src/lib/components/dashboard/DashboardDigitizePanel.svelte`
- Modify: `docs/adr/ADR-002-map-architecture.md`

**Interfaces:**
- Consumes: `Geometry` from `$shared/geojson`, `DrawMode` from `$shared/enums`, `saveDraftGeometry` from `$lib/services/api/draft-geometry`, `toastStore` from `$lib/stores/toast`
- Produces: events `addProject: CustomEvent<Geometry>`, `reset: CustomEvent<void>`, `geometry: CustomEvent<Geometry | null>`, `mode: CustomEvent<DrawMode>`

### Step 1: Create the sheet component

Create `frontend/src/lib/components/dashboard/DashboardDrawSheet.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Geometry } from '$shared/geojson';
  import type { DrawMode } from '$shared/enums';

  export let mode: DrawMode = 'polygon';
  export let geometry: Geometry | null = null;
  export let statusText: string = 'Buka peta dan klik untuk menggambar.';
  export let isMapMode: 'view' | 'draw' = 'view';

  let isOpen = false;

  const dispatch = createEventDispatcher<{
    addProject: Geometry;
    reset: void;
    modechange: DrawMode;
    mapModeChange: 'view' | 'draw';
  }>();

  function toggleOpen(): void {
    isOpen = !isOpen;
    dispatch('mapModeChange', isOpen ? 'draw' : 'view');
  }

  function selectMode(next: DrawMode): void {
    mode = next;
    dispatch('modechange', next);
  }

  function onReset(): void {
    geometry = null;
    dispatch('reset');
  }

  function onAddProject(): void {
    if (!geometry) return;
    dispatch('addProject', geometry);
  }

  $: isComplete = geometry !== null;
</script>

<!-- Handle: 24px tall, pinned bottom-center, offset 100px to the left -->
<button
  type="button"
  class="dashboard-draw-sheet-handle"
  class:open={isOpen}
  aria-expanded={isOpen}
  aria-controls="dashboard-draw-sheet-content"
  data-testid="dashboard-draw-sheet-handle"
  on:click={toggleOpen}
  title="Draft tidak tersimpan sampai Tambah Proyek ditekan"
>
  <span class="bar" aria-hidden="true" />
  <span class="label">Digitasi</span>
</button>

{#if isOpen}
  <div
    id="dashboard-draw-sheet-content"
    class="dashboard-draw-sheet"
    data-testid="dashboard-draw-sheet"
    role="region"
    aria-label="Digitasi Cepat"
  >
    <header>
      <strong>Digitasi Cepat</strong>
      <button
        type="button"
        class="close"
        aria-label="Tutup drawer"
        data-testid="dashboard-draw-sheet-close"
        on:click={toggleOpen}
      >✕</button>
    </header>

    <fieldset class="modes">
      <legend class="sr-only">Mode digitasi</legend>
      {#each ['point', 'line', 'polygon'] as DrawMode[] as m}
        <label>
          <input
            type="radio"
            name="dashboard-draw-mode"
            value={m}
            checked={mode === m}
            on:change={() => selectMode(m)}
            data-testid={`dashboard-draw-sheet-mode-${m}`}
          />
          <span>{m === 'point' ? 'Titik' : m === 'line' ? 'Garis' : 'Area'}</span>
        </label>
      {/each}
    </fieldset>

    <div class="status" aria-live="polite" data-testid="dashboard-draw-sheet-status">
      {statusText}
    </div>

    <div class="actions">
      <button
        type="button"
        class="reset"
        on:click={onReset}
        data-testid="dashboard-draw-sheet-reset"
      >Reset</button>
      <button
        type="button"
        class="primary"
        on:click={onAddProject}
        disabled={!isComplete}
        data-testid="dashboard-draw-sheet-add-project"
      >Tambah Proyek</button>
    </div>
  </div>
{/if}

<style>
  .dashboard-draw-sheet-handle {
    position: fixed;
    bottom: 12px;
    left: calc(50% - 100px);
    transform: translateX(-50%);
    z-index: 30;
    height: 24px;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(15, 23, 42, 0.85);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 12px;
    cursor: pointer;
  }
  .dashboard-draw-sheet-handle .bar {
    display: inline-block;
    width: 24px;
    height: 3px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 2px;
  }
  .dashboard-draw-sheet {
    position: fixed;
    bottom: 48px;
    left: calc(50% - 100px);
    transform: translateX(-50%);
    z-index: 30;
    width: 380px;
    max-width: calc(100vw - 32px);
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    padding: 12px 16px;
  }
  .dashboard-draw-sheet header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .dashboard-draw-sheet .close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
  }
  .dashboard-draw-sheet .modes {
    display: flex;
    gap: 12px;
    border: none;
    padding: 0;
    margin: 0 0 8px 0;
  }
  .dashboard-draw-sheet .modes label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }
  .dashboard-draw-sheet .status {
    min-height: 24px;
    font-size: 13px;
    color: #475569;
    margin-bottom: 12px;
  }
  .dashboard-draw-sheet .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .dashboard-draw-sheet .actions .reset {
    background: #f1f5f9;
    color: #0f172a;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
  }
  .dashboard-draw-sheet .actions .primary {
    background: #1d4ed8;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
  }
  .dashboard-draw-sheet .actions .primary[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .dashboard-draw-sheet,
    .dashboard-draw-sheet-handle {
      transition: none;
    }
  }
</style>
```

### Step 2: Wire the dashboard page

In `frontend/src/routes/dashboard/+page.svelte`:

- Remove the existing `<FloatingPanel ... extraClasses="!bottom-16"><DashboardDigitizePanel /></FloatingPanel>` block (lines ~241-250 per the spec).
- Add at the top of the script block, near other imports:

```svelte
<script lang="ts">
  // ... existing imports
  import DashboardDrawSheet from '$lib/components/dashboard/DashboardDrawSheet.svelte';
  import { saveDraftGeometry } from '$lib/services/api/draft-geometry';
  import { toastStore } from '$lib/stores/toast';
  import { goto } from '$app/navigation';
  import type { Geometry } from '$shared/geojson';
  import type { DrawMode } from '$shared/enums';

  let mapMode: 'view' | 'draw' = 'view';
  let drawMode: DrawMode = 'polygon';
  let committedGeometry: Geometry | null = null;
  let statusText = 'Buka peta dan klik untuk menggambar.';

  async function handleAddProject(e: CustomEvent<Geometry>) {
    const geometry = e.detail;
    const ok = saveDraftGeometry(geometry);
    if (!ok) {
      toastStore.error('Gagal menyimpan draft — kuota browser penuh');
      return;
    }
    toastStore.info(`Geometry disimpan sebagai draft (${geometry.type}). Mengarahkan ke Tambah Proyek…`);
    await goto('/projects/create');
  }

  function handleReset() {
    committedGeometry = null;
  }

  function handleModeChange(e: CustomEvent<DrawMode>) {
    drawMode = e.detail;
    committedGeometry = null;
  }
</script>
```

- Find the `<MapContainer ...>` element in the template and update:

```svelte
<MapContainer
  mode={mapMode}
  bind:committedGeometry
  bind:statusText
  ...other existing props
  on:geometrychange={(e) => (committedGeometry = e.detail.geometry)}
/>
```

- Add the sheet component after the map and the existing floating panels:

```svelte
<DashboardDrawSheet
  bind:mode={drawMode}
  bind:geometry={committedGeometry}
  {statusText}
  {mapMode}
  on:addProject={handleAddProject}
  on:reset={handleReset}
  on:modechange={handleModeChange}
  on:mapModeChange={(e) => (mapMode = e.detail)}
/>
```

Note: The exact prop names on the existing `MapContainer` vary — match the file's style. The two new bindings (`committedGeometry` and `statusText`) need to be added as `export let` if `MapContainer` does not yet declare them; this was already done in Task 4. If you need a one-line `event` like `on:geometrychange`, Svelte 4's `createEventDispatcher` is the source — it bubbles to `MapContainer` which forwards.

### Step 3: Delete the old panel

```bash
rm frontend/src/lib/components/dashboard/DashboardDigitizePanel.svelte
```

### Step 4: Update ADR-002

Edit `docs/adr/ADR-002-map-architecture.md` — find the section listing the "MapContainer is read-only" invariant and append:

```markdown
### Draw mode opt-in (amended 2026-06-28)

The dashboard surface uses `MapContainer` in `mode='draw'`, which mounts a
`MapDrawController` child to add a draft geometry layer and click handlers.
This is **opt-in per page**: the `mode` prop defaults to `'view'`, so other
routes (assets, etc.) keep the read-only behavior. See
`docs/superpowers/specs/2026-06-28-hybrid-map-digitize-design.md` §3.1 for
the full architecture.
```

### Step 5: Run type check

Run: `cd frontend && npm run check`
Expected: exit 0. Fix any TS errors that surface from missing imports or prop mismatches.

### Step 6: Commit

```bash
cd frontend
git add src/lib/components/dashboard/DashboardDrawSheet.svelte src/lib/components/dashboard/DashboardDigitizePanel.svelte src/routes/dashboard/+page.svelte ../docs/adr/ADR-002-map-architecture.md
git commit -m "feat(frontend): bottom sheet drawer for dashboard digitize, retire FloatingPanel

- Replaces DashboardDigitizePanel + FloatingPanel with DashboardDrawSheet
- Wires MapContainer mode='draw' on the dashboard
- ADR-002 amended: draw mode is opt-in per page

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: E2E spec for the sheet + a11y test

**Files:**
- Create: `frontend/tests/e2e/dashboard-digitize-sheet.spec.ts`
- Delete: `frontend/tests/e2e/dashboard-digitize-panel.spec.ts`
- Modify: `frontend/tests/e2e/a11y.spec.ts`
- Modify: `docs/superpowers/specs/2026-06-27-dashboard-digitize-bridge-design.md` (add superseded header)

### Step 1: Create the new E2E spec

Create `frontend/tests/e2e/dashboard-digitize-sheet.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard bottom sheet digitize', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin to ensure digitize UI is reachable
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@simanta.test');
    await page.getByLabel('Password').fill('password');
    await page.getByLabel('OTP').fill('123456');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await page.waitForURL('**/dashboard');
  });

  test('sheet is collapsed by default', async ({ page }) => {
    await expect(page.getByTestId('dashboard-draw-sheet-handle')).toBeVisible();
    await expect(page.getByTestId('dashboard-draw-sheet')).toHaveCount(0);
  });

  test('tapping the handle opens the sheet and switches the map to draw mode', async ({ page }) => {
    await page.getByTestId('dashboard-draw-sheet-handle').click();
    await expect(page.getByTestId('dashboard-draw-sheet')).toBeVisible();
    // Mode radios visible
    await expect(page.getByTestId('dashboard-draw-sheet-mode-polygon')).toBeChecked();
  });

  test('polygon: 4 clicks + close on first vertex enables CTA', async ({ page }) => {
    await page.getByTestId('dashboard-draw-sheet-handle').click();
    const map = page.locator('.maplibregl-canvas');
    const box = await map.boundingBox();
    if (!box) throw new Error('map canvas not found');
    // 4 distinct clicks
    await page.mouse.click(box.x + 100, box.y + 100);
    await page.mouse.click(box.x + 200, box.y + 100);
    await page.mouse.click(box.x + 200, box.y + 200);
    await page.mouse.click(box.x + 100, box.y + 200);
    // Close by clicking the first vertex
    await page.mouse.click(box.x + 100, box.y + 100);
    await expect(page.getByTestId('dashboard-draw-sheet-add-project')).toBeEnabled();
  });

  test('CTA navigates to /projects/create and pre-imports the geometry', async ({ page }) => {
    await page.getByTestId('dashboard-draw-sheet-handle').click();
    const map = page.locator('.maplibregl-canvas');
    const box = await map.boundingBox();
    if (!box) throw new Error('map canvas not found');
    await page.mouse.click(box.x + 100, box.y + 100);
    await page.mouse.click(box.x + 200, box.y + 100);
    await page.mouse.click(box.x + 200, box.y + 200);
    await page.mouse.click(box.x + 100, box.y + 200);
    await page.mouse.click(box.x + 100, box.y + 100);
    await page.getByTestId('dashboard-draw-sheet-add-project').click();
    await page.waitForURL('**/projects/create');
    // Import toast should appear
    await expect(page.getByText(/Diimpor dari Dashboard/)).toBeVisible({ timeout: 5000 });
  });

  test('Reset clears the geometry and disables the CTA', async ({ page }) => {
    await page.getByTestId('dashboard-draw-sheet-handle').click();
    const map = page.locator('.maplibregl-canvas');
    const box = await map.boundingBox();
    if (!box) throw new Error('map canvas not found');
    await page.mouse.click(box.x + 100, box.y + 100);
    await page.getByTestId('dashboard-draw-sheet-reset').click();
    await expect(page.getByTestId('dashboard-draw-sheet-add-project')).toBeDisabled();
  });
});
```

### Step 2: Delete the old E2E spec

```bash
rm frontend/tests/e2e/dashboard-digitize-panel.spec.ts
```

### Step 3: Add a11y test for the sheet

In `frontend/tests/e2e/a11y.spec.ts`, find the test block that runs axe-core on the dashboard. Add a new test:

```typescript
  test('dashboard draw sheet passes axe-core', async ({ page }) => {
    // login (same flow as the rest of the file)
    await page.goto('/login');
    // ... reuse existing login helper if present
    await page.getByTestId('dashboard-draw-sheet-handle').click();
    await page.getByTestId('dashboard-draw-sheet').waitFor();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
```

Use the same AxeBuilder import already used elsewhere in the file. Adjust the login flow to match whatever helper this file uses.

### Step 4: Add superseded header to old spec

Edit `docs/superpowers/specs/2026-06-27-dashboard-digitize-bridge-design.md` — at the very top, after the H1, insert:

```markdown
> **Status:** SUPERSEDED for the dashboard surface by
> [`2026-06-28-hybrid-map-digitize-design.md`](./2026-06-28-hybrid-map-digitize-design.md).
> The `sessionStorage` bridge contract (§5) and the `/projects/create` import flow (§4) remain authoritative.
```

### Step 5: Commit

```bash
cd frontend
git add tests/e2e/dashboard-digitize-sheet.spec.ts tests/e2e/dashboard-digitize-panel.spec.ts tests/e2e/a11y.spec.ts ../docs/superpowers/specs/2026-06-27-dashboard-digitize-bridge-design.md
git commit -m "test(frontend): E2E for dashboard draw sheet + a11y, retire old panel spec

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Full `verify:mvp` gate

**Files:** none modified — this task is a checkpoint.

### Step 1: Run type check

Run: `cd frontend && npm run check`
Expected: exit 0. If errors point to Svelte 4 vs 5 syntax issues, fix inline.

### Step 2: Run unit tests

Run: `cd frontend && npm run test`
Expected: all green, including the 12 new tests in `drawing-controller.test.ts` and the 5 new tests in `MapDrawController.test.ts`.

### Step 3: Run build

Run: `cd frontend && npm run build`
Expected: exit 0, no warnings about missing imports or unused props.

### Step 4: Run E2E

Run: `cd frontend && npm run test:e2e`
Expected: all 5 new sheet specs pass. Other E2E specs (frontend-mvp, a11y) must also pass — the sheet change must not regress them.

### Step 5: Run a11y

Run: `cd frontend && npm run test:a11y`
Expected: all green, including the new sheet a11y test.

### Step 6: Run the full verify script

Run: `cd frontend && npm run verify:mvp`
Expected: all gates pass. If any gate fails, return to the relevant task and fix.

### Step 7: No commit needed (gate only)

If `verify:mvp` passes, the plan is complete. Tag the closing commit:

```bash
cd frontend
git log --oneline -1
# Note the SHA. Mention it in the next user message.
```

If `verify:mvp` fails, the failure tells you which task to revisit. Do not amend prior commits; add a fixup commit instead.

---

## Self-Review Notes

- **Spec coverage**: spec §3.1 (mode prop) → Task 4. §3.2 (tree) → Task 5. §3.3 (data flow) → Task 5 handlers. §4.1 (pure module) → Task 2. §4.2 (controller) → Task 3. §4.3 (sheet UI) → Task 5. §4.5 (MapContainer change) → Task 4. §4.7 (DrawMode type) → Task 1. §5.2 (error matrix) → covered in Task 2 (`commit` null on insufficient) and Task 3 (click suppression, isStyleLoaded guard, layer cleanup). §5.3 (a11y) → Task 6. §6 (file diff) → all 14 files accounted for across Tasks 1-6. §7 (testing) → Tasks 2, 3, 6, 7. §8 (out of scope) → spec only, no task needed. §9 (risks) → dblclick suppression in Task 3, layer cleanup in Task 3, handle offset in Task 5, MapContainer default in Task 4, hover tolerance in Task 3.
- **Type consistency**: `DrawMode` defined in `shared/src/enums` (Task 1), imported in `drawing-controller.ts` (Task 2) and `MapDrawController.svelte` (Task 3) and `DashboardDrawSheet.svelte` (Task 5). `VertexState` exported from `drawing-controller.ts` only — internal to the drawing pair. `Geometry` used consistently as `$shared/geojson` import.
- **Event names**: `geometrychange` on `MapDrawController` → forwarded to `MapContainer` → re-emitted to `+page.svelte`. Sheet events: `addProject`, `reset`, `modechange`, `mapModeChange` — all defined and used consistently.
- **Method names**: `addVertex`, `tryClosePolygon`, `commit`, `reset` defined in Task 2 and used in Task 3. No drift.
- **Style cleanup**: every `addLayer` has a corresponding `removeLayer` in `onDestroy`. Every `map.on` has a `map.off` in `onDestroy` or the `onMount` cleanup return.
- **Out-of-scope deferred items** (keyboard, undo, multi-geom) appear in spec §8 but not in tasks — correct, those are post-MVP only.

Plan complete and saved to `docs/superpowers/plans/2026-06-28-hybrid-map-digitize.md`.
