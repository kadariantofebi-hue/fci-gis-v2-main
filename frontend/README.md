# SIMANTA Frontend MVP

Frontend MVP contract-first SvelteKit static SPA. Saat ini mengikuti plan `.hermes/plans/2026-06-12_104500-frontend-mvp-prd-v137-next-gap.md` (verdict BA `APPROVED_FOR_DEV` 2026-06-12) di atas baseline `.hermes/plans/2026-06-09_102337-frontend-mvp-prd-gap-next.md`.

Stack: SvelteKit 2/Svelte 5, adapter-static SPA (`ssr=false`, fallback `index.html`), Tailwind CSS v4, Leaflet, mock API envelope `/api/v1/*`.

## Status iterasi

- **Milestone 1+2** (commit `211b1fc`, plan 2026-06-09): SELESAI. Branding PRD v1.3.7, two-pillar dashboard, single active OPD guards, viewer omit-total, project subnavigation, laporan interaktif, document/payment role matrix, audit event, OMP final `APPROVED`.
- **Iterasi berikutnya** (plan 2026-06-12): BA handoff `APPROVED_FOR_DEV`. Eksekusi 11 phase implementasi (Phase 1 → Phase 11) setelah Phase 0 BA handoff singkat, mencakup: P0 branding rebrand, map-backed asset digitization, auth MVP hardening, tools contract-first + health service + jobs polling, report presets CRUD, project sub-routes (milestones + linked assets), notification toast service, attachment metadata depth, a11y coverage expansion, docs update + fixture invariants, verifikasi + Accept/Deny gate.

## Jalankan

```bash
cd frontend
npm install
npm run check
npm run test
npm run build
npm run dev
```

Login demo: email apa pun dari fixture (`admin@simanta.test`, `viewer@simanta.test`, `auditor@simanta.test`) + password apa pun, OTP `123456`.

## Catatan MVP

- Semua mutasi masih mock in-memory/localStorage.
- Role switcher bertanda “Mode Demo” dan bisa dimatikan dengan `PUBLIC_ENABLE_DEMO_ROLE_SWITCHER=false`.
- Dokumen/file proyek sensitif di-omit total untuk Viewer; payment reference sensitif di-redact sesuai RBAC demo.
- Upload/download/import/export/atlas memakai flow mock/contract-first; persistence backend, signed URL, scan/quarantine, object storage policy, OpenAPI/backend RBAC enforcement, PostgreSQL/PostGIS, dan BullMQ worker adalah go-live hardening/backend integration.

## PRD v1.3.7 MVP alignment

This frontend MVP is intentionally frontend-only/mock until stakeholder review. It follows the two-pillar SIMANTA positioning and single active OPD invariant from SIMANTA PRD v1.3.7:

- MVP mock: UI flows, shared contracts, deterministic fixtures, OPD current profile, Aset Wilayah dashboard, Administrasi Proyek GIS document headers, interactive multi-file mock upload, read-only payment history/reference display, and audit events for document/file actions.
- Go-live hardening: real malware scan/quarantine, signed URLs, object storage policy, OpenAPI/backend RBAC enforcement, PostgreSQL/PostGIS persistence, and BullMQ worker integration.
- Out of scope for active MVP: multi-OPD management, additional OPD CRUD, OPD transfer/relocation, cross-OPD statistics/filtering, Sub OPD/Bidang/UPT UI, finance/procurement workflow, and payment approval/processing.
- Payment pages are read-only administrative references; SIMANTA is not the source system for LPSE/SIRUP/SIPD/SP2D/finance.
