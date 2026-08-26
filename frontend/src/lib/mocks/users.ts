import type { ActiveSession, BackupCode, User, PermissionGrant } from '$shared/schemas/auth';
import type { RoleName } from '$shared/enums';

// Permission catalog mirrors shared/src/enums.ts (subset used in MVP mocks).
// New keys added in PRD v1.3.7: report:preset_manage, user:update, user:force_logout.
const allKeys: PermissionGrant['key'][] = [
  'asset:read', 'asset:create', 'asset:update', 'asset:delete',
  'opd:read', 'opd:update',
  'report:read', 'report:preset_manage',
  'project:read', 'project:create', 'project:update',
  'project:document_read', 'project:document_write', 'project:document_verify',
  'project:payment_read',
  'prefs:read', 'prefs:update',
  'audit:read',
  'user:read', 'user:update', 'user:force_logout'
];
const all: PermissionGrant[] = allKeys.map((key) => ({ key, scope: 'all' }));
const readonly: PermissionGrant[] = [
  ...(['asset:read', 'opd:read', 'report:read', 'project:read'] as const).map((key) => ({ key, scope: 'own_opd' as const })),
  ...(['prefs:read', 'prefs:update', 'user:read'] as const).map((key) => ({ key, scope: 'self' as const }))
];

export const users: User[] = [
  { id: 'u-super', name: 'Sinta Super Admin', email: 'super@simanta.test', phoneVerified: true, role: 'Super Admin', permissions: all },
  { id: 'u-admin', name: 'Andi Admin Aset', email: 'admin@simanta.test', phoneVerified: true, role: 'Admin', permissions: all },
  {
    id: 'u-opd', name: 'Ratna OPD Admin', email: 'opd@simanta.test', phoneVerified: true, role: 'OPD Admin', opdId: 'opd-1',
    permissions: [...readonly, { key: 'opd:update', scope: 'own_opd' }, { key: 'asset:create', scope: 'own_opd' }, { key: 'asset:update', scope: 'own_opd' }, { key: 'project:create', scope: 'own_opd' }, { key: 'project:update', scope: 'own_opd' }, { key: 'project:document_read', scope: 'own_opd' }, { key: 'project:document_write', scope: 'own_opd' }]
  },
  {
    id: 'u-editor', name: 'Eko Editor GIS', email: 'editor@simanta.test', phoneVerified: true, role: 'Editor', opdId: 'opd-1',
    permissions: [...readonly, { key: 'asset:create', scope: 'own_created' }, { key: 'asset:update', scope: 'own_created' }, { key: 'project:document_read', scope: 'assigned_project' }, { key: 'project:document_write', scope: 'assigned_project' }]
  },
  { id: 'u-viewer', name: 'Vina Viewer', email: 'viewer@simanta.test', phoneVerified: true, role: 'Viewer', permissions: readonly },
  {
    id: 'u-auditor', name: 'Aulia Auditor', email: 'auditor@simanta.test', phoneVerified: true, role: 'Auditor',
    permissions: [...readonly, { key: 'audit:read', scope: 'all' }, { key: 'project:document_read', scope: 'all' }, { key: 'project:document_verify', scope: 'all' }, { key: 'project:payment_read', scope: 'all' }]
  }
];

export function userByRole(role: RoleName) {
  return users.find((u) => u.role === role) ?? users[1];
}

// ---------- Backup codes fixture (PRD §7.2.5 / §7.8) ----------
// 8 codes per user (PRD requirement). Stored plaintext in MVP mock only;
// real backend stores bcryptjs-hashed + returns ONE TIME on regenerate.

const TOTAL_BACKUP_CODES = 8;

function generateMockCodes(userId: string): BackupCode[] {
  const now = new Date('2026-06-01T08:00:00Z').toISOString();
  return Array.from({ length: TOTAL_BACKUP_CODES }, (_, i) => ({
    id: `bc-${userId}-${i + 1}`,
    userId,
    code: `${(100000 + i * 17).toString().slice(0, 6)}-${(200000 + i * 23).toString().slice(0, 6)}`,
    used: false,
    createdAt: now
  }));
}

export const backupCodes: BackupCode[] = users.flatMap((u) => generateMockCodes(u.id));
export const backupCodesByUser: Record<string, BackupCode[]> = backupCodes.reduce(
  (acc, bc) => {
    (acc[bc.userId] ??= []).push(bc);
    return acc;
  },
  {} as Record<string, BackupCode[]>
);

// ---------- Active sessions fixture (PRD §7.2.6) ----------
// 2-3 sessions per user, one marked isCurrent. Mock device fingerprints.

function generateMockSessions(userId: string): ActiveSession[] {
  const baseIp = '10.20.30';
  return [
    {
      id: `sess-${userId}-1`,
      userId,
      device: 'Chrome 126 · Windows 11',
      ip: `${baseIp}.41`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0',
      createdAt: '2026-05-28T08:00:00Z',
      lastSeenAt: '2026-06-12T03:00:00Z',
      isCurrent: true
    },
    {
      id: `sess-${userId}-2`,
      userId,
      device: 'Safari 18 · iPhone 15 Pro',
      ip: `${baseIp}.122`,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
      createdAt: '2026-06-04T14:00:00Z',
      lastSeenAt: '2026-06-11T20:00:00Z',
      isCurrent: false
    },
    {
      id: `sess-${userId}-3`,
      userId,
      device: 'Firefox 127 · Ubuntu 24.04',
      ip: `${baseIp}.203`,
      userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
      createdAt: '2026-06-09T10:00:00Z',
      lastSeenAt: '2026-06-10T15:00:00Z',
      isCurrent: false
    }
  ];
}

export const activeSessions: ActiveSession[] = users.flatMap((u) => generateMockSessions(u.id));
export const sessionsByUser: Record<string, ActiveSession[]> = activeSessions.reduce(
  (acc, s) => {
    (acc[s.userId] ??= []).push(s);
    return acc;
  },
  {} as Record<string, ActiveSession[]>
);
