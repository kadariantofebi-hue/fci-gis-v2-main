# Hybrid MapContainer + Bottom Sheet Drawer for Dashboard Digitize

**Status:** Proposed
**Date:** 2026-06-28
**Author:** Claude (brainstorming session with user)
**Supersedes:** N/A (replaces design §3 and §7 of `2026-06-27-dashboard-digitize-bridge-design.md` for the dashboard surface only; `/projects/create` flow unchanged)
**PRD:** v1.3.7 Go-Live Hardening (inherited from previous phase)

## 1. Problem

The current "Digitasi Cepat" implementation on the dashboard (committed in `8bbe4fb`, refined through `efd8cbf`) mounts a `FloatingPanel` at the bottom-left of the dashboard, which embeds a **second** `MapLibre` instance (`DigitizeMapPanel` at `h-60`). The result is:

- **Two MapLibre instances** on `/dashboard`: the main basemap (`MapContainer`) and the mini digitizer. This doubles tile requests, hurts time-to-interactive on slow connections, and contradicts the post-MVP risk register §7.1 ("share one MapLibre instance via a context") that was previously deferred.
- **Visual redundancy**: a 240px-tall mini map floating over a full-size basemap. Users must mentally "switch contexts" between drawing on the small map and locating themselves on the big map.
- **Six floating panels on the dashboard** (KPI, Filter, Zoom, Legend, SimulateRow, Digitize). The Digitize panel is the only one with a duplicate map; removing it brings the count back to five.

The user requested: "reduce the number of visual UI elements, and allow direct add-project from a drawer." They also authorized breaking the "MapContainer is read-only" invariant (ADR-002) for this scope.

## 2. Goal

Replace the dashboard's `FloatingPanel`-based digitizer with a **bottom sheet drawer** that drives a **draw mode on the main basemap** (`MapContainer`). One MapLibre instance. The user draws the polygon directly on the basemap they can already see, then taps a CTA to navigate to `/projects/create` with the draft geometry.

**Out of scope (per user direction "hanya Dashboard"):**
- `/projects/create` editor continues to use the full-size `DigitizeMapPanel`. No change.
- `MapContainer` instances on other routes (asset view, etc.) remain `'view'` mode. The `mode` prop defaults to `'view'`, so existing call sites are unaffected.
- Multi-geometry batch, undo/redo, drag-edit vertices, keyboard drawing — post-MVP.

## 3. Architecture

### 3.1 Mode state on MapContainer

`MapContainer.svelte` gains a `mode?: 'view' | 'draw'` prop (default `'view'`). In `'view'` mode the component behaves exactly as today — read-only basemap, no drawing layer, no click handlers. In `'draw'` mode the component additionally mounts `<MapDrawController>` as a child, which adds a GeoJSON source + fill/outline layers and attaches click/dblclick handlers to the same MapLibre instance.

`MapContainer` exposes two bindable outputs to its parent:

- `committedGeometry: Geometry | null` — the final shape, set on commit (polygon close, line dblclick, or point click)
- `statusText: string` — a short Indonesian label for the sheet to display ("0 vertex", "Klik untuk tambah vertex", "Polygon ditutup", etc.)

This keeps `MapContainer` agnostic about *what* uses the geometry; it only knows that in `'draw'` mode it should host a drawing layer and emit shapes.

### 3.2 Component tree on `/dashboard`

```
routes/dashboard/+page.svelte
├─ <MapContainer mode="draw" bind:committedGeometry bind:statusText ...>
│   └─ <MapDrawController mode={currentMode} {map} on:geometrychange>
│
├─ <DashboardDrawSheet
│     bind:mode
│     bind:geometry={committedGeometry}
│     {statusText}
│     on:addProject
│     on:reset />
│
└─ (5 floating panels unchanged: KPI, Filter, Zoom, Legend, SimulateRow)
```

`<DashboardDigitizePanel>` is removed. The previous `<FloatingPanel extraClasses="!bottom-16">` mount point is also removed.

### 3.3 Data flow

```
User taps sheet handle (collapsed state)
  → DashboardDrawSheet.isOpen = true
  → +page.svelte sets MapContainer.mode = 'draw'
       ↓
MapContainer mounts <MapDrawController>
  MapDrawController:
    ├─ on map.isStyleLoaded(), add source 'draft-shape' + layers (fill, outline, vertices)
    ├─ map.on('click', handleClick)        → drawing-controller.addVertex
    ├─ map.on('dblclick', handleDblClick)  → drawing-controller.commit (line)
    └─ for polygon: on mousemove near first vertex, raise outline highlight (no tooltip)
       ↓
After every addVertex:
  ├─ update source data with new FeatureCollection (live render)
  └─ emit('geometrychange', { vertices, statusText, isComplete })
       ↓
+page.svelte: bind:statusText updates sheet label; bind:committedGeometry updates when isComplete
       ↓
User taps CTA "Tambah Proyek" in sheet (enabled when isComplete)
  → +page.svelte: saveDraftGeometry(geometry)
    ├─ on false (quota / JSON error): toast.error, abort
    └─ on true: toast.info, goto('/projects/create')
       ↓
/projects/create: existing consumeDraftGeometry() flow (unchanged)
```

## 4. Components

### 4.1 New: `lib/components/map/drawing-controller.ts` (pure module, ~80 LOC)

Pure functions, no DOM, no MapLibre imports. Takes a `VertexState` and returns updated state or geometry. The `DrawMode` type is imported from `$shared/enums` (see §4.7) to keep a single source of truth.

```ts
import type { DrawMode } from '$shared/enums';

export interface VertexState {
  mode: DrawMode;
  vertices: [number, number][];   // [lng, lat]
  isComplete: boolean;
}

export function addVertex(state: VertexState, lngLat: [number, number]): VertexState;
export function tryClosePolygon(state: VertexState, lngLat: [number, number], tolerancePx: number, firstVertexPx: [number, number]): { closed: boolean; state: VertexState };
export function commit(state: VertexState): Geometry | null;   // Point | LineString | Polygon, or null if not enough vertices
export function reset(): VertexState;
```

Tolerance and pixel coords are passed in so the controller stays pure. `MapDrawController.svelte` does the map-projection conversion (lng/lat → pixels via `map.project()`) before calling these.

### 4.2 New: `lib/components/map/MapDrawController.svelte` (~120 LOC)

Renders nothing (`{#if false}` slot or just `<!-- -->`). Mounted as a child of `MapContainer`. Receives the `map` instance via prop or context. Responsibilities:

- Wait for `map.isStyleLoaded()` then add source `'draft-shape'` and layers (fill, outline, vertex circles)
- Attach `map.on('click')` and `map.on('dblclick')` handlers
- For polygon mode, attach `map.on('mousemove')` to project the first vertex to pixels and highlight outline when cursor is within 15px
- For `'line'` mode, single-click is suppressed within 250ms after dblclick (MapLibre fires both; we swallow the trailing click)
- On `commit()`, emit `geometrychange` event with the `Geometry`
- On `reset` (mode change or geometry change to null), clear source data and vertices
- `onDestroy`: `map.removeLayer()` for all draft layers, `map.removeSource('draft-shape')`, `map.off()` for all attached handlers

Props: `mode: DrawMode`, `map: maplibregl.Map`. Events: `geometrychange: CustomEvent<{ geometry: Geometry | null; statusText: string; isComplete: boolean }>`.

### 4.3 New: `lib/components/dashboard/DashboardDrawSheet.svelte` (~100 LOC)

Bottom sheet drawer. Renders:

- A 24px-tall handle pinned to bottom-center, **offset 100px to the left** of center to sit alongside `SimulateRow` (which is also at bottom-center) without overlap. Handle is `<button>` with `role="button"`, `aria-expanded={isOpen}`, `aria-controls={sheetContentId}`.
- When `isOpen`, a sheet slides up to height 280px, containing:
  - Close "✕" on the right of the header
  - Mode radio group: ○ Titik / ○ Garis / ● Area (default polygon)
  - Status text: `<div aria-live="polite">{statusText}</div>`
  - Two buttons: "Reset" (secondary), "Tambah Proyek" (primary, disabled when `!isComplete`)

When the handle is tapped while open, `isOpen` becomes false and the sheet slides down. There is no separate "Cancel" button — the user signals cancellation by closing the sheet (per the brainstorming decision: minimal UX). Reset is for "wrong shape, redraw"; close is for "abandon entirely".

The sheet does **not** contain its own map. It binds to `committedGeometry` and `statusText` from `MapContainer` and only renders the chrome. Sheet transitions respect `prefers-reduced-motion: reduce`: no slide animation, just show/hide.

### 4.4 Deleted: `lib/components/dashboard/DashboardDigitizePanel.svelte`

Removed. The FloatingPanel mount in `+page.svelte` (lines 241-250 of `routes/dashboard/+page.svelte`) is replaced by `<DashboardDrawSheet>`. The `extraClasses="!bottom-16"` hack is no longer needed because the sheet handle is positioned in its own right.

### 4.5 Changed: `lib/components/map/MapContainer.svelte`

Two changes:

1. Add prop `mode?: 'view' | 'draw' = 'view'`. When `'draw'`, mount `<MapDrawController>` after the basemap layers are added.
2. Expose `bind:committedGeometry` and `bind:statusText`. The flow: `MapDrawController` emits a `geometrychange` event with the geometry and status; `MapContainer` forwards those to its parent via the bound variables (Svelte event forwarding with `on:geometrychange` is sufficient — no new internal state is added to `MapContainer` itself).

The existing render-token race guard at line ~615 continues to apply. `MapDrawController` waits for `map.isStyleLoaded()` before adding layers, so it cannot race the basemap.

### 4.6 Unchanged

- `lib/components/map/DigitizeMapPanel.svelte` — still used by `/projects/create`
- `lib/services/api/draft-geometry.ts` — bridge contract preserved (`saveDraftGeometry`, `consumeDraftGeometry`, `clearDraftGeometry`)
- `routes/projects/create/+page.svelte` — the import on `onMount` is unchanged

### 4.7 New type: `shared/src/enums.ts`

```ts
export type DrawMode = 'point' | 'line' | 'polygon';
```

## 5. State & Error Handling

### 5.1 State machine

`MapContainer.mode` is a simple toggle: `'view' ↔ 'draw'`. Transitions:

- `'view' → 'draw'`: user taps the sheet handle. `MapDrawController` mounts.
- `'draw' → 'view'`: user taps the handle to close the sheet, or navigates away. `MapDrawController` unmounts; its `onDestroy` removes the source, layers, and event handlers.

The `vertices` and `isComplete` state lives entirely inside `MapDrawController`. It is reset whenever `mode` changes (point → line → polygon) or `geometry` is set to null.

### 5.2 Error matrix

| Condition | Behavior |
|---|---|
| User clicks on a tile that has not finished loading | `MapDrawController` rejects the click (no vertex added). `statusText` becomes "Lokasi belum siap, coba lagi." |
| `QuotaExceededError` from `sessionStorage.setItem` | `toast.error('Gagal menyimpan draft — kuota browser penuh')`. CTA does not navigate. Identical to current behavior. |
| Corrupted draft at `/projects/create` | `consumeDraftGeometry()` returns `null` and clears the key. Existing path, unchanged. |
| User changes mode (e.g. polygon → line) with 2 pending vertices | `vertices = []`, `isComplete = false`, `statusText = 'Mode diganti. Klik untuk tambah vertex.'` No data is persisted, so no data loss. |
| User navigates away mid-draw (browser back, route change) | `MapContainer` unmounts, which unmounts `MapDrawController`, which cleans up the source and handlers. The in-progress vertices are not saved; the user is informed of this via the handle's tooltip ("Draft tidak tersimpan sampai Tambah Proyek ditekan"). |
| MapLibre fails to load | Existing `MapContainer` render-token guard kicks in. `MapDrawController` does not mount until `map.isStyleLoaded()` resolves. |
| dblclick on map (default zoom behavior) | In `polygon` mode, dblclick is suppressed during draw (default browser behavior re-enabled after mode returns to `'view'`). In `line` mode, dblclick is the commit signal. |

### 5.3 Accessibility

- Sheet handle: `role="button"`, `aria-expanded`, `aria-controls`, keyboard `Enter`/`Space` to toggle
- Mode radio: native `<input type="radio">` group, `aria-label="Mode digitasi"`
- Status text: `aria-live="polite"` so screen readers announce vertex counts and state changes
- CTA: `<button type="button" disabled={!isComplete}>`
- Sheet transitions: respect `prefers-reduced-motion: reduce` (no slide animation, just show/hide)

Keyboard drawing (Enter to commit point, Esc to cancel) is **out of scope for this iteration** — see §8.

## 6. File Diff Summary

| File | Action | LOC |
|---|---|---|
| `frontend/src/lib/components/map/drawing-controller.ts` | New | +80 |
| `frontend/src/lib/components/map/drawing-controller.test.ts` | New | +120 |
| `frontend/src/lib/components/map/MapDrawController.svelte` | New | +120 |
| `frontend/src/lib/components/map/MapDrawController.test.ts` | New | +90 |
| `frontend/src/lib/components/dashboard/DashboardDrawSheet.svelte` | New | +100 |
| `frontend/src/lib/components/dashboard/DashboardDigitizePanel.svelte` | Deleted | -120 |
| `frontend/src/lib/components/map/MapContainer.svelte` | Edited | +30 |
| `frontend/src/routes/dashboard/+page.svelte` | Edited | +5 / -10 |
| `frontend/shared/src/enums.ts` | Edited | +3 |
| `frontend/docs/adr/ADR-002-map-architecture.md` | Edited | +10 |
| `frontend/tests/e2e/dashboard-digitize-sheet.spec.ts` | New | +90 |
| `frontend/tests/e2e/dashboard-digitize-panel.spec.ts` | Deleted | -60 |
| `frontend/tests/e2e/a11y.spec.ts` | Edited (one new test) | +25 |
| `frontend/docs/superpowers/specs/2026-06-27-dashboard-digitize-bridge-design.md` | Edited (superseded note) | +5 |

**Net:** ~+440 LOC, -190 LOC. Mostly additive.

## 7. Testing Strategy

### 7.1 Unit (vitest, co-located)

- `drawing-controller.test.ts` — 12 cases covering `addVertex`, `tryClosePolygon` (within/outside tolerance, mode gating), `commit` (insufficient vertices returns null, point/line/polygon assembly, polygon ring closure)
- `MapDrawController.test.ts` (jsdom) — 6 cases: layer added on `isStyleLoaded`, mode change resets state, cleanup on unmount, event emission, render-token race guard, dblclick click suppression

### 7.2 E2E (Playwright)

- `tests/e2e/dashboard-digitize-sheet.spec.ts` (replaces `dashboard-digitize-panel.spec.ts`):
  1. Sheet is collapsed by default on `/dashboard`
  2. Tapping the handle opens the sheet; mode radio is visible; map cursor is `crosshair`
  3. Polygon mode: click 4 points on the basemap, click the first point to close, CTA becomes enabled
  4. CTA → navigation to `/projects/create` + import toast visible + form `geometry` populated
  5. "Reset" → vertices cleared, CTA disabled
- `tests/e2e/a11y.spec.ts` — one new test using axe-core: sheet passes focus order, `aria-expanded` toggles, no `prefers-reduced-motion` regression

### 7.3 Manual smoke

- Desktop 1920×1080: full layout
- Mobile 375×812: sheet should span full width
- Basemap switch (sat → standard): drawing layer remains visible
- Slow 3G throttling: mode='draw' does not crash when tiles lag
- Mid-draw cancel: close sheet at vertex=2, reopen → fresh state

## 8. Out of Scope (Post-MVP)

Captured in the post-mvp hardening checklist as new TODO(mvp2) markers:

- Keyboard drawing (Enter to commit point, Esc to cancel draw)
- Undo/Redo (currently only Reset exists)
- Multi-geometry batch (multiple polygons in one draft)
- Drag-edit vertices after polygon close
- Persist draft across browser tabs (sessionStorage is per-tab)
- Drawing mode in `/assets` view (today's read-only asset map)
- Native mobile gestures (pinch-zoom-while-drawing)

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| MapLibre fires `click` after `dblclick` — double-adds vertex on line commit | `MapDrawController` sets a 250ms suppression flag after handling dblclick in line mode. |
| Layers leak if user navigates away mid-draw | `MapDrawController.onDestroy` removes source + layers + handlers. Tested in unit test. |
| Sheet handle collides with `SimulateRow` at bottom-center | Handle is offset 100px to the left of center; verified by visual review at 1920×1080. |
| Hover highlight near first vertex fires too often at low zoom | Tolerance is 15px in screen space, computed via `map.project()`. At low zoom the visual snap zone is the same 15px, so behavior is consistent. |
| User closes sheet mid-draw expecting draft to be saved | Disclosed in handle tooltip: "Draft tidak tersimpan sampai Tambah Proyek ditekan." No silent data loss. |
| `MapContainer` API change breaks other routes | `mode` prop is optional with `'view'` default. All existing call sites keep working unchanged. |

## 10. Superseded Doc Note

The previous design (`docs/superpowers/specs/2026-06-27-dashboard-digitize-bridge-design.md`) describes the `FloatingPanel` + `DigitizeMapPanel` mini-map + `sessionStorage` bridge. Sections 3 (Components) and 7 (Risk Register) of that document are superseded by this spec for the dashboard surface. The `sessionStorage` bridge contract (§5 of the old spec) and the `/projects/create` import flow (§4) are still authoritative and remain unchanged.
