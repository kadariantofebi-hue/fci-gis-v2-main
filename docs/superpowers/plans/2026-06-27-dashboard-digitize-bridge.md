# Dashboard Digitize Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Digitasi Cepat" floating panel on `/dashboard` that lets a user digitize a polygon/line/point, then jump to `/projects/create` with the geometry pre-loaded via `sessionStorage` bridge.

**Architecture:** Reuse the existing `DigitizeMapPanel` inside a new `DashboardDigitizePanel.svelte` mounted in a `FloatingPanel` at `position="bottom-left"`. A small browser-only helper `lib/services/api/draft-geometry.ts` owns the `sessionStorage` lifecycle. `/projects/create` consumes the draft in `onMount` and pre-loads `form.geometry` + `digitizeMode`.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes-friendly but this uses Svelte 4 syntax for consistency with existing dashboard), MapLibre GL JS 5, Vitest 3, Playwright 1.60, Tailwind 4.

## Global Constraints

- **Svelte 4 reactive syntax (`export let`, `$:`, `on:event`)** — matches the existing dashboard and create page; do not introduce Svelte 5 runes here.
- **Frontend-only MVP** — no backend changes; no `localStorage` (session-only per spec §3.3).
- **Path alias `$shared`** — for `Geometry` type from `shared/src/geojson.ts`. Never deep-relative imports.
- **Test environment** — `vitest.config.ts` `environment: 'node'`; for browser-only code (sessionStorage) use `vi.stubGlobal` or guard with `typeof window`.
- **Test ID prefix** — `dashboard-digitize-*` for the new panel; reuse existing `project-geometry-state` and `digitize-map` in create page.
- **Bilingual copy** — Indonesian for user-facing strings, English for code/test.
- **Commit message format** — `feat(frontend): ...` or `test(frontend): ...` or `fix(frontend): ...` per `CLAUDE.md` phase pattern.
- **No new dependencies** — all needed packages are already in `package.json`.
- **Run unit tests** — `cd frontend && npx vitest run <file>`.
- **Run single E2E** — `cd frontend && npx playwright test frontend-mvp.spec.ts -g "<pattern>"`.
- **Type check** — `cd frontend && npm run check`.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `frontend/src/lib/services/api/draft-geometry.ts` | NEW | sessionStorage read/write/clear for geometry draft |
| `frontend/src/lib/services/api/draft-geometry.test.ts` | NEW | unit tests for draft-geometry helper |
| `frontend/src/lib/components/dashboard/DashboardDigitizePanel.svelte` | NEW | floating panel body: mode toggle, DigitizeMapPanel reuse, CTA |
| `frontend/src/routes/dashboard/+page.svelte` | EDIT | add DashboardDigitizePanel in bottom-left FloatingPanel |
| `frontend/src/routes/projects/create/+page.svelte` | EDIT | onMount consumes draft, sets form.geometry + digitizeMode, toast |
| `frontend/tests/e2e/frontend-mvp.spec.ts` | EDIT | add new E2E spec for dashboard → create bridge |

**Decomposition rationale:** The helper is a leaf node with no UI deps (Task 1). The panel component depends only on the helper + the existing `DigitizeMapPanel` (Task 2). The dashboard wiring is a 4-line template addition (Task 3). The create-page wiring is a 10-line `onMount` block (Task 4). E2E is last because it exercises all pieces together (Task 5).

---

## Task 1: `draft-geometry` helper + tests

**Files:**
- Create: `frontend/src/lib/services/api/draft-geometry.ts`
- Test: `frontend/src/lib/services/api/draft-geometry.test.ts`

**Interfaces:**
- Consumes: `Geometry` from `$shared/geojson`
- Produces:
  - `saveDraftGeometry(g: Geometry): void`
  - `consumeDraftGeometry(): Geometry | null`
  - `clearDraftGeometry(): void`
  - `STORAGE_KEY = 'simanta.draft.geometry.v1'`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/services/api/draft-geometry.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  saveDraftGeometry,
  consumeDraftGeometry,
  clearDraftGeometry,
  STORAGE_KEY
} from './draft-geometry';
import type { Geometry } from '$shared/geojson';

// In-memory sessionStorage stub (matches the Web Storage API surface we use)
function makeSessionStorageStub() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; }
  };
}

describe('draft-geometry', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { sessionStorage: makeSessionStorageStub() });
    vi.stubGlobal('sessionStorage', (window as any).sessionStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const polygon: Geometry = {
    type: 'Polygon',
    coordinates: [[[112.7, -7.4], [112.71, -7.4], [112.71, -7.41], [112.7, -7.4]]]
  };
  const line: Geometry = {
    type: 'LineString',
    coordinates: [[112.7, -7.4], [112.71, -7.4]]
  };
  const point: Geometry = {
    type: 'Point',
    coordinates: [112.7, -7.4]
  };

  it('round-trips a polygon through save + consume', () => {
    saveDraftGeometry(polygon);
    const out = consumeDraftGeometry();
    expect(out).toEqual(polygon);
  });

  it('round-trips a linestring', () => {
    saveDraftGeometry(line);
    expect(consumeDraftGeometry()).toEqual(line);
  });

  it('round-trips a point', () => {
    saveDraftGeometry(point);
    expect(consumeDraftGeometry()).toEqual(point);
  });

  it('consume returns null on second call (consumed flag)', () => {
    saveDraftGeometry(polygon);
    expect(consumeDraftGeometry()).toEqual(polygon);
    expect(consumeDraftGeometry()).toBeNull();
  });

  it('returns null when storage is empty', () => {
    expect(consumeDraftGeometry()).toBeNull();
  });

  it('returns null and clears key on corrupted JSON', () => {
    (window as any).sessionStorage.setItem(STORAGE_KEY, '{not-valid-json');
    expect(consumeDraftGeometry()).toBeNull();
    expect((window as any).sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clearDraftGeometry removes the key', () => {
    saveDraftGeometry(polygon);
    clearDraftGeometry();
    expect(consumeDraftGeometry()).toBeNull();
  });

  it('is safe when window is undefined (SSR guard)', () => {
    vi.unstubAllGlobals();
    expect(() => saveDraftGeometry(polygon)).not.toThrow();
    expect(consumeDraftGeometry()).toBeNull();
    expect(() => clearDraftGeometry()).not.toThrow();
  });

  it('uses the v1 storage key', () => {
    expect(STORAGE_KEY).toBe('simanta.draft.geometry.v1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/services/api/draft-geometry.test.ts`
Expected: FAIL with "Cannot find module './draft-geometry'".

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/services/api/draft-geometry.ts`:

```typescript
import { browser } from '$app/environment';
import type { Geometry } from '$shared/geojson';

/**
 * Dashboard → /projects/create geometry bridge (spec 2026-06-27).
 *
 * Lives in sessionStorage so the draft:
 * - vanishes when the tab closes (no stale data on next visit)
 * - is per-tab (no cross-tab leakage)
 * - is one-shot (consume flips `consumed: true` so a reload of the
 *   create page does not re-import)
 *
 * SSR-safe: all functions no-op when `window` is undefined.
 */

export const STORAGE_KEY = 'simanta.draft.geometry.v1';

type Stored = {
  geometry: Geometry;
  consumed: boolean;
  createdAt: number;
};

function readRaw(): string | null {
  if (!browser || typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeRaw(value: string): boolean {
  if (!browser || typeof window === 'undefined') return false;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

function removeRaw(): void {
  if (!browser || typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function saveDraftGeometry(g: Geometry): void {
  const payload: Stored = { geometry: g, consumed: false, createdAt: Date.now() };
  writeRaw(JSON.stringify(payload));
}

/**
 * Read the draft and mark it consumed. Returns the geometry once;
 * subsequent calls return null until a new `saveDraftGeometry` is made.
 */
export function consumeDraftGeometry(): Geometry | null {
  const raw = readRaw();
  if (!raw) return null;
  let parsed: Stored;
  try {
    parsed = JSON.parse(raw) as Stored;
  } catch {
    removeRaw();
    return null;
  }
  if (parsed.consumed) return null;
  // Mark consumed so a reload of the create page doesn't re-import.
  writeRaw(JSON.stringify({ ...parsed, consumed: true }));
  return parsed.geometry;
}

export function clearDraftGeometry(): void {
  removeRaw();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/services/api/draft-geometry.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Type check**

Run: `cd frontend && npm run check`
Expected: 0 errors (or only pre-existing errors unrelated to this file).

- [ ] **Step 6: Commit**

```bash
cd C:/projects/fci/fci-gis
git add frontend/src/lib/services/api/draft-geometry.ts frontend/src/lib/services/api/draft-geometry.test.ts
git commit -m "feat(frontend): draft-geometry helper + unit tests"
```

---

## Task 2: `DashboardDigitizePanel.svelte` component

**Files:**
- Create: `frontend/src/lib/components/dashboard/DashboardDigitizePanel.svelte`

**Interfaces:**
- Consumes: `DigitizeMapPanel` (existing), `$lib/services/api/draft-geometry#saveDraftGeometry`, `$app/navigation#goto`
- Produces: visual panel; on CTA click → saves draft + navigates to `/projects/create`
- Emits: `geometry` (CustomEvent<Geometry | null>) — fires whenever the inner DigitizeMapPanel commits/resets

- [ ] **Step 1: Write the component**

Create `frontend/src/lib/components/dashboard/DashboardDigitizePanel.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import { MapPin, RotateCcw, ArrowRight } from 'lucide-svelte';
  import DigitizeMapPanel from '$lib/components/map/DigitizeMapPanel.svelte';
  import { saveDraftGeometry } from '$lib/services/api/draft-geometry';
  import { toastStore } from '$lib/stores/toast';
  import type { Geometry } from '$shared/geojson';

  /**
   * Dashboard "Digitasi Cepat" floating panel (spec 2026-06-27).
   * Reuses DigitizeMapPanel at compact height; on commit the user can
   * click "Tambah Proyek" to bridge the geometry into /projects/create.
   */
  type Mode = 'point' | 'line' | 'polygon';

  const MODES: Array<{ key: Mode; label: string; testId: string }> = [
    { key: 'point', label: 'Titik', testId: 'dashboard-digitize-mode-point' },
    { key: 'line', label: 'Garis', testId: 'dashboard-digitize-mode-line' },
    { key: 'polygon', label: 'Area', testId: 'dashboard-digitize-mode-polygon' }
  ];

  let mode: Mode = 'polygon';
  let committedGeometry: Geometry | null = null;
  let isNavigating = false;

  const dispatch = createEventDispatcher<{ geometry: Geometry | null }>();

  function onGeometryChange(event: CustomEvent<Geometry | null>) {
    committedGeometry = event.detail;
    dispatch('geometry', committedGeometry);
  }

  function reset() {
    // Reset by remounting the DigitizeMapPanel — `{#key mode}` on the
    // wrapper handles internal state; here we clear our own slot.
    committedGeometry = null;
    dispatch('geometry', null);
  }

  function onAddProject() {
    if (!committedGeometry || isNavigating) return;
    isNavigating = true;
    saveDraftGeometry(committedGeometry);
    toastStore.info(`Geometry disimpan sebagai draft (${committedGeometry.type}). Mengarahkan ke Tambah Proyek…`);
    void goto('/projects/create');
  }

  $: statusLabel = committedGeometry
    ? `Geometry: ${committedGeometry.type} · siap di-bridge`
    : 'Geometry: belum digambar';
  $: canAdd = committedGeometry !== null && !isNavigating;
</script>

<div class="space-y-2" data-testid="dashboard-digitize-panel-body">
  <div class="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Mode digitasi">
    <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Mode</span>
    {#each MODES as m (m.key)}
      <button
        type="button"
        role="radio"
        aria-checked={mode === m.key}
        class="rounded-md border px-2 py-1 text-xs font-semibold transition {mode === m.key
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}"
        on:click={() => (mode = m.key)}
        data-testid={m.testId}
      >
        {m.label}
      </button>
    {/each}
    <button
      type="button"
      class="ml-auto rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      on:click={reset}
      disabled={!committedGeometry}
      data-testid="dashboard-digitize-reset"
    >
      <RotateCcw size={12} class="mr-1 inline" /> Reset
    </button>
  </div>

  {#key mode}
    <div class="h-60 w-full overflow-hidden rounded-xl border border-slate-200">
      <DigitizeMapPanel mode={mode} value={null} on:change={onGeometryChange} />
    </div>
  {/key}

  <div class="flex items-center justify-between text-[11px] text-slate-600">
    <span data-testid="dashboard-digitize-geometry-state">
      {statusLabel}
    </span>
  </div>

  <button
    type="button"
    class="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
    on:click={onAddProject}
    disabled={!canAdd}
    aria-disabled={!canAdd}
    data-testid="dashboard-digitize-add-project"
  >
    <MapPin size={14} />
    {isNavigating ? 'Mengalihkan…' : 'Tambah Proyek dari geometri ini'}
    {#if canAdd}<ArrowRight size={14} />{/if}
  </button>

  <p class="text-[10px] leading-tight text-slate-500">
    Draft tersimpan di tab ini saja. Setelah geometri jadi, klik tombol di atas untuk membuka Tambah Proyek dengan geometry terisi otomatis.
  </p>
</div>
```

- [ ] **Step 2: Type check**

Run: `cd frontend && npm run check`
Expected: 0 errors related to this file.

- [ ] **Step 3: Manual visual check (dev server)**

Run: `cd frontend && npm run dev -- --port 5174`
Navigate to `http://127.0.0.1:5174/dashboard` (login as `admin@simanta.test`).
Verify: floating panel "Digitasi Cepat" appears at bottom-left with 3 mode buttons, mini map, and disabled CTA.

- [ ] **Step 4: Commit**

```bash
cd C:/projects/fci/fci-gis
git add frontend/src/lib/components/dashboard/DashboardDigitizePanel.svelte
git commit -m "feat(frontend): DashboardDigitizePanel — quick digitize UI"
```

---

## Task 3: Mount the panel on `/dashboard`

**Files:**
- Modify: `frontend/src/routes/dashboard/+page.svelte` (add import + 1 new FloatingPanel block)

**Interfaces:**
- Consumes: `DashboardDigitizePanel` (from Task 2), `FloatingPanel` (existing)
- Produces: visual mount of the new panel

- [ ] **Step 1: Read current dashboard imports**

In `frontend/src/routes/dashboard/+page.svelte` lines 1-27, note the existing import order. We add the new import alphabetically with the other dashboard components.

- [ ] **Step 2: Add the import**

After the line `import DashboardSimulateRow from "$lib/components/dashboard/DashboardSimulateRow.svelte";` (line 18), insert:

```typescript
import DashboardDigitizePanel from "$lib/components/dashboard/DashboardDigitizePanel.svelte";
```

- [ ] **Step 3: Mount the panel**

After the existing `<FloatingPanel position="bottom-right" ...>` block (lines 226-233), before the `<!-- Floating Simulate Row -->` comment, insert:

```svelte
        <!-- Floating Digitize Panel (bottom-left) — quick sketch to /projects/create bridge -->
        <FloatingPanel
            position="bottom-left"
            title="Digitasi Cepat"
            icon="🎯"
            testId="dashboard-digitize-panel"
        >
            <DashboardDigitizePanel />
        </FloatingPanel>
```

- [ ] **Step 4: Type check**

Run: `cd frontend && npm run check`
Expected: 0 errors.

- [ ] **Step 5: Visual check**

Dev server already running from Task 2. Reload `http://127.0.0.1:5174/dashboard`.
Verify: 6 floating panels visible (KPI, Filter, Zoom, Digitize, Legend, SimulateRow). Digitize Cepat at bottom-left.

- [ ] **Step 6: Commit**

```bash
cd C:/projects/fci/fci-gis
git add frontend/src/routes/dashboard/+page.svelte
git commit -m "feat(frontend): mount DashboardDigitizePanel di bottom-left"
```

---

## Task 4: Consume draft in `/projects/create`

**Files:**
- Modify: `frontend/src/routes/projects/create/+page.svelte` (add `onMount` import + onMount block; add `consumeDraftGeometry` import)

**Interfaces:**
- Consumes: `consumeDraftGeometry` (from Task 1), `toastStore` (existing)
- Produces: `form.geometry` populated, `digitizeMode` synced, info toast

- [ ] **Step 1: Update imports**

In `frontend/src/routes/projects/create/+page.svelte` line 1 (`import { goto } from '$app/navigation';`), keep as-is. Add a new import after line 7 (`import DigitizeMapPanel from '$lib/components/map/DigitizeMapPanel.svelte';`):

```typescript
import { onMount } from 'svelte';
import { consumeDraftGeometry } from '$lib/services/api/draft-geometry';
```

- [ ] **Step 2: Add the onMount block**

After the line `  let digitizeMode: 'point' | 'line' | 'polygon' = 'polygon';` (line 71), insert:

```typescript

  onMount(() => {
    const draft = consumeDraftGeometry();
    if (!draft) return;
    form.geometry = draft;
    if (draft.type === 'Point') digitizeMode = 'point';
    else if (draft.type === 'LineString') digitizeMode = 'line';
    else digitizeMode = 'polygon';
    toastStore.info(`Geometry diimpor dari Dashboard (${draft.type}).`);
  });
```

- [ ] **Step 3: Type check**

Run: `cd frontend && npm run check`
Expected: 0 errors.

- [ ] **Step 4: Manual end-to-end smoke (no automation yet)**

Keep dev server running. In browser:
1. On `/dashboard`, click "Area" in the Digitasi Cepat panel.
2. Click 3 points on the mini map; click the first vertex to close polygon.
3. Click "Tambah Proyek dari geometri ini".
4. Verify URL becomes `/projects/create`.
5. Verify badge shows `Geometry: Polygon`.
6. Verify DigitizeMapPanel renders the polygon preview (you should see the shape).
7. Verify roadName/rt/rw/kelurahan/kecamatan inputs are still empty.
8. Verify a toast appears (top-right): "Geometry diimpor dari Dashboard (Polygon)."
9. Reload the page → no toast, no auto-import (consumed flag).
10. Open `/projects/create` in a new tab directly → no toast, no geometry (sessionStorage per-tab).

- [ ] **Step 5: Commit**

```bash
cd C:/projects/fci/fci-gis
git add frontend/src/routes/projects/create/+page.svelte
git commit -m "feat(frontend): consume geometry draft on /projects/create mount"
```

---

## Task 5: E2E test for the bridge

**Files:**
- Modify: `frontend/tests/e2e/frontend-mvp.spec.ts` (add new `test.describe` block)

**Interfaces:**
- Consumes: Playwright `page` + already-logged-in admin session (set up in the file's `beforeEach` or the existing `test.beforeAll`)
- Produces: regression coverage for dashboard → create bridge

- [ ] **Step 1: Inspect existing spec scaffolding**

Run: `cd frontend && head -60 tests/e2e/frontend-mvp.spec.ts`

Look for the existing `test.beforeAll` / `test.beforeEach` block that logs in as `admin@simanta.test`. Note the auth helper name (likely `loginAsAdmin(page)`) and any reusable imports.

If the file does NOT have a reusable login helper, add a manual login in this new spec (do not refactor existing tests in this plan — out of scope).

- [ ] **Step 2: Append the new spec block**

Append to the end of `frontend/tests/e2e/frontend-mvp.spec.ts`:

```typescript
import { test, expect, type Page } from '@playwright/test';

test.describe('Dashboard digitize → projects/create bridge', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin (matches the demo creds from CLAUDE.md)
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@simanta.test');
    await page.getByLabel('Password').fill('any-password');
    await page.getByRole('button', { name: /Masuk|Login/i }).click();
    await page.waitForURL(/\/dashboard$/);
  });

  test('user can digitize a polygon on dashboard and bridge to /projects/create', async ({ page }) => {
    await page.goto('/dashboard');
    const panel = page.getByTestId('dashboard-digitize-panel');
    await expect(panel).toBeVisible();

    // Switch to Area (polygon) mode
    await page.getByTestId('dashboard-digitize-mode-polygon').click();

    // Wait for the inner mini map to be ready
    const miniMap = panel.locator('[data-testid="digitize-map"]');
    await expect(miniMap).toHaveAttribute('data-digitize-ready', 'true', { timeout: 10_000 });

    // Click 3 distinct points in the mini map to start a polygon
    const box = await miniMap.boundingBox();
    if (!box) throw new Error('mini map has no bounding box');
    await miniMap.click({ position: { x: 40, y: 40 } });
    await miniMap.click({ position: { x: 120, y: 40 } });
    await miniMap.click({ position: { x: 80, y: 100 } });

    // Close polygon by clicking the first vertex (15px snap inside DigitizeMapPanel)
    await miniMap.click({ position: { x: 40, y: 40 } });

    // CTA should now be enabled
    const cta = page.getByTestId('dashboard-digitize-add-project');
    await expect(cta).toBeEnabled();

    // Click CTA → navigate to /projects/create
    await cta.click();
    await page.waitForURL(/\/projects\/create$/);

    // Geometry badge should reflect Polygon
    const geometryBadge = page.getByTestId('project-geometry-state');
    await expect(geometryBadge).toContainText(/Polygon/);

    // DigitizeMapPanel in create page should be ready and show the preview
    const createMap = page.locator('[data-testid="digitize-map"]').first();
    await expect(createMap).toHaveAttribute('data-digitize-ready', 'true', { timeout: 10_000 });

    // Address fields stay empty
    await expect(page.getByLabel('Jalan')).toHaveValue('');
    await expect(page.getByLabel('RT')).toHaveValue('');
    await expect(page.getByLabel('RW')).toHaveValue('');
    await expect(page.getByLabel('Kelurahan')).toHaveValue('');
    await expect(page.getByLabel('Kecamatan')).toHaveValue('');

    // Reload should NOT re-import (consumed flag)
    await page.reload();
    await expect(geometryBadge).toContainText(/belum dipetakan/);
  });
});
```

If the existing file already imports `test`/`expect` from `@playwright/test` at the top, REMOVE the duplicate import line at the start of this new block.

- [ ] **Step 3: Run the new E2E in isolation**

Run: `cd frontend && npx playwright test frontend-mvp.spec.ts -g "dashboard digitize"`
Expected: PASS (1 test).

- [ ] **Step 4: Run the full E2E suite**

Run: `cd frontend && npm run test:e2e`
Expected: All existing specs still pass + the new one.

- [ ] **Step 5: Run a11y suite**

Run: `cd frontend && npm run test:a11y`
Expected: All existing a11y specs pass. (We did not introduce new a11y violations; the radiogroup and aria-disabled are correct.)

- [ ] **Step 6: Commit**

```bash
cd C:/projects/fci/fci-gis
git add frontend/tests/e2e/frontend-mvp.spec.ts
git commit -m "test(frontend): E2E dashboard digitize → projects/create bridge"
```

---

## Task 6: Final MVP verification

**Files:** none (verification gate)

- [ ] **Step 1: Run `npm run verify:mvp` from `frontend/`**

Run: `cd frontend && npm run verify:mvp`
Expected:
- `svelte-check` → 0 errors
- `vitest run` → all tests pass (including the 9 new draft-geometry tests)
- `vite build` → success
- `playwright test frontend-mvp.spec.ts` → all pass (including the new bridge test)
- `playwright test a11y.spec.ts` → all pass

If any step fails, fix the issue and re-run the full gate. Do not commit a broken gate.

- [ ] **Step 2: Final commit (if any fixup was needed)**

```bash
cd C:/projects/fci/fci-gis
git add -A
git commit -m "fix(frontend): verify:mvp gate fixes for digitize bridge"
```

(Only run this if there were fixups. If clean, skip.)

- [ ] **Step 3: Summary commit on branch**

Push the branch (do NOT merge to main — the user owns that decision):

```bash
cd C:/projects/fci/fci-gis
git log --oneline -10
```

Report the 4-5 new commits in the final message. Do not push without explicit user instruction.

---

## Acceptance Criteria Mapping

| Spec §8 criterion | Verified by |
|---|---|
| 1. `/dashboard` shows 6th FloatingPanel "Digitasi Cepat" at bottom-left | Task 3 Step 5 |
| 2. Toggling Titik/Garis/Area changes inner mode | Task 2 Step 3 + Task 5 E2E |
| 3. Drawing a polygon + closing first vertex commits it; CTA enables | Task 4 Step 4.3 + Task 5 E2E |
| 4. Clicking CTA navigates to `/projects/create` | Task 4 Step 4.4 + Task 5 E2E |
| 5. Geometry badge shows correct type | Task 4 Step 4.5 + Task 5 E2E |
| 6. Toast "Geometry diimpor dari Dashboard (TYPE)" appears | Task 4 Step 4.6 + Task 5 E2E (visual) |
| 7. Address fields (roadName/rt/rw/kelurahan/kecamatan) are empty | Task 4 Step 4.7 + Task 5 E2E |
| 8. Lat/lng auto-fills for Point (not in this E2E but exercised by `geometryToLatLng`) | Task 4 Step 4 (manual, optional) |
| 9. Reload does NOT re-import (consumed flag) | Task 5 E2E reload assertion |
| 10. Fresh tab → no toast, no geometry | Task 1 unit test + Task 5 E2E (indirect) |
