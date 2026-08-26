# Esri Premium Basemap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan `esri_imagery_premium` ke basemaps registry sebagai paid basemap (token-gated, custom MapServer URL, z20–22 coverage). Default basemap otomatis ke premium ketika `PUBLIC_ARCGIS_TOKEN` + `PUBLIC_ARCGIS_IMAGERY_URL` di-set; fallback chain ke `maptiler_streets` → `osm_standard` jika tidak.

**Architecture:** Entry baru di `basemaps` registry mengikuti pola `mapbox_satellite` (existing paid provider). `PUBLIC_ARCGIS_TOKEN` baked ke client bundle (Vite/Svelte `PUBLIC_` prefix) — pattern sama dengan `PUBLIC_MAPTILER_API_KEY` dan `PUBLIC_MAPBOX_ACCESS_TOKEN`. `DEFAULT_BASEMAP` resolver di-extend dengan fallback chain. Free `esri_satellite` tetap di registry sebagai fallback development. Existing UI (MapContainer switcher, dashboard dropdown, preferences dropdown) tidak berubah karena sudah consume `getActiveBasemaps()`.

**Tech Stack:** SvelteKit 2 (Svelte 5), TypeScript strict, Vite, MapLibre GL 5.24, vitest, Playwright. Env-driven config via `$env/static/public`.

## Global Constraints

- **PRD:** v1.4 §3.5 (basemap provider policy, PRINT_ALLOWED_BASEMAPS, DPIA)
- **Pattern reference:** `mapbox_satellite` di `basemaps.ts:106-118` (paid provider, token-in-URL, maxzoom 19)
- **TypeScript:** strict mode; explicit `BasemapKey` union, no `any` kecuali test mocks
- **Naming:** `esri_imagery_premium` (key), `esri-premium` (source id — distinct dari `esri` free)
- **Backward compat:** free `esri_satellite` TIDAK dihapus; `preferences.ts#resolveStoredBasemap` whitelist via `in basemaps` otomatis include key baru
- **Token security:** `PUBLIC_ARCGIS_TOKEN` di-bundle ke client (Vite `PUBLIC_` prefix); mitigasi provider-side (referer lock + rate limit)
- **Commit format:** `feat(frontend): ...` / `test(frontend): ...` / `docs(spec): ...` / `chore(frontend): ...` dengan `Co-Authored-By: Claude <noreply@anthropic.com>` trailer
- **Test discipline:** TDD — test dulu (red), implementasi (green), commit. Setiap task berakhir dengan deliverable testable
- **Branch:** `hermes/dev` (per AGENTS.md dan pattern plan sebelumnya)

## File Structure

**Modified files:**

| File | LOC delta | Responsibility |
|---|---|---|
| `frontend/.env.example` | +14 | Tambah `PUBLIC_ARCGIS_IMAGERY_URL` + `PUBLIC_ARCGIS_TOKEN` placeholder + komentar compliance |
| `frontend/.env` | +1 / -1 | Ubah `PUBLIC_DEFAULT_BASEMAP` ke `esri_imagery_premium` |
| `frontend/src/lib/components/map/basemaps.ts` | +30 / -5 | Tambah `BasemapKey` member, basemaps entry, update `DEFAULT_BASEMAP` resolver |
| `frontend/src/lib/components/map/basemaps.test.ts` | +50 / -3 | Update "5 providers" → "6 providers" + 5 test baru |
| `docs/PRD_WebGIS_Pemetaan_Wilayah.md` | +1 row | Tambah entry Esri Premium di tabel §3.5 |
| `frontend/tests/e2e/frontend-mvp.spec.ts` | +20 | 1 test baru (skip-able tanpa env) |

**Unchanged (verified consume via public API):**
- `frontend/src/lib/stores/preferences.ts` — `resolveStoredBasemap` otomatis whitelist key baru via `in basemaps` check
- `frontend/src/lib/components/map/MapContainer.svelte` — switcher iterate `getActiveBasemaps()`
- `frontend/src/routes/dashboard/+page.svelte` — dropdown iterate `getActiveBasemaps()`
- `frontend/src/routes/profile/preferences/+page.svelte` — dropdown iterate `getActiveBasemaps()`

---

## Task 1: Setup env vars

**Files:**
- Modify: `frontend/.env.example` (append after `PUBLIC_MAPBOX_ACCESS_TOKEN=`)
- Modify: `frontend/.env` (change `PUBLIC_DEFAULT_BASEMAP` value)

**Interfaces:**
- Consumes: existing `.env.example` content
- Produces: 2 new public env vars visible in `frontend/.env.example`; `PUBLIC_DEFAULT_BASEMAP=esri_imagery_premium` in `frontend/.env`

- [ ] **Step 1: Append env vars to `frontend/.env.example`**

Append after the last existing `PUBLIC_MAPBOX_ACCESS_TOKEN=` line:

```bash
# === Esri/ArcGIS World Imagery (institutional subscription) ===
# Custom MapServer URL dari admin Esri Anda (contoh:
# https://gis.example.go.id/arcgis/rest/services/Imagery/MapServer).
# Token format mengikuti ToS provider (token= query param atau custom).
# Syarat: subscription harus mengizinkan client-side token exposure
# (referer lock / rate limit di sisi provider).
# Compliance: tile imagery mengirim IP + koordinat ke server Esri
# (sudah tercakup DPIA basemap eksternal). Untuk PDF/Atlas export,
# konfirmasi ToS subscription — kalau tidak termasuk static export,
# tambahkan ke exclusion list PRINT_ALLOWED_BASEMAPS di PRD §3.5.
PUBLIC_ARCGIS_IMAGERY_URL=
PUBLIC_ARCGIS_TOKEN=
```

- [ ] **Step 2: Change default basemap in `frontend/.env`**

Edit `frontend/.env`. Find the line `PUBLIC_DEFAULT_BASEMAP=maptiler_streets` (or whatever current value is) and replace with:

```bash
PUBLIC_DEFAULT_BASEMAP=esri_imagery_premium
```

- [ ] **Step 3: Verify env files are syntactically valid**

Run: `cd frontend && node -e "require('fs').readFileSync('.env.example', 'utf8'); require('fs').readFileSync('.env', 'utf8'); console.log('env files readable')"`
Expected: `env files readable`

- [ ] **Step 4: Commit**

```bash
git add frontend/.env.example frontend/.env
git commit -m "chore(frontend): add PUBLIC_ARCGIS_* env vars + default to esri_imagery_premium" \
  -m "Add PUBLIC_ARCGIS_IMAGERY_URL and PUBLIC_ARCGIS_TOKEN placeholders to .env.example with compliance notes (DPIA, PRINT_ALLOWED_BASEMAPS, referer lock). Set PUBLIC_DEFAULT_BASEMAP=esri_imagery_premium in .env — fallback chain ke maptiler_streets -> osm_standard saat token kosong." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Add `esri_imagery_premium` to `BasemapKey` union (TDD)

**Files:**
- Modify: `frontend/src/lib/components/map/basemaps.ts:4-9` (extend `BasemapKey` union)
- Test: `frontend/src/lib/components/map/basemaps.test.ts:5-14` (update existing test)

**Interfaces:**
- Consumes: existing `BasemapKey` union
- Produces: `BasemapKey` includes `'esri_imagery_premium'`; test asserts 6 keys

- [ ] **Step 1: Update the failing test in `basemaps.test.ts`**

Open `frontend/src/lib/components/map/basemaps.test.ts`. Find the test `it('exposes the 5 supported basemap providers', ...)`. Replace its body with:

```ts
it('exposes the 6 supported basemap providers', () => {
  // 2026-07-04: esri_imagery_premium ditambahkan sebagai paid basemap
  // (institutional subscription). Free esri_satellite tetap di registry
  // sebagai fallback development.
  expect(Object.keys(basemaps).sort()).toEqual(
    ['esri_imagery_premium', 'esri_satellite', 'mapbox_satellite',
     'maptiler_satellite', 'maptiler_streets', 'osm_standard'].sort()
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/components/map/basemaps.test.ts -t "exposes the 6 supported basemap providers"`
Expected: FAIL with "expected [...5 keys] to deeply equal [...6 keys including 'esri_imagery_premium']"

- [ ] **Step 3: Extend `BasemapKey` union in `basemaps.ts`**

Open `frontend/src/lib/components/map/basemaps.ts`. Find the `BasemapKey` union (lines 4-9). Replace with:

```ts
export type BasemapKey =
  | 'osm_standard'
  | 'esri_satellite'
  | 'esri_imagery_premium'
  | 'maptiler_satellite'
  | 'maptiler_streets'
  | 'mapbox_satellite';
```

- [ ] **Step 4: Run test to verify it passes (key union alone won't satisfy the test — proceed to Task 3 if test still fails)**

The test asserts `Object.keys(basemaps).sort()` which iterates the `basemaps` registry, not just the union. The test will still fail until Task 3 adds the entry. Move to Task 3.

---

## Task 3: Add `esri_imagery_premium` entry to `basemaps` registry

**Files:**
- Modify: `frontend/src/lib/components/map/basemaps.ts:1` (extend import) and `basemaps.ts:53-119` (add entry after `esri_satellite`)
- Test: `frontend/src/lib/components/map/basemaps.test.ts` (verify Task 2 test now passes)

**Interfaces:**
- Consumes: `PUBLIC_ARCGIS_TOKEN`, `PUBLIC_ARCGIS_IMAGERY_URL` from `$env/static/public`
- Produces: `basemaps.esri_imagery_premium` with `isPaid: true, hasToken: !!token && !!url, maxzoom: 22`, source id `esri-premium`, tile URL `${PUBLIC_ARCGIS_IMAGERY_URL}/tile/{z}/{y}/{x}?token=${PUBLIC_ARCGIS_TOKEN}`

- [ ] **Step 1: Extend import statement at top of `basemaps.ts`**

Open `frontend/src/lib/components/map/basemaps.ts`. Find line 1:

```ts
import { PUBLIC_DEFAULT_BASEMAP, PUBLIC_MAPTILER_API_KEY, PUBLIC_MAPBOX_ACCESS_TOKEN } from '$env/static/public';
```

Replace with:

```ts
import { PUBLIC_DEFAULT_BASEMAP, PUBLIC_MAPTILER_API_KEY, PUBLIC_MAPBOX_ACCESS_TOKEN, PUBLIC_ARCGIS_TOKEN, PUBLIC_ARCGIS_IMAGERY_URL } from '$env/static/public';
```

- [ ] **Step 2: Add the new entry to `basemaps` object**

Find the `esri_satellite` block (lines 67-79) and add the following entry immediately after the `esri_satellite` block closing `},` and before the `// MapTiler streets-v2` comment:

```ts
  // Esri/ArcGIS World Imagery (institutional subscription) — custom MapServer
  // dengan high-res tile cache (z20–22). Requires PUBLIC_ARCGIS_TOKEN dan
  // PUBLIC_ARCGIS_IMAGERY_URL. PDF/Atlas export mengikuti ToS subscription —
  // admin konfirmasi sebelum export (cek PRD §3.5 PRINT_ALLOWED_BASEMAPS).
  esri_imagery_premium: {
    key: 'esri_imagery_premium',
    name: 'Esri Imagery (Premium)',
    style: rasterStyle(
      'esri-premium',
      [`${PUBLIC_ARCGIS_IMAGERY_URL || ''}/tile/{z}/{y}/{x}?token=${PUBLIC_ARCGIS_TOKEN || ''}`],
      'Tiles © Esri (institutional subscription)',
      22,  // maxzoom coverage; turunkan sesuai actual MapServer capability
      256
    ),
    isPaid: true,
    hasToken: !!PUBLIC_ARCGIS_TOKEN && !!PUBLIC_ARCGIS_IMAGERY_URL,
    maxzoom: 22
  },
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/components/map/basemaps.test.ts -t "exposes the 6 supported basemap providers"`
Expected: PASS (1 test passed)

- [ ] **Step 4: Run all basemap tests to ensure no regression**

Run: `cd frontend && npx vitest run src/lib/components/map/basemaps.test.ts`
Expected: ALL existing tests pass + the new "6 providers" test passes (6 tests passed total)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/components/map/basemaps.ts frontend/src/lib/components/map/basemaps.test.ts
git commit -m "feat(frontend): add esri_imagery_premium basemap entry" \
  -m "Paid basemap (institutional subscription) with custom MapServer URL, token-gated via PUBLIC_ARCGIS_TOKEN and PUBLIC_ARGCIS_IMAGERY_URL. maxzoom 22 (high-res institutional tile cache). isPaid=true, hasToken reactive to env. Source id 'esri-premium' (distinct from free 'esri' to avoid collision). Test updated: 5 -> 6 providers." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Add maxzoom cap and source spec tests (TDD)

**Files:**
- Modify: `frontend/src/lib/components/map/basemaps.test.ts` (add 2 tests after the "6 providers" test)

**Interfaces:**
- Consumes: `basemaps.esri_imagery_premium` entry from Task 3
- Produces: 2 tests asserting `maxzoom: 22` and source spec matches provider maxzoom

- [ ] **Step 1: Add the failing tests**

Open `frontend/src/lib/components/map/basemaps.test.ts`. Find the test `it('exposes the 6 supported basemap providers', ...)` and add the following tests immediately after it (before the `maptiler_streets` test):

```ts
it('esri_imagery_premium caps at z22 (premium tile cache, not the z19 raster cap)', () => {
  // Existing "caps raster basemaps at z19" test covers upstream-capped
  // raster sources (OSM, ESRI free, Mapbox). esri_imagery_premium uses
  // a custom institutional tile cache with high-res coverage up to z20-22,
  // so it joins the z22 group with maptiler_streets/maptiler_satellite.
  // Asserting this explicitly prevents accidental regression to z19 if
  // a future change touches the maxzoom field.
  expect(basemaps.esri_imagery_premium.maxzoom).toBe(22);
});

it('esri_imagery_premium source spec maxzoom matches provider maxzoom', () => {
  // Mirror of the existing "source spec maxzoom matches provider maxzoom
  // for raster basemaps" test, but for the premium entry. Its source id
  // is `esri-premium` (not `esri`) so it is not picked up by the
  // existing loop; assert it explicitly.
  const source = basemaps.esri_imagery_premium.style.sources?.['esri-premium'] as any;
  expect(source?.maxzoom).toBe(basemaps.esri_imagery_premium.maxzoom);
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/components/map/basemaps.test.ts -t "esri_imagery_premium"`
Expected: PASS for both tests (maxzoom=22 was set in Task 3 step 2, so tests should pass on first run — this is regression-guard discipline, not strict TDD-red-first)

- [ ] **Step 3: Run all basemap tests**

Run: `cd frontend && npx vitest run src/lib/components/map/basemaps.test.ts`
Expected: ALL tests pass (8 tests passed total: 5 existing + 1 updated + 2 new)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/components/map/basemaps.test.ts
git commit -m "test(frontend): assert esri_imagery_premium maxzoom 22 and source spec" \
  -m "Regression guards: caps at z22 (premium tile cache, not z19 raster cap); source spec maxzoom matches provider maxzoom (separate from existing 'raster basemaps' loop because source id is 'esri-premium', not 'esri')." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Add paid + token-in-URL + active filter tests (TDD)

**Files:**
- Modify: `frontend/src/lib/components/map/basemaps.test.ts` (add 3 tests after the Task 4 tests)

**Interfaces:**
- Consumes: `basemaps.esri_imagery_premium` entry
- Produces: 3 tests asserting `isPaid`, `hasToken` reactivity, and `getActiveBasemaps()` filter behavior

- [ ] **Step 1: Add the failing tests**

Open `frontend/src/lib/components/map/basemaps.test.ts`. Add the following tests immediately after the `esri_imagery_premium source spec maxzoom` test (after Task 4 tests, before the `caps raster basemaps at z19` test):

```ts
it('esri_imagery_premium is paid and gated by env', () => {
  expect(basemaps.esri_imagery_premium.isPaid).toBe(true);
  // hasToken reflects env at module-load time
  expect(basemaps.esri_imagery_premium.hasToken)
    .toBe(!!PUBLIC_ARCGIS_TOKEN && !!PUBLIC_ARCGIS_IMAGERY_URL);
});

it('esri_imagery_premium embeds token in tile URL', () => {
  const tiles = (basemaps.esri_imagery_premium.style.sources?.['esri-premium'] as any)?.tiles;
  expect(Array.isArray(tiles)).toBe(true);
  expect(tiles[0]).toContain('token=');
  if (PUBLIC_ARCGIS_IMAGERY_URL) {
    expect(tiles[0]).toContain(PUBLIC_ARCGIS_IMAGERY_URL);
  }
});

it('getActiveBasemaps hides esri_imagery_premium when no token or no url', () => {
  const active = getActiveBasemaps();
  if (basemaps.esri_imagery_premium.hasToken) {
    expect(active.some(b => b.key === 'esri_imagery_premium')).toBe(true);
  } else {
    expect(active.some(b => b.key === 'esri_imagery_premium')).toBe(false);
  }
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/components/map/basemaps.test.ts -t "esri_imagery_premium\|getActiveBasemaps"`
Expected: PASS for all 3 tests (entry from Task 3 already has `isPaid`, `hasToken`, and token-in-URL set correctly)

- [ ] **Step 3: Run all basemap tests**

Run: `cd frontend && npx vitest run src/lib/components/map/basemaps.test.ts`
Expected: ALL tests pass (11 tests passed total: 5 existing + 1 updated + 5 new)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/components/map/basemaps.test.ts
git commit -m "test(frontend): assert esri_imagery_premium isPaid, token embed, active filter" \
  -m "Regression guards: isPaid=true, hasToken reactive ke env (PUBLIC_ARCGIS_TOKEN && PUBLIC_ARCGIS_IMAGERY_URL), tile URL mengandung 'token=' dan URL MapServer, getActiveBasemaps() hide entry saat hasToken false." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Update `DEFAULT_BASEMAP` resolver (TDD)

**Files:**
- Modify: `frontend/src/lib/components/map/basemaps.ts:121-135` (update `DEFAULT_BASEMAP` IIFE)
- Test: `frontend/src/lib/components/map/basemaps.test.ts` (add test for resolver behavior)

**Interfaces:**
- Consumes: `basemaps.esri_imagery_premium.hasToken`, `basemaps.maptiler_streets.hasToken`
- Produces: `DEFAULT_BASEMAP` returns `esri_imagery_premium` when token+url set; otherwise follows existing fallthrough to `maptiler_streets` → `osm_standard`

- [ ] **Step 1: Add the failing test**

Open `frontend/src/lib/components/map/basemaps.test.ts`. Add the following test immediately after the `getActiveBasemaps hides` test from Task 5:

```ts
it('DEFAULT_BASEMAP prefers esri_imagery_premium when token + url set', () => {
  if (basemaps.esri_imagery_premium.hasToken) {
    expect(DEFAULT_BASEMAP).toBe('esri_imagery_premium');
  } else {
    // Fallback chain: maptiler_streets -> osm_standard
    expect(['maptiler_streets', 'osm_standard']).toContain(DEFAULT_BASEMAP);
  }
});
```

- [ ] **Step 2: Run test to verify it fails (or passes depending on current resolver)**

Run: `cd frontend && npx vitest run src/lib/components/map/basemaps.test.ts -t "DEFAULT_BASEMAP prefers esri_imagery_premium"`
Expected: May FAIL if current resolver doesn't have the fallback chain, or PASS if existing resolver already handles the chain. Inspect actual result and proceed.

- [ ] **Step 3: Update `DEFAULT_BASEMAP` resolver in `basemaps.ts`**

Find the `DEFAULT_BASEMAP` IIFE (lines 121-135). Replace the entire block with:

```ts
export const DEFAULT_BASEMAP: BasemapKey = (() => {
  const requested = PUBLIC_DEFAULT_BASEMAP as BasemapKey;
  if (requested in basemaps && (!basemaps[requested].isPaid || basemaps[requested].hasToken)) {
    return requested;
  }
  // Fallback chain: premium -> maptiler_streets -> osm_standard
  if (basemaps.esri_imagery_premium.hasToken) return 'esri_imagery_premium';
  if (basemaps.maptiler_streets.hasToken) return 'maptiler_streets';
  return 'osm_standard';
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/components/map/basemaps.test.ts -t "DEFAULT_BASEMAP prefers esri_imagery_premium"`
Expected: PASS

- [ ] **Step 5: Run all basemap tests**

Run: `cd frontend && npx vitest run src/lib/components/map/basemaps.test.ts`
Expected: ALL 12 tests pass (5 existing + 1 updated + 6 new)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/components/map/basemaps.ts frontend/src/lib/components/map/basemaps.test.ts
git commit -m "feat(frontend): DEFAULT_BASEMAP resolver prefers esri_imagery_premium" \
  -m "Resolver: honor PUBLIC_DEFAULT_BASEMAP if valid + token-gated; else fallback chain esri_imagery_premium -> maptiler_streets -> osm_standard. Mirrors existing paid provider pattern (mapbox_satellite)." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Update PRD §3.5 with Esri Premium row

**Files:**
- Modify: `docs/PRD_WebGIS_Pemetaan_Wilayah.md` (§3.5 table)

**Interfaces:**
- Consumes: existing PRD table rows
- Produces: 1 new row for `esri_imagery_premium` after the free `ESRI World Imagery` row

- [ ] **Step 1: Locate the table in PRD §3.5**

Run: `grep -n "ESRI World Imagery" docs/PRD_WebGIS_Pemetaan_Wilayah.md`
Expected: a line in §3.5 (around line 252 per the AGENTS.md context)

- [ ] **Step 2: Add the new row immediately after the free ESRI World Imagery row**

Find the row containing `ESRI World Imagery | esri_satellite | ...` and add the following row immediately after it:

```markdown
| Esri Imagery (Premium) | `esri_imagery_premium` | ya (institutional subscription) | ya (token di env) | sesuai ToS subscription — konfirmasi admin; kalau tidak termasuk static export, masuk exclusion list | tidak cache permanen kecuali lisensi | IP + koordinat tile ke server Esri institutional | OSM/MapTiler/self-hosted/no-basemap |
```

- [ ] **Step 3: Verify the row is correctly placed**

Run: `grep -n "esri_imagery_premium\|ESRI World Imagery\|Esri Imagery" docs/PRD_WebGIS_Pemetaan_Wilayah.md`
Expected: 3 lines matched, in order: `ESRI World Imagery` (free row), `Esri Imagery (Premium)` (new row), and possibly a reference in the explanatory text below

- [ ] **Step 4: Commit**

```bash
git add docs/PRD_WebGIS_Pemetaan_Wilayah.md
git commit -m "docs(spec): add Esri Imagery (Premium) to basemap provider table" \
  -m "PRD v1.4 \u00a73.5 updated with new row for esri_imagery_premium (institutional subscription, token-gated, custom MapServer). Caveat: ToS compliance untuk PDF/Atlas static export \u2014 admin confirm sebelum enable. DPIA sudah tercakup (sama dengan basemap eksternal lain)." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Add E2E test for basemap switcher (skip-able tanpa env)

**Files:**
- Modify: `frontend/tests/e2e/frontend-mvp.spec.ts` (add 1 test at end of file)

**Interfaces:**
- Consumes: existing testid pattern `map-basemap-button`, `basemap-option-${key}`, `map-basemap-state`
- Produces: 1 new E2E test that asserts premium option appears in switcher when env is set

- [ ] **Step 1: Find the end of the e2e test file**

Run: `tail -5 frontend/tests/e2e/frontend-mvp.spec.ts`
Expected: shows the closing brace of the last `test(...)` block

- [ ] **Step 2: Append the new E2E test**

Add the following test at the end of `frontend/tests/e2e/frontend-mvp.spec.ts` (after the last test block, before the final `});` of any enclosing `test.describe`):

```ts
test('basemap switcher shows premium when token + url set', async ({ page }) => {
  // Skip when env not configured (CI tanpa institutional subscription).
  // Pattern sama dengan test basemap MapTiler/Mapbox.
  test.skip(
    !process.env.PUBLIC_ARCGIS_TOKEN || !process.env.PUBLIC_ARCGIS_IMAGERY_URL,
    'PUBLIC_ARCGIS_TOKEN or PUBLIC_ARCGIS_IMAGERY_URL not set'
  );

  await loginAs(page);
  await page.goto('/dashboard');
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible({ timeout: 10000 });
  // Selector real dari MapContainer switcher (sudah dipakai di test
  // PRD v1.4 §8.1 basemap toolbar).
  await page.getByTestId('map-basemap-button').click();
  await expect(page.getByTestId('basemap-option-esri_imagery_premium')).toBeVisible();
  await expect(page.getByTestId('map-basemap-state')).toContainText('Esri Imagery (Premium)');
});
```

- [ ] **Step 3: Verify test compiles (typecheck)**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errors (if there are errors, fix the test code)

- [ ] **Step 4: Run the new test (will skip without env)**

Run: `cd frontend && npx playwright test e2e/frontend-mvp.spec.ts -g "basemap switcher shows premium"`
Expected: 1 skipped, 0 failed, 0 passed (because env is not set in CI/dev without subscription)

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/e2e/frontend-mvp.spec.ts
git commit -m "test(e2e): basemap switcher shows premium when env set" \
  -m "Skip-able test (skip when PUBLIC_ARCGIS_TOKEN or PUBLIC_ARGCIS_IMAGERY_URL unset). Asserts basemap-option-esri_imagery_premium visible di switcher dan map-basemap-state meng-contain 'Esri Imagery (Premium)' setelah klik." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Verify full MVP suite

**Files:** none (verification only)

- [ ] **Step 1: Run unit tests**

Run: `cd frontend && npm run test:unit` (or `npx vitest run` if no script)
Expected: ALL tests pass (12+ basemap tests + all other frontend unit tests)

- [ ] **Step 2: Run E2E tests**

Run: `cd frontend && npm run test:e2e`
Expected: ALL existing E2E tests pass + the new premium test is skipped (env not set)

- [ ] **Step 3: Run lint + typecheck + build (full verify:mvp)**

Run: `cd frontend && npm run verify:mvp`
Expected: PASS (lint, typecheck, unit tests, E2E tests, build all green)

- [ ] **Step 4: Manual smoke (optional, requires env from admin)**

If `PUBLIC_ARGCIS_TOKEN` and `PUBLIC_ARGCIS_IMAGERY_URL` are set locally:

1. `cd frontend && npm run dev`
2. Buka `http://localhost:5173/dashboard` → peta load dengan Esri premium
3. Zoom ke z20+ → tile masih tajam (bandingkan dengan `maptiler_streets` z20+)
4. Buka switcher top-right → "Esri Imagery (Premium)" muncul sebagai opsi
5. Buka `http://localhost:5173/profile/preferences` → dropdown "Default basemap" punya opsi premium
6. Attribution "Tiles © Esri (institutional subscription)" tampil di pojok peta
7. Unset token di `.env`, restart dev → switcher sembunyikan premium, default kembali ke `maptiler_streets` atau `osm_standard`

- [ ] **Step 5: Final summary commit (only if manual smoke revealed a fix)**

If manual smoke revealed a bug, fix it and commit with `fix(frontend): ...` prefix. Otherwise, no commit needed.

---

## Self-Review

**1. Spec coverage:**

| Spec section | Implemented in |
|---|---|
| §1 Problem (Esri premium tajam z20+) | Tasks 1-9 (entry, token, env) |
| §2 Goal (token-gated, default fallback, backward compat) | Tasks 1, 3, 6, 8 + integration verify di Task 9 |
| §3 Decisions (entry baru, custom URL, dll) | Tasks 1, 3, 6 |
| §4 Architecture (component tree, data flow) | Tasks 3, 6 (registry + resolver) |
| §5.1 `basemaps.ts` entry | Task 3 |
| §5.2 `basemaps.test.ts` | Tasks 2, 4, 5, 6 (5 new tests + 1 update) |
| §5.3 `.env.example` | Task 1 |
| §5.4 `.env` | Task 1 |
| §5.5 PRD §3.5 | Task 7 |
| §5.6 Unchanged files | Verified (no edits needed) |
| §6 State & Error Handling | Covered by tests in Tasks 4, 5, 6 (token reactivity, cap, resolver fallback) |
| §8 Testing Strategy | Tasks 2-6 (unit), Task 8 (E2E), Task 9 (verify) |
| §9 Open Questions (admin) | Noted in spec; implementer tidak block — admin sediakan saat deployment |

**2. Placeholder scan:** No "TBD", "TODO", "implement later" in any step. Every code block is complete. Every commit has full message.

**3. Type consistency:**
- `BasemapKey` = `'osm_standard' | 'esri_satellite' | 'esri_imagery_premium' | 'maptiler_satellite' | 'maptiler_streets' | 'mapbox_satellite'` (used consistently in Tasks 2-6)
- `basemaps.esri_imagery_premium` field names: `key`, `name`, `style`, `isPaid`, `hasToken`, `maxzoom` (matches `BasemapProvider` interface in basemaps.ts:11-29)
- Source id `esri-premium` (used in Task 3 entry, Task 4 source spec test, Task 5 token-in-URL test)
- Env var names: `PUBLIC_ARCGIS_TOKEN`, `PUBLIC_ARCGIS_IMAGERY_URL` (used in Task 1 env, Task 3 entry, Task 5 tests)
- Test helper: `loginAs` (imported in Task 8 from existing helpers)
- Test IDs: `map-basemap-button`, `basemap-option-esri_imagery_premium`, `map-basemap-state`, `[data-map-ready="true"]` (consistent with existing E2E test at frontend-mvp.spec.ts:327-369)

**4. Plan failure checks:**
- No "fill in details" placeholders
- No "appropriate error handling" without code
- No "similar to Task N" without repeating code
- All test code is complete, not stubs
- All commit messages are full

**Gaps found:** None. Spec coverage complete. Plan ready for execution.

---

## Execution Handoff

Plan complete dan saved to `docs/superpowers/plans/2026-07-04-esri-premium-basemap.md` (9 tasks, semua bite-sized, TDD-disciplined).

**Dua execution option:**

1. **Subagent-Driven (recommended)** — saya dispatch fresh subagent per task, review antara task, fast iteration
2. **Inline Execution** — execute tasks di session ini pakai `executing-plans`, batch execution dengan checkpoint

Pilih approach, atau ada bagian plan yang perlu direvisi dulu?
