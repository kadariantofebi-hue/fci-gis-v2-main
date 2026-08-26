import type { PermissionKey, PermissionScope } from '$shared/enums';
import type { User } from '$shared/schemas/auth';
import { projectMembers } from '$lib/mocks/projects';

export function can(user: User | null | undefined, key: PermissionKey, scope?: PermissionScope) {
  if (!user) return false;
  if (scope === 'assigned_project') return false;
  return user.permissions.some(
    (permission) =>
      permission.key === key &&
      (!scope
        ? permission.scope !== 'assigned_project'
        : permission.scope === scope || permission.scope === 'all')
  );
}

export function canForProject(user: User | null | undefined, key: PermissionKey, projectId: string) {
  if (!user) return false;
  return user.permissions.some((permission) => {
    if (permission.key !== key) return false;
    if (permission.scope === 'all' || permission.scope === 'own_opd') return true;
    if (permission.scope === 'assigned_project') {
      return projectMembers.some((member) => member.projectId === projectId && member.userId === user.id);
    }
    return false;
  });
}

export function canSeeSensitiveProjectData(user: User | null | undefined) {
  // Contract/payment-sensitive project values are gated by project:payment_read.
  // Sensitive document files use canReadSensitiveProjectDocument(), which also
  // requires project:document_read.
  return canReadPaymentHistory(user);
}

export function canCreateAssets(user: User | null | undefined) {
  return can(user, 'asset:create');
}

export function canUpdateAssets(user: User | null | undefined) {
  return can(user, 'asset:update');
}

export function canWriteAssets(user: User | null | undefined) {
  return canCreateAssets(user) || canUpdateAssets(user);
}

export function canWriteOpd(user: User | null | undefined) {
  return canUpdateCurrentOpd(user);
}

export function canCreateProjects(user: User | null | undefined) {
  return can(user, 'project:create');
}

export function canUpdateProjects(user: User | null | undefined) {
  return can(user, 'project:update');
}

export function canWriteProjects(user: User | null | undefined) {
  return canCreateProjects(user) || canUpdateProjects(user);
}

export function canUpdateCurrentOpd(user: User | null | undefined) {
  return can(user, 'opd:update');
}

export function canVerifyProjectDocument(user: User | null | undefined) {
  return can(user, 'project:document_verify');
}

export function canReadProjectDocument(user: User | null | undefined) {
  return can(user, 'project:document_read');
}

export function canReadProjectDocumentsAggregate(user: User | null | undefined) {
  // Aggregate/list/dashboard views have no single projectId. They intentionally
  // exclude assigned_project grants to avoid cross-project document exposure.
  return can(user, 'project:document_read');
}

export function canReadProjectDocumentForProject(user: User | null | undefined, projectId: string) {
  return canForProject(user, 'project:document_read', projectId);
}

export function canWriteProjectDocument(user: User | null | undefined) {
  return can(user, 'project:document_write');
}

export function canWriteProjectDocumentForProject(user: User | null | undefined, projectId: string) {
  return canForProject(user, 'project:document_write', projectId);
}

export function canReadSensitiveProjectDocument(user: User | null | undefined) {
  // PRD v1.3.7 says sensitive document access needs project:document_read plus
  // an additional sensitive-document authority. Payment references still use
  // project:payment_read separately; non-payment sensitive docs can be handled
  // by document writers/verifiers without using payment permission as a generic
  // catch-all.
  return canReadProjectDocument(user) && (canWriteProjectDocument(user) || canVerifyProjectDocument(user) || canReadPaymentHistory(user));
}

export function canReadSensitiveProjectDocumentsAggregate(user: User | null | undefined) {
  return canReadProjectDocumentsAggregate(user) && (canWriteProjectDocument(user) || canVerifyProjectDocument(user) || canReadPaymentHistory(user));
}

export function canReadSensitiveProjectDocumentForProject(user: User | null | undefined, projectId: string) {
  return (
    canReadProjectDocumentForProject(user, projectId) &&
    (canWriteProjectDocumentForProject(user, projectId) || canVerifyProjectDocument(user) || canReadPaymentHistory(user))
  );
}

export function canReadPaymentHistory(user: User | null | undefined) {
  return can(user, 'project:payment_read');
}

export function canViewBackupCodesStatus(user: User | null | undefined) {
  // PRD §7.2.5: status view is per-user (self); `user:read` covers the
  // authenticated user inspecting their own codes.
  return can(user, 'user:read');
}

export function canRegenerateBackupCodes(user: User | null | undefined) {
  // PRD §7.8: `POST /api/v1/users/:id/backup-codes/regenerate` requires
  // `user:update` with scope `self` / `own_opd` / `all`. The `can()` helper
  // already matches `permission.scope === scope || permission.scope === 'all'`,
  // so any user:update grant of those three scopes will pass.
  return can(user, 'user:update');
}

export function canViewActiveSessions(user: User | null | undefined) {
  // Per PRD §7.2.6, an authenticated user can list their own active sessions
  // (for the security & devices view). Viewer with `user:read` self scope
  // is sufficient.
  return can(user, 'user:read');
}

export function canForceLogoutOtherSession(user: User | null | undefined) {
  // PRD §7.2.6 + §7.8: force-logout of OTHER users' sessions is an admin
  // action. Reserve `user:force_logout` for that. Do NOT widen via OR-fallback
  // with `user:update` (which is for self-service profile edits).
  return can(user, 'user:force_logout');
}

export function canRevokeOwnSession(user: User | null | undefined) {
  // A user can self-revoke their own non-current sessions (e.g. sign out
  // an old phone). This is distinct from cross-user force-logout and is
  // allowed with `user:update` self/own_opd scope.
  return can(user, 'user:update');
}

export function canManageReportPresets(user: User | null | undefined) {
  // PRD §6.1.2 + §7.12: report:preset_manage for /api/v1/reports/presets CRUD
  return can(user, 'report:preset_manage');
}
