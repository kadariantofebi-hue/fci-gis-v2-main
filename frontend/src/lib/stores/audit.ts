import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type MockAuditAction =
  | 'PROJECT_DOCUMENT_DOWNLOAD'
  | 'PROJECT_DOCUMENT_DOWNLOAD_BLOCKED'
  | 'PROJECT_DOCUMENT_VERIFY'
  | 'PROJECT_DOCUMENT_FILE_DELETE'
  | 'ATTACHMENT_UPLOAD'
  | 'ATTACHMENT_DOWNLOAD'
  | 'ATTACHMENT_DOWNLOAD_BLOCKED'
  | 'ATTACHMENT_DELETE'
  | 'FORCE_LOGOUT'
  | 'RECOVERY_ATTEMPT'
  | 'RECOVERY_SUCCESS'
  | 'RECOVERY_FAILED';

export type MockAuditEntity = 'project_document' | 'project_document_file' | 'asset_attachment' | 'user_session';

export type MockAuditEvent = {
  id: string;
  action: MockAuditAction;
  entity: MockAuditEntity;
  documentId?: string;
  fileId?: string;
  attachmentId?: string;
  assetId?: string;
  // sessionId is required for entity === 'user_session' (FORCE_LOGOUT, RECOVERY_*)
  // but the field is typed optional so the rest of the union stays simple.
  // Callers must populate it for user_session events; the audit page renders
  // `'-'` as fallback if missing.
  sessionId?: string;
  // projectId is required for project-scoped events; empty string convention
  // is used for entity === 'user_session' (sessions are not project-scoped).
  projectId: string;
  actorName: string;
  createdAt: string;
  metadata?: Record<string, string>;
};

const KEY = 'simanta.mock.audit-events';

function initial(): MockAuditEvent[] {
  if (!browser) return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MockAuditEvent[];
  } catch {
    return [];
  }
}

export const auditEvents = writable<MockAuditEvent[]>(initial());

auditEvents.subscribe((events) => {
  if (browser) localStorage.setItem(KEY, JSON.stringify(events));
});

function record(event: Omit<MockAuditEvent, 'id' | 'createdAt'>) {
  const next = { ...event, id: `audit-${Date.now()}`, createdAt: new Date().toISOString() } as MockAuditEvent;
  auditEvents.update((events) => [next, ...events].slice(0, 25));
  return next;
}

export function recordDocumentDownload(event: Omit<MockAuditEvent, 'id' | 'action' | 'entity' | 'createdAt'>) {
  return record({ ...event, action: 'PROJECT_DOCUMENT_DOWNLOAD', entity: 'project_document_file' });
}
export function recordDocumentDownloadBlocked(event: Omit<MockAuditEvent, 'id' | 'action' | 'entity' | 'createdAt'>) {
  return record({ ...event, action: 'PROJECT_DOCUMENT_DOWNLOAD_BLOCKED', entity: 'project_document_file' });
}
export function recordDocumentVerify(event: Omit<MockAuditEvent, 'id' | 'action' | 'entity' | 'createdAt'>) {
  return record({ ...event, action: 'PROJECT_DOCUMENT_VERIFY', entity: 'project_document' });
}
export function recordDocumentFileDelete(event: Omit<MockAuditEvent, 'id' | 'action' | 'entity' | 'createdAt'>) {
  return record({ ...event, action: 'PROJECT_DOCUMENT_FILE_DELETE', entity: 'project_document_file' });
}

export function recordAttachmentUpload(event: Omit<MockAuditEvent, 'id' | 'action' | 'entity' | 'createdAt'>) {
  return record({ ...event, action: 'ATTACHMENT_UPLOAD', entity: 'asset_attachment' });
}
export function recordAttachmentDownload(event: Omit<MockAuditEvent, 'id' | 'action' | 'entity' | 'createdAt'>) {
  return record({ ...event, action: 'ATTACHMENT_DOWNLOAD', entity: 'asset_attachment' });
}
export function recordAttachmentDownloadBlocked(event: Omit<MockAuditEvent, 'id' | 'action' | 'entity' | 'createdAt'>) {
  return record({ ...event, action: 'ATTACHMENT_DOWNLOAD_BLOCKED', entity: 'asset_attachment' });
}
export function recordAttachmentDelete(event: Omit<MockAuditEvent, 'id' | 'action' | 'entity' | 'createdAt'>) {
  return record({ ...event, action: 'ATTACHMENT_DELETE', entity: 'asset_attachment' });
}
export function recordForceLogout(event: Omit<MockAuditEvent, 'id' | 'action' | 'entity' | 'createdAt'>) {
  return record({ ...event, action: 'FORCE_LOGOUT', entity: 'user_session' });
}
export function recordRecoveryAttempt(event: Omit<MockAuditEvent, 'id' | 'action' | 'entity' | 'createdAt'>) {
  return record({ ...event, action: 'RECOVERY_ATTEMPT', entity: 'user_session' });
}
export function recordRecoverySuccess(event: Omit<MockAuditEvent, 'id' | 'action' | 'entity' | 'createdAt'>) {
  return record({ ...event, action: 'RECOVERY_SUCCESS', entity: 'user_session' });
}
export function recordRecoveryFailed(event: Omit<MockAuditEvent, 'id' | 'action' | 'entity' | 'createdAt'>) {
  return record({ ...event, action: 'RECOVERY_FAILED', entity: 'user_session' });
}
