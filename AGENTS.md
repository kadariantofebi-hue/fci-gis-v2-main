# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

**SIMANTA** (Sistem Informasi Manajemen Aset, Tata Wilayah & Administrasi Proyek GIS) is a modern Web GIS platform for local government asset management and GIS project administration. The system manages spatial assets (land, buildings, roads, facilities) and provides auditable project documentation from procurement to completion.

### Core Capabilities

1. **Asset Management**: CRUD operations for spatial assets with geometry digitization (polygons, lines, points)
2. **Interactive Mapping**: Dashboard with satellite/street basemaps, layer controls, search, and measurement tools
3. **GIS Project Administration**: Document lifecycle tracking from tender to payment, with multi-file attachments
4. **Reporting**: Interactive reports with filters, charts, thematic maps, and async exports (Shapefile, Excel, PDF, Atlas)
5. **Audit Trail**: Comprehensive logging with PII redaction, version history, and geometry change tracking
6. **Security**: JWT + refresh token rotation, OTP-based MFA (WhatsApp/Email), RBAC with granular permissions

### Key Design Principles

- **Single Active OPD Mode**: System operates with one primary organizational unit (OPD)
- **Geometry as Source of Truth**: All spatial data stored as PostGIS geometry, not separate lat/lng columns
- **Optimistic Locking**: Version fields prevent concurrent edit conflicts
- **Soft Delete**: Entities use `deleted_at` for logical deletion with restore capability
- **Async Heavy Operations**: Background jobs (BullMQ) for exports, imports, bulk operations
- **Contract-First API**: Versioned endpoints (`/api/v1/*`) with standardized envelope responses

## Technology Stack

### Runtime & Core
- **Runtime**: Bun (primary) with Node.js fallback compatibility
- **Frontend**: SvelteKit 2 (Svelte 5) with `adapter-static` (SPA mode, `ssr=false`)
- **Backend**: Hono.js 4.x (ultra-lightweight, TypeScript-first)
- **Database**: PostgreSQL 16 + PostGIS 3.4
- **ORM**: Drizzle ORM (hybrid approach: Drizzle for non-spatial, raw SQL for geometry)

### Infrastructure
- **Storage**: MinIO (S3-compatible) for documents, photos, exports
- **Cache & Queue**: Redis 7.x + BullMQ for background jobs
- **Reverse Proxy**: Nginx (HTTPS, compression, static serving, API proxy)
- **Deployment**: Docker + Docker Compose

### Frontend Libraries
- **Mapping**: Leaflet.js 1.9.x with leaflet-draw, leaflet-search, leaflet-measure
- **Charts**: Chart.js 4.x
- **Validation**: Zod 3.x (shared between FE/BE)
- **Basemaps**: ESRI World Imagery, MapTiler, Mapbox, OSM

### Authentication & Security
- **Auth**: JWT (HS256, 15min TTL) + Refresh tokens (30 days, HttpOnly cookie)
- **Password**: bcryptjs (default) or argon2
- **MFA**: OTP via WhatsApp (Fonnte/Wablas) + Email fallback + Backup codes
- **RBAC**: Permission-based with scopes (`all`, `own_opd`, `own_created`, `self`)

## Architecture Highlights

### Monorepo Structure
```
simanta/
├── frontend/          # SvelteKit SPA
├── backend/           # Hono.js API + Worker
├── shared/            # Shared types, schemas, contracts
├── tests/             # E2E tests (Playwright)
├── infra/             # Docker, Nginx, observability configs
└── docs/              # PRD, API specs, ADRs, runbooks
```

### Key Architectural Decisions (ADRs)

**ADR-001: Bun vs Node**
- Primary: Bun for performance and DX
- Fallback: Node.js ≥20 for production safety
- Strategy: Dual runtime compatibility, CI matrix testing

**ADR-002: Leaflet vs MapLibre**
- Phase 1: Leaflet (simpler, proven ecosystem)
- Future: MapLibre GL for vector tiles when scale demands (>10k assets)
- Abstraction: `MapContainer.svelte` isolates map engine

**ADR-003: Drizzle + PostGIS Hybrid**
- Drizzle: Type-safe ORM for non-spatial columns
- Raw SQL: PostGIS operations via `sql` template
- Geometry: Managed through manual SQL migrations, not Drizzle schema

### Database Schema Patterns

**Spatial Data**
- All geometry stored as PostGIS `geometry(Geometry, 4326)` (WGS84)
- Trigger-maintained: `centroid`, `luas_spasial` (area), `panjang_spasial` (length)
- GIST indexes for spatial queries
- Geometry validation: `ST_IsValid` + `ST_MakeValid` on write

**Versioning & Audit**
- `assets.version`: Optimistic locking (incremented on update)
- `asset_versions`: Immutable snapshots (full history)
- `assets_geom_history`: Simplified geometry archive (bbox + simplified geom)
- `audit_logs`: Append-only with PII redaction, partitioned by year

**Multi-file Attachments**
- `asset_attachments`: Documents, photos, certificates (scan/quarantine support)
- `project_documents`: Header metadata for project documents
- `project_document_files`: Physical files per header (multi-file support)

## Building and Running

### Development Setup

```bash
# Install dependencies (Bun)
bun install

# Start development services (Postgres, Redis, MinIO)
cd infra/compose
docker compose -f compose.dev.yaml up -d

# Run database migrations
cd backend
bun run db:migrate

# Start backend API
bun run dev

# Start frontend (separate terminal)
cd frontend
bun run dev
```

### Environment Variables

Key variables (see `.env.example`):
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/simanta

# JWT
JWT_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>

# Storage
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=<key>
MINIO_SECRET_KEY=<secret>

# OTP Gateway
FONNTE_TOKEN=<token>

# Basemaps (optional)
DEFAULT_BASEMAP=esri_satellite
MAPTILER_API_KEY=<key>
MAPBOX_ACCESS_TOKEN=<token>
```

### Testing

```bash
# Backend unit tests (Bun + Node matrix)
cd backend
bun test
npm test  # Node fallback

# Frontend unit tests
cd frontend
bun test

# E2E tests (Playwright)
cd tests
npx playwright test

# Accessibility tests
npx playwright test e2e/a11y.spec.ts
```

### Production Build

```bash
# Frontend static build
cd frontend
bun run build

# Backend (uses Dockerfile.bun or Dockerfile.node)
docker build -f backend/Dockerfile.bun -t simanta-api:latest .

# Full stack
cd infra/compose
docker compose -f compose.prod.yaml up -d
```

## Development Conventions

### Code Style
- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (2 spaces, single quotes)
- **Linting**: ESLint with TypeScript rules
- **Imports**: Path aliases via `shared/` for cross-package types

### API Conventions
- **Versioning**: All endpoints under `/api/v1/*`
- **Envelope**: Standardized response format (see `shared/envelope.ts`)
  ```typescript
  { success: true, data: {...}, meta: {...}, request_id, timestamp }
  { success: false, code: "ERROR_CODE", message, errors, request_id, timestamp }
  ```
- **Validation**: Zod schemas in `shared/schemas/`
- **Auth**: JWT middleware checks `kid` (key rotation) and `tv` (token version)
- **RBAC**: Permission keys like `asset:create`, `report:export` with scopes

### Database Conventions
- **Migrations**: Drizzle for schema, manual SQL for PostGIS features
- **Naming**: snake_case for columns, camelCase in TypeScript
- **Timestamps**: `timestamptz` (UTC storage, Asia/Jakarta display)
- **Soft Delete**: `deleted_at` + `deleted_by` pattern
- **Optimistic Lock**: `version` integer field (increment on update)

### Frontend Conventions
- **Components**: Svelte 5 runes (`$state`, `$derived`, `$effect`)
- **Stores**: Minimal use, prefer component state
- **API Calls**: Centralized in `lib/services/api/`
- **Types**: Import from `shared/` for API contracts
- **Styling**: Tailwind CSS v4 with design tokens

### Testing Conventions
- **Unit**: Co-located `.test.ts` files
- **Integration**: `backend/tests/` and `frontend/tests/`
- **E2E**: `tests/e2e/` with Playwright
- **Coverage**: ≥80% for service layer, ≥60% for critical components
- **A11y**: axe-core in CI, Lighthouse score ≥95

### Security Practices
- **Secrets**: Docker secrets in prod, `.env` in dev only
- **PII**: Redaction in audit logs (see `backend/src/services/pii.service.ts`)
- **Input**: Zod validation on all endpoints
- **SQL**: Parameterized queries only (Drizzle + `sql` template)
- **Files**: Magic-byte validation, scan/quarantine for uploads
- **RBAC**: Permission checks in middleware, not just role strings

## Important Context

### Geometry Handling
- **Never** use separate `latitude`/`longitude` columns
- Always work with PostGIS `geometry` type
- Use `ST_AsGeoJSON()` for API responses
- Apply `ST_SimplifyPreserveTopology()` for map rendering
- Validate with `ST_IsValid()`, repair with `ST_MakeValid()`

### Asset Types & Geometry
- `tanah`, `bangunan`, `lapangan`, `makam`, `taman`: Polygon/MultiPolygon
- `jalan`, `saluran`: LineString/MultiLineString
- `lainnya`: Point only
- Constraint enforced: `jenis` must match geometry type

### OPD (Organization) Model
- **Single Active OPD**: System operates with one primary OPD
- No multi-OPD CRUD, no cross-OPD transfers in active scope
- Internal grouping via Sub OPD/Bidang/UPT fields
- `own_opd` scope always refers to the single active OPD

### Authentication Flow
- **Two-step login**: Password → OTP (WhatsApp/Email) → Session
- Access token: 15min, in-memory (FE)
- Refresh token: 30 days, HttpOnly cookie, rotation with 30s grace window
- Reuse detection: Revoke entire token family if refresh token reused after grace
- Recovery: Backup codes (8) + Email OTP fallback

### Versioning & History
- `assets.version`: Optimistic locking (prevent concurrent edits)
- `asset_versions`: Full snapshots (immutable, for restore/diff)
- `assets_geom_history`: Geometry archive (simplified, for audit)
- Revision created on: attribute change, geometry change, legal document upload

### Export & Import
- **Async**: All exports via BullMQ (shapefile, Excel, PDF, atlas)
- **Shapefile**: Split by geometry type (polygon, line, point), EPSG:4326
- **Import**: Two-phase (preview → commit), ST_Transform for reprojection
- **Results**: Signed URLs from MinIO, 7-day retention

### Project GIS Module
- **Purpose**: Document administration, not project management suite
- **Scope**: Tender → Contract → Execution → Handover → Payment reference
- **Documents**: Header + multi-file attachments pattern
- **Not a replacement**: LPSE/SIRUP/SIPD/SP2D remain source of truth

## Common Tasks

### Adding a New API Endpoint
1. Define Zod schema in `shared/schemas/`
2. Add route in `backend/src/routes/v1/`
3. Implement permission check middleware
4. Add audit logging for mutations
5. Update OpenAPI spec in `docs/api/v1.yaml`
6. Add integration test

### Adding a New Asset Type
1. Update `jenis_aset` enum in `backend/src/db/schema.ts`
2. Add geometry type constraint in PostGIS migration
3. Update form validation in `frontend/src/lib/components/crud/AssetForm.svelte`
4. Add color/style in `frontend/src/lib/components/map/styles.ts`
5. Update legend and layer control

### Modifying Geometry Schema
1. **Never** use Drizzle migrations for geometry columns
2. Create manual SQL in `backend/src/db/migrations-postgis/`
3. Test with sample data and `ST_IsValid()`
4. Update trigger if centroid/area/length calculation changes
5. Run migration test in CI

### Adding a Background Job
1. Define queue in `backend/src/queue/`
2. Implement worker handler in `backend/src/worker.ts`
3. Add job status endpoint
4. Implement retry logic and DLQ handling
5. Add Prometheus metrics for queue depth

## Troubleshooting

### Bun Compatibility Issues
- Check `backend/src/runtime/` for adapter patterns
- Run tests in both Bun and Node (`bun test` + `npm test`)
- Use `bcryptjs` (pure JS) instead of native `bcrypt`
- Avoid Bun-specific APIs in hot paths

### PostGIS Query Performance
- Verify GIST indexes exist: `\d+ assets` in psql
- Use `EXPLAIN ANALYZE` for slow queries
- Check bbox filter is applied: `ST_Intersects(geom, ST_MakeEnvelope(...))`
- Consider simplification tolerance for zoom level
- Monitor materialized view refresh time

### Refresh Token Lockout
- Check grace window (30s) in rotation logic
- Verify `replaced_by_id` chain is correct
- Look for race conditions in parallel tab scenarios
- Review audit logs for `LOCKED_REUSE_DETECTED` events

### Import Shapefile Failures
- Verify `.prj` file exists and CRS is recognized
- Check geometry validity: `ST_IsValid()` in preview
- Ensure attribute mapping is complete
- Review staging table for error details
- Check worker logs for ST_Transform errors

## References

- **PRD**: `docs/PRD_WebGIS_Pemetaan_Wilayah.md` (comprehensive system specification)
- **API Spec**: `docs/api/v1.yaml` (OpenAPI 3.0)
- **ADRs**: `docs/adr/` (architectural decisions)
- **Runbooks**: `docs/runbooks/` (operations procedures)
- **Frontend README**: `frontend/README.md` (MVP notes)

## Version

This AGENTS.md corresponds to PRD v1.4 (June 2026) — Dashboard pivot. Note: PRD v1.4 revises §8.1 from "Dashboard Interaktif" (asset-centric) to "Dashboard Proyek" (project-centric). Modul Web GIS Aset (Pilar 1) remains in body pasal but is scheduled for full removal in the next mayor revision per §16 Roadmap TODO. The single-pillar pivot ("Administrasi Proyek GIS with intrinsic spatial component") is the target end state.
