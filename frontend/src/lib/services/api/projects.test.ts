import { describe, expect, it } from 'vitest';
import { getProjectBundle, listProjectDocumentFiles, listProjectDocuments, listProjects, projectDashboardStats, projectGeoJson } from './projects';

describe('project GIS visibility contract', () => {
  it('blocks document headers/files and payment metadata when route permissions are absent', async () => {
    const response = await getProjectBundle('prj-001', {
      includeProjectDocuments: false,
      includeSensitiveDocuments: false,
      includeSensitivePayments: false
    });
    const sensitiveFlagWithoutDocumentRead = await getProjectBundle('prj-001', {
      includeProjectDocuments: false,
      includeSensitiveDocuments: true,
      includeSensitivePayments: false
    });

    expect(response.success).toBe(true);
    expect(sensitiveFlagWithoutDocumentRead.success).toBe(true);
    if (!response.success) return;

    const serialized = JSON.stringify(response.data);
    expect(response.meta?.documentVisibility).toBe('not_permitted');
    expect(response.meta?.paymentScope).toBe('not_permitted');
    expect(response.data.documents).toHaveLength(0);
    expect(response.data.documentFiles).toHaveLength(0);
    expect(response.data.payments).toHaveLength(0);
    expect(response.data.project.documentSummary).toEqual({ total: 0, verified: 0, sensitive: 0 });
    expect(response.data.project.paymentSummary).toEqual({ invoiceTotal: 0, paidTotal: 0, terms: 0 });
    expect(response.data.project.contractValue).toBe(0);
    expect(serialized).not.toContain('hps_rahasia');
    expect(serialized).not.toContain('kontrak_GIS-2026-001');
    expect(serialized).not.toContain('invoice_termin_GIS-2026-001');
    expect(serialized).not.toContain('INV-GEO-001/2026');
    expect(serialized).not.toContain('SP2D/LS/2026/00401');
    if (sensitiveFlagWithoutDocumentRead.success) {
      expect(sensitiveFlagWithoutDocumentRead.meta?.documentVisibility).toBe('not_permitted');
      expect(sensitiveFlagWithoutDocumentRead.data.documents).toHaveLength(0);
      expect(sensitiveFlagWithoutDocumentRead.data.documentFiles).toHaveLength(0);
      expect(JSON.stringify(sensitiveFlagWithoutDocumentRead.data)).not.toContain('hps_rahasia_GIS-2026-001.pdf');
    }
  });

  it('omits sensitive project document headers and files for non-sensitive document readers', async () => {
    const response = await getProjectBundle('prj-001', {
      includeProjectDocuments: true,
      includeSensitiveDocuments: false,
      includeSensitivePayments: false
    });

    expect(response.success).toBe(true);
    if (!response.success) return;

    const serialized = JSON.stringify(response.data);
    expect(response.meta?.documentVisibility).toBe('public_only_omits_sensitive');
    expect(response.data.documents.every((document: any) => !document.isSensitive)).toBe(true);
    expect(response.data.documentFiles.every((file: any) => file.isSensitive === undefined)).toBe(true);
    expect(response.data.project.documentSummary).toEqual({ total: 2, verified: 1, sensitive: 0 });
    expect(response.data.payments).toHaveLength(0);
    expect(response.data.project.paymentSummary).toEqual({ invoiceTotal: 0, paidTotal: 0, terms: 0 });
    expect(serialized).not.toContain('hps_rahasia');
    expect(serialized).not.toContain('kontrak_GIS-2026-001');
    expect(serialized).not.toContain('invoice_termin_GIS-2026-001');
  });

  it('returns sensitive document headers/files and payment references only when permission is granted', async () => {
    const response = await getProjectBundle('prj-001', {
      includeProjectDocuments: true,
      includeSensitiveDocuments: true,
      includeSensitivePayments: true
    });

    expect(response.success).toBe(true);
    if (!response.success) return;

    const serialized = JSON.stringify(response.data);
    expect(response.meta?.documentVisibility).toBe('permission_granted');
    expect(response.meta?.paymentScope).toBe('project:payment_read');
    expect(response.data.documents.some((document: any) => document.isSensitive)).toBe(true);
    expect(response.data.project.documentSummary.sensitive).toBeGreaterThan(0);
    expect(response.data.project.paymentSummary.terms).toBeGreaterThan(0);
    expect(serialized).toContain('hps_rahasia_GIS-2026-001.pdf');
    expect(serialized).toContain('INV-GEO-001/2026');
  });


  it('separates non-payment sensitive documents from payment-sensitive document references', async () => {
    const nonPaymentSensitive = await getProjectBundle('prj-001', {
      includeProjectDocuments: true,
      includeSensitiveDocuments: true,
      includeSensitivePayments: false
    });

    expect(nonPaymentSensitive.success).toBe(true);
    if (!nonPaymentSensitive.success) return;

    const serialized = JSON.stringify(nonPaymentSensitive.data);
    expect(nonPaymentSensitive.meta?.documentVisibility).toBe('sensitive_non_payment_granted_payment_omitted');
    expect(serialized).toContain('hps_rahasia_GIS-2026-001.pdf');
    expect(serialized).toContain('kontrak_GIS-2026-001_clean-scan.pdf');
    expect(serialized).not.toContain('invoice_termin_GIS-2026-001.pdf');
    expect(nonPaymentSensitive.data.payments).toHaveLength(0);
  });

  it('applies omit-total policy to list endpoints and project summaries', async () => {
    const deniedDocuments = await listProjectDocuments('prj-001', { includeProjectDocuments: false });
    const deniedSensitiveDocuments = await listProjectDocuments('prj-001', { includeProjectDocuments: false, includeSensitiveDocuments: true });
    const publicDocuments = await listProjectDocuments('prj-001', { includeProjectDocuments: true, includeSensitiveDocuments: false });
    const projects = await listProjects({}, { includeProjectDocuments: false, includeSensitivePayments: false });

    expect(deniedDocuments.success).toBe(false);
    expect(deniedSensitiveDocuments.success).toBe(false);
    expect(publicDocuments.success).toBe(true);
    expect(projects.success).toBe(true);
    if (!deniedDocuments.success) expect(deniedDocuments.code).toBe('FORBIDDEN');
    if (!deniedSensitiveDocuments.success) expect(deniedSensitiveDocuments.code).toBe('FORBIDDEN');
    if (publicDocuments.success) {
      expect(publicDocuments.data).toHaveLength(2);
      expect(JSON.stringify(publicDocuments.data)).not.toContain('Metadata sensitif disembunyikan');
    }
    if (projects.success) {
      const project = projects.data.items.find((item: any) => item.id === 'prj-001');
      expect(project?.documentSummary).toEqual({ total: 0, verified: 0, sensitive: 0 });
      expect(project?.paymentSummary).toEqual({ invoiceTotal: 0, paidTotal: 0, terms: 0 });
      expect(project?.contractValue).toBe(0);
    }
  });

  it('returns FORBIDDEN for document file lists when document read or sensitive guard is absent', async () => {
    const noRead = await listProjectDocumentFiles('prj-001', 'doc-1-1', { includeProjectDocuments: false });
    const sensitiveWithoutGrant = await listProjectDocumentFiles('prj-001', 'doc-1-2', {
      includeProjectDocuments: true,
      includeSensitiveDocuments: false
    });

    expect(noRead.success).toBe(false);
    expect(sensitiveWithoutGrant.success).toBe(false);
    if (!noRead.success) expect(noRead.code).toBe('FORBIDDEN');
    if (!sensitiveWithoutGrant.success) expect(sensitiveWithoutGrant.code).toBe('FORBIDDEN');
  });

});

describe('PRD v1.4 §8.1 — Dashboard Proyek API', () => {
  it('projectGeoJson returns FeatureCollection with all 3 mock projects that have geometry', async () => {
    const res = await projectGeoJson();
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.type).toBe('FeatureCollection');
    expect(res.data.features).toHaveLength(3);
    const types = Array.from(new Set(res.data.features.map((f: { geometry: { type: string } | null }) => f.geometry?.type))).sort();
    expect(types).toEqual(['LineString', 'Point', 'Polygon']);
  });
  it('projectGeoJson features expose project properties (id, projectCode, projectName, status, fiscalYear, jenisInfrastruktur, opdName)', async () => {
    const res = await projectGeoJson();
    if (!res.success) return;
    const first = res.data.features[0];
    expect(first.type).toBe('Feature');
    expect(first.properties).toMatchObject({
      id: expect.any(String),
      projectCode: expect.any(String),
      projectName: expect.any(String),
      status: expect.any(String),
      fiscalYear: expect.any(Number),
      jenisInfrastruktur: expect.any(String),
      opdName: expect.any(String),
      skProyek: expect.any(String),
      startDate: expect.any(String)
    });
  });

  it('projectGeoJson metadata includes path and count', async () => {
    const res = await projectGeoJson();
    expect(res.meta?.path).toBe('/api/v1/projects/geojson');
    expect(res.meta?.count).toBe(3);
  });

  it('projectDashboardStats returns totalProyek and proyekBerjalan with correct counts', async () => {
    const res = await projectDashboardStats();
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data).toEqual({ totalProyek: 3, proyekBerjalan: 1 });
    expect(res.meta?.path).toBe('/api/v1/projects/dashboard-stats');
  });

  it('projectDashboardStats counts only in_progress status as berjalan (not procurement/completed)', async () => {
    const res = await projectDashboardStats();
    if (!res.success) return;
    expect(res.data.proyekBerjalan).toBe(1);
  });
});

describe('PRD v1.4 §8.1 — projectStatusGroup mapping (ProjectStatus → visual group)', () => {
  it('planning/procurement/contracted → perencanaan', async () => {
    const { projectStatusGroup } = await import('$shared/enums');
    expect(projectStatusGroup('planning')).toBe('perencanaan');
    expect(projectStatusGroup('procurement')).toBe('perencanaan');
    expect(projectStatusGroup('contracted')).toBe('perencanaan');
  });
  it('in_progress → berjalan', async () => {
    const { projectStatusGroup } = await import('$shared/enums');
    expect(projectStatusGroup('in_progress')).toBe('berjalan');
  });
  it('handover/completed → selesai', async () => {
    const { projectStatusGroup } = await import('$shared/enums');
    expect(projectStatusGroup('handover')).toBe('selesai');
    expect(projectStatusGroup('completed')).toBe('selesai');
  });
  it('cancelled/archived → dibatalkan', async () => {
    const { projectStatusGroup } = await import('$shared/enums');
    expect(projectStatusGroup('cancelled')).toBe('dibatalkan');
    expect(projectStatusGroup('archived')).toBe('dibatalkan');
  });
  it('PROJECT_STATUS_GROUPS exposes all 4 groups in stable order', async () => {
    const { PROJECT_STATUS_GROUPS } = await import('$shared/enums');
    expect(PROJECT_STATUS_GROUPS).toEqual(['perencanaan', 'berjalan', 'selesai', 'dibatalkan']);
  });
});

describe('listProjects with skProyek filter', () => {
  it('filters projects by skProyek substring (case-insensitive)', async () => {
    const res = await listProjects({ skProyek: 'SK.050/118' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.items).toHaveLength(1);
      expect(res.data.items[0].projectCode).toBe('GIS-2026-001');
      expect(res.data.items[0].skProyek).toBe('SK.050/118/438.5.2/2026');
    }
  });

  it('returns all projects when skProyek filter is empty', async () => {
    const res = await listProjects({ skProyek: '' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.items.length).toBeGreaterThanOrEqual(3);
    }
  });
});
