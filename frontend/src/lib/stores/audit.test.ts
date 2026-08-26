import { describe, expect, it, beforeEach, vi } from 'vitest';

// Polyfill localStorage for node test env. We use `vi.hoisted` to ensure the
// polyfill runs before any module imports (which would otherwise be hoisted
// to the top of the file). The audit store calls `localStorage.setItem` at
// module-load time via `auditEvents.subscribe(...)` (line 51), so the
// polyfill must be in place before `import './audit'` below.
vi.hoisted(() => {
  const memStore = new Map<string, string>();
  const localStoragePolyfill = {
    getItem: (k: string) => memStore.get(k) ?? null,
    setItem: (k: string, v: string) => memStore.set(k, v),
    removeItem: (k: string) => memStore.delete(k),
    clear: () => memStore.clear(),
    key: (i: number) => Array.from(memStore.keys())[i] ?? null,
    get length() {
      return memStore.size;
    }
  };
  (globalThis as any).localStorage = localStoragePolyfill;
});

// Mock the svelte/environment before importing audit
vi.mock('$app/environment', () => ({ browser: true }));

import {
  recordForceLogout,
  recordRecoveryAttempt,
  recordRecoverySuccess,
  recordRecoveryFailed,
  recordAttachmentUpload,
  recordAttachmentDownload,
  recordAttachmentDownloadBlocked,
  recordAttachmentDelete,
  auditEvents,
  type MockAuditEvent
} from './audit';

function lastEvent(): MockAuditEvent | undefined {
  let captured: MockAuditEvent[] = [];
  auditEvents.subscribe((v) => (captured = v))();
  return captured[0];
}

describe('audit store — entity mapping (Phase 1 P0 fix)', () => {
  beforeEach(() => {
    // Clear localStorage-backed store before each test
    auditEvents.set([]);
  });

  it('recordForceLogout emits entity user_session', () => {
    const ev = recordForceLogout({
      projectId: '',
      sessionId: 'sess-mock-1',
      actorName: 'admin',
      metadata: { targetSession: 'sess-other-2' }
    });
    expect(ev.action).toBe('FORCE_LOGOUT');
    expect(ev.entity).toBe('user_session');
    expect(ev.sessionId).toBe('sess-mock-1');
  });

  it('recordRecoveryAttempt emits entity user_session', () => {
    const ev = recordRecoveryAttempt({
      projectId: '',
      sessionId: 'sess-mock-2',
      actorName: 'operator@simanta.local',
      metadata: { email: 'operator@simanta.local' }
    });
    expect(ev.action).toBe('RECOVERY_ATTEMPT');
    expect(ev.entity).toBe('user_session');
  });

  it('recordRecoverySuccess emits entity user_session', () => {
    const ev = recordRecoverySuccess({
      projectId: '',
      sessionId: 'sess-mock-3',
      actorName: 'operator@simanta.local',
      metadata: { email: 'operator@simanta.local' }
    });
    expect(ev.action).toBe('RECOVERY_SUCCESS');
    expect(ev.entity).toBe('user_session');
  });

  it('recordRecoveryFailed emits entity user_session', () => {
    const ev = recordRecoveryFailed({
      projectId: '',
      sessionId: 'sess-mock-4',
      actorName: 'operator@simanta.local',
      metadata: { email: 'operator@simanta.local', reason: 'OTP_MISMATCH' }
    });
    expect(ev.action).toBe('RECOVERY_FAILED');
    expect(ev.entity).toBe('user_session');
  });

  // Regression guards — these helpers MUST keep their existing entity mapping.
  it('recordAttachmentUpload keeps entity asset_attachment', () => {
    const ev = recordAttachmentUpload({
      projectId: '',
      assetId: 'asset-001',
      attachmentId: 'att-mock-1',
      actorName: 'operator',
      metadata: { kind: 'sertifikat' }
    });
    expect(ev.entity).toBe('asset_attachment');
  });

  it('recordAttachmentDownload keeps entity asset_attachment', () => {
    const ev = recordAttachmentDownload({
      projectId: '',
      assetId: 'asset-001',
      attachmentId: 'att-mock-1',
      actorName: 'operator',
      metadata: { kind: 'sertifikat' }
    });
    expect(ev.entity).toBe('asset_attachment');
  });

  it('recordAttachmentDownloadBlocked keeps entity asset_attachment', () => {
    const ev = recordAttachmentDownloadBlocked({
      projectId: '',
      assetId: 'asset-001',
      attachmentId: 'att-mock-1',
      actorName: 'operator',
      metadata: { kind: 'sertifikat' }
    });
    expect(ev.entity).toBe('asset_attachment');
  });

  it('recordAttachmentDelete keeps entity asset_attachment', () => {
    const ev = recordAttachmentDelete({
      projectId: '',
      assetId: 'asset-001',
      attachmentId: 'att-mock-1',
      actorName: 'operator',
      metadata: { kind: 'sertifikat' }
    });
    expect(ev.entity).toBe('asset_attachment');
  });

  it('last event is the most recent recorded event', () => {
    recordAttachmentUpload({
      projectId: '',
      assetId: 'asset-001',
      attachmentId: 'att-1',
      actorName: 'op'
    });
    recordForceLogout({
      projectId: '',
      sessionId: 'sess-x',
      actorName: 'admin'
    });
    const ev = lastEvent();
    expect(ev?.action).toBe('FORCE_LOGOUT');
    expect(ev?.entity).toBe('user_session');
  });
});
