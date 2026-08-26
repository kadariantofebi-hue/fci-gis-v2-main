import type { JenisAset, StatusHak } from '../enums';
export type ReportRow = { assetId: string; idPemda: string; name: string; opdName: string; jenis: JenisAset; hak: StatusHak; tahun: number; luas?: number; panjang?: number; hasGeom: boolean };
export type ReportResult = { rows: ReportRow[]; summary: { totalAssets: number; totalLuas: number; totalPanjang: number; tanpaGeometri: number }; groups: { label: string; value: number }[]; filtersApplied: Record<string, unknown>; scopeApplied: string };

/**
 * Report preset (PRD §6.1.2 + §7.12). Stored per-user; CRUD via
 * `report:preset_manage` permission. Filters are saved as a flat
 * Record<string, string> matching the queryReports input shape.
 */
export type ReportPreset = {
  id: string;
  ownerId: string;
  name: string;
  filters: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type ReportPresetCreateInput = {
  name: string;
  filters: Record<string, string>;
};

export type ReportPresetUpdateInput = {
  name?: string;
  filters?: Record<string, string>;
};
