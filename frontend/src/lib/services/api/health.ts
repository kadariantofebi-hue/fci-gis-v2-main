import { err, ok, type ApiResponse } from '$shared/envelope';
import { apiMode, realFetch } from './client';

/**
 * Mock `GET /api/v1/health` readiness probe.
 * Returns { status, services: { db, redis, minio, queue }, version, buildTime }.
 * getHealth returns ok on the happy path; getHealthDegraded exercises
 * one 'down' service; getHealthDown exercises the full 'down' state.
 * All three are contract-first mocks — the real backend will surface
 * actual probe results in apiMode === 'real'.
 */
export type HealthPayload = {
  status: 'ok' | 'degraded' | 'down';
  services: {
    db: { status: 'up' | 'down'; latencyMs?: number };
    redis: { status: 'up' | 'down'; latencyMs?: number };
    minio: { status: 'up' | 'down'; latencyMs?: number };
    queue: { status: 'up' | 'down'; depth?: number };
  };
  version: string;
  buildTime: string;
};

function okHealth(payload: HealthPayload, message: string, path: string) {
  return ok(payload, message, { path });
}

export async function getHealth(): Promise<ApiResponse<HealthPayload>> {
  await new Promise((r) => setTimeout(r, 60));
  if (apiMode === 'real') return realFetch('/health');
  return okHealth(
    {
      status: 'ok',
      services: {
        db: { status: 'up', latencyMs: 8 },
        redis: { status: 'up', latencyMs: 1 },
        minio: { status: 'up', latencyMs: 12 },
        queue: { status: 'up', depth: 0 }
      },
      version: '0.1.0-mock',
      buildTime: '2026-06-12T00:00:00Z'
    },
    'Health mock',
    '/api/v1/health'
  );
}

/**
 * Degraded health — one service 'down'. Used to demo the degraded badge
 * state in the Navbar without changing the production path.
 */
export async function getHealthDegraded(): Promise<ApiResponse<HealthPayload>> {
  await new Promise((r) => setTimeout(r, 60));
  return okHealth(
    {
      status: 'degraded',
      services: {
        db: { status: 'up', latencyMs: 24 },
        redis: { status: 'up', latencyMs: 3 },
        minio: { status: 'down' },
        queue: { status: 'up', depth: 3 }
      },
      version: '0.1.0-mock',
      buildTime: '2026-06-12T00:00:00Z'
    },
    'Health degraded (mock)',
    '/api/v1/health?degraded=1'
  );
}

/**
 * Full outage health — top-level status 'down'. Demo for the red Navbar
 * badge branch.
 */
export async function getHealthDown(): Promise<ApiResponse<HealthPayload>> {
  await new Promise((r) => setTimeout(r, 60));
  return okHealth(
    {
      status: 'down',
      services: {
        db: { status: 'up', latencyMs: 12 },
        redis: { status: 'up', latencyMs: 4 },
        minio: { status: 'down' },
        queue: { status: 'down', depth: 0 }
      },
      version: '0.1.0-mock',
      buildTime: '2026-06-12T00:00:00Z'
    },
    'Health down (mock)',
    '/api/v1/health?down=1'
  );
}

/**
 * Simulated probe failure. Returns err('INTERNAL_ERROR') to exercise
 * the Navbar badge "no signal" path and prove the call site does not
 * crash on probe errors.
 */
export async function getHealthFailing(): Promise<ApiResponse<HealthPayload>> {
  await new Promise((r) => setTimeout(r, 60));
  if (apiMode === 'real') return realFetch('/health');
  return err('INTERNAL_ERROR', 'Mock probe failure — health endpoint returned 5xx.');
}
