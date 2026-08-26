import { ok, err } from '$shared/envelope';
import type { FeatureCollection, ProjectFeatureProperties } from '$shared/geojson';
import { apiMode, realFetch } from './client';
import type { Project, ProjectDocument, ProjectDocumentFile, ProjectPayment } from '$shared/schemas/project';
import type { ProjectDocumentFileLabel, ProjectDocumentKind, ProjectStage } from '$shared/enums';
import { assets } from '$lib/mocks/assets';
import { ACTIVE_OPD } from '$lib/mocks/opd';
import { projects, documents, documentFiles, milestones, payments, projectAssetLinks, projectMembers } from '$lib/mocks/projects';

type ProjectVisibilityOptions = {
  includeProjectDocuments?: boolean;
  includeSensitiveDocuments?: boolean;
  includeSensitivePayments?: boolean;
};

type ProjectBundleOptions = ProjectVisibilityOptions;

type ProjectDocumentWithFiles = ProjectDocument & { files: ProjectDocumentFile[] };

function normalizeVisibility(options: ProjectVisibilityOptions = {}) {
  const includeProjectDocuments = options.includeProjectDocuments === true;
  return {
    includeProjectDocuments,
    // Sensitive document visibility is never a standalone grant. It requires the
    // caller to prove both project:document_read and the sensitive-data grant.
    includeSensitiveDocuments: includeProjectDocuments && options.includeSensitiveDocuments === true,
    includeSensitivePayments: options.includeSensitivePayments === true
  };
}

function rawDocuments(projectId: string) {
  return documents.filter((document) => document.projectId === projectId);
}

function documentVisibilityLabel(includeProjectDocuments = false, includeSensitiveDocuments = false, includeSensitivePayments = false) {
  if (!includeProjectDocuments) return 'not_permitted';
  if (!includeSensitiveDocuments) return 'public_only_omits_sensitive';
  return includeSensitivePayments ? 'permission_granted' : 'sensitive_non_payment_granted_payment_omitted';
}

function isPaymentSensitiveDocument(document: ProjectDocument) {
  const marker = `${document.stage} ${document.kind} ${document.title}`.toLowerCase();
  return document.stage === 'payment' || /invoice|sp2d|pajak|tax|payment|pembayaran|bukti pembayaran/.test(marker);
}

function isVisibleDocument(
  document: ProjectDocument,
  includeProjectDocuments = false,
  includeSensitiveDocuments = false,
  includeSensitivePayments = false
) {
  if (!includeProjectDocuments) return false;
  if (!document.isSensitive) return true;
  if (isPaymentSensitiveDocument(document)) return includeSensitiveDocuments && includeSensitivePayments;
  return includeSensitiveDocuments;
}

function isVisibleFile(
  document: ProjectDocument,
  _file: ProjectDocumentFile,
  includeProjectDocuments = false,
  includeSensitiveDocuments = false,
  includeSensitivePayments = false
) {
  // PRD: file sensitivity is inherited from project_documents.isSensitive.
  return isVisibleDocument(document, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments);
}

function filesForDocument(
  document: ProjectDocument,
  includeProjectDocuments = false,
  includeSensitiveDocuments = false,
  includeSensitivePayments = false
) {
  return documentFiles
    .filter((file) => file.documentId === document.id && isVisibleFile(document, file, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments))
    .sort((a, b) => a.fileOrder - b.fileOrder);
}

function nestedDocuments(
  projectId: string,
  includeProjectDocuments = false,
  includeSensitiveDocuments = false,
  includeSensitivePayments = false
): ProjectDocumentWithFiles[] {
  return rawDocuments(projectId)
    .filter((document) => isVisibleDocument(document, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments))
    .map((document) => ({
      ...document,
      files: filesForDocument(document, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments)
    }));
}

function scopedDocumentFiles(projectId: string, includeProjectDocuments = false, includeSensitiveDocuments = false, includeSensitivePayments = false) {
  const docsById = new Map(rawDocuments(projectId).map((document) => [document.id, document]));

  return documentFiles
    .filter((file) => {
      if (file.projectId !== projectId) return false;
      const document = docsById.get(file.documentId);
      return (
        !!document &&
        isVisibleDocument(document, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments) &&
        isVisibleFile(document, file, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments)
      );
    })
    .sort((a, b) => a.fileOrder - b.fileOrder);
}

function documentSummary(
  projectId: string,
  includeProjectDocuments = false,
  includeSensitiveDocuments = false,
  includeSensitivePayments = false
): Project['documentSummary'] {
  const visibleDocuments = nestedDocuments(projectId, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments);

  return {
    total: visibleDocuments.length,
    verified: visibleDocuments.filter((document) => document.verificationStatus === 'verified').length,
    sensitive: includeSensitiveDocuments ? visibleDocuments.filter((document) => document.isSensitive).length : 0
  };
}

function projectWithScopedSummary(
  project: Project,
  includeProjectDocuments = false,
  includeSensitiveDocuments = false,
  includeSensitivePayments = false
): Project {
  return {
    ...project,
    contractValue: includeSensitivePayments ? project.contractValue : 0,
    documentSummary: documentSummary(project.id, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments),
    paymentSummary: includeSensitivePayments ? project.paymentSummary : { invoiceTotal: 0, paidTotal: 0, terms: 0 }
  };
}

export async function listProjects(filters: Record<string, string> = {}, options: ProjectVisibilityOptions = {}) {
  if (apiMode === 'real') return realFetch(`/projects?${new URLSearchParams(filters).toString()}`);

  const { includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments } = normalizeVisibility(options);
  const q = filters.q?.toLowerCase() ?? '';
  const skProyek = filters.skProyek?.toLowerCase() ?? '';
  const contractNumber = filters.contractNumber?.toLowerCase() ?? '';
  const district = filters.district?.toLowerCase() ?? '';
  const items = projects
    .filter(
      (project) =>
        (!q || `${project.projectCode} ${project.projectName}`.toLowerCase().includes(q)) &&
        (!filters.status || project.status === filters.status) &&
        (!filters.fiscalYear || String(project.fiscalYear) === filters.fiscalYear) &&
        (!contractNumber || project.contractNumber.toLowerCase().includes(contractNumber)) &&
        (!filters.jenisInfrastruktur || project.jenisInfrastruktur === filters.jenisInfrastruktur) &&
        (!skProyek || (project.skProyek ?? '').toLowerCase().includes(skProyek)) &&
        (!district || (project.district ?? '').toLowerCase().includes(district))
    )
    .map((project) => projectWithScopedSummary(project, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments));

  return ok({ items, total: items.length, scope: 'single_active_opd', activeOpd: ACTIVE_OPD }, 'Daftar Administrasi Proyek GIS', {
    path: '/api/v1/projects',
    filters: { ...filters, opd_id: 'implicit_current_opd' },
    documentVisibility: documentVisibilityLabel(includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments),
    paymentScope: includeSensitivePayments ? 'project:payment_read' : 'not_permitted'
  });
}

export async function getProject(id: string) {
  if (apiMode === 'real') return realFetch(`/projects/${id}`);
  const project = projects.find((item) => item.id === id);
  return project ? ok(project, 'Detail proyek') : err('NOT_FOUND', 'Proyek tidak ditemukan');
}

/**
 * PRD v1.4 §8.1: GeoJSON FeatureCollection untuk Dashboard Proyek. Proyek
 * tanpa geometry di-skip; client bisa render feature tanpa geometry sebagai
 * status-only card jika dibutuhkan. Filter: opd aktif saja (single active
 * OPD mode), non-soft-deleted (mock data belum soft-delete aware).
 */
export async function projectGeoJson() {
  if (apiMode === 'real') return realFetch('/projects/geojson');
  const features: FeatureCollection<ProjectFeatureProperties>['features'] = projects
    .filter((project) => project.geometry != null)
    .map((project) => ({
      type: 'Feature' as const,
      geometry: project.geometry!,
      properties: {
        id: project.id,
        projectCode: project.projectCode,
        projectName: project.projectName,
        status: project.status,
        fiscalYear: project.fiscalYear,
        jenisInfrastruktur: project.jenisInfrastruktur ?? 'lainnya',
        opdName: project.opdName,
        skProyek: project.skProyek,
        startDate: project.startDate
      }
    }));
  const collection: FeatureCollection<ProjectFeatureProperties> = { type: 'FeatureCollection', features };
  return ok(collection, 'Project GeoJSON', { path: '/api/v1/projects/geojson', count: features.length });
}

/**
 * PRD v1.4 §8.1: KPI ringkas Dashboard Proyek. Single source of truth untuk
 * 2 metric utama: Total Proyek (semua status) + Proyek Berjalan (in_progress).
 * Tidak termasuk KPI spasial (luas, panjang, dll.) — sudah dihilangkan dari
 * Dashboard per PRD §8.1 "Dihilangkan dari produk".
 */
export async function projectDashboardStats() {
  if (apiMode === 'real') return realFetch('/projects/dashboard-stats');
  const totalProyek = projects.length;
  const proyekBerjalan = projects.filter((project) => project.status === 'in_progress').length;
  return ok({ totalProyek, proyekBerjalan }, 'Project dashboard stats', { path: '/api/v1/projects/dashboard-stats' });
}

export async function saveProject(payload: Partial<Project> & { id?: string; simulateConflict?: boolean }) {
  if (apiMode === 'real') return realFetch(payload.id ? `/projects/${payload.id}` : '/projects', { method: payload.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
  if (payload.simulateConflict) {
    const currentVersion = payload.id ? projects.find((project) => project.id === payload.id)?.version ?? null : null;
    return err('CONFLICT_VERSION', 'Versi proyek sudah berubah. Muat ulang sebelum menyimpan.', undefined, {
      current_version: currentVersion,
      your_version: payload.version ?? null
    });
  }
  if (payload.id) {
    const idx = projects.findIndex((project) => project.id === payload.id);
    if (idx < 0) return err('NOT_FOUND', 'Proyek tidak ditemukan');
    const updated = { ...projects[idx], ...payload, opdId: ACTIVE_OPD.id, opdName: ACTIVE_OPD.shortName, version: projects[idx].version + 1 } as Project;
    projects[idx] = updated;
    return ok(updated, 'PROJECT_UPDATED');
  }
  const created: Project = {
    id: `prj-${String(projects.length + 1).padStart(3, '0')}`,
    projectCode: payload.projectCode || `GIS-${new Date().getFullYear()}-MOCK`,
    projectName: payload.projectName || 'Proyek GIS Baru',
    fiscalYear: Number(payload.fiscalYear || new Date().getFullYear()),
    opdId: ACTIVE_OPD.id,
    opdName: ACTIVE_OPD.shortName,
    vendorName: payload.vendorName || 'Vendor Mock',
    contractNumber: payload.contractNumber || '-',
    contractValue: Number(payload.contractValue || 0),
    startDate: payload.startDate || new Date().toISOString().slice(0, 10),
    endDate: payload.endDate || new Date().toISOString().slice(0, 10),
    status: payload.status || 'planning',
    version: 1,
    description: payload.description || '',
    roadName: payload.roadName || '',
    rt: payload.rt || '',
    rw: payload.rw || '',
    kelurahan: payload.kelurahan || '',
    kecamatan: payload.kecamatan || '',
    skProyek: payload.skProyek || '',
    geometry: payload.geometry ?? null,
    documentSummary: { total: 0, verified: 0, sensitive: 0 },
    paymentSummary: { invoiceTotal: 0, paidTotal: 0, terms: 0 }
  };
  projects.unshift(created);
  return ok(created, 'PROJECT_CREATED');
}

export async function getProjectBundle(id: string, options: ProjectBundleOptions = {}) {
  if (apiMode === 'real') return realFetch(`/projects/${id}`);
  const project = projects.find((item) => item.id === id);
  if (!project) return err('NOT_FOUND', 'Proyek tidak ditemukan');

  const { includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments } = normalizeVisibility(options);
  const scopedPayments: ProjectPayment[] = includeSensitivePayments ? payments.filter((payment) => payment.projectId === id) : [];

  return ok(
    {
      project: projectWithScopedSummary(project, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments),
      documents: nestedDocuments(id, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments),
      documentFiles: scopedDocumentFiles(id, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments),
      milestones: milestones.filter((milestone) => milestone.projectId === id),
      payments: scopedPayments,
      members: projectMembers.filter((member) => member.projectId === id),
      assetLinks: projectAssetLinks.filter((link) => link.projectId === id),
      linkedAssets: projectAssetLinks
        .filter((link) => link.projectId === id)
        .map((link) => ({ ...link, asset: assets.find((asset) => asset.id === link.assetId) }))
        .filter((link) => link.asset)
    },
    'Bundle proyek',
    {
      path: `/api/v1/projects/${id}`,
      documentVisibility: documentVisibilityLabel(includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments),
      paymentScope: includeSensitivePayments ? 'project:payment_read' : 'not_permitted'
    }
  );
}

export async function listProjectDocuments(projectId: string, options: ProjectVisibilityOptions = {}) {
  if (apiMode === 'real') return realFetch(`/projects/${projectId}/documents`);
  const { includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments } = normalizeVisibility(options);
  if (!includeProjectDocuments) return err('FORBIDDEN', 'PROJECT_DOCUMENT_READ_REQUIRED: project:document_read diperlukan untuk membuka dokumen proyek.');
  return ok(nestedDocuments(projectId, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments), 'Daftar header dokumen', {
    path: `/api/v1/projects/${projectId}/documents`,
    documentVisibility: documentVisibilityLabel(includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments)
  });
}

export async function getProjectDocument(projectId: string, documentId: string, options: ProjectVisibilityOptions = {}) {
  const { includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments } = normalizeVisibility(options);
  if (!includeProjectDocuments) return err('FORBIDDEN', 'PROJECT_DOCUMENT_READ_REQUIRED: project:document_read diperlukan untuk membuka dokumen proyek.');
  const document = nestedDocuments(projectId, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments).find((item) => item.id === documentId);
  return document ? ok(document, 'Detail dokumen') : err('NOT_FOUND', 'Dokumen tidak ditemukan');
}

export async function saveProjectDocument(payload: Partial<ProjectDocument> & { id: string; projectId: string; simulateConflict?: boolean }) {
  if (payload.simulateConflict) {
    const currentVersion = documents.find((document) => document.id === payload.id && document.projectId === payload.projectId)?.version ?? null;
    return err('CONFLICT_VERSION', 'Versi header dokumen berubah.', undefined, {
      current_version: currentVersion,
      your_version: payload.version ?? null
    });
  }
  const idx = documents.findIndex((document) => document.id === payload.id && document.projectId === payload.projectId);
  if (idx < 0) return err('NOT_FOUND', 'Dokumen tidak ditemukan');
  documents[idx] = { ...documents[idx], ...payload, version: documents[idx].version + 1, updatedAt: new Date().toISOString() } as ProjectDocument;
  return ok(documents[idx], 'PROJECT_DOCUMENT_UPDATED');
}

export async function verifyProjectDocument(projectId: string, documentId: string) {
  const document = documents.find((item) => item.id === documentId && item.projectId === projectId);
  if (!document) return err('NOT_FOUND', 'Dokumen tidak ditemukan');
  const cleanFiles = documentFiles.filter((file) => file.documentId === documentId && file.isActive && file.scanStatus === 'clean');
  if (cleanFiles.length === 0) return err('VALIDATION_FAILED', 'PROJECT_DOCUMENT_INCOMPLETE: Dokumen belum memiliki file aktif dengan scan clean.');
  document.verificationStatus = 'verified';
  document.version += 1;
  document.updatedAt = new Date().toISOString();
  return ok(document, 'PROJECT_DOCUMENT_VERIFIED');
}

export async function listProjectDocumentFiles(projectId: string, documentId: string, options: ProjectVisibilityOptions = {}) {
  const { includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments } = normalizeVisibility(options);
  if (!includeProjectDocuments) return err('FORBIDDEN', 'PROJECT_DOCUMENT_READ_REQUIRED: project:document_read diperlukan untuk membuka file dokumen proyek.');
  const document = documents.find((item) => item.projectId === projectId && item.id === documentId);
  if (!document) return err('NOT_FOUND', 'Dokumen tidak ditemukan');

  if (!isVisibleDocument(document, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments)) {
    return err('FORBIDDEN', 'PROJECT_DOCUMENT_SENSITIVE_REQUIRED: permission tambahan diperlukan untuk membuka file dokumen sensitif.');
  }

  return ok(filesForDocument(document, includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments), 'Daftar file dokumen', {
    path: `/api/v1/projects/${projectId}/documents/${documentId}/files`,
    documentVisibility: documentVisibilityLabel(includeProjectDocuments, includeSensitiveDocuments, includeSensitivePayments)
  });
}

export async function saveProjectDocumentFileMetadata(payload: Partial<ProjectDocumentFile> & { id: string; projectId: string; documentId: string; simulateConflict?: boolean }) {
  if (payload.simulateConflict) {
    const currentVersion = documentFiles.find((file) => file.id === payload.id && file.documentId === payload.documentId)?.version ?? null;
    return err('CONFLICT_VERSION', 'Versi file dokumen berubah.', undefined, {
      current_version: currentVersion,
      your_version: payload.version ?? null
    });
  }
  const idx = documentFiles.findIndex((file) => file.id === payload.id && file.documentId === payload.documentId);
  if (idx < 0) return err('NOT_FOUND', 'File dokumen tidak ditemukan');
  documentFiles[idx] = { ...documentFiles[idx], ...payload, version: documentFiles[idx].version + 1 } as ProjectDocumentFile;
  return ok(documentFiles[idx], 'PROJECT_DOCUMENT_FILE_UPDATED');
}

export async function createProjectDocumentFiles(
  projectId: string,
  documentId: string,
  uploads: Array<{ filename: string; fileLabel: ProjectDocumentFile['fileLabel']; sizeBytes: number; fileOrder: number }>
) {
  const document = documents.find((item) => item.id === documentId && item.projectId === projectId);
  if (!document) return err('NOT_FOUND', 'Dokumen tidak ditemukan');
  const created = uploads.map(
    (upload, index) =>
      ({
        id: `file-${Date.now()}-${index}`,
        projectId,
        documentId,
        fileLabel: upload.fileLabel,
        fileOrder: upload.fileOrder,
        fileVersion: 1,
        filename: upload.filename,
        originalFilename: upload.filename,
        mimeType: 'application/octet-stream',
        sizeBytes: upload.sizeBytes,
        isActive: true,
        scanStatus: 'pending',
        checksumSha256: `sha256:mock-${Date.now()}-${index}`,
        uploadedBy: 'Mock uploader',
        uploadedAt: new Date().toISOString(),
        version: 1
      }) satisfies ProjectDocumentFile
  );
  documentFiles.push(...created);
  if (document.verificationStatus === 'incomplete') document.verificationStatus = 'submitted';
  document.version += 1;
  return ok(created, 'PROJECT_DOCUMENT_FILES_CREATED', { path: `/api/v1/projects/${projectId}/documents/${documentId}/files` });
}

export async function deleteProjectDocumentFile(projectId: string, documentId: string, fileId: string) {
  const file = documentFiles.find((item) => item.projectId === projectId && item.documentId === documentId && item.id === fileId);
  if (!file) return err('NOT_FOUND', 'File dokumen tidak ditemukan');
  file.isActive = false;
  file.version += 1;
  return ok(file, 'PROJECT_DOCUMENT_FILE_DELETED');
}

export type CreateProjectDocumentInput = {
  stage: ProjectStage;
  kind: ProjectDocumentKind;
  title: string;
  documentNumber?: string;
  documentDate?: string;
  isSensitive: boolean;
  description?: string;
};

/**
 * Mock-only: insert satu header dokumen ke array `documents` (in-memory).
 * Dipakai oleh halaman create proyek yang menyertakan section dokumen inline.
 * Real-mode parity: gunakan `POST /projects/:id/documents` (atomic single call).
 */
export async function createProjectDocumentHeader(
  projectId: string,
  input: CreateProjectDocumentInput
) {
  if (apiMode === 'real') return realFetch(`/projects/${projectId}/documents`, { method: 'POST', body: JSON.stringify(input) });
  const project = projects.find((p) => p.id === projectId);
  if (!project) return err('NOT_FOUND', 'Proyek tidak ditemukan');
  const sameProjectDocs = documents.filter((doc) => doc.projectId === projectId);
  const nextIndex = sameProjectDocs.length + 1;
  const now = new Date().toISOString();
  const created: ProjectDocument = {
    id: `doc-${projectId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}-${nextIndex}`,
    projectId,
    stage: input.stage,
    kind: input.kind,
    documentNumber: input.documentNumber || `${project.projectCode}/${String(nextIndex).padStart(2, '0')}`,
    documentDate: input.documentDate || now.slice(0, 10),
    title: input.title,
    description: input.description || `Header metadata ${input.title} sesuai PRD v1.3.7`,
    isSensitive: input.isSensitive,
    verificationStatus: 'incomplete',
    version: 1,
    createdBy: 'Mock uploader',
    createdAt: now,
    updatedAt: now
  };
  documents.push(created);
  return ok(created, 'PROJECT_DOCUMENT_CREATED', { path: `/api/v1/projects/${projectId}/documents` });
}

export type CreateProjectWithDocumentsInput = {
  project: Partial<Project>;
  documents: Array<CreateProjectDocumentInput & { files: Array<{ filename: string; fileLabel: ProjectDocumentFileLabel; sizeBytes: number; fileOrder: number }> }>;
};

/**
 * Submit atomik: proyek + N header dokumen + M file per header, dalam satu envelope.
 * Mock branch mengkomposisikan saveProject + createProjectDocumentHeader + createProjectDocumentFiles.
 * Real branch: komposisi 3-call POST (proyek → dokumen → files). Bila backend menyediakan
 * satu endpoint atomic (?include=documents,files) di masa depan, real branch akan pindah ke single call.
 */
export async function createProjectWithDocuments(payload: CreateProjectWithDocumentsInput) {
  if (apiMode === 'real') {
    return realFetch('/projects?include=documents,files', { method: 'POST', body: JSON.stringify(payload) });
  }

  // 1) Buat proyek lebih dulu.
  const projectResponse = await saveProject(payload.project);
  if (!projectResponse.success) return projectResponse;
  const project = projectResponse.data;

  const createdDocuments: ProjectDocument[] = [];
  const createdFiles: ProjectDocumentFile[] = [];

  for (const docInput of payload.documents) {
    const { files, ...headerInput } = docInput;
    const headerResponse = await createProjectDocumentHeader(project.id, headerInput);
    if (!headerResponse.success) return headerResponse;
    const document = headerResponse.data;
    createdDocuments.push(document);
    if (files.length > 0) {
      const filesResponse = await createProjectDocumentFiles(project.id, document.id, files);
      if (!filesResponse.success) return filesResponse;
      createdFiles.push(...filesResponse.data);
    }
  }

  return ok(
    { project, documents: createdDocuments, files: createdFiles },
    'PROJECT_WITH_DOCUMENTS_CREATED',
    { path: '/api/v1/projects?include=documents,files', totalDocuments: createdDocuments.length, totalFiles: createdFiles.length }
  );
}
