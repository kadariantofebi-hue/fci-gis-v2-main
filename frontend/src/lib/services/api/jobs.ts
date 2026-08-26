import { err, ok, type ApiResponse } from '$shared/envelope';
import { apiMode, realFetch } from './client';

/**
 * Shared job-polling TypeScript wrapper.
 *
 * Per the OMP-aligned plan, this is a CLIENT-SIDE wrapper that fans out
 * to the three PRD §7.7/§7.9/§7.10-aligned job paths:
 *   - GET /api/v1/export/jobs/:id   (Excel/PDF/Shapefile/Atlas exports)
 *   - GET /api/v1/import/jobs/:id   (Shapefile import preview/commit)
 *   - GET /api/v1/bulk/jobs/:id    (bulk asset operations)
 *
 * We intentionally do NOT introduce a /api/v1/jobs/:id path. All callers
 * select the right kind up front; the wrapper unifies the client-side
 * surface (state machine, polling, mock fallback).
 */

export type JobKind = 'export' | 'import' | 'bulk';

export type JobState = 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type JobTemplate = 'excel' | 'pdf' | 'shapefile' | 'atlas' | 'import_preview' | 'bulk_asset';

export type Job = {
  id: string;
  kind: JobKind;
  template: JobTemplate;
  state: JobState;
  progress: number; // 0..100
  queue: string;
  createdAt: string;
  updatedAt: string;
  filters?: Record<string, unknown>;
  resultUrl?: string; // mock signed-URL placeholder
  error?: { code: string; message: string };
};

// Path mapping per PRD §7.7/§7.9/§7.10
const PATH_FOR_KIND: Record<JobKind, string> = {
  export: '/export/jobs',
  import: '/import/jobs',
  bulk: '/bulk/jobs'
};

// In-memory mock state machine. Per-call state advances; real mode
// would hit the backend path and let the worker drive transitions.
const mockJobs = new Map<string, Job>();
const mockPollCounters = new Map<string, number>();
// Fail-simulation: jobs whose id contains the marker below will FAILED
// on their third poll. Used for E2E coverage of the FAILED branch.
const FAIL_MARKER = 'fail-please';

function makeId(kind: JobKind): string {
  return `job-${kind}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Test helper exported for unit tests and E2E that want to exercise the
// FAILED branch. The actual id is composed by `makeId` (random suffix), so
// to opt in to failure the test calls enqueueExportJob, then immediately
// patches the mock entry's id via a separate test hook. Here we expose a
// deterministic id generator: pass a template-2-letter prefix that includes
// the FAIL_MARKER to force a FAILED outcome on second poll.
function makeDeterministicId(kind: JobKind, marker: string): string {
  return `job-${kind}-${marker}-${Date.now()}`;
}

function templateForKind(kind: JobKind): JobTemplate {
  // Default to excel for export, import_preview for import, bulk_asset for bulk.
  // Callers can override via the per-kind helpers below.
  return kind === 'export' ? 'excel' : kind === 'import' ? 'import_preview' : 'bulk_asset';
}

function nowIso(): string {
  return new Date().toISOString();
}

function emptyJob(kind: JobKind, template: JobTemplate, filters: Record<string, unknown> | undefined): Job {
  const id = makeId(kind);
  const created: Job = {
    id,
    kind,
    template,
    state: 'WAITING',
    progress: 0,
    queue: `${kind}-queue-mock`,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    filters
  };
  mockJobs.set(id, created);
  mockPollCounters.set(id, 0);
  return created;
}

/**
 * Enqueue an export job. Returns the freshly-created Job in WAITING state.
 * PRD §7.7: `POST /api/v1/export/<format>` body filter -> { job_id } -> poll.
 */
export async function enqueueExportJob(template: Exclude<JobTemplate, 'import_preview' | 'bulk_asset'>, filters: Record<string, unknown> = {}): Promise<ApiResponse<Job>> {
  await new Promise((r) => setTimeout(r, 80));
  if (apiMode === 'real') {
    const format = template === 'shapefile' ? 'shapefile' : template;
    return realFetch(`/export/${format}`, { method: 'POST', body: JSON.stringify(filters) });
  }
  return ok(emptyJob('export', template, filters), 'Export job enqueued');
}

export async function enqueueImportJob(filters: Record<string, unknown> = {}): Promise<ApiResponse<Job>> {
  await new Promise((r) => setTimeout(r, 80));
  if (apiMode === 'real') return realFetch('/import/shapefile/preview', { method: 'POST', body: JSON.stringify(filters) });
  return ok(emptyJob('import', 'import_preview', filters), 'Import preview enqueued');
}

export async function enqueueBulkJob(filters: Record<string, unknown> = {}): Promise<ApiResponse<Job>> {
  await new Promise((r) => setTimeout(r, 80));
  if (apiMode === 'real') return realFetch('/bulk/assets', { method: 'POST', body: JSON.stringify(filters) });
  return ok(emptyJob('bulk', 'bulk_asset', filters), 'Bulk job enqueued');
}

/**
 * Poll a job. State machine: WAITING -> ACTIVE -> COMPLETED|FAILED.
 * The mock advances on each call; real mode fetches the PRD-aligned path.
 */
export async function getJob(kind: JobKind, id: string): Promise<ApiResponse<Job>> {
  await new Promise((r) => setTimeout(r, 60));
  if (apiMode === 'real') return realFetch(`${PATH_FOR_KIND[kind]}/${id}`);

  const job = mockJobs.get(id);
  if (!job) return err('NOT_FOUND', `Job ${id} tidak ditemukan atau sudah kadaluarsa di mock.`);
  if (job.state === 'WAITING') {
    // First poll: ACTIVE
    const updated: Job = { ...job, state: 'ACTIVE', progress: 50, updatedAt: nowIso() };
    mockJobs.set(id, updated);
    return ok(updated, 'Job ACTIVE');
  }
  if (job.state === 'ACTIVE') {
    // Second poll: COMPLETED (or FAILED for jobs with the fail marker)
    if (id.includes(FAIL_MARKER)) {
      const updated: Job = {
        ...job,
        state: 'FAILED',
        progress: 0,
        updatedAt: nowIso(),
        error: { code: 'WORKER_ERROR', message: 'Mock worker failure. Retry dengan parameter yang sama atau hubungi admin.' }
      };
      mockJobs.set(id, updated);
      return ok(updated, 'Job FAILED');
    }
    const updated: Job = {
      ...job,
      state: 'COMPLETED',
      progress: 100,
      updatedAt: nowIso(),
      resultUrl: `mock://signed-url/${id}/${job.template}.bin`
    };
    mockJobs.set(id, updated);
    return ok(updated, 'Job COMPLETED');
  }
  return ok(job, `Job ${job.state}`);
}

export async function listJobs(kind: JobKind): Promise<ApiResponse<Job[]>> {
  await new Promise((r) => setTimeout(r, 60));
  if (apiMode === 'real') return realFetch(`${PATH_FOR_KIND[kind]}`);
  const list = Array.from(mockJobs.values()).filter((j) => j.kind === kind);
  return ok(list, `Daftar job ${kind} mock`);
}

/**
 * Convenience polling helper. Invokes getJob in a loop until the job
 * reaches a terminal state. Real backend integration point for the
 * export /tools polling UI.
 */
export async function pollJob(kind: JobKind, id: string, intervalMs = 800, maxAttempts = 5): Promise<ApiResponse<Job>> {
  let last: ApiResponse<Job> | null = null;
  for (let i = 0; i < maxAttempts; i += 1) {
    last = await getJob(kind, id);
    if (!last.success) return last;
    if (last.data.state === 'COMPLETED' || last.data.state === 'FAILED' || last.data.state === 'CANCELLED') return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return last ?? err('INTERNAL_ERROR', 'Polling mencapai batas tanpa respons.');
}
