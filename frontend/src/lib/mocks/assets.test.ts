import { describe, expect, it } from 'vitest';
import { assetHistory, assets } from './assets';

describe('asset fixtures', () => {
  it('do not expose legacy TRANSFER lifecycle actions', () => {
    expect(assetHistory.map((item) => item.action)).not.toContain('TRANSFER');
  });

  it('uses PRD v1.3.7 asset attachment kinds instead of legacy aliases', () => {
    const attachmentKinds = assets.flatMap((asset) => asset.attachments.map((attachment) => attachment.kind));

    expect(attachmentKinds).toContain('sertifikat');
    expect(attachmentKinds).toContain('foto');
    expect(attachmentKinds).not.toContain('legal' as never);
    expect(attachmentKinds).not.toContain('photo' as never);
    expect(attachmentKinds).not.toContain('other' as never);
  });

  it('uses only the PRD-whitelisted asset lifecycle action set', () => {
    // PRD §6.9.1: lifecycle actions are CREATE, UPDATE,
    // GEOMETRY_UPDATE, RESPONSIBILITY_UPDATE, ARCHIVE, RESTORE.
    const ALLOWED = new Set([
      'CREATE',
      'UPDATE',
      'GEOMETRY_UPDATE',
      'RESPONSIBILITY_UPDATE',
      'ARCHIVE',
      'RESTORE'
    ]);
    const observed = new Set(assetHistory.map((item) => item.action));
    const extras = [...observed].filter((action) => !ALLOWED.has(action));
    expect(extras).toEqual([]);
  });

  it('every asset that has geom has a Geometry, every non-geom asset has null', () => {
    // Schema-drift guard: ensure the fixture is consistent with
    // shared/src/schemas/asset.ts (geom: Geometry | null).
    for (const asset of assets) {
      if (asset.geom) {
        expect(['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon']).toContain(asset.geom.type);
      } else {
        expect(asset.geom).toBeNull();
      }
    }
  });
});
