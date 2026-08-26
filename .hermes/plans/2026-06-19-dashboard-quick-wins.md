# SIMANTA Dashboard — Full Maps Quick Wins (PRD v1.4 feedback 2026-06-19)

**Tanggal:** 19 Juni 2026
**Profile:** simantadev (Software Engineer)
**Reviewer:** Claude Code (LiteLLM proxy, model `MiniMax-M3`)
**PRD anchor:** `docs/PRD_WebGIS_Pemetaan_Wilayah.md` v1.4 §8.1 + SIBIMASAKTI reference
**Plan status:** Phase 1 quick wins dari refactor list (option a user)

## Scope

Tiga quick wins dari advice refactor sebelumnya:
1. **#7 Basemap toolbar** — pindahkan basemap dropdown dari dashboard hero ke floating toolbar di map
2. **#10 Coordinate display + custom scale bar** — tampilkan lat/lng cursor real-time + scale bar custom di bottom-left map
3. **Fullscreen button** — tombol fullscreen di top-left map controls (toggle Fullscreen API)

Tidak mengubah layout Dashboard secara keseluruhan. Tidak menyentuh KPI cards, legend, layer controls (sudah selesai di v1.4 polish).

## Tasks

### Task 1: Basemap dropdown pindah ke map toolbar
- **File:** `frontend/src/lib/components/map/MapContainer.svelte`
- **Change:** Add floating basemap switcher di top-right map (absolute positioning), wired ke `basemap` prop + `setBasemap()` function
- **Parent change:** `frontend/src/routes/dashboard/+page.svelte` — hapus basemap dropdown dari hero section
- **Acceptance:**
  - Map punya basemap switcher floating top-right
  - Switch basemap update tile layer + persist via `persistDashboardPreferences()`
  - Dashboard hero lebih ringkas (tidak ada basemap dropdown lagi)

### Task 2: Coordinate display + scale bar
- **File:** `frontend/src/lib/components/map/MapContainer.svelte`
- **Change:**
  - Tambah Leaflet event listener `mousemove` → track cursor lat/lng
  - Render `<div class="map-coord-display">` di bottom-left map: `Lat: -7.4538, Lng: 112.7176`
  - Tambah custom scale bar: pakai `map.addControl()` atau custom DOM overlay di bottom-right (saat ini sudah ada attribution "10 km" dari Leaflet default — keep itu, tambah label precision)
- **Acceptance:**
  - Cursor move di map → koordinat update real-time
  - Scale bar visible dengan unit metric ("10 km" atau "500 m")
  - Bottom-left corner clean (tidak overlap dengan attribution)

### Task 3: Fullscreen button
- **File:** `frontend/src/lib/components/map/MapContainer.svelte`
- **Change:**
  - Tambah button di top-left map controls (sebelah +/- zoom)
  - Pakai browser Fullscreen API: `mapEl.requestFullscreen()` / `document.exitFullscreen()`
  - Icon: lucide `Maximize2` (default) / `Minimize2` (saat fullscreen)
  - Listen ke `fullscreenchange` event untuk update icon
- **Acceptance:**
  - Click button → map element jadi fullscreen
  - Click lagi atau ESC → exit fullscreen
  - Icon toggle antara maximize/minimize

## Files Touched

- `frontend/src/lib/components/map/MapContainer.svelte` (semua 3 tasks)
- `frontend/src/routes/dashboard/+page.svelte` (Task 1 — hapus basemap dropdown)

## Acceptance Criteria

1. svelte-check: 0 errors
2. vitest: 105/105 (atau lebih jika tambah tests)
3. E2E dashboard: 35/35 (atau lebih jika tambah assertions)
4. Visual: dashboard hero lebih ringkas, map punya toolbar top-right (basemap) + top-left zoom+fullscreen + bottom-left coord+scale
5. PRD v1.4 §8.1 compliance: 2 KPI tetap Total Proyek + Proyek Berjalan, layer per status/jenis tetap

## Claude Code Setup (WAJIB untuk simantadev)

Per user directive 2026-06-19, eksekusi task coding harus via Claude Code:

```bash
ANTHROPIC_BASE_URL=http://0.0.0.0:4000 \
ANTHROPIC_AUTH_TOKEN=*** \
claude --model MiniMax-M3 \
  --print \
  --add-dir C:/projects/fci/fci-gis \
  --add-dir /tmp \
  -p "$(cat /tmp/quickwins-prompt.txt)"
```

Setelah implementasi, jalankan Claude Code review terhadap diff dengan command yang sama. Cycle 1 → fixes → cycle 2 APPROVED.

## Out of Scope (deferred)

- Items #1-#6 (medium/big refactor): floating overlay layout, project search, wilayah kecamatan layer
- Item #11 (project detail drawer)
- Measurement tools (PRD v1.4 hapus)
- Mini-map / export PNG

## Risks

- Leaflet Fullscreen API behavior berbeda antar browser (Chrome OK, Firefox perlu vendor prefix). Test di Chromium via Playwright.
- Mousemove handler bisa throttled kalau event terlalu sering. Leaflet auto-throttle.
- Scale bar precision butuh tuning per zoom level.