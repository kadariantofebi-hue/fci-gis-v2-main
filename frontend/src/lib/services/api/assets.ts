import type { Asset, AssetFilters } from '$shared/schemas/asset';
import type { FeatureCollection, Geometry } from '$shared/geojson';
import { err, ok, type ApiResponse } from '$shared/envelope';
import { apiMode, realFetch } from './client';
import { assets, assetHistory } from '$lib/mocks/assets';
import { validateGeometryAgainstJenis } from '$lib/geometry-rules';

function applyFilters(list: Asset[], f: AssetFilters = {}) {
  return list.filter(
    (a) =>
      (!f.q || `${a.idPemda} ${a.name} ${a.alamat}`.toLowerCase().includes(f.q.toLowerCase())) &&
      (!f.jenis || a.jenis === f.jenis) &&
      (!f.ownerOpdId || a.ownerOpdId === f.ownerOpdId) &&
      (!f.hak || a.hak === f.hak) &&
      (!f.hasGeom || f.hasGeom === 'all' || (f.hasGeom === 'yes' ? !!a.geom : !a.geom))
  );
}

export async function listAssets(filters: AssetFilters = {}): Promise<ApiResponse<{ items: Asset[]; total: number }>> {
  if (apiMode === 'real') return realFetch(`/assets?${new URLSearchParams(filters as Record<string, string>).toString()}`);
  const items = applyFilters(assets, filters);
  return ok({ items, total: items.length }, 'Daftar aset', { path: '/api/v1/assets', filters });
}

export async function getAsset(id: string): Promise<ApiResponse<Asset>> {
  if (apiMode === 'real') return realFetch(`/assets/${id}`);
  const asset = assets.find((a) => a.id === id);
  return asset ? ok(asset, 'Detail aset') : err('NOT_FOUND', 'Aset tidak ditemukan');
}

export async function assetGeoJson(): Promise<ApiResponse<FeatureCollection>> {
  if (apiMode === 'real') return realFetch('/assets/geojson');
  return ok(
    {
      type: 'FeatureCollection',
      features: assets
        .filter((a) => a.geom)
        .map((a) => ({
          type: 'Feature',
          geometry: a.geom,
          properties: { id: a.id, idPemda: a.idPemda, name: a.name, jenis: a.jenis, ownerOpdId: a.ownerOpdId, hasGeom: !!a.geom }
        }))
    },
    'GeoJSON aset'
  );
}

export async function saveAsset(payload: Partial<Asset> & { id?: string; simulateConflict?: boolean }): Promise<ApiResponse<Asset>> {
  if (apiMode === 'real') return realFetch(payload.id ? `/assets/${payload.id}` : '/assets', { method: payload.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
  if (payload.simulateConflict) {
    const currentVersion = payload.id ? assets.find((asset) => asset.id === payload.id)?.version ?? null : null;
    return err('CONFLICT_VERSION', 'Versi aset sudah berubah. Muat ulang sebelum menyimpan.', undefined, {
      current_version: currentVersion,
      your_version: payload.version ?? null
    });
  }
  // Geometry-vs-jenis contract (PRD v1.3.7 §6.7)
  if (payload.geom && payload.jenis) {
    const v = validateGeometryAgainstJenis(payload.geom as Geometry, payload.jenis);
    if (!v.valid) {
      return err('VALIDATION_FAILED', v.reason, { geometryType: [`${v.got ?? 'null'} tidak sesuai untuk ${payload.jenis}; expected ${v.expected.join('/')}`] });
    }
  }
  if (payload.id) {
    const idx = assets.findIndex((a) => a.id === payload.id);
    if (idx < 0) return err('NOT_FOUND', 'Aset tidak ditemukan');
    const updated = { ...assets[idx], ...payload, version: assets[idx].version + 1, updatedAt: new Date().toISOString() } as Asset;
    assets[idx] = updated;
    return ok(updated, 'Aset diperbarui');
  }
  const created = {
    id: `asset-${String(assets.length + 1).padStart(3, '0')}`,
    idPemda: payload.idPemda || `JTM-MOCK-${assets.length + 1}`,
    name: payload.name || 'Aset Baru',
    jenis: payload.jenis || 'tanah',
    ownerOpdId: payload.ownerOpdId || 'opd-5',
    ownerOpdName: payload.ownerOpdName || 'BPKAD',
    version: 1,
    geom: payload.geom ?? null,
    centroid: payload.centroid ?? null,
    luasSertifikat: payload.luasSertifikat,
    luasSpasial: payload.luasSpasial,
    panjangSpasial: payload.panjangSpasial,
    harga: payload.harga,
    hak: payload.hak || 'Lainnya',
    tahunPengadaan: payload.tahunPengadaan || new Date().getFullYear(),
    alamat: payload.alamat || 'Jawa Timur',
    attachments: [],
    createdBy: 'Demo',
    updatedAt: new Date().toISOString()
  } as Asset;
  assets.unshift(created);
  return ok(created, 'Aset dibuat');
}

export async function getAssetHistory(_id: string) {
  return ok(assetHistory, 'Riwayat aset');
}
