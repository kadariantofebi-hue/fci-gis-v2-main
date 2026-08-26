import { ok } from '$shared/envelope';
import { apiMode, realFetch } from './client';
import type { ReportResult } from '$shared/schemas/report';
import { assets } from '$lib/mocks/assets';
import { ACTIVE_OPD } from '$lib/mocks/opd';
export async function queryReports(filters: Record<string, string> = {}) {
  if (apiMode === 'real') return realFetch('/reports/query', { method: 'POST', body: JSON.stringify({ ...filters, scope: 'own_opd' }) });
  const rows = assets.filter((a)=>(!filters.jenis || a.jenis===filters.jenis) && (!filters.hak || a.hak===filters.hak) && (!filters.tahun || String(a.tahunPengadaan)===filters.tahun) && (!filters.hasGeom || filters.hasGeom==='all' || (filters.hasGeom==='yes' ? !!a.geom : !a.geom)) && (!filters.hasAttachment || filters.hasAttachment==='all' || (filters.hasAttachment==='yes' ? (a.attachments?.length ?? 0)>0 : (a.attachments?.length ?? 0)===0)) && (!filters.hasSp2d || filters.hasSp2d==='all' || (filters.hasSp2d==='yes' ? !!a.sp2dNumber : !a.sp2dNumber))).map((a)=>({ assetId:a.id, idPemda:a.idPemda, name:a.name, opdName:a.ownerOpdName, jenis:a.jenis, hak:a.hak, tahun:a.tahunPengadaan, luas:a.luasSpasial, panjang:a.panjangSpasial, hasGeom:!!a.geom, hasAttachment:(a.attachments?.length ?? 0)>0, sp2dNumber:a.sp2dNumber, sp2dDate:a.sp2dDate }));
  const result: ReportResult = { rows, summary:{ totalAssets:rows.length, totalLuas:rows.reduce((s,r)=>s+(r.luas || 0),0), totalPanjang:rows.reduce((s,r)=>s+(r.panjang || 0),0), tanpaGeometri:rows.filter((r)=>!r.hasGeom).length }, groups:Object.entries(rows.reduce((m,r)=>({ ...m, [r.jenis]:(m[r.jenis] || 0)+1 }),{} as Record<string,number>)).map(([label,value])=>({label,value})), filtersApplied:filters, scopeApplied:`own_opd (${ACTIVE_OPD.shortName})` };
  return ok(result, 'Laporan aset single active OPD', { path:'/api/v1/reports/query' });
}
