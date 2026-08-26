# Dashboard Digitize Bridge — Design Spec

**Date:** 2026-06-27
**Status:** Draft (pending user approval)
**Author:** brainstorming session with user
**Scope:** SIMANTA frontend-only MVP — adds digitize-to-create flow on Dashboard

---

## 1. Purpose & Background

SIMANTA (Sistem Informasi Manajemen Aset, Tata Wilayah & Administrasi Proyek GIS) lets an Admin/OPD Admin digitize a new project's location, then attach administrative documents. Today the only path to create a project is `/projects/create`, where the user must (a) fill in the address + project metadata, and (b) digitize the geometry on the inline `DigitizeMapPanel` in the "Lokasi & Peta wilayah" card.

This flow forces the user to context-switch between form fields and the digitizer, and offers no way to sketch a polygon on the global Dashboard map (which already shows all existing projects at full-screen).

This spec adds a **"Digitasi Cepat"** floating panel on `/dashboard` that lets the user digitize a polygon/line/point on a mini MapLibre map, then click **"Tambah Proyek dari geometri ini"** to jump to `/projects/create` with the geometry pre-loaded. The bridge is one-shot via `sessionStorage` — a draft that vanishes when the tab closes.

## 2. Goals & Non-Goals

### 2.1 Goals
- Single-click from polygon on Dashboard to fully-loaded `/projects/create` form
- Reuse the proven `DigitizeMapPanel` component (no new map widget)
- No backend changes (frontend-only contract-first MVP, per `CLAUDE.md`)
- Consistent with the existing full-maps Dashboard layout (5 FloatingPanel + MapContainer)
- Geometry stays the source of truth (PRD v1.3.7 §6.7/§6.8)

### 2.2 Non-Goals
- Multi-step wizard / multi-geometry batch upload
- Persisting the draft across tabs (only within the same tab via `sessionStorage`)
- Pre-filling the address fields (roadName/rt/rw/kelurahan/kecamatan) — user fills them manually
- Editing geometry inline on the Dashboard MapContainer (kept read-only per ADR-002 swap-point invariant)
- Real-time two-way binding between dashboard map and create page

## 3. Architecture

### 3.1 Files Touched

| File | Change |
|---|---|
| `frontend/src/lib/components/dashboard/DashboardDigitizePanel.svelte` | **NEW** — Floating panel body, 3-mode toggle, Reset, "Tambah Proyek" CTA, reuses `DigitizeMapPanel` |
| `frontend/src/lib/services/api/draft-geometry.ts` | **NEW** — `saveDraftGeometry`, `consumeDraftGeometry`, `clearDraftGeometry` helpers |
| `frontend/src/lib/services/api/draft-geometry.test.ts` | **NEW** — co-located unit tests (round-trip, consume-once, SSR safety) |
| `frontend/src/routes/dashboard/+page.svelte` | **EDIT** — add `DashboardDigitizePanel` wrapped in `FloatingPanel` at `position="bottom-left"` |
| `frontend/src/routes/projects/create/+page.svelte` | **EDIT** — `onMount` reads draft, assigns `form.geometry`, sets `digitizeMode` from geometry type, shows info toast |

### 3.2 Data Flow

```
┌─────────────── /dashboard ───────────────┐
│                                           │
│  [User clicks "Area" toggle]              │
│       ↓                                   │
│  [User clicks 3+ vertices on mini map]   │
│       ↓                                   │
│  [User clicks first vertex to close]      │
│       ↓                                   │
│  DigitizeMapPanel emits 'change' (Polygon)│
│       ↓                                   │
│  DashboardDigitizePanel committedGeometry │
│  = Polygon                                │
│       ↓                                   │
│  Button "Tambah Proyek" becomes enabled   │
│       ↓                                   │
│  [User clicks button]                     │
│       ↓                                   │
│  saveDraftGeometry(Polygon)               │
│  → sessionStorage['simanta.draft...v1']   │
│       ↓                                   │
│  goto('/projects/create')                 │
│                                           │
└───────────────────────────────────────────┘
              ↓
┌────────── /projects/create ──────────────┐
│                                           │
│  onMount:                                 │
│    draft = consumeDraftGeometry()         │
│    if draft:                              │
│      form.geometry = draft                │
│      digitizeMode = draft.type→'point'    │
│                          /'line'/'polygon'│
│      toastStore.info(                     │
│        'Geometry diimpor dari Dashboard') │
│                                           │
│  [User fills roadName/rt/rw/...manual]    │
│  [User fills projectCode, vendor, etc.]   │
│  [Clicks "Simpan proyek + dokumen"]       │
│                                           │
└───────────────────────────────────────────┘
```

### 3.3 Storage Contract

**Key:** `simanta.draft.geometry.v1`
**Scope:** `sessionStorage` (per-tab, vanishes on tab close)
**Shape:**
```typescript
type Stored = {
  geometry: Geometry;        // GeoJSON Point | LineString | Polygon
  consumed: boolean;         // false on save, true after first consume
  createdAt: number;         // Date.now() — reserved for future TTL/freshness
};
```

**Lifecycle:**
- `saveDraftGeometry(g)` — writes with `consumed: false`
- `consumeDraftGeometry()` — reads, if `consumed: false` returns geometry and sets `consumed: true`; if `consumed: true` or missing/corrupted returns `null`
- `clearDraftGeometry()` — removes the key (used by Reset button)

## 4. Component Design

### 4.1 `DashboardDigitizePanel.svelte`

**Props:** none (self-contained)
**Events:** `geometry: CustomEvent<Geometry | null>` — fires when user commits geometry (so future parent wiring can hook analytics)

**State:**
- `mode: 'point' | 'line' | 'polygon' = 'polygon'`
- `committedGeometry: Geometry | null = null` (null = idle/drawing)
- `showResumeBanner: boolean = false` (reserved for future "continue draft" flow — not in MVP)

**UI layout (within `FloatingPanel` body):**
```
┌────────────────────────────────────────┐
│ Mode: [Titik] [Garis] [Area]   Reset   │ ← mode radiogroup + Reset
│ ┌── mini MapLibre (h-60, ~240px) ───┐  │
│ │  (klik untuk digitasi)            │  │
│ └────────────────────────────────────┘  │
│ Geometry: Polygon · 5 vertex            │ ← live status
│ ┌────────────────────────────────────┐  │
│ │ Tambah Proyek dari geometri ini  → │  │ ← primary CTA, disabled until commit
│ └────────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**Behavior:**
- `mode` radio group drives the inner `DigitizeMapPanel mode={mode}` prop (reactive)
- When `DigitizeMapPanel` emits `change(g)`, store in `committedGeometry`
- The CTA button is disabled until `committedGeometry !== null`
- Reset button calls `committedGeometry = null` + clear inner DigitizeMapPanel (re-render via `{#key mode}` trick if needed)
- CTA click: `saveDraftGeometry(committedGeometry)` then `goto('/projects/create')`

### 4.2 `draft-geometry.ts` helper

Browser-only (guard `typeof window`). Three pure-ish functions:
- `saveDraftGeometry(g: Geometry): void` — `try/catch` JSON.stringify + setItem; toast on quota error
- `consumeDraftGeometry(): Geometry | null` — getItem → JSON.parse → return & flip flag, or return null
- `clearDraftGeometry(): void` — removeItem

All three functions are safe to call during SSR (return safe defaults) per the existing pattern in `lib/services/api/*`.

### 4.3 Edit — `dashboard/+page.svelte`

Add import + 1 new `<FloatingPanel>` block at `position="bottom-left"` (currently the only free slot — top-left, top-right, right-middle, bottom-right, bottom-center are taken). No other changes to the existing 5 panels.

### 4.4 Edit — `projects/create/+page.svelte`

Add `onMount` block (the file currently has no `onMount` — `+page.svelte` is client-only by `+layout.ts` `ssr = false`):
```typescript
onMount(() => {
  const draft = consumeDraftGeometry();
  if (draft) {
    form.geometry = draft;
    digitizeMode = draft.type === 'Point' ? 'point'
                 : draft.type === 'LineString' ? 'line'
                 : 'polygon';
    toastStore.info(`Geometry diimpor dari Dashboard (${draft.type}).`);
  }
});
```

Field alamat (roadName/rt/rw/kelurahan/kecamatan) **tidak** disentuh — tetap string kosong, user isi manual.

## 5. Error Handling

| Scenario | Behavior |
|---|---|
| User clicks "Tambah Proyek" without committing | Button `disabled` + `aria-disabled="true"`, no-op |
| `sessionStorage` quota exceeded | `try/catch` in `saveDraftGeometry`, `toastStore.error('Gagal menyimpan draft — kuota browser penuh')`, abort navigation |
| Corrupted JSON in storage | `try/catch` in `consumeDraftGeometry`, return `null`, `clearDraftGeometry()` to clean up |
| Reload `/projects/create` after import | `consumed: true` flag prevents re-import. Form state still holds geometry from Svelte runtime |
| Open `/projects/create` without going through dashboard | `sessionStorage` empty → no banner, no toast — clean state |
| Geometry type mismatch on import | `digitizeMode` synced to `draft.type`; DigitizeMapPanel resets via reactive `$: mode; reset()` (already in component) |
| User clicks Reset after commit | `committedGeometry = null`, CTA disabled, inner DigitizeMapPanel cleared |
| Draft expires (tab close → reopen) | `sessionStorage` cleared by browser — clean state, no stale data |

## 6. Testing Strategy

### 6.1 Unit tests — `draft-geometry.test.ts`

Co-located next to the helper. Cover:
- `saveDraftGeometry` round-trip (set then get via consume)
- `consumeDraftGeometry` returns geometry on first call, `null` on second
- `consumeDraftGeometry` returns `null` on corrupted JSON + clears key
- `clearDraftGeometry` removes key
- SSR safety: all three functions return safe defaults when `window` undefined

### 6.2 E2E test — extend `tests/e2e/frontend-mvp.spec.ts`

New spec: `Dashboard digitize → projects/create bridge`
- Login as `admin@simanta.test`
- Navigate to `/dashboard`
- Wait for `[data-testid="dashboard-digitize-panel"]`
- Click `Area` toggle
- Click 3 distinct points on the mini map (use bounding box from snapshot)
- Click first vertex to close polygon
- Click `Tambah Proyek dari geometri ini`
- Assert URL is `/projects/create`
- Assert `[data-testid="project-geometry-state"]` text contains `Polygon`
- Assert DigitizeMapPanel renders preview (canvas + data-digitize-ready)
- Assert roadName/rt/rw/kelurahan/kecamatan inputs are empty
- (Optional) Submit form → assert redirect to `/projects/:id/documents`

### 6.3 A11y (axe-core via `tests/e2e/a11y.spec.ts`)

- New `radiogroup` for mode toggle: each button has `role="radio"` + `aria-checked`
- CTA button: `aria-disabled` when geometry not yet committed
- Toast: `role="status"` (already in `toastStore`)
- FloatingPanel: existing a11y (title + `aria-label` from the primitive)

### 6.4 Test IDs

| Test ID | Element |
|---|---|
| `dashboard-digitize-panel` | FloatingPanel wrapper |
| `dashboard-digitize-mode-point` | Mode button "Titik" |
| `dashboard-digitize-mode-line` | Mode button "Garis" |
| `dashboard-digitize-mode-polygon` | Mode button "Area" |
| `dashboard-digitize-reset` | Reset button |
| `dashboard-digitize-add-project` | CTA "Tambah Proyek" |
| `dashboard-digitize-vertex-count` | Live "N vertex" label |
| `project-geometry-state` | (existing in create page) |
| `digitize-map` | (existing in DigitizeMapPanel) |
| `digitize-vertex-circles` | (existing MapLibre layer, for E2E verify) |

## 7. Open Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `DigitizeMapPanel` + `MapContainer` running side-by-side may double tile requests | Acceptable for MVP — both load ESRI satellite by default. Future: share one MapLibre instance via a context (out of scope) |
| Floating panel at `bottom-left` may overlap with SimulateRow at `bottom-center` on narrow viewports | SimulateRow is `left-1/2 -translate-x-1/2` (centered), DigitizePanel will be `left-4` (offset). On <1024px viewports both fit; on <768px the panel becomes horizontally narrow — graceful degradation |
| `sessionStorage` is per-tab — if user opens `/projects/create` in a new tab from the same dashboard, the draft is lost | Document in the panel UI: "Draft tersimpan di tab ini saja" (small hint text) |
| `goto` during a tile load race | Existing race-guard in `DigitizeMapPanel` (renderToken) prevents stale render after unmount — no new concern |

## 8. Acceptance Criteria

A reviewer should be able to verify all of the following by hand:
1. `/dashboard` shows a 6th FloatingPanel "Digitasi Cepat" at bottom-left
2. Toggling Titik/Garis/Area changes the inner DigitizeMapPanel mode
3. Drawing a polygon and clicking the first vertex commits it; the CTA becomes enabled
4. Clicking the CTA navigates to `/projects/create`
5. The geometry badge shows the correct type (Polygon/LineString/Point)
6. A toast says "Geometry diimpor dari Dashboard (TYPE)"
7. Address fields (roadName/rt/rw/kelurahan/kecamatan) are empty
8. Lat/lng fields auto-fill if type is Point
9. Reloading `/projects/create` after import does NOT re-import (consumed flag)
10. Opening `/projects/create` in a fresh tab (no dashboard visit) shows no toast, no geometry

## 9. Out of Scope (deferred to post-MVP)

- Multi-geometry batch (one draft at a time)
- Pre-filling the address fields from reverse geocoding
- Two-way binding (edit geometry on create page → reflect on dashboard)
- Drag-and-drop geometry file (`.geojson` upload) into the dashboard panel
- Sharing draft via URL query param (e.g. `?geom=<base64>`)
- Persisting draft across tabs via `localStorage` (intentionally session-only for MVP)

## 10. References

- `CLAUDE.md` — repo conventions, "Single Active OPD", geometry-as-truth, mock parity
- `frontend/README.md` — MVP framing, demo creds
- `shared/src/geojson.ts` — `Geometry` union type
- `frontend/src/lib/components/map/DigitizeMapPanel.svelte` — the digitizer we reuse
- `frontend/src/routes/dashboard/+page.svelte` — current 5-FloatingPanel layout
- `frontend/src/routes/projects/create/+page.svelte` — target consumer
- PRD v1.3.7 §6.7/§6.8 — geometry as canonical, lat/lng derived
- ADR-002 — MapLibre GL JS migration
