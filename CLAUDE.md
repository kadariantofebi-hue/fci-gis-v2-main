# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

**SIMANTA** (Sistem Informasi Manajemen Aset, Tata Wilayah & Administrasi Proyek GIS) — a local-government Web GIS for asset management + project administration. The current repo state is a **frontend-only contract-first MVP** built against PRD v1.3.7. There is no backend in this repo yet — every "API" call is a deterministic mock in `lib/services/api/*` driven by `PUBLIC_API_MODE=mock` and `lib/mocks/*` fixtures, with persistent state held in `localStorage` for the report-presets slice only.

The authoritative guidance for full-stack architecture, runtime decisions, and the production target lives in `AGENTS.md`. The MVP-specific framing, demo credentials, and the Go-Live Hardening iteration scope live in `frontend/README.md`. Read both before proposing changes.

## Repo Layout (current state)

```
fci-gis/
├── AGENTS.md                 # Full-stack PRD v1.3.7 + ADRs (Bun/Hono/PostGIS target)
├── frontend/                 # The only implemented slice — SvelteKit static SPA
│   ├── src/
│   │   ├── lib/
│   │   │   ├── auth/         # permissions.ts + route-guards.ts (RBAC)
│   │   │   ├── components/   # auth/, crud/, dashboard/, layout/, map/, projects/
│   │   │   ├── services/api/ # client.ts (realFetch + mockResponse), per-domain modules
│   │   │   ├── stores/       # auth.ts, preferences.ts, toast.ts, audit.ts
│   │   │   ├── mocks/        # users, assets, projects, opd (in-memory fixtures)
│   │   │   ├── geometry-rules.ts  # PRD §6.7 asset-kind → geometry-type validation
│   │   │   ├── assets-filters.ts  # PRD §6.8 has_geom query-param translation
│   │   │   └── async-race-guard.ts  # OMP I-3 fix, generalized pattern (see below)
│   │   ├── routes/           # +layout.svelte guard, +page.ts redirects to /dashboard
│   │   │                     # dashboard, assets, projects, reports, opd, profile/*, tools, audit, login, recovery
│   │   └── app.{css,html,d.ts}
│   ├── tests/e2e/            # Playwright + axe-core a11y
│   ├── svelte.config.js      # adapter-static, fallback 'index.html', $shared alias
│   ├── vite.config.ts        # tailwindcss + sveltekit, vitest includes src/**/*.test.ts
│   └── playwright.config.ts  # baseURL 127.0.0.1:5174, webServer auto-starts `npm run dev --port 5174`
├── shared/src/               # Cross-package contracts imported via $shared alias
│   ├── envelope.ts           # ok/err/unwrap — the API response shape (PRD §7.1)
│   ├── enums.ts              # JenisAset, RoleName, PermissionKey, ProjectStatus, etc.
│   ├── geojson.ts            # Geometry / Feature / FeatureCollection types
│   └── schemas/              # asset, auth, opd, project, report Zod-less TS types
├── docs/
│   ├── PRD_WebGIS_Pemetaan_Wilayah.md  # PRD v1.3.7 (authoritative)
│   ├── adr/                  # ADR-001 Bun, ADR-002 Leaflet, ADR-003 Drizzle+PostGIS
│   └── mvp/                  # 2026-06-12 post-mvp hardening checklist (4 deferred items)
├── .hermes/plans/            # Iteration plans (MVP, go-live hardening, BA review)
└── .bob/                     # Local Bob-skill scratch; gitignored
```

The `backend/`, `infra/`, and `tests/e2e/` (top-level) directories referenced in `AGENTS.md` are **planned but not present**. Do not scaffold them without an explicit task.

## Commands (all from `frontend/`)

```bash
cd frontend
npm install                 # node_modules is the active setup (not bun.lock present)
npm run dev                 # vite dev server on 127.0.0.1:5173
npm run check               # svelte-kit sync && svelte-check --tsconfig ./tsconfig.json
npm run test                # vitest run — co-located *.test.ts files
npm run test:watch          # vitest
npm run test:e2e            # playwright test tests/e2e/frontend-mvp.spec.ts
npm run test:a11y           # playwright test tests/e2e/a11y.spec.ts (axe-core)
npm run verify:mvp          # check && test && build && test:e2e && test:a11y
npm run build               # vite build (output: build/) — adapter-static SPA, prerender index
npm run preview             # vite preview on 127.0.0.1:4173
```

Run a single unit test file: `npx vitest run src/lib/geometry-rules.test.ts`.
Run a single E2E test: `npx playwright test frontend-mvp.spec.ts -g "admin can login"`.

## Demo Auth (mock)

OTP is hardcoded to `123456` (see `lib/services/api/auth.ts`). Any password is accepted. Three useful fixture users:

- `admin@simanta.test` — Admin (all permissions)
- `viewer@simanta.test` — Viewer (read-only own_opd/self)
- `auditor@simanta.test` — Auditor

Role switcher is the "Mode Demo" widget in the navbar. Disable with `PUBLIC_ENABLE_DEMO_ROLE_SWITCHER=false` in `frontend/.env`.

## Big-Picture Architecture

### Single Active OPD invariant (PRD §6.1)
The system intentionally models **one** active OPD at a time. There is no multi-OPD CRUD, no cross-OPD filter, no OPD transfer, no Sub OPD/Bidang/UPT UI. `lib/mocks/opd.ts#ACTIVE_OPD` is the source. The Sidebar banner ("Mode Mock · Single active OPD") and the E2E specs that assert zero "Distribusi OPD" / "Tambah mock" controls enforce this. Do not add OPD-list filters, cross-OPD stats, or `?opd=` query params.

### Geometry as source of truth (PRD §6.7 + §6.8)
- Asset geometry is PostGIS `geometry(Geometry, 4326)`; the frontend never invents separate lat/lng columns.
- `lib/geometry-rules.ts#GEOMETRY_RULES` maps `JenisAset` → allowed `Geometry['type']`. `validateGeometryAgainstJenis()` is called on save (see `lib/services/api/assets.ts`) and surfaces the mismatch to AssetForm.
- A `null`/`undefined` `geom` is the "belum dipetakan" / "tanpa geometri" state — it is **not** a validation failure at the API edge (PRD §6.8). The dashboard "Tanpa Geometri" stat card drills into `/assets?has_geom=false` via `lib/assets-filters.ts#hasGeomFromQuery` / `hasGeomToQuery`.
- Trigger-maintained `centroid`, `luas_spasial`, `panjang_spasial` come from the backend; the mocks in `lib/mocks/assets.ts` populate them by hand to match the contract.

### RBAC and route guards
- `PermissionKey` and `PermissionScope` (`all` | `own_opd` | `own_created` | `self` | `assigned_project`) are defined in `shared/src/enums.ts`.
- `lib/auth/permissions.ts#can(user, key, scope?)` is the single check. `canForProject(user, key, projectId)` handles `assigned_project` scope by walking `lib/mocks/projects#projectMembers`.
- `lib/auth/route-guards.ts` maps URL regex → required `PermissionKey`. `/login` and `/recovery` are public; everything else goes through `canAccessPath()` in `+layout.svelte`. Project documents have a special case (`/projects/:id/documents`) that requires `canForProject`, not the generic `can`.

### API envelope and the `real` vs `mock` switch
- `shared/src/envelope.ts` exports `ok<T>(data, message, meta?)`, `err(code, message, errors?, meta?)`, `ApiResponse<T>`, `unwrap<T>(response)`. All service modules return `Promise<ApiResponse<T>>` — never throw on HTTP-shape failures, only on programmer errors.
- `lib/services/api/client.ts#apiMode` is `'mock'` by default. When `PUBLIC_API_MODE=real`, every service module takes its `realFetch(path, init?)` branch and hits `${apiBaseUrl}${path}`. The mock branch returns the same envelope shape with an 80ms `setTimeout` to mimic latency. **All mock branches must produce the same `ApiResponse<T>` shape as the real path** — do not let mocks return raw objects.
- A few "still-mock" services have additional helper variants (e.g. `getHealth`, `getHealthDegraded`, `getHealthDown`, `getHealthFailing` in `lib/services/api/health.ts`) to exercise UI branches without changing the production path.

### Async job polling
- `lib/services/api/jobs.ts` is the client-side wrapper for PRD §7.7/§7.9/§7.10 job paths: `export`, `import`, `bulk`. There is no unified `/api/v1/jobs/:id`; each kind has its own path (`/export/jobs/:id`, `/import/jobs/:id`, `/bulk/jobs/:id`).
- In-memory `mockJobs` map advances `WAITING → ACTIVE → COMPLETED` per poll. Jobs whose id contains `fail-please` FAILED on third poll (E2E hook for the FAILED branch).
- **Race-guard pattern** (`lib/async-race-guard.ts`): when two async ops overlap (e.g. user clicks two tiles before the first `pollJob` resolves), the guard returns a monotonically increasing token. After every `await`, callers must `if (!guard.isCurrent(token)) return;` before mutating shared state. This is the OMP I-3 fix generalized from `tools/+page.svelte`'s inline `let pollGeneration = 0`. The `tools/+page.svelte` integration refactor is **deliberately deferred** (see Phase 4 NO-OP marker in the post-mvp checklist); do not modify `tools/+page.svelte` in scope-limited phases.

### SvelteKit SPA mode
- `+layout.ts` sets `ssr = false`, `prerender = true`. `+page.ts` redirects `/` → `/dashboard`.
- `svelte.config.js` uses `@sveltejs/adapter-static` with `fallback: 'index.html'`. There is no server runtime.
- `$shared` alias points to `../shared/src` so types/schemas/envelope can be imported in routes and components.

### Map (Leaflet, ADR-002)
- `lib/components/map/MapContainer.svelte` is the **only** file that touches `L.*`. ADR-002 makes this a swap point for a future MapLibre migration when >10k polygons or 3D/heatmap are required.
- Basemaps (`lib/components/map/basemaps.ts`): `osm_standard`, `esri_satellite` (default), `maptiler_satellite`, `mapbox_satellite`. `getActiveBasemaps()` filters out paid providers whose tokens are empty.
- `lib/components/map/styles.ts` provides per-`JenisAset` fill + stroke colors and pattern hints (`dashed 2-4` for `saluran`, `hatch 45°` for `makam`, etc.).
- A render-token guard in `MapContainer.svelte` (`let renderToken = 0; if (token !== renderToken) return;`) prevents stale async Leaflet imports from clobbering state — same race pattern as `async-race-guard.ts`, inlined because it predates the generalized module.

### Stores and persistence
- `lib/stores/auth.ts` — session in `localStorage['simanta.mock.session']`. `setSession`, `logout`, `switchRole(role)`. Roles enumerated: `Super Admin`, `Admin`, `OPD Admin`, `Editor`, `Viewer`, `Auditor`.
- `lib/stores/preferences.ts` — `theme`, `defaultBasemap`, `visibleLayers` in `localStorage['simanta.preferences']`. Toggles `.dark` class on `<html>`.
- `lib/stores/toast.ts` — FIFO bounded queue (max 5), 4s default duration, browser-only.
- `lib/stores/audit.ts` — append-only in-memory mock audit events (PII-redacted contract). Types: `MockAuditAction`, `MockAuditEntity` (`project_document`, `project_document_file`, `asset_attachment`, `user_session`).
- `lib/services/api/report-presets.ts` — the only slice that persists beyond a session, via `localStorage['simanta.mock.report-presets.v1']`. CRUD gated by `report:preset_manage`.

### Conventions enforced by code
- Path alias `$shared` for cross-package types — never deep-relative-import `../../../../shared/src/schemas/asset` from a route.
- snake_case in DB columns, camelCase in TS (mirrors `AGENTS.md`; not yet material since no DB).
- `timestamptz` UTC at rest, Asia/Jakarta display.
- Standardized error codes (string-literal union in `shared/src/envelope.ts#ErrorCode`): `BAD_REQUEST`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT_VERSION`, `GONE_DEPRECATED_API`, `VALIDATION_FAILED`, `LOCKED_REUSE_DETECTED`, `RATE_LIMITED`, `INTERNAL_ERROR`.
- Default error meta: `RATE_LIMITED` → `{ retry_after_seconds: 60 }`, `CONFLICT_VERSION` → `{ current_version, your_version }`, `GONE_DEPRECATED_API` → `{ migrate_to }`.

## PRD v1.3.7 Negative Scope (do not add)

The MVP is intentionally narrow. The following are **explicitly out of scope** until Post-MVP:

- Multi-OPD management, additional OPD CRUD, OPD transfer/relocation, cross-OPD statistics/filtering
- Sub OPD / Bidang / UPT UI
- Finance / procurement workflow, payment approval/processing
- LPSE / SIRUP / SIPD / SP2D source-of-truth replacement (payment pages are read-only admin references)
- Real-time basemap auto-swap on tile error (one-time warning banner only)
- Atlas PDF multi-page booklet depth (mock manifest, not real PDF render)
- Import Preview multi-phase UI depth (two-phase upload → preview, no staging table UI)
- Admin cross-user force-logout route (`/admin/sessions`) — only self-revoke is wired
- Real malware scan, signed URLs, MinIO object storage, OpenAPI backend RBAC, PostgreSQL/PostGIS persistence, BullMQ worker integration

These are captured in `docs/mvp/2026-06-12_post-mvp-hardening-checklist.md` and tracked as TODO comments at the marker locations listed there.

## Phase Iteration Pattern

Commits in `git log` (branch `hermes/dev`) follow a phase pattern: `feat(frontend): Phase N P<prio> <description> (PRD v1.3.7 Go-Live Hardening)`. The BA verdict (e.g. `APPROVED_FOR_DEV`, `PASS`) is captured in `.hermes/plans/*` and `.hermes/plans/2026-06-12_phase11-ba-final-review.md`. New phase work typically:

1. Read the current `.hermes/plans/*.md` for the active iteration scope and verdict.
2. Look for the `TODO(post-mvp)` or `TODO(integration)` markers in code — they reference the plan phase that introduced them.
3. Keep changes inside the phase's scope. The OMP final `APPROVED` verdict for MVP was Phase 11; the Go-Live Hardening iteration (2026-06-12 plan) followed. Each phase carries a `P0/P1/P2` priority tag.
4. Unit tests are co-located (`*.test.ts` next to the source). E2E lives in `tests/e2e/`.

## Things to Watch For

- **Mock vs real mode parity**: when adding a service, both branches of `if (apiMode === 'real') return realFetch(...)` must exist. The mock branch must use the same `ok()` / `err()` helpers and respect the same `setTimeout(60-120ms)` latency pattern.
- **Don't add real backend claims** in UI copy. The Navbar subtitle is "Contract-first prototype · mock persistence lokal/in-memory · single active OPD" — keep that tone. The Sidebar "Mode Mock" badge exists for a reason.
- **Two-pillar language**: UI text uses "Aset Wilayah" and "Administrasi Proyek GIS" as the two product pillars. Dashboard, E2E, and Sidebar all assert these. Don't rename to "Asset" / "Project" in the UI surface.
- **`belumDipetakan` → `tanpaGeometri` rename** is done (Phase 2 P0). The query-param `has_geom` is the only spelling. Don't regress the dashboard stat name or the filter translation.
- **Geometry validation is fail-closed** for unknown `jenis` — see `validateGeometryAgainstJenis` in `geometry-rules.ts`. Stale fixtures / enum drift must not silently bypass validation.
- **ADP/finance payment pages** are read-only. SIMANTA is not the source system; do not add write/approve flows.
