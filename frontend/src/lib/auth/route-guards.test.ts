import { describe, expect, it } from 'vitest';
import { canAccessPath, requiredPermissionForPath } from './route-guards';
import { userByRole } from '$lib/mocks/users';

describe('route permission guards', () => {
  it('requires specific asset permissions for direct asset create/edit routes', () => {
    expect(requiredPermissionForPath('/assets/create')).toBe('asset:create');
    expect(requiredPermissionForPath('/assets/asset-1/edit')).toBe('asset:update');
    expect(canAccessPath(userByRole('Viewer'), '/assets/create')).toBe(false);
    expect(canAccessPath(userByRole('Admin'), '/assets/create')).toBe(true);
  });

  it('requires specific project permissions for project create/edit routes', () => {
    expect(requiredPermissionForPath('/projects/create')).toBe('project:create');
    expect(requiredPermissionForPath('/projects/project-1/edit')).toBe('project:update');
    expect(canAccessPath(userByRole('Viewer'), '/projects/create')).toBe(false);
    expect(canAccessPath(userByRole('Admin'), '/projects/create')).toBe(true);
  });

  it('keeps read routes available for viewers', () => {
    expect(requiredPermissionForPath('/assets')).toBe('asset:read');
    expect(requiredPermissionForPath('/projects/project-1')).toBe('project:read');
    expect(canAccessPath(userByRole('Viewer'), '/assets')).toBe(true);
    expect(canAccessPath(userByRole('Viewer'), '/projects/project-1')).toBe(true);
  });

  it('requires project document/payment permissions for submodule routes', () => {
    expect(requiredPermissionForPath('/projects/project-1/documents')).toBe('project:document_read');
    expect(requiredPermissionForPath('/projects/project-1/payments')).toBe('project:payment_read');
    expect(canAccessPath(userByRole('Viewer'), '/projects/project-1/documents')).toBe(false);
    expect(canAccessPath(userByRole('Viewer'), '/projects/project-1/payments')).toBe(false);
    expect(canAccessPath(userByRole('Editor'), '/projects/prj-001/documents')).toBe(false);
    expect(canAccessPath(userByRole('Auditor'), '/projects/project-1/documents')).toBe(true);
    expect(canAccessPath(userByRole('Auditor'), '/projects/project-1/payments')).toBe(true);
  });

  it('uses PRD-aligned profile and audit route permissions', () => {
    expect(requiredPermissionForPath('/profile/preferences')).toBe('prefs:read');
    expect(requiredPermissionForPath('/profile/backup-codes')).toBe('user:read');
    expect(requiredPermissionForPath('/profile/sessions')).toBe('user:read');
    expect(requiredPermissionForPath('/audit')).toBe('audit:read');
    expect(canAccessPath(userByRole('Viewer'), '/profile/preferences')).toBe(true);
    expect(canAccessPath(userByRole('Viewer'), '/profile/sessions')).toBe(true);
    expect(canAccessPath(userByRole('Viewer'), '/audit')).toBe(false);
    expect(canAccessPath(userByRole('Auditor'), '/audit')).toBe(true);
  });
});
