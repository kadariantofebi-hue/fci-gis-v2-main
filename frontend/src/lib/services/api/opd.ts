import { ok, err } from '$shared/envelope';
import { apiMode, realFetch } from './client';
import type { Opd } from '$shared/schemas/opd';
import { ACTIVE_OPD, opd } from '$lib/mocks/opd';
import { assets } from '$lib/mocks/assets';

function withAssetCount(o: Opd) { return { ...o, assetCount: assets.filter((a) => a.ownerOpdId === o.id).length }; }

export async function getCurrentOpd() {
  if (apiMode === 'real') return realFetch('/opd/current');
  return ok(withAssetCount(ACTIVE_OPD), 'Profil OPD aktif/default', { path: '/api/v1/opd/current' });
}

export async function updateCurrentOpd(payload: Partial<Opd> & { version?: number }) {
  if (apiMode === 'real') return realFetch('/opd/current', { method: 'PUT', body: JSON.stringify(payload) });
  if (payload.version && payload.version !== ACTIVE_OPD.version) return err('CONFLICT_VERSION', 'Versi profil OPD sudah berubah. Muat ulang sebelum menyimpan.', undefined, { current_version: ACTIVE_OPD.version, your_version: payload.version });
  Object.assign(ACTIVE_OPD, payload, { id: ACTIVE_OPD.id, isActive: true, isPrimary: true, version: ACTIVE_OPD.version + 1 });
  opd[0] = ACTIVE_OPD;
  return ok(withAssetCount(ACTIVE_OPD), 'OPD_CURRENT_UPDATED', { path: '/api/v1/opd/current' });
}

export async function listOpd(filters: { q?: string; includeInactive?: string } = {}) {
  if (apiMode === 'real') return realFetch(`/opd?${new URLSearchParams(filters).toString()}`);
  return ok([withAssetCount(ACTIVE_OPD)], 'Alias kompatibilitas: satu OPD aktif/default', { path: '/api/v1/opd', filters, compatibility: 'single-active-opd' });
}

export const saveOpd = updateCurrentOpd;
export async function softDeleteOpd(_id: string) { return err('VALIDATION_FAILED', 'OUT_OF_SCOPE: CRUD/hapus OPD tidak ada dalam active scope PRD v1.3.7. Gunakan Profil OPD Pengguna.'); }
