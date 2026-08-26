import { describe, expect, it } from 'vitest';
import { getProjectBundle } from '$lib/services/api/projects';
import { documentFiles, documents, milestones, payments, projectMembers } from './projects';

describe('project document fixtures', () => {
  it('never marks a document header verified without an active clean file', () => {
    const violations = documents
      .filter((document) => document.verificationStatus === 'verified')
      .filter(
        (document) =>
          !documentFiles.some(
            (file) =>
              file.documentId === document.id &&
              file.isActive &&
              file.scanStatus === 'clean'
          )
      )
      .map((document) => `${document.projectId}/${document.id}/${document.title}`);

    expect(violations).toEqual([]);
  });

  it('uses PRD document file field names, not legacy mock aliases', () => {
    const sample = documentFiles[0] as any;

    expect(sample.fileLabel).toBeTruthy();
    expect(sample.fileOrder).toBeGreaterThan(0);
    expect(sample.fileVersion).toBeGreaterThan(0);
    expect(sample.originalFilename).toBe(sample.filename);
    expect(sample.checksumSha256).toMatch(/^sha256:/);
    expect(sample.label).toBeUndefined();
    expect(sample.order).toBeUndefined();
    expect(sample.checksum).toBeUndefined();
    expect(sample.isSensitive).toBeUndefined();
  });

  it('uses PRD project member, milestone, and payment field names', () => {
    const member = projectMembers[0] as any;
    const milestone = milestones[0] as any;
    const payment = payments[0] as any;

    expect(member.memberRole).toBe('owner');
    expect(member.role).toBeUndefined();
    expect(milestone.name).toBeTruthy();
    expect(milestone.plannedDate).toBeTruthy();
    expect(milestone.title).toBeUndefined();
    expect(milestone.date).toBeUndefined();
    expect(milestone.status).toBeUndefined();
    expect(payment.documentId).toBe('doc-1-5');
    expect(payment.metadata).toEqual({ source: 'mock_reference' });
    expect(payment.linkedDocumentId).toBeUndefined();
  });

  it('never marks submitted or verified document headers without an active file', () => {
    const violations = documents
      .filter((document) => ['submitted', 'verified'].includes(document.verificationStatus))
      .filter(
        (document) =>
          !documentFiles.some(
            (file) =>
              file.documentId === document.id &&
              file.isActive
          )
      )
      .map((document) => `${document.projectId}/${document.id}/${document.title}/${document.verificationStatus}`);

    expect(violations).toEqual([]);
  });

  it('omits payment references from mock project bundle unless payment permission is requested', async () => {
    const redacted = await getProjectBundle('prj-001');
    const sensitive = await getProjectBundle('prj-001', { includeSensitivePayments: true });

    expect(redacted.success).toBe(true);
    expect(sensitive.success).toBe(true);
    if (!redacted.success || !sensitive.success) return;

    expect(redacted.data.payments).toHaveLength(0);
    expect(redacted.data.project.paymentSummary).toEqual({ invoiceTotal: 0, paidTotal: 0, terms: 0 });
    expect(sensitive.data.payments[0].invoiceNumber).toBe('INV-GEO-001/2026');
    expect(sensitive.data.payments[0].sp2dNumber).toBe('SP2D/LS/2026/00401');
  });

  it('omits sensitive project document headers and files unless document permission is requested', async () => {
    const denied = await getProjectBundle('prj-001');
    const publicOnly = await getProjectBundle('prj-001', { includeProjectDocuments: true });
    const privileged = await getProjectBundle('prj-001', { includeProjectDocuments: true, includeSensitiveDocuments: true });

    expect(denied.success).toBe(true);
    expect(publicOnly.success).toBe(true);
    expect(privileged.success).toBe(true);
    if (!denied.success || !publicOnly.success || !privileged.success) return;

    expect(denied.data.documents).toHaveLength(0);
    expect(denied.data.documentFiles).toHaveLength(0);
    expect(publicOnly.data.documents.every((document: any) => !document.isSensitive)).toBe(true);
    expect(publicOnly.data.documentFiles.every((file: any) => file.isSensitive === undefined)).toBe(true);
    expect(publicOnly.data.documents.map((document: any) => document.title)).not.toContain('HPS');
    expect(publicOnly.data.documentFiles.map((file: any) => file.filename)).not.toContain('hps_rahasia_GIS-2026-001.pdf');
    expect(privileged.data.documents.some((document: any) => document.isSensitive)).toBe(true);
    expect(privileged.data.documentFiles.every((file: any) => file.isSensitive === undefined)).toBe(true);
  });
});
