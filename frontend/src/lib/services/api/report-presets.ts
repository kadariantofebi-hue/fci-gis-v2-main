import { err, ok, type ApiResponse } from '$shared/envelope';
import { apiMode, realFetch } from './client';
import type { ReportPreset, ReportPresetCreateInput, ReportPresetUpdateInput } from '$shared/schemas/report';
import { browser } from '$app/environment';
import { ACTIVE_OPD } from '$lib/mocks/opd';

const STORAGE_KEY = 'simanta.mock.report-presets.v1';

function loadFromStorage(): ReportPreset[] {
  if (!browser) return seedPresets();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedPresets();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as ReportPreset[];
  } catch {
    return seedPresets();
  }
}

function saveToStorage(presets: ReportPreset[]): void {
  if (!browser) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function seedPresets(): ReportPreset[] {
  const now = '2026-06-12T00:00:00Z';
  return [
    {
      id: 'preset-1',
      ownerId: 'u-admin',
      name: 'Aset Tanah Belum Dipetakan',
      filters: { jenis: 'tanah', hasGeom: 'no' },
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'preset-2',
      ownerId: 'u-admin',
      name: 'Saluran + Jalan Koridor',
      filters: { jenis: 'saluran', hasSp2d: 'yes' },
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'preset-3',
      ownerId: 'u-admin',
      name: 'Aset per Jenis',
      filters: {},
      createdAt: now,
      updatedAt: now
    }
  ];
}

function nextId(): string {
  return `preset-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function listReportPresets(_ownerId?: string): Promise<ApiResponse<ReportPreset[]>> {
  await new Promise((r) => setTimeout(r, 60));
  if (apiMode === 'real') return realFetch('/reports/presets');
  return ok(loadFromStorage(), 'Daftar report preset', { path: '/api/v1/reports/presets', scope: `own_opd (${ACTIVE_OPD.shortName})` });
}

export async function createReportPreset(
  input: ReportPresetCreateInput,
  ownerId: string
): Promise<ApiResponse<ReportPreset>> {
  await new Promise((r) => setTimeout(r, 80));
  if (apiMode === 'real') {
    return realFetch('/reports/presets', { method: 'POST', body: JSON.stringify(input) });
  }
  if (!input.name || input.name.trim().length === 0) {
    return err('VALIDATION_FAILED', 'Nama preset wajib diisi.', { name: ['Nama preset wajib diisi.'] });
  }
  const list = loadFromStorage();
  if (list.some((p) => p.name === input.name && p.ownerId === ownerId)) {
    return err('CONFLICT_VERSION', `Preset dengan nama "${input.name}" sudah ada.`, { name: [`Preset dengan nama "${input.name}" sudah ada.`] });
  }
  const now = new Date().toISOString();
  const preset: ReportPreset = {
    id: nextId(),
    ownerId,
    name: input.name.trim(),
    filters: input.filters,
    createdAt: now,
    updatedAt: now
  };
  list.push(preset);
  saveToStorage(list);
  return ok(preset, 'Preset disimpan');
}

export async function updateReportPreset(
  id: string,
  input: ReportPresetUpdateInput,
  ownerId: string
): Promise<ApiResponse<ReportPreset>> {
  await new Promise((r) => setTimeout(r, 80));
  if (apiMode === 'real') {
    return realFetch(`/reports/presets/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }
  const list = loadFromStorage();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return err('NOT_FOUND', `Preset ${id} tidak ditemukan.`);
  const current = list[idx];
  if (current.ownerId !== ownerId) {
    return err('FORBIDDEN', `Preset ini dimiliki oleh user lain dan tidak dapat diubah.`);
  }
  if (input.name !== undefined && input.name.trim().length === 0) {
    return err('VALIDATION_FAILED', 'Nama preset tidak boleh kosong.', { name: ['Nama preset tidak boleh kosong.'] });
  }
  const updated: ReportPreset = {
    ...current,
    name: input.name?.trim() ?? current.name,
    filters: input.filters ?? current.filters,
    updatedAt: new Date().toISOString()
  };
  list[idx] = updated;
  saveToStorage(list);
  return ok(updated, 'Preset diperbarui');
}

export async function deleteReportPreset(id: string, ownerId: string): Promise<ApiResponse<{ id: string }>> {
  await new Promise((r) => setTimeout(r, 60));
  if (apiMode === 'real') {
    return realFetch(`/reports/presets/${id}`, { method: 'DELETE' });
  }
  const list = loadFromStorage();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return err('NOT_FOUND', `Preset ${id} tidak ditemukan.`);
  const current = list[idx];
  if (current.ownerId !== ownerId) {
    return err('FORBIDDEN', `Preset ini dimiliki oleh user lain dan tidak dapat dihapus.`);
  }
  list.splice(idx, 1);
  saveToStorage(list);
  return ok({ id }, 'Preset dihapus');
}
