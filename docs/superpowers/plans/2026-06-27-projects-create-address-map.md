# Project Create: Address Fields + Peta Wilayah Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah field alamat (Jalan, RT, RW, Kelurahan, Kecamatan) + section Peta wilayah interaktif (DigitizeMapPanel) di bawah Deskripsi, di atas Header dokumen pada halaman `/projects/create`. Default mode peta = polygon, lat/lng textbox di bawah peta auto-fill dari klik.

**Architecture:** Sisipkan card baru "Lokasi & Peta wilayah" di antara card form project metadata dan card dokumen. Schema Project di-extend dengan 4 opsional fields (rt/rw/kelurahan/kecamatan) mengikuti pola existing (district/roadName). Geometry tetap via `Project.geometry` (GeoJSON). Lat/Lng textbox adalah turunan reaktif dari `geometry` — auto-fill dari klik peta, juga bisa di-edit manual (mode point only). Helper `geometryToLatLng` + `latLngToPoint` di-extract ke file pure-function untuk unit testability.

**Tech Stack:** SvelteKit (adapter-static), Svelte 4, TypeScript, MapLibre GL JS, Tailwind, Vitest, Playwright.

## Global Constraints

- Project MVP is contract-first; all new fields are **optional / nullable**. Backward-compat: mock data lama tanpa field → render `—` (pola sama dengan district/roadName, Phase 2 PRD §6.8).
- E2E test `frontend-mvp.spec.ts:92` "project create/edit has no OPD selector" tidak boleh break — field baru tidak menambah OPD selector.
- PRD v1.3.7 §6.7 geometry validation tetap di `validateGeometryAgainstJenis` (sudah ada). PRD §6.8: null geometry = valid state (belum dipetakan), bukan validation failure.
- Coordinate order: GeoJSON spec = `[lng, lat]`. MapLibre uses `[lng, lat]`. **Tidak** `[lat, lng]`.
- UI copy two-pillar language: "Aset Wilayah" & "Administrasi Proyek GIS". Section heading: "Lokasi & Peta wilayah" (tetap konsisten dengan pillar "Administrasi Proyek GIS" di kicker).
- ADR-002: `lib/components/map/MapContainer.svelte` adalah **satu-satunya** file yang menyentuh `L.map.*`. Untuk digitize, `DigitizeMapPanel.svelte` sudah ada dan dipakai di `AssetForm.svelte` — **reuse**, jangan duplikasi.
- a11y: setiap form input harus punya `<label>` atau `aria-label`. Map testid: `data-testid="digitize-map"`, `data-testid="digitize-mode"`, `data-testid="digitize-vertex-count"`, `data-testid="digitize-commit"`, `data-testid="digitize-undo"`, `data-testid="digitize-reset"`.
- Tidak ada backend baru — semua submit via `createProjectWithDocuments` mock branch. Field baru di-serialize ke `Project` payload (string, default `''`).
- Tidak menambah dependency baru. MapLibre sudah terinstall.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `shared/src/schemas/project.ts` (modify) | Tambah 4 opsional fields: `rt`, `rw`, `kelurahan`, `kecamatan`. |
| `frontend/src/lib/components/map/coordinate-helpers.ts` (NEW) | Pure functions: `geometryToLatLng(geom)`, `latLngToPoint(lat, lng)`, `parseCoordInput(value)`. |
| `frontend/src/lib/components/map/coordinate-helpers.test.ts` (NEW) | Unit tests untuk pure helpers. |
| `frontend/src/routes/projects/create/+page.svelte` (modify) | Tambah card "Lokasi & Peta wilayah", DigitizeMapPanel embed, reactive sync, form fields. |
| `frontend/src/lib/services/api/projects.ts` (modify) | `saveProject`: tambah default `''` untuk 4 field baru + persist `geometry`. |
| `frontend/src/lib/mocks/projects.ts` (modify) | Tambah 1 fixture dengan rt/rw/kelurahan/kecamatan + geometry polygon untuk demo visual. |

---

### Task 1: Schema additions

**Files:**
- Modify: `shared/src/schemas/project.ts:33-41` (add new fields in `Project` type)

**Interfaces:**
- Consumes: existing `Project` type from `shared/src/schemas/project.ts`
- Produces: `Project.rt`, `Project.rw`, `Project.kelurahan`, `Project.kecamatan` (all `string | undefined`)

- [ ] **Step 1: Add 4 optional fields to `Project` type**

Edit `shared/src/schemas/project.ts`. Inside the `Project` type, after the existing `roadName?: string;` line (line 41), add the new fields. The new section should look like this:

```ts
  /**
   * Kolom Daerah di /projects (2026-06-21 revisi). Opsional untuk backward
   * compatibility — mock data baru ter-isi 'Sidoarjo' & nama ruas, proyek
   * lama tanpa field akan render '—' di tabel.
   */
  district?: string;
  roadName?: string;
  /**
   * Alamat granular di /projects/create (2026-06-27 revisi). Semua opsional
   * untuk backward compatibility. RT/RW disimpan sebagai string (bukan number)
   * karena banyak kasus RT/RW mengandung leading zero ("03", "007").
   */
  rt?: string;
  rw?: string;
  kelurahan?: string;
  kecamatan?: string;
};
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npm run check`
Expected: 0 errors. (Field baru opsional, tidak ada referensi yang harus di-update.)

- [ ] **Step 3: Commit**

```bash
git add shared/src/schemas/project.ts
git commit -m "feat(shared): tambah field rt/rw/kelurahan/kecamatan di Project schema"
```

---

### Task 2: Coordinate helper module

**Files:**
- Create: `frontend/src/lib/components/map/coordinate-helpers.ts`
- Create: `frontend/src/lib/components/map/coordinate-helpers.test.ts`

**Interfaces:**
- Consumes: `Geometry` type from `$shared/geojson`
- Produces: 3 exported pure functions:
  - `geometryToLatLng(geom: Geometry | null | undefined): { lat: number; lng: number } | null`
  - `latLngToPoint(lat: number, lng: number): Point`
  - `parseCoordInput(value: string | number | null | undefined): number | null`

- [ ] **Step 1: Write the failing test file**

Create `frontend/src/lib/components/map/coordinate-helpers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { geometryToLatLng, latLngToPoint, parseCoordInput } from './coordinate-helpers';
import type { Geometry } from '$shared/geojson';

describe('coordinate-helpers: project create geometry ↔ lat/lng', () => {
  describe('geometryToLatLng', () => {
    it('returns null for null geometry (PRD §6.8 belum dipetakan)', () => {
      expect(geometryToLatLng(null)).toBeNull();
      expect(geometryToLatLng(undefined)).toBeNull();
    });

    it('returns {lat, lng} for Point geometry', () => {
      const g: Geometry = { type: 'Point', coordinates: [112.6789, -7.45123] };
      const result = geometryToLatLng(g);
      expect(result).toEqual({ lat: -7.45123, lng: 112.6789 });
    });

    it('returns midpoint of LineString for Line geometry', () => {
      const g: Geometry = {
        type: 'LineString',
        coordinates: [
          [112.0, -7.0],
          [114.0, -8.0]
        ]
      };
      const result = geometryToLatLng(g);
      // Midpoint: lat = (-7 + -8)/2 = -7.5, lng = (112 + 114)/2 = 113
      expect(result).toEqual({ lat: -7.5, lng: 113 });
    });

    it('returns centroid of Polygon ring (excluding closing duplicate vertex)', () => {
      // Polygon ring with 4 unique vertices + closing duplicate = 5 coords
      const g: Geometry = {
        type: 'Polygon',
        coordinates: [
          [
            [112, -7],
            [114, -7],
            [114, -9],
            [112, -9],
            [112, -7]
          ]
        ]
      };
      const result = geometryToLatLng(g);
      // Centroid of 4 vertices: lat = (-7+-7+-9+-9)/4 = -8, lng = (112+114+114+112)/4 = 113
      expect(result).toEqual({ lat: -8, lng: 113 });
    });
  });

  describe('latLngToPoint', () => {
    it('builds a Point geometry with [lng, lat] order (GeoJSON spec)', () => {
      const p = latLngToPoint(-7.45123, 112.6789);
      expect(p).toEqual({ type: 'Point', coordinates: [112.6789, -7.45123] });
    });

    it('handles zero/negative values', () => {
      expect(latLngToPoint(0, 0)).toEqual({ type: 'Point', coordinates: [0, 0] });
      expect(latLngToPoint(-1.5, 100.25)).toEqual({ type: 'Point', coordinates: [100.25, -1.5] });
    });
  });

  describe('parseCoordInput', () => {
    it('returns null for empty / null / undefined input', () => {
      expect(parseCoordInput('')).toBeNull();
      expect(parseCoordInput(null)).toBeNull();
      expect(parseCoordInput(undefined)).toBeNull();
      expect(parseCoordInput('   ')).toBeNull();
    });

    it('parses valid numeric string to number', () => {
      expect(parseCoordInput('-7.45123')).toBe(-7.45123);
      expect(parseCoordInput('112.6789')).toBe(112.6789);
    });

    it('parses number input directly', () => {
      expect(parseCoordInput(-7.45123)).toBe(-7.45123);
      expect(parseCoordInput(0)).toBe(0);
    });

    it('returns null for non-numeric string', () => {
      expect(parseCoordInput('abc')).toBeNull();
      expect(parseCoordInput('-7.4abc')).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails (function not yet defined)**

Run: `cd frontend && npx vitest run src/lib/components/map/coordinate-helpers.test.ts`
Expected: FAIL with "Cannot find module './coordinate-helpers'".

- [ ] **Step 3: Implement the helpers**

Create `frontend/src/lib/components/map/coordinate-helpers.ts`:

```ts
import type { Geometry, Point } from '$shared/geojson';

/**
 * Convert a geometry to a single (lat, lng) coordinate for display in the
 * project's coordinate textbox. Returns null when geometry is null/undefined
 * (PRD §6.8 "belum dipetakan" state).
 *
 * - Point → coordinates directly (lng, lat → {lat, lng})
 * - LineString → midpoint of vertices
 * - Polygon → centroid of ring (excluding the closing duplicate vertex)
 */
export function geometryToLatLng(geom: Geometry | null | undefined): { lat: number; lng: number } | null {
  if (!geom) return null;

  if (geom.type === 'Point') {
    const [lng, lat] = geom.coordinates as [number, number];
    return { lat, lng };
  }

  let coords: [number, number][] = [];
  if (geom.type === 'LineString') {
    coords = geom.coordinates as [number, number][];
  } else if (geom.type === 'Polygon') {
    // Polygon ring includes closing duplicate; drop last for centroid accuracy.
    const ring = geom.coordinates[0] ?? [];
    coords = ring.slice(0, ring.length > 1 ? ring.length - 1 : ring.length) as [number, number][];
  } else {
    // MultiPoint/MultiLineString/MultiPolygon not yet supported in create form.
    return null;
  }

  if (coords.length === 0) return null;

  // Centroid (simple average — sufficient for preview display).
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of coords) {
    sumLng += lng;
    sumLat += lat;
  }
  return { lat: sumLat / coords.length, lng: sumLng / coords.length };
}

/**
 * Build a Point geometry from lat/lng user input. Used when user types
 * coordinates manually and we need to push back to DigitizeMapPanel preview.
 * Coordinate order is [lng, lat] per GeoJSON spec / MapLibre convention.
 */
export function latLngToPoint(lat: number, lng: number): Point {
  return { type: 'Point', coordinates: [lng, lat] };
}

/**
 * Parse a coord input string/number to a valid number, or null.
 * Whitespace-only and non-numeric strings return null (will surface as
 * validation error in the form).
 */
export function parseCoordInput(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/components/map/coordinate-helpers.test.ts`
Expected: PASS, all 11 cases green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/components/map/coordinate-helpers.ts frontend/src/lib/components/map/coordinate-helpers.test.ts
git commit -m "feat(frontend): tambah coordinate helpers (geometryToLatLng/latLngToPoint/parseCoordInput) + unit tests"
```

---

### Task 3: Wire 4 address fields + DigitizeMapPanel in create form

**Files:**
- Modify: `frontend/src/routes/projects/create/+page.svelte:1-388` (script + template)

**Interfaces:**
- Consumes:
  - `DigitizeMapPanel` from `$lib/components/map/DigitizeMapPanel.svelte` (sends `change: Geometry | null`, receives `mode`, `value`, `basemap`)
  - `geometryToLatLng`, `latLngToPoint`, `parseCoordInput` from `$lib/components/map/coordinate-helpers`
  - `Geometry` type from `$shared/geojson`
- Produces: form state extended with `roadName`, `rt`, `rw`, `kelurahan`, `kecamatan`, `coordLat`, `coordLng`, `geometry`. Submit payload includes the 4 address fields and `geometry` (via existing `createProjectWithDocuments` spread).

- [ ] **Step 1: Update form state and imports**

In `frontend/src/routes/projects/create/+page.svelte`, replace the `<script lang="ts">` opening block. Replace the imports section (lines 1-7) and the form state declaration (lines 45-56) with:

```ts
<script lang="ts">
  import { goto } from '$app/navigation';
  import { currentUser } from '$lib/stores/auth';
  import { canWriteProjectDocument } from '$lib/auth/permissions';
  import { createProjectWithDocuments } from '$lib/services/api/projects';
  import { toastStore } from '$lib/stores/toast';
  import DigitizeMapPanel from '$lib/components/map/DigitizeMapPanel.svelte';
  import { geometryToLatLng, latLngToPoint, parseCoordInput } from '$lib/components/map/coordinate-helpers';
  import type { ProjectDocumentFileLabel, ProjectDocumentKind, ProjectStage } from '$shared/enums';
  import type { Geometry } from '$shared/geojson';
```

(Note: added `DigitizeMapPanel`, coordinate helpers, and `Geometry` type import.)

- [ ] **Step 2: Extend the form state object**

Replace the existing `let form = { ... }` block (lines 45-56) with:

```ts
  let form = {
    projectCode: '',
    projectName: '',
    fiscalYear: 2026,
    vendorName: '',
    contractNumber: '',
    contractValue: 0,
    startDate: '2026-06-01',
    endDate: '2026-08-30',
    status: 'planning',
    description: '',
    // Alamat (PRD v1.3.7 §6.1 + 2026-06-27 revisi)
    roadName: '',
    rt: '',
    rw: '',
    kelurahan: '',
    kecamatan: '',
    // Koordinat (manual, auto-fill dari peta)
    coordLat: '' as string | number,
    coordLng: '' as string | number,
    // Geometry (sumber utama — see PRD §6.7/6.8)
    geometry: null as Geometry | null
  };
  let digitizeMode: 'point' | 'line' | 'polygon' = 'polygon';
  let coordErrors: { lat: string; lng: string } = { lat: '', lng: '' };
```

- [ ] **Step 3: Add reactive sync handlers**

After the form state, before `let statusMessage` (line 41 in current file — but state is already declared above, so place these handlers just before `async function submit()` around line 180). Insert:

```ts
  function onGeometryChange(event: CustomEvent<Geometry | null>) {
    form.geometry = event.detail;
    // Auto-fill lat/lng textbox dari geometry (mode point only)
    const derived = geometryToLatLng(form.geometry);
    if (derived) {
      form.coordLat = derived.lat.toFixed(6);
      form.coordLng = derived.lng.toFixed(6);
      coordErrors = { lat: '', lng: '' };
    } else {
      form.coordLat = '';
      form.coordLng = '';
    }
  }

  function onCoordLatInput() {
    coordErrors = { ...coordErrors, lat: '' };
    const parsed = parseCoordInput(form.coordLat);
    if (parsed === null) {
      if (String(form.coordLat).trim() !== '') {
        coordErrors = { ...coordErrors, lat: 'Latitude harus angka (-90 sampai 90)' };
      }
      return;
    }
    if (parsed < -90 || parsed > 90) {
      coordErrors = { ...coordErrors, lat: 'Latitude di luar jangkauan (-90 sampai 90)' };
      return;
    }
    // Rebuild geometry as Point (hanya jika mode point)
    if (digitizeMode === 'point') {
      const lng = parseCoordInput(form.coordLng);
      if (lng !== null) {
        form.geometry = latLngToPoint(parsed, lng);
      }
    }
  }

  function onCoordLngInput() {
    coordErrors = { ...coordErrors, lng: '' };
    const parsed = parseCoordInput(form.coordLng);
    if (parsed === null) {
      if (String(form.coordLng).trim() !== '') {
        coordErrors = { ...coordErrors, lng: 'Longitude harus angka (-180 sampai 180)' };
      }
      return;
    }
    if (parsed < -180 || parsed > 180) {
      coordErrors = { ...coordErrors, lng: 'Longitude di luar jangkauan (-180 sampai 180)' };
      return;
    }
    if (digitizeMode === 'point') {
      const lat = parseCoordInput(form.coordLat);
      if (lat !== null) {
        form.geometry = latLngToPoint(lat, parsed);
      }
    }
  }
```

- [ ] **Step 4: Strip UI-only fields before submit**

In the existing `submit()` function (line 180), replace the `project: { ... }` payload (line 185-190) with:

```ts
    const response = await createProjectWithDocuments({
      project: {
        projectCode: form.projectCode,
        projectName: form.projectName,
        fiscalYear: Number(form.fiscalYear),
        vendorName: form.vendorName,
        contractNumber: form.contractNumber,
        contractValue: Number(form.contractValue),
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        description: form.description,
        roadName: form.roadName,
        rt: form.rt,
        rw: form.rw,
        kelurahan: form.kelurahan,
        kecamatan: form.kecamatan,
        geometry: form.geometry
      } as any,
      documents: headers.map((h) => ({
        stage: h.stage,
        kind: h.kind,
        title: h.title,
        isSensitive: h.isSensitive,
        files: pendingFilesByHeader[h.id] ?? []
      }))
    });
```

(Note: removed `...form` spread, dropped UI-only `coordLat/coordLng` from payload, kept `geometry` and 4 address fields.)

- [ ] **Step 5: Insert new card "Lokasi & Peta wilayah" between Description and Header dokumen**

In the template section, after the existing form card (which ends at the `</div>` after the Deskripsi textarea on line 252), insert this new card **before** the `<div class="card space-y-3">` that starts the "Header dokumen" section (line 254):

```svelte
  <div class="card space-y-4" data-testid="project-address-card">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <div class="kicker">Administrasi Proyek GIS · lokasi &amp; peta wilayah</div>
        <h2 class="text-lg font-bold text-slate-950">Lokasi &amp; Peta wilayah</h2>
        <p class="text-sm text-slate-500">Alamat administratif + digitasi geometri (titik/garis/area) langsung di peta. Geometry tetap sumber utama; kolom lat/lng di bawah peta untuk verifikasi manual.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <span class="badge bg-slate-100 text-slate-700" data-testid="project-geometry-state">
          {form.geometry ? `Geometry: ${form.geometry.type}` : 'Geometry: belum dipetakan'}
        </span>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-6">
      <label class="text-sm font-semibold text-slate-700 md:col-span-2">Jalan<input class="input mt-1" bind:value={form.roadName} aria-label="Jalan" placeholder="cth. Jl. Raya Buduran No. 12" /></label>
      <label class="text-sm font-semibold text-slate-700">RT<input class="input mt-1" bind:value={form.rt} aria-label="RT" placeholder="cth. 03" inputmode="numeric" maxlength="4" /></label>
      <label class="text-sm font-semibold text-slate-700">RW<input class="input mt-1" bind:value={form.rw} aria-label="RW" placeholder="cth. 02" inputmode="numeric" maxlength="4" /></label>
      <label class="text-sm font-semibold text-slate-700">Kelurahan<input class="input mt-1" bind:value={form.kelurahan} aria-label="Kelurahan" placeholder="cth. Buduran" /></label>
      <label class="text-sm font-semibold text-slate-700">Kecamatan<input class="input mt-1" bind:value={form.kecamatan} aria-label="Kecamatan" placeholder="cth. Buduran" /></label>
    </div>

    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="font-semibold text-slate-700">Mode digitasi:</span>
        <div class="inline-flex overflow-hidden rounded-xl border border-slate-200" role="radiogroup" aria-label="Mode digitasi peta">
          {#each ['point', 'line', 'polygon'] as mode}
            <button type="button" role="radio" aria-checked={digitizeMode === mode} class={`px-3 py-1.5 text-xs font-semibold transition ${digitizeMode === mode ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`} on:click={() => (digitizeMode = mode)} data-testid={`digitize-mode-${mode}`}>{mode === 'point' ? 'Titik' : mode === 'line' ? 'Garis' : 'Area'}</button>
          {/each}
        </div>
        <span class="ml-2 text-slate-500">Default: <b>Area (polygon)</b> untuk plot kawasan</span>
      </div>

      <DigitizeMapPanel mode={digitizeMode} value={form.geometry} on:change={onGeometryChange} />

      <div class="grid gap-3 md:grid-cols-2">
        <label class="text-sm font-semibold text-slate-700">
          Latitude (auto-fill dari klik peta)
          <input class="input mt-1" type="text" inputmode="decimal" bind:value={form.coordLat} on:input={onCoordLatInput} aria-label="Latitude" aria-invalid={coordErrors.lat ? 'true' : 'false'} placeholder="-7.45123" data-testid="project-coord-lat" disabled={digitizeMode !== 'point'} />
          {#if coordErrors.lat}<p class="mt-1 text-xs text-rose-700" data-testid="project-coord-lat-error">{coordErrors.lat}</p>{/if}
        </label>
        <label class="text-sm font-semibold text-slate-700">
          Longitude (auto-fill dari klik peta)
          <input class="input mt-1" type="text" inputmode="decimal" bind:value={form.coordLng} on:input={onCoordLngInput} aria-label="Longitude" aria-invalid={coordErrors.lng ? 'true' : 'false'} placeholder="112.67890" data-testid="project-coord-lng" disabled={digitizeMode !== 'point'} />
          {#if coordErrors.lng}<p class="mt-1 text-xs text-rose-700" data-testid="project-coord-lng-error">{coordErrors.lng}</p>{/if}
        </label>
      </div>
      {#if digitizeMode !== 'point'}
        <p class="text-xs text-slate-500" data-testid="project-coord-disabled-hint">Lat/lng textbox hanya berlaku untuk mode titik. Untuk mode garis/area, geometry adalah sumber utama.</p>
      {/if}
    </div>
  </div>
```

- [ ] **Step 6: Add submit guard for invalid coordinates**

Replace the opening of `submit()` (line 180-184) with:

```ts
  async function submit() {
    errorMessage = '';
    statusMessage = '';
    // Re-validate coord inputs sebelum submit (jika mode point)
    if (digitizeMode === 'point') {
      const lat = parseCoordInput(form.coordLat);
      const lng = parseCoordInput(form.coordLng);
      if (lat !== null && (lat < -90 || lat > 90)) {
        coordErrors = { ...coordErrors, lat: 'Latitude di luar jangkauan (-90 sampai 90)' };
      }
      if (lng !== null && (lng < -180 || lng > 180)) {
        coordErrors = { ...coordErrors, lng: 'Longitude di luar jangkauan (-180 sampai 180)' };
      }
      if (coordErrors.lat || coordErrors.lng) {
        errorMessage = 'VALIDATION_FAILED: Perbaiki koordinat terlebih dahulu.';
        toastStore.error(errorMessage);
        return;
      }
    }
    isSubmitting = true;
```

(The `isSubmitting = true;` and existing `await createProjectWithDocuments(...)` remain unchanged below.)

- [ ] **Step 7: Run check**

Run: `cd frontend && npm run check`
Expected: 0 TypeScript / Svelte errors. Warnings about unused imports are acceptable if minor.

- [ ] **Step 8: Manual smoke verify**

Run: `cd frontend && npm run dev`
Navigate to `http://127.0.0.1:5173/projects/create`. Verify:
- New card "Lokasi & Peta wilayah" muncul di bawah Deskripsi, di atas "Header dokumen & lampiran".
- 5 textbox alamat terlihat (Jalan, RT, RW, Kelurahan, Kecamatan).
- Peta tampil dengan basemap default (Esri satellite), default mode = polygon.
- Klik 3x di peta → polygon terbentuk. Lat/lng textbox **disabled** (karena mode polygon).
- Switch ke mode titik → lat/lng textbox enabled. Klik di peta → textbox terisi otomatis.
- Edit lat/lng manual → validation berjalan, geometry ter-rebuild saat mode point.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/routes/projects/create/+page.svelte
git commit -m "feat(frontend): tambah card lokasi & peta wilayah (alamat + DigitizeMapPanel) di /projects/create"
```

---

### Task 4: Persist geometry + 4 address fields in saveProject

**Files:**
- Modify: `frontend/src/lib/services/api/projects.ts:212-248` (`saveProject` function)

**Interfaces:**
- Consumes: existing `saveProject` signature `Partial<Project> & { id?: string; simulateConflict?: boolean }`
- Produces: persisted `Project` with 4 address fields + optional `geometry`

- [ ] **Step 1: Add geometry default + 4 address field defaults to new-project branch**

In `frontend/src/lib/services/api/projects.ts`, in the `saveProject` function, find the `const created: Project = { ... }` block (line 228-245). Replace it with:

```ts
  const created: Project = {
    id: `prj-${String(projects.length + 1).padStart(3, '0')}`,
    projectCode: payload.projectCode || `GIS-${new Date().getFullYear()}-MOCK`,
    projectName: payload.projectName || 'Proyek GIS Baru',
    fiscalYear: Number(payload.fiscalYear || new Date().getFullYear()),
    opdId: ACTIVE_OPD.id,
    opdName: ACTIVE_OPD.shortName,
    vendorName: payload.vendorName || 'Vendor Mock',
    contractNumber: payload.contractNumber || '-',
    contractValue: Number(payload.contractValue || 0),
    startDate: payload.startDate || new Date().toISOString().slice(0, 10),
    endDate: payload.endDate || new Date().toISOString().slice(0, 10),
    status: payload.status || 'planning',
    version: 1,
    description: payload.description || '',
    roadName: payload.roadName || '',
    rt: payload.rt || '',
    rw: payload.rw || '',
    kelurahan: payload.kelurahan || '',
    kecamatan: payload.kecamatan || '',
    geometry: payload.geometry ?? null,
    documentSummary: { total: 0, verified: 0, sensitive: 0 },
    paymentSummary: { invoiceTotal: 0, paidTotal: 0, terms: 0 }
  };
  projects.unshift(created);
  return ok(created, 'PROJECT_CREATED');
```

- [ ] **Step 2: Verify update-branch preserves the new fields**

The PUT branch (line 222-226) uses `projects[idx] = { ...projects[idx], ...payload, ... }`. Since spread preserves any field present in `payload`, address fields and `geometry` will already flow through without further code changes. **No edit needed** for the update branch — confirm by reading lines 222-226 and noting the spread.

- [ ] **Step 3: Run check + test**

Run: `cd frontend && npm run check && npm run test`
Expected: 0 errors, all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/services/api/projects.ts
git commit -m "feat(frontend): saveProject default untuk roadName/rt/rw/kelurahan/kecamatan + persist geometry"
```

---

### Task 5: Demo fixture with new address fields

**Files:**
- Modify: `frontend/src/lib/mocks/projects.ts:8-10` (extend one of the 3 existing fixtures)

**Interfaces:**
- Consumes: existing `Project[]` mock array
- Produces: at least 1 fixture with non-empty `rt/rw/kelurahan/kecamatan` + polygon geometry

- [ ] **Step 1: Extend `prj-002` fixture with address fields + kecamatan**

In `frontend/src/lib/mocks/projects.ts`, find the `prj-002` entry (line 9). Replace it with:

```ts
 {id:'prj-002',projectCode:'GIS-2026-002',projectName:'Inventarisasi Lahan Pemerintah Wilayah Selatan',fiscalYear:2026,opdId,opdName,vendorName:'CV Kartografi Timur',contractNumber:'028/119/KONTRAK/2026',contractValue:920000000,startDate:'2026-03-15',endDate:'2026-09-01',status:'procurement',version:1,description:'Inventarisasi lahan dan dokumen legal untuk audit aset.',documentSummary:{total:4,verified:1,sensitive:1},paymentSummary:{invoiceTotal:0,paidTotal:0,terms:2},jenisInfrastruktur:'lapangan',roadName:'Jl. Raya Buduran No. 12',rt:'03',rw:'02',kelurahan:'Buduran',kecamatan:'Buduran',district:'Sidoarjo',geometry:{type:'Polygon',coordinates:[[[-7.78,112.72],[-7.78,112.76],[-7.82,112.76],[-7.82,112.72],[-7.78,112.72]]]}}
```

(Only the `prj-002` entry is touched; `prj-001` and `prj-003` remain unchanged to demonstrate backward-compat — they will render `—` for new fields in `/projects` list.)

- [ ] **Step 2: Run check + test**

Run: `cd frontend && npm run check && npm run test`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/mocks/projects.ts
git commit -m "feat(frontend): demo fixture prj-002 dengan alamat lengkap (roadName/rt/rw/kelurahan/kecamatan)"
```

---

### Task 6: E2E smoke test for new fields

**Files:**
- Modify: `frontend/tests/e2e/frontend-mvp.spec.ts:92-103` (existing project create test — extend with new field assertions)

**Interfaces:**
- Consumes: existing Playwright test "project create/edit has no OPD selector"
- Produces: extended test that fills new address fields, clicks peta (3x for polygon), and verifies the geometry state badge

- [ ] **Step 1: Extend the existing project create test**

In `frontend/tests/e2e/frontend-mvp.spec.ts`, find the test starting at line 92 ("project create/edit has no OPD selector and uses active OPD implicitly"). After the `await page.getByLabel('Nilai kontrak').fill('123000000');` line, add:

```ts
    // 2026-06-27: Alamat + peta wilayah
    await page.getByLabel('Jalan').fill('Jl. Raya Buduran No. 12');
    await page.getByLabel('RT').fill('03');
    await page.getByLabel('RW').fill('02');
    await page.getByLabel('Kelurahan').fill('Buduran');
    await page.getByLabel('Kecamatan').fill('Buduran');
    // Peta: default mode = polygon, klik 3 vertex
    await expect(page.getByTestId('digitize-mode')).toContainText('polygon');
    await expect(page.locator('[data-digitize-ready="true"]')).toBeVisible({ timeout: 10000 });
    const projectMap = page.getByTestId('digitize-map');
    await projectMap.click({ position: { x: 220, y: 100 } });
    await projectMap.click({ position: { x: 320, y: 100 } });
    await projectMap.click({ position: { x: 270, y: 180 } });
    await page.getByTestId('digitize-commit').click();
    await expect(page.getByTestId('project-geometry-state')).toContainText('Geometry: Polygon');
```

(Do not change the existing assertions about `OPD proyek` label count, `Simpan proyek mock` button, or `PROJECT_CREATED` status — those are still required for the original test to pass.)

- [ ] **Step 2: Run E2E test**

Run: `cd frontend && npx playwright test frontend-mvp.spec.ts -g "project create/edit has no OPD selector"`
Expected: PASS. If it fails, check that the dev server (`npm run dev`) is running and the new testids are present.

- [ ] **Step 3: Run full verify suite**

Run: `cd frontend && npm run verify:mvp`
Expected: all 5 stages pass (check, test, build, test:e2e, test:a11y).

- [ ] **Step 4: Commit**

```bash
git add frontend/tests/e2e/frontend-mvp.spec.ts
git commit -m "test(frontend): E2E smoke test untuk address fields + peta polygon di /projects/create"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - Schema 4 fields → Task 1 ✓
  - Coordinate helpers (geometry ↔ lat/lng) → Task 2 ✓
  - Card layout + DigitizeMapPanel embed → Task 3 ✓
  - Submit integration → Task 3 (form payload) + Task 4 (saveProject defaults) ✓
  - Validation/error handling → Task 3 (coord input validation) + Task 4 (geometry default) ✓
  - Backward compat → Task 1 (optional fields) + Task 5 (only 1 of 3 fixtures updated) ✓
  - E2E coverage → Task 6 ✓
- [x] **No placeholders:** All steps contain exact code, exact commands, exact expected output.
- [x] **Type consistency:** `geometryToLatLng`, `latLngToPoint`, `parseCoordInput` defined in Task 2 and used identically in Task 3. `digitizeMode: 'point' | 'line' | 'polygon'` consistent between Task 3 and DigitizeMapPanel's `mode` prop type. `Project.rt/rw/kelurahan/kecamatan: string | undefined` consistent between Task 1 (schema) and Task 4 (defaults). `data-testid` values consistent: `project-address-card`, `project-geometry-state`, `digitize-mode-{point|line|polygon}`, `project-coord-lat`, `project-coord-lng`, `project-coord-{lat|lng}-error`, `project-coord-disabled-hint`.
