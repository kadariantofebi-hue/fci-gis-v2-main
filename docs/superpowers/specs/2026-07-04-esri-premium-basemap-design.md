# Esri Premium Basemap sebagai Default

**Status:** Proposed
**Date:** 2026-07-04
**Author:** Claude (brainstorming session with user)
**Supersedes:** N/A (additive terhadap `esri_satellite` free)
**PRD:** v1.4 §3.5 (Basemap Provider)
**Related:** `2026-06-28-vector-native-basemap-design.md` (maptiler_streets), `2026-07-02 restore maptiler_satellite hybrid`

## 1. Problem

User ingin basemap satelit yang tetap tajam pada zoom level sangat tinggi (z20+). Opsi satelit publik yang ada di registry (`esri_satellite` free, `maptiler_satellite` hybrid raster, `mapbox_satellite`, `osm_standard`) semuanya **raster** dan native max-zoom **z19** — di atas z19 tile raster diulang/diinterpolasi sehingga pixel membesar. Opsi non-raster (`maptiler_streets`) tajam sampai z22, tetapi tidak menampilkan citra satelit.

User memiliki akses ke MapServer Esri premium (institutional subscription) dengan tile cache high-res yang menjangkau z20–22 di coverage area target. Basemap ini memenuhi syarat "satelit + tajam di z20+".

## 2. Goal

Tambahkan basemap Esri premium sebagai opsi di switcher dan default di environment, dengan syarat:

- **Token-gated**: entry hanya muncul di switcher ketika admin/dev menyediakan `PUBLIC_ARCGIS_TOKEN` + `PUBLIC_ARCGIS_IMAGERY_URL` di `.env`. Tanpa keduanya, entry tersembunyi.
- **Default fallback chain**: `PUBLIC_DEFAULT_BASEMAP=esri_imagery_premium` ketika token+URL di-set; jika tidak, fallback ke `maptiler_streets` (kalau punya token MapTiler) → `osm_standard` (ultimate fallback, selalu tersedia).
- **Backward compatible**: `esri_satellite` free TIDAK dihapus. Tetap di registry, tetap di switcher, tetap jadi fallback development tanpa subscription.
- **Tidak migrate existing user preference**: user dengan `localStorage.defaultBasemap=esri_satellite` atau `maptiler_streets` tetap pakai preferensinya (existing pattern di `preferences.ts#resolveStoredBasemap`).

**Out of scope (per diskusi brainstorming):**

- Basemap auto-swap on tile error (Post-MVP per Plan 2026-06-12)
- Tile health check khusus untuk premium provider (Post-MVP)
- Migrasi existing user preferences ke premium
- UI badge/indikator khusus untuk basemap premium
- Paid basemap lain (Nearmap, Maxar, Hexagon)
- Modifikasi `MapContainer.svelte`, `DigitizeMapPanel.svelte`, `MapDrawController.svelte`, `DashboardDrawSheet.svelte`, `routes/dashboard/+page.svelte`, `routes/preferences/+page.svelte` — semuanya sudah consume `basemaps[key]`, `DEFAULT_BASEMAP`, `getActiveBasemaps()` lewat public API

## 3. Decisions (Brainstorming)

| # | Pertanyaan | Keputusan |
|---|---|---|
| 1 | Target zoom level dan prioritas | z20+, tajam prioritas, tetap dalam mode satelit (membutuhkan custom MapServer, bukan public endpoint) |
| 2 | Strategy: free vs premium vs composite | Custom Esri MapServer high-res dengan token, ditambahkan sebagai entry baru, `esri_satellite` free tetap di registry |
| 3 | Struktur entry: baru vs replace | Entry baru `esri_imagery_premium`, free `esri_satellite` tetap (replace default, bukan replace entry) |
| 4 | URL pattern | Custom — admin sediakan MapServer URL institutional. Token di query param `token=`. (Tidak hard-code `server.arcgisonline.com` standard; flexibility untuk custom deployment) |
| 5 | Token model | `PUBLIC_ARCGIS_TOKEN` di bundle Svelte/Vite (standar client-side Esri tokens, biasanya dengan referer lock + rate limit di sisi provider) |
| 6 | Attribution | `Tiles © Esri (institutional subscription)` |
| 7 | PDF/Atlas allowance | Sesuai ToS subscription — admin konfirmasi; kalau subscription tidak termasuk static export, masuk exclusion list `PRINT_ALLOWED_BASEMAPS` (cek PRD §3.5) |

## 4. Architecture

### 4.1 Component tree (file yang berubah)

```
frontend/
├─ .env.example                          ← +2 env vars + komentar compliance
├─ .env                                  ← PUBLIC_DEFAULT_BASEMAP diubah
└─ src/lib/components/map/
   ├─ basemaps.ts                        ← +BasemapKey member, +basemaps entry, ~DEFAULT_BASEMAP resolver
   └─ basemaps.test.ts                   ← update existing tests + 4 test baru

frontend/src/lib/stores/preferences.ts    ← TIDAK berubah (resolveStoredBasemap sudah validate via `in basemaps`)

docs/
├─ PRD_WebGIS_Pemetaan_Wilayah.md        ← +row di tabel §3.5
```

### 4.2 Data flow (runtime)

```
App boot
  → Vite inlines PUBLIC_ARCGIS_TOKEN dan PUBLIC_ARCGIS_IMAGERY_URL ke bundle
  → basemaps.ts module load
     ├─ basemaps.esri_imagery_premium.hasToken = !!token && !!url
     └─ DEFAULT_BASEMAP resolver:
         if PUBLIC_DEFAULT_BASEMAP valid + (!isPaid || hasToken) → return it
         else if esri_imagery_premium.hasToken → 'esri_imagery_premium'
         else if maptiler_streets.hasToken → 'maptiler_streets'
         else 'osm_standard'
  → preferences.ts init
     → localStorage('simanta.preferences').defaultBasemap
     → if stored in basemaps (whitelist includes new key) → pakai itu
     → else DEFAULT_BASEMAP
  → getActiveBasemaps() filter: hide esri_imagery_premium jika hasToken === false

User buka /dashboard
  → MapContainer mount, use $basemaps[$DEFAULT_BASEMAP]
  → tile layer URL = `${PUBLIC_ARCGIS_IMAGERY_URL}/tile/{z}/{y}/{x}?token=${PUBLIC_ARCGIS_TOKEN}`

User buka switcher (top-right map)
  → list = getActiveBasemaps()
  → "Esri Imagery (Premium)" muncul sebagai opsi pertama (sesuai urutan registry) kalau token+URL di-set
  → klik → MapContainer swap tile layer

Tile error (token invalid / 401 / network)
  → existing tileerror listener di MapContainer
  → existing warning banner "Basemap tile error" tampil (Plan 2026-06-12)
  → tidak ada auto-swap (Post-MVP deferred)
```

## 5. Components

### 5.1 Changed: `frontend/src/lib/components/map/basemaps.ts`

**Import tambahan:**

```ts
import { PUBLIC_DEFAULT_BASEMAP, PUBLIC_MAPTILER_API_KEY, PUBLIC_MAPBOX_ACCESS_TOKEN, PUBLIC_ARCGIS_TOKEN, PUBLIC_ARCGIS_IMAGERY_URL } from '$env/static/public';
```

**`BasemapKey` union diperluas:**

```ts
export type BasemapKey =
  | 'osm_standard'
  | 'esri_satellite'
  | 'esri_imagery_premium'  // ← baru
  | 'maptiler_satellite'
  | 'maptiler_streets'
  | 'mapbox_satellite';
```

**Entry baru di `basemaps` registry** (letakkan setelah `esri_satellite` free, sebelum `maptiler_streets`):

```ts
// Esri/ArcGIS World Imagery (institutional subscription) — custom MapServer
// dengan high-res tile cache (z20–22). Requires PUBLIC_ARCGIS_TOKEN dan
// PUBLIC_ARCGIS_IMAGERY_URL. PDF/Atlas export mengikuti ToS subscription —
// admin konfirmasi sebelum export.
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
}
```

**`DEFAULT_BASEMAP` resolver update:**

```ts
export const DEFAULT_BASEMAP: BasemapKey = (() => {
  const requested = PUBLIC_DEFAULT_BASEMAP as BasemapKey;
  if (requested in basemaps && (!basemaps[requested].isPaid || basemaps[requested].hasToken)) {
    return requested;
  }
  // Fallback chain: premium → maptiler_streets → osm_standard
  if (basemaps.esri_imagery_premium.hasToken) return 'esri_imagery_premium';
  if (basemaps.maptiler_streets.hasToken) return 'maptiler_streets';
  return 'osm_standard';
})();
```

### 5.2 Changed: `frontend/src/lib/components/map/basemaps.test.ts`

**Update test existing:**

```ts
it('exposes the 6 supported basemap providers', () => {
  expect(Object.keys(basemaps).sort()).toEqual(
    ['esri_imagery_premium', 'esri_satellite', 'mapbox_satellite',
     'maptiler_satellite', 'maptiler_streets', 'osm_standard'].sort()
  );
});
```

**Test baru:**

```ts
it('esri_imagery_premium is paid and gated by env', () => {
  expect(basemaps.esri_imagery_premium.isPaid).toBe(true);
  expect(basemaps.esri_imagery_premium.hasToken)
    .toBe(!!PUBLIC_ARCGIS_TOKEN && !!PUBLIC_ARCGIS_IMAGERY_URL);
});

it('esri_imagery_premium embeds token in tile URL', () => {
  const tiles = (basemaps.esri_imagery_premium.style.sources?.['esri-premium'] as any)?.tiles;
  expect(tiles[0]).toContain('token=');
  if (PUBLIC_ARCGIS_IMAGERY_URL) {
    expect(tiles[0]).toContain(PUBLIC_ARCGIS_IMAGERY_URL);
  }
});

it('DEFAULT_BASEMAP prefers esri_imagery_premium when token + url set', () => {
  if (basemaps.esri_imagery_premium.hasToken) {
    expect(DEFAULT_BASEMAP).toBe('esri_imagery_premium');
  } else {
    expect(['maptiler_streets', 'osm_standard']).toContain(DEFAULT_BASEMAP);
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

it('source spec maxzoom matches provider maxzoom for esri_imagery_premium', () => {
  const source = basemaps.esri_imagery_premium.style.sources?.['esri-premium'] as any;
  expect(source?.maxzoom).toBe(basemaps.esri_imagery_premium.maxzoom);
});

it('esri_imagery_premium caps at z22 (premium tile cache, not the z19 raster cap)', () => {
  // Existing "caps raster basemaps at z19" test covers upstream-capped
  // raster sources (OSM, ESRI free, Mapbox). esri_imagery_premium uses
  // a custom institutional tile cache with high-res coverage up to z20–22,
  // so it joins the z22 group with maptiler_streets/maptiler_satellite.
  // Asserting this explicitly prevents accidental regression to z19 if
  // a future change touches the maxzoom field.
  expect(basemaps.esri_imagery_premium.maxzoom).toBe(22);
});


```

### 5.3 Changed: `frontend/.env.example`

Tambah (setelah `PUBLIC_MAPBOX_ACCESS_TOKEN`):

```
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

### 5.4 Changed: `frontend/.env`

```
PUBLIC_DEFAULT_BASEMAP=esri_imagery_premium
```

(`PUBLIC_ARCGIS_IMAGERY_URL` dan `PUBLIC_ARCGIS_TOKEN` di-set manual oleh admin dari nilai institutional subscription; tidak di-commit.)

### 5.5 Changed: `docs/PRD_WebGIS_Pemetaan_Wilayah.md`

Tambah row di tabel §3.5 (setelah baris `ESRI World Imagery` free):

```
| Esri Imagery (Premium) | `esri_imagery_premium` | ya (institutional subscription) | ya (token di env) | sesuai ToS subscription — konfirmasi admin; kalau tidak termasuk static export, masuk exclusion list | tidak cache permanen kecuali lisensi | IP + koordinat tile ke server Esri institutional | OSM/MapTiler/self-hosted/no-basemap |
```

### 5.6 Unchanged

- `frontend/src/lib/stores/preferences.ts` — `resolveStoredBasemap` sudah memvalidasi `parsed.defaultBasemap in basemaps`, otomatis whitelist key baru. Tidak perlu edit.
- `frontend/src/lib/components/map/MapContainer.svelte` — consume `basemaps[key]` lewat prop, switcher iterate `getActiveBasemaps()`, tidak ada perubahan API.
- `frontend/src/lib/components/map/DigitizeMapPanel.svelte`, `MapDrawController.svelte` — tidak terkait.
- `frontend/src/routes/dashboard/+page.svelte`, `routes/preferences/+page.svelte` — dropdown sudah iterate `getActiveBasemaps()`.
- `frontend/src/lib/services/api/preferences.ts` — mock service, tidak ada basemap allowlist.
- Backend — tidak ada perubahan (frontend-only feature).

## 6. State & Error Handling

### 6.1 State matrix

| Condition | Behavior |
|---|---|
| `PUBLIC_ARCGIS_TOKEN` + `PUBLIC_ARCGIS_IMAGERY_URL` di-set, `PUBLIC_DEFAULT_BASEMAP=esri_imagery_premium` | Resolver return `esri_imagery_premium`. Switcher tunjukkan opsi. Dashboard default = premium. |
| `PUBLIC_DEFAULT_BASEMAP=esri_imagery_premium` tapi token/URL kosong | Resolver detect `isPaid && !hasToken` → fall through ke chain `maptiler_streets` → `osm_standard`. Switcher sembunyikan premium. Default jadi `maptiler_streets` atau `osm_standard`. Tidak ada error. |
| `PUBLIC_DEFAULT_BASEMAP=esri_imagery_premium` di-set tapi key tidak dikenal | Sama dengan row di atas (resolver fall through). |
| `PUBLIC_DEFAULT_BASEMAP=esri_satellite` (existing) | Tidak ada perubahan behavior. Free Esri tetap default. Premium opsional via switcher. |
| User existing dengan `localStorage.defaultBasemap=esri_satellite` / `maptiler_streets` | Tetap pakai preferensinya (resolveStoredBasemap whitelist include new key, tapi tidak override existing). |
| `localStorage.defaultBasemap=esri_imagery_premium` tapi token dihapus dari env | `resolveStoredBasemap` check `in basemaps` — key masih dikenal. MapContainer panggil entry yang ada. Tile gagal load (401). tileerror handler existing tampil banner. User harus pilih basemap lain manual. (Bisa diperbaiki dengan auto-fallback Post-MVP.) |
| MapServer maxzoom coverage < 22 | `maxzoom: 22` di style spec memungkinkan overscale. Jika MapServer hanya serve sampai z20, tile error di z>20. Admin turunkan `maxzoom` di entry sesuai actual capability. |
| Token bocor ke client (sengaja atau tidak) | Token di-prefix `PUBLIC_` → baked ke bundle (Vite/Svelte standard). Mitigasi: referer lock + rate limit di provider, dan rotasi berkala oleh admin. Tidak ada data sensitif dalam token imagery. |
| Token invalid/expired | Tile load 401 → tileerror → existing warning banner. User switch manual ke basemap lain. |

### 6.2 Migration / rollback

- Rollback: ubah `PUBLIC_DEFAULT_BASEMAP` di `.env` ke `maptiler_streets` (atau nilai sebelumnya). `basemaps.ts` dan `basemaps.test.ts` tetap — entry premium tetap di registry, hidden by `getActiveBasemaps()` filter ketika token kosong.
- Forward compatibility: jika user menambah basemap paid lain di masa depan, pattern sama (env var token + isPaid + hasToken). Resolver tetap extensible.

### 6.3 Accessibility

Tidak ada regresi a11y. Switcher dan dropdown Preferences sudah accessible (test-id `map-basemap-button`, `map-basemap-state`, `Pilih basemap dashboard`). Entry baru otomatis muncul dengan role/label/aria yang sudah ada.

## 7. File Diff Summary

| File | Action | LOC |
|---|---|---|
| `frontend/.env.example` | Edited | +14 / -0 |
| `frontend/.env` | Edited | +1 / -1 (ganti `PUBLIC_DEFAULT_BASEMAP` value) |
| `frontend/src/lib/components/map/basemaps.ts` | Edited | +30 / -5 |
| `frontend/src/lib/components/map/basemaps.test.ts` | Edited | +55 / -3 |
| `docs/PRD_WebGIS_Pemetaan_Wilayah.md` | Edited | +1 row di tabel §3.5 |
| `frontend/src/lib/stores/preferences.ts` | Unchanged (whitelist via `in basemaps`) | — |
| `frontend/src/lib/components/map/MapContainer.svelte` | Unchanged | — |
| `frontend/tests/e2e/frontend-mvp.spec.ts` | Edited (1 new test, conditional on env) | +25 / -0 |

**Net:** ~+125 LOC, additive. Tidak ada file yang dihapus. Tidak ada breaking change untuk existing basemap.

## 8. Testing Strategy

### 8.1 Unit (vitest)

Lokasi: `frontend/src/lib/components/map/basemaps.test.ts`

- 5 test baru (lihat §5.2): "is paid and gated by env", "embeds token in tile URL", "DEFAULT_BASEMAP prefers premium", "getActiveBasemaps hides premium", "caps at z22 (premium tile cache, not the z19 raster cap)".
- 1 test update: "exposes the 6 supported basemap providers" (dari 5 → 6)
- Test "caps raster basemaps at z19" TIDAK berubah — assertion-nya iterate key secara eksplisit (`osm_standard`, `esri_satellite`, `mapbox_satellite`, `maptiler_streets`, `maptiler_satellite`) sehingga `esri_imagery_premium` tidak ikut ter-cap. Test `esri_imagery_premium caps at z22` baru meng-assert maxzoom premium = 22 secara eksplisit (lihat §5.2).

### 8.2 E2E (Playwright)

Lokasi: `frontend/tests/e2e/frontend-mvp.spec.ts`

Tambah 1 test, skip-able ketika env tidak di-set (pattern sama dengan MapTiler/Mapbox):

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
  // PRD v1.4 §8.1 basemap toolbar di line 332).
  await page.getByTestId('map-basemap-button').click();
  await expect(page.getByTestId('basemap-option-esri_imagery_premium')).toBeVisible();
  await expect(page.getByTestId('map-basemap-state')).toContainText('Esri Imagery (Premium)');
});
```

### 8.3 Manual smoke

1. `cd frontend && npm run dev`
2. Set `PUBLIC_ARCGIS_IMAGERY_URL` dan `PUBLIC_ARCGIS_TOKEN` di `.env` dengan nilai dari admin
3. Buka `/dashboard` → peta load dengan Esri premium. Zoom ke z20+ → tile masih tajam
4. Buka switcher → "Esri Imagery (Premium)" muncul. Klik → peta swap ke tile premium
5. Unset `PUBLIC_ARCGIS_TOKEN` di `.env`, restart dev → switcher sembunyikan premium, default kembali ke `maptiler_streets` atau `osm_standard`
6. Buka `/profile/preferences` → dropdown "Default basemap" otomatis punya opsi premium ketika token di-set
7. Attribution "Tiles © Esri (institutional subscription)" tampil di pojok peta

### 8.4 Verification

```bash
cd frontend && npm run verify:mvp
```

Expected: PASS (semua test existing + baru).

## 9. Open Questions (untuk admin sebelum implementasi)

1. **MapServer URL**: institusi menyediakan custom MapServer URL dengan high-res tile cache. Path lengkap (contoh: `https://gis.example.go.id/arcgis/rest/services/Imagery/MapServer`). Berapa `maxzoom` coverage actual?
2. **Token acquisition**: bagaimana admin generate token — via ArcGIS Online `generateToken` endpoint, atau via OAuth 2.0, atau static institutional token?
3. **ToS compliance**: apakah subscription mencakup static export/print untuk PDF/Atlas? Jika tidak, update `PRINT_ALLOWED_BASEMAPS` di PRD §3.5.
4. **Referer lock**: apakah provider mengunci token per domain (mis. hanya `gis.example.go.id`)? Konfigurasi di sisi ArcGIS Online.
5. **Token rotation**: seberapa sering token di-rotate? Apakah ada automation?

Item 1 dan 5 adalah blocker untuk deployment production. Item 2-4 adalah konfigurasi awal, bisa di-set kemudian.

## 10. References

- `frontend/src/lib/components/map/basemaps.ts` — registry existing, pattern `mapbox_satellite` untuk paid provider
- `frontend/src/lib/stores/preferences.ts` — `resolveStoredBasemap` whitelist pattern
- `docs/PRD_WebGIS_Pemetaan_Wilayah.md` §3.5 — basemap provider policy
- `docs/superpowers/specs/2026-06-28-vector-native-basemap-design.md` — referensi decision vector vs raster, maxzoom capping
- `docs/superpowers/specs/2026-07-04-sidoarjo-boundary-design.md` — format spec reference
- Plan `2026-06-12_161000-frontend-mvp-prd-v137-go-live-hardening.md` — Post-MVP deferral untuk auto-swap basemap
