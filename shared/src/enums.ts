export type JenisAset = 'tanah' | 'bangunan' | 'jalan' | 'saluran' | 'lapangan' | 'makam' | 'taman' | 'lainnya';
export type StatusHak = 'SHM' | 'HGB' | 'HPL' | 'HP' | 'HM' | 'Pakai' | 'Pengelolaan' | 'Lainnya';
export type RoleName = 'Super Admin' | 'Admin' | 'OPD Admin' | 'Editor' | 'Viewer' | 'Auditor';
export type PermissionScope = 'all' | 'own_opd' | 'own_created' | 'self' | 'assigned_project';
export type PermissionKey =
  | 'asset:read' | 'asset:create' | 'asset:update' | 'asset:delete'
  | 'opd:read' | 'opd:update'
  | 'report:read' | 'report:preset_manage'
  | 'project:read' | 'project:create' | 'project:update'
  | 'project:document_read' | 'project:document_write' | 'project:document_verify'
  | 'project:payment_read'
  | 'prefs:read' | 'prefs:update'
  | 'audit:read'
  | 'user:read' | 'user:update' | 'user:force_logout';
export type ProjectStatus = 'planning' | 'procurement' | 'contracted' | 'in_progress' | 'handover' | 'completed' | 'cancelled' | 'archived';
export type ProjectStage = 'planning' | 'procurement' | 'contract' | 'implementation' | 'handover' | 'payment' | 'post_project';
export type ProjectDocumentKind =
  | 'kak_tor' | 'hps' | 'rup_reference' | 'tender_document' | 'aanwijzing_ba'
  | 'vendor_proposal' | 'evaluation_ba' | 'winner_appointment' | 'contract' | 'spmk'
  | 'progress_report' | 'deliverable_list' | 'uat_document' | 'bast_final' | 'receipt'
  | 'maintenance_report' | 'change_request' | 'invoice' | 'tax_invoice' | 'sp2d_reference'
  | 'payment_proof' | 'other';
export type ProjectDocumentVerificationStatus = 'draft' | 'incomplete' | 'submitted' | 'verified' | 'rejected';
export type ProjectDocumentFileLabel = 'dokumen_utama' | 'lampiran' | 'revisi' | 'bukti_pendukung' | 'dokumentasi' | 'lainnya';
export type ProjectDocumentScanStatus = 'pending' | 'clean' | 'blocked';
export type ProjectPaymentStatus = 'draft' | 'submitted' | 'verified' | 'paid' | 'rejected' | 'cancelled';

/**
 * PRD v1.4 §8.1: infrastruktur proyek (geometry intrinsic).
 * Pemetaan wilayah (jalan, sungai, drainase, dll.) ditentukan dari proyek,
 * bukan dari entitas Aset terpisah. v1.5 akan menyatukan ini dengan
 * JenisAset yang sudah ada — lihat PRD §16 Roadmap TODO.
 */
export type JenisInfrastruktur = 'jalan' | 'sungai' | 'drainase' | 'saluran' | 'bangunan' | 'lapangan' | 'taman' | 'lainnya';

/**
 * PRD v1.4 §8.1: grouping status untuk warna fitur & layer di Dashboard Proyek.
 * Memetakan ProjectStatus internal ke 4 kategori visual.
 */
export type ProjectStatusGroup = 'perencanaan' | 'berjalan' | 'selesai' | 'dibatalkan';

/**
 * PRD v1.4 §8.1: mapping ProjectStatus internal → ProjectStatusGroup visual.
 * - perencanaan: planning / procurement / contracted
 * - berjalan: in_progress
 * - selesai: handover / completed
 * - dibatalkan: cancelled / archived
 */
export function projectStatusGroup(status: ProjectStatus): ProjectStatusGroup {
  switch (status) {
    case 'planning':
    case 'procurement':
    case 'contracted':
      return 'perencanaan';
    case 'in_progress':
      return 'berjalan';
    case 'handover':
    case 'completed':
      return 'selesai';
    case 'cancelled':
    case 'archived':
      return 'dibatalkan';
  }
}

export const PROJECT_STATUS_GROUPS: ProjectStatusGroup[] = ['perencanaan', 'berjalan', 'selesai', 'dibatalkan'];

/**
 * Drawing mode for the dashboard digitize feature (PRD v1.3.7 Go-Live Hardening,
 * 2026-06-28 hybrid map). Mirrors the supported GeoJSON geometry kinds that
 * the dashboard's bottom sheet drawer can produce.
 */
export type DrawMode = 'point' | 'line' | 'polygon';

