export type Opd = {
  id: string;
  kode: string;
  name: string;
  shortName: string;
  kepala?: string;
  assetCount?: number;
  isActive: boolean;
  isPrimary: boolean;
  version: number;
  /**
   * PRD v1.4 §8.1.1: default center peta Dashboard Proyek. Mengikuti profil
   * OPD aktif; mock default = Kabupaten Sidoarjo. Real backend wajib expose
   * field ini per OPD dan FE mem-pass ke MapContainer. Nullable untuk
   * backward compatibility dengan OPD profile yang belum di-setup.
   */
  defaultLatitude?: number;
  defaultLongitude?: number;
  defaultZoom?: number;
  /** Bounding box [minLng, minLat, maxLng, maxLat] untuk fitBounds opsional. */
  defaultBbox?: [number, number, number, number];
};
