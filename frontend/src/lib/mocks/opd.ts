import type { Opd } from '$shared/schemas/opd';
/**
 * PRD v1.4 §8.1.1 + feedback 2026-06-19: ACTIVE_OPD dispesifikkan ke DPUPR
 * Kabupaten Sidoarjo. Koordinat default center di kantor DPUPR Sidoarjo
 * (Jl. Sultan Agung, Sidoarjo). Zoom default 8 = view Jawa Timur + Sidoarjo
 * + sedikit Jawa Tengah, sehingga operator punya konteks regional. User bisa
 * zoom in ke 11 untuk detail Kabupaten atau zoom out ke 5 untuk Indonesia.
 * bbox melingkupi Jawa Timur + sebagian Jawa Tengah untuk fitBounds opsional.
 */
export const ACTIVE_OPD: Opd = {
  id: 'opd-1',
  kode: '1.03',
  name: 'Dinas Pekerjaan Umum dan Penataan Ruang Kabupaten Sidoarjo',
  shortName: 'DPUPR Sidoarjo',
  kepala: 'Ir. Ratna Wulandari',
  isActive: true,
  isPrimary: true,
  version: 1,
  // Kantor DPUPR Sidoarjo center
  defaultLatitude: -7.4538,
  defaultLongitude: 112.7176,
  defaultZoom: 8,
  // bbox Jawa Timur + sebagian Jawa Tengah + sedikit Madura
  defaultBbox: [110.5, -8.5, 114.5, -6.5]
};
export const opd: Opd[] = [ACTIVE_OPD];
