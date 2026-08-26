import type { ProjectFeatureProperties } from '$shared/geojson';

/**
 * Kriteria pencarian Dashboard (panel "Filter & Layer"): SK Proyek, Proyek
 * (kode/nama), Tahun anggaran, dan Bulan mulai proyek. Semua field string
 * kosong = tidak ada batasan.
 */
export type ProjectSearch = {
  skProyek: string;
  proyek: string;
  fiscalYear: string;
  bulan: string;
};

export const EMPTY_PROJECT_SEARCH: ProjectSearch = {
  skProyek: '',
  proyek: '',
  fiscalYear: '',
  bulan: ''
};

export function isProjectSearchActive(search: ProjectSearch): boolean {
  return Boolean(
    search.skProyek.trim() ||
      search.proyek.trim() ||
      search.fiscalYear.trim() ||
      search.bulan.trim()
  );
}

/**
 * Pure matcher: apakah feature proyek lolos semua kriteria pencarian (AND).
 * - `proyek`: substring case-insensitive pada projectCode + projectName.
 * - `skProyek`: substring case-insensitive pada nomor SK Proyek/Juklak.
 * - `fiscalYear`: pencocokan eksak string tahun anggaran.
 * - `bulan`: bulan mulai proyek, diambil dari `startDate` via slice(5,7)
 *   (hindari Date parsing/TZ), format "01"–"12".
 */
export function matchesProjectSearch(
  props: ProjectFeatureProperties,
  search: ProjectSearch
): boolean {
  const proyek = search.proyek.trim().toLowerCase();
  if (
    proyek &&
    !`${props.projectCode} ${props.projectName}`.toLowerCase().includes(proyek)
  ) {
    return false;
  }
  const sk = search.skProyek.trim().toLowerCase();
  if (sk && !(props.skProyek ?? '').toLowerCase().includes(sk)) {
    return false;
  }
  if (
    search.fiscalYear.trim() &&
    String(props.fiscalYear) !== search.fiscalYear.trim()
  ) {
    return false;
  }
  if (
    search.bulan.trim() &&
    (props.startDate ?? '').slice(5, 7) !== search.bulan.trim()
  ) {
    return false;
  }
  return true;
}
