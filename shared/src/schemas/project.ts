import type { Geometry } from '../geojson';
import type { JenisInfrastruktur, ProjectDocumentFileLabel, ProjectDocumentKind, ProjectDocumentScanStatus, ProjectDocumentVerificationStatus, ProjectPaymentStatus, ProjectStage, ProjectStatus } from '../enums';

export type Project = {
  id: string;
  projectCode: string;
  projectName: string;
  fiscalYear: number;
  opdId: string;
  opdName: string;
  vendorName: string;
  contractNumber: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  version: number;
  description: string;
  documentSummary: { total: number; verified: number; sensitive: number };
  paymentSummary: { invoiceTotal: number; paidTotal: number; terms: number };
  /**
   * PRD v1.4 §8.1: jenis infrastruktur yang dicakup proyek. Dipakai untuk
   * layer toggle per jenis di Dashboard Proyek dan filtering GeoJSON.
   * Nullable untuk backward compatibility dengan mock data lama.
   */
  jenisInfrastruktur?: JenisInfrastruktur;
  /**
   * PRD v1.4 §8.1: geometry intrinsic proyek. LineString untuk jalan/sungai/
   * drainase/saluran, Polygon untuk lapangan/taman/fasilitas area, Point
   * untuk proyek titik (gapura, monumen, pos). Nullable untuk proyek yang
   * belum dipetakan (akan di-render dengan status warna saja + popup warning).
   */
  geometry?: Geometry | null;
  /**
   * Kolom Daerah di /projects (2026-06-21 revisi). Opsional untuk backward
   * compatibility — mock data baru ter-isi 'Sidoarjo' & nama ruas, proyek
   * lama tanpa field akan render '—' di tabel.
   */
  district?: string;
  roadName?: string;
  /**
   * Alamat granular di /projects/create (2026-06-27 revisi). Semua opsional
   * untuk backward compatibility. RT/RW disimpan sebagai string (bukan number)
   * karena banyak kasus RT/RW mengandung leading zero ("03", "007").
   */
  rt?: string;
  rw?: string;
  kelurahan?: string;
  kecamatan?: string;
  /**
   * Nomor SK Proyek / Petunjuk Pelaksanaan (Juklak) administrasi proyek GIS.
   * Opsional untuk backward compatibility — proyek tanpa field akan render '—'.
   */
  skProyek?: string;
};

export type ProjectDocument = {
  id: string;
  projectId: string;
  stage: ProjectStage;
  kind: ProjectDocumentKind;
  documentNumber: string;
  documentDate: string;
  title: string;
  description?: string;
  isSensitive: boolean;
  verificationStatus: ProjectDocumentVerificationStatus;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDocumentFile = {
  id: string;
  projectId: string;
  documentId: string;
  fileLabel: ProjectDocumentFileLabel;
  fileOrder: number;
  fileVersion: number;
  filename: string;
  originalFilename?: string;
  mimeType: string;
  sizeBytes: number;
  isActive: boolean;
  scanStatus: ProjectDocumentScanStatus;
  checksumSha256: string;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
};

export type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  memberRole: 'owner' | 'manager' | 'member' | 'reviewer';
  assignedBy?: string;
  assignedAt: string;
};

export type ProjectMilestone = {
  id: string;
  projectId: string;
  name: string;
  plannedDate: string;
  actualDate?: string;
  notes?: string;
};

export type ProjectPayment = {
  id: string;
  projectId: string;
  paymentTerm: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: number;
  sp2dNumber: string;
  sp2dDate: string;
  paymentStatus: ProjectPaymentStatus;
  documentId?: string;
  metadata: Record<string, unknown>;
};

export type ProjectAssetLink = { projectId: string; assetId: string; relation: 'deliverable' | 'updated' | 'surveyed' | 'migrated' };
