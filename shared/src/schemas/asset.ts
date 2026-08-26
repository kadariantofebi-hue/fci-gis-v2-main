import type { Geometry } from '../geojson'; import type { JenisAset, StatusHak } from '../enums';
export type AssetAttachmentKind = 'sertifikat' | 'foto' | 'sp2d' | 'berita_acara' | 'sk_transfer' | 'dokumen_legal' | 'dokumen_pendukung' | 'lainnya';
export type AssetAttachmentScanStatus = 'pending' | 'clean' | 'blocked';
export type AssetAttachment = {
  id: string;
  kind: AssetAttachmentKind;
  filename: string;
  objectKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  description?: string;
  metadata?: Record<string, unknown>;
  scanStatus?: AssetAttachmentScanStatus;
  scanResult?: Record<string, unknown>;
  scannedAt?: string;
  checksumSha256?: string;
  quarantineObjectKey?: string;
  isSensitive?: boolean;
  isVersioned?: boolean;
  isActive?: boolean; // PRD §6.9.1 is_active
  uploadedBy?: string; // PRD §6.9.1 attribution
  uploadedAt: string;
  deletedAt?: string;
  deletedBy?: string;
};
export type Asset = { id: string; idPemda: string; name: string; jenis: JenisAset; ownerOpdId: string; ownerOpdName: string; version: number; geom: Geometry | null; centroid: [number, number] | null; luasSertifikat?: number; luasSpasial?: number; panjangSpasial?: number; harga?: number; hak: StatusHak; tahunPengadaan: number; alamat: string; sp2dNumber?: string; sp2dDate?: string; attachments: AssetAttachment[]; createdBy: string; updatedAt: string };
export type AssetFilters = { q?: string; jenis?: JenisAset | ''; ownerOpdId?: string; hasGeom?: 'all' | 'yes' | 'no'; hak?: StatusHak | '' };
export type AssetHistoryItem = { id: string; action: 'CREATE' | 'UPDATE' | 'GEOMETRY_UPDATE' | 'RESPONSIBILITY_UPDATE' | 'ARCHIVE' | 'RESTORE'; actor: string; at: string; summary: string };
