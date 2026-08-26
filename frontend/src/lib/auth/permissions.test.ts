import { describe, expect, it } from 'vitest';
import type { User } from '$shared/schemas/auth';
import {
  can,
  canForProject,
  canReadPaymentHistory,
  canReadProjectDocument,
  canReadProjectDocumentForProject,
  canSeeSensitiveProjectData,
  canWriteAssets,
  canWriteProjectDocument,
  canWriteProjectDocumentForProject,
  canWriteProjects
} from './permissions';
import { userByRole, users } from '$lib/mocks/users';

describe('RBAC helper', () => {
  it('blocks Viewer fixture from document routes, payment metadata, and asset mutations', () => {
    expect(canReadProjectDocument(userByRole('Viewer'))).toBe(false);
    expect(canReadPaymentHistory(userByRole('Viewer'))).toBe(false);
    expect(canSeeSensitiveProjectData(userByRole('Viewer'))).toBe(false);
    expect(can(userByRole('Viewer'), 'asset:create')).toBe(false);
    expect(can(userByRole('Viewer'), 'asset:update')).toBe(false);
  });

  it('allows Auditor and Admin to read payment references without Finance role', () => {
    expect(canReadPaymentHistory(userByRole('Auditor'))).toBe(true);
    expect(canSeeSensitiveProjectData(userByRole('Admin'))).toBe(true);
  });

  it('derives sensitive document visibility from document plus payment-sensitive permissions, not role labels', () => {
    const privilegedLabelOnly: User = {
      ...userByRole('Auditor'),
      permissions: []
    };
    const documentReadOnly: User = {
      ...userByRole('OPD Admin'),
      permissions: [{ key: 'project:document_read', scope: 'all' }]
    };
    const explicitSensitiveGrant: User = {
      ...userByRole('Viewer'),
      permissions: [
        { key: 'project:document_read', scope: 'all' },
        { key: 'project:payment_read', scope: 'all' }
      ]
    };

    expect(canSeeSensitiveProjectData(privilegedLabelOnly)).toBe(false);
    expect(canSeeSensitiveProjectData(documentReadOnly)).toBe(false);
    expect(canSeeSensitiveProjectData(explicitSensitiveGrant)).toBe(true);
  });

  it('only exposes project document write affordances to document writers', () => {
    expect(canWriteProjectDocument(userByRole('Admin'))).toBe(true);
    expect(canWriteProjectDocument(userByRole('OPD Admin'))).toBe(true);
    expect(canWriteProjectDocument(userByRole('Editor'))).toBe(false);
    expect(canWriteProjectDocument(userByRole('Viewer'))).toBe(false);
  });

  it('does not treat assigned_project grants as global document access', () => {
    const assignedMember: User = {
      ...userByRole('Viewer'),
      id: 'u-auditor',
      permissions: [
        { key: 'project:document_read', scope: 'assigned_project' },
        { key: 'project:document_write', scope: 'assigned_project' }
      ]
    };

    expect(can(userByRole('Editor'), 'project:document_read')).toBe(false);
    expect(can(assignedMember, 'project:document_read', 'assigned_project')).toBe(false);
    expect(canForProject(userByRole('Editor'), 'project:document_read', 'prj-001')).toBe(false);
    expect(canForProject(assignedMember, 'project:document_read', 'prj-001')).toBe(true);
    expect(canForProject(assignedMember, 'project:document_read', 'prj-002')).toBe(false);
    expect(canReadProjectDocumentForProject(assignedMember, 'prj-001')).toBe(true);
    expect(canWriteProjectDocumentForProject(assignedMember, 'prj-001')).toBe(true);
    expect(canForProject(userByRole('OPD Admin'), 'project:document_read', 'prj-002')).toBe(true);
  });

  it('uses PRD v1.3.7 specific mutation permission keys instead of legacy write aliases', () => {
    const permissionKeys = users.flatMap((user) => user.permissions.map((permission) => permission.key));

    expect(permissionKeys).toContain('asset:create');
    expect(permissionKeys).toContain('asset:update');
    expect(permissionKeys).toContain('project:create');
    expect(permissionKeys).toContain('project:update');
    expect(permissionKeys).toContain('opd:update');
    expect(permissionKeys).not.toContain('asset:write' as never);
    expect(permissionKeys).not.toContain('project:write' as never);
    expect(permissionKeys).not.toContain('opd:write' as never);
    expect(canWriteAssets(userByRole('Admin'))).toBe(true);
    expect(canWriteProjects(userByRole('Admin'))).toBe(true);
  });
});
