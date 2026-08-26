import { describe, expect, it } from 'vitest';
import type { ProjectFeatureProperties } from '$shared/geojson';
import {
  EMPTY_PROJECT_SEARCH,
  isProjectSearchActive,
  matchesProjectSearch,
  type ProjectSearch
} from './project-search';

// Fixture mirror mock projects.ts (geojson properties + skProyek/startDate).
const p001: ProjectFeatureProperties = {
  id: 'prj-001',
  projectCode: 'GIS-2026-001',
  projectName: 'Pemetaan Aset Jalan dan Saluran Koridor Utara',
  status: 'in_progress',
  fiscalYear: 2026,
  jenisInfrastruktur: 'jalan',
  opdName: 'DPU',
  skProyek: 'SK.050/118/438.5.2/2026',
  startDate: '2026-02-01'
};
const p002: ProjectFeatureProperties = {
  id: 'prj-002',
  projectCode: 'GIS-2026-002',
  projectName: 'Inventarisasi Lahan Pemerintah Wilayah Selatan',
  status: 'procurement',
  fiscalYear: 2026,
  jenisInfrastruktur: 'lapangan',
  opdName: 'DPU',
  skProyek: 'SK.050/142/438.5.2/2026',
  startDate: '2026-03-15'
};
const p003: ProjectFeatureProperties = {
  id: 'prj-003',
  projectCode: 'GIS-2025-014',
  projectName: 'Migrasi Data Aset Pendidikan ke SIMANTA',
  status: 'completed',
  fiscalYear: 2025,
  jenisInfrastruktur: 'bangunan',
  opdName: 'DPU',
  skProyek: 'SK.420/215/438.5.1/2025',
  startDate: '2025-08-01'
};
const p004: ProjectFeatureProperties = {
  id: 'prj-004',
  projectCode: 'GIS-2026-003',
  projectName: 'Normalisasi Sungai Porong dan Perkuatan Tanggul',
  status: 'in_progress',
  fiscalYear: 2026,
  jenisInfrastruktur: 'sungai',
  opdName: 'DPU',
  skProyek: 'SK.050/201/438.5.2/2026',
  startDate: '2026-04-10'
};
const p005: ProjectFeatureProperties = {
  id: 'prj-005',
  projectCode: 'GIS-2026-004',
  projectName: 'Pembangunan Saluran Drainase Utama Waru',
  status: 'planning',
  fiscalYear: 2026,
  jenisInfrastruktur: 'drainase',
  opdName: 'DPU',
  skProyek: 'SK.050/305/438.5.2/2026',
  startDate: '2026-05-02'
};
const p006: ProjectFeatureProperties = {
  id: 'prj-006',
  projectCode: 'GIS-2026-005',
  projectName: 'Penataan Ruang Terbuka Hijau & Taman Alun-Alun Sidoarjo',
  status: 'completed',
  fiscalYear: 2026,
  jenisInfrastruktur: 'taman',
  opdName: 'DPU',
  skProyek: 'SK.050/088/438.5.2/2026',
  startDate: '2026-01-10'
};
const p007: ProjectFeatureProperties = {
  id: 'prj-007',
  projectCode: 'GIS-2025-009',
  projectName: 'Rehabilitasi Jaringan Saluran Irigasi Krian',
  status: 'cancelled',
  fiscalYear: 2025,
  jenisInfrastruktur: 'saluran',
  opdName: 'DPU',
  skProyek: 'SK.050/512/438.5.2/2025',
  startDate: '2025-09-01'
};

const search = (over: Partial<ProjectSearch> = {}): ProjectSearch => ({
  ...EMPTY_PROJECT_SEARCH,
  ...over
});

describe('matchesProjectSearch — filter Proyek (kode/nama)', () => {
  it('matches projectCode substring', () => {
    const s = search({ proyek: 'GIS-2026' });
    expect(matchesProjectSearch(p001, s)).toBe(true);
    expect(matchesProjectSearch(p003, s)).toBe(false);
  });

  it('matches projectName substring case-insensitively', () => {
    const s = search({ proyek: 'pemetaan' });
    expect(matchesProjectSearch(p001, s)).toBe(true);
    expect(matchesProjectSearch(p002, s)).toBe(false);
  });
});

describe('matchesProjectSearch — filter SK Proyek', () => {
  it('matches skProyek substring case-insensitively', () => {
    const s = search({ skProyek: 'sk.050/118' });
    expect(matchesProjectSearch(p001, s)).toBe(true);
    expect(matchesProjectSearch(p002, s)).toBe(false);
    expect(matchesProjectSearch(p003, s)).toBe(false);
  });

  it('matches different SK numbers per project', () => {
    const s = search({ skProyek: 'SK.420/215' });
    expect(matchesProjectSearch(p003, s)).toBe(true);
    expect(matchesProjectSearch(p001, s)).toBe(false);
  });
});

describe('matchesProjectSearch — filter Tahun', () => {
  it('matches fiscalYear exactly', () => {
    const s = search({ fiscalYear: '2025' });
    expect(matchesProjectSearch(p003, s)).toBe(true);
    expect(matchesProjectSearch(p001, s)).toBe(false);
  });

  it('does not match partial year text', () => {
    const s = search({ fiscalYear: '202' });
    expect(matchesProjectSearch(p001, s)).toBe(false);
    expect(matchesProjectSearch(p003, s)).toBe(false);
  });
});

describe('matchesProjectSearch — filter Bulan (bulan mulai dari startDate)', () => {
  it('matches start month "01" → prj-006 (Taman)', () => {
    const s = search({ bulan: '01' });
    expect(matchesProjectSearch(p006, s)).toBe(true);
    expect(matchesProjectSearch(p001, s)).toBe(false);
  });

  it('matches start month "02" → prj-001', () => {
    const s = search({ bulan: '02' });
    expect(matchesProjectSearch(p001, s)).toBe(true);
    expect(matchesProjectSearch(p002, s)).toBe(false);
    expect(matchesProjectSearch(p003, s)).toBe(false);
  });

  it('matches start month "04" → prj-004 (Sungai)', () => {
    const s = search({ bulan: '04' });
    expect(matchesProjectSearch(p004, s)).toBe(true);
    expect(matchesProjectSearch(p001, s)).toBe(false);
  });

  it('matches start month "08" → prj-003', () => {
    const s = search({ bulan: '08' });
    expect(matchesProjectSearch(p003, s)).toBe(true);
    expect(matchesProjectSearch(p001, s)).toBe(false);
  });

  it('returns false for month with no start dates', () => {
    const s = search({ bulan: '12' });
    expect(matchesProjectSearch(p001, s)).toBe(false);
    expect(matchesProjectSearch(p002, s)).toBe(false);
    expect(matchesProjectSearch(p003, s)).toBe(false);
  });
});

describe('matchesProjectSearch — kombinasi AND', () => {
  it('bulan + tahun gabungan', () => {
    const s = search({ bulan: '03', fiscalYear: '2026' });
    expect(matchesProjectSearch(p002, s)).toBe(true);
    expect(matchesProjectSearch(p001, s)).toBe(false);
  });

  it('proyek + bulan tidak cocok → false', () => {
    const s = search({ proyek: 'pemetaan', bulan: '08' });
    expect(matchesProjectSearch(p001, s)).toBe(false);
  });

  it('search kosong → semua cocok', () => {
    expect(matchesProjectSearch(p001, EMPTY_PROJECT_SEARCH)).toBe(true);
    expect(matchesProjectSearch(p002, EMPTY_PROJECT_SEARCH)).toBe(true);
    expect(matchesProjectSearch(p003, EMPTY_PROJECT_SEARCH)).toBe(true);
  });
});

describe('isProjectSearchActive', () => {
  it('false when all criteria empty', () => {
    expect(isProjectSearchActive(EMPTY_PROJECT_SEARCH)).toBe(false);
  });

  it('true when any criterion set', () => {
    expect(isProjectSearchActive(search({ proyek: '  GIS  ' }))).toBe(true);
    expect(isProjectSearchActive(search({ bulan: '08' }))).toBe(true);
    expect(isProjectSearchActive(search({ fiscalYear: '2026' }))).toBe(true);
  });

  it('whitespace-only values count as inactive', () => {
    expect(isProjectSearchActive(search({ skProyek: '   ' }))).toBe(false);
  });
});
