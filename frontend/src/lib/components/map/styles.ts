import type { JenisAset, ProjectStatusGroup } from '$shared/enums';

export const assetColors: Record<JenisAset, string> = {
  tanah: '#ef4444',
  bangunan: '#3b82f6',
  jalan: '#475569',
  saluran: '#06b6d4',
  lapangan: '#f97316',
  makam: '#8b5cf6',
  taman: '#22c55e',
  lainnya: '#eab308'
};

export const assetStrokeColors: Record<JenisAset, string> = {
  tanah: '#991b1b',
  bangunan: '#1e3a8a',
  jalan: '#475569',
  saluran: '#06b6d4',
  lapangan: '#9a3412',
  makam: '#5b21b6',
  taman: '#15803d',
  lainnya: '#854d0e'
};

export const assetPatterns: Partial<Record<JenisAset, string>> = {
  saluran: 'dashed 2-4',
  makam: 'hatch 45°',
  lainnya: 'dotted radius 6px'
};

export function colorForJenis(jenis: JenisAset) {
  return assetColors[jenis];
}

export function strokeForJenis(jenis: JenisAset) {
  return assetStrokeColors[jenis];
}

/**
 * PRD v1.4 §8.1: warna fitur proyek berdasarkan status group di Dashboard
 * Proyek. Perencanaan=blue, berjalan=amber (active), selesai=emerald,
 * dibatalkan=slate (muted).
 */
export const projectStatusColors: Record<ProjectStatusGroup, string> = {
  perencanaan: '#3b82f6',
  berjalan: '#f59e0b',
  selesai: '#10b981',
  dibatalkan: '#94a3b8'
};

export const projectStatusStrokeColors: Record<ProjectStatusGroup, string> = {
  perencanaan: '#1e3a8a',
  berjalan: '#92400e',
  selesai: '#065f46',
  dibatalkan: '#475569'
};

export function colorForProjectStatus(group: ProjectStatusGroup) {
  return projectStatusColors[group];
}

export function strokeForProjectStatus(group: ProjectStatusGroup) {
  return projectStatusStrokeColors[group];
}

