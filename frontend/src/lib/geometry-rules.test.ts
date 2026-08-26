import { describe, expect, it } from 'vitest';
import { GEOMETRY_RULES, expectedGeometryTypes, validateGeometryAgainstJenis } from './geometry-rules';
import type { Geometry } from '$shared/geojson';

describe('geometry-rules: PRD v1.3.7 §6.7', () => {
  it('tanah/bangunan/lapangan/makam/taman expects Polygon/MultiPolygon', () => {
    for (const j of ['tanah', 'bangunan', 'lapangan', 'makam', 'taman'] as const) {
      expect(expectedGeometryTypes(j)).toEqual(['Polygon', 'MultiPolygon']);
    }
  });

  it('jalan/saluran expects LineString/MultiLineString', () => {
    for (const j of ['jalan', 'saluran'] as const) {
      expect(expectedGeometryTypes(j)).toEqual(['LineString', 'MultiLineString']);
    }
  });

  it('lainnya expects Point only', () => {
    expect(expectedGeometryTypes('lainnya')).toEqual(['Point']);
  });

  it('GEOMETRY_RULES covers every JenisAset', () => {
    // Keep this rule in sync with shared/src/enums.ts
    const expected = ['tanah', 'bangunan', 'jalan', 'saluran', 'lapangan', 'makam', 'taman', 'lainnya'];
    expect(Object.keys(GEOMETRY_RULES).sort()).toEqual([...expected].sort());
  });

  describe('validateGeometryAgainstJenis', () => {
    it('returns valid:true for matching Polygon tanah', () => {
      const polygon: Geometry = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
      expect(validateGeometryAgainstJenis(polygon, 'tanah')).toEqual({ valid: true });
    });

    it('returns valid:true for matching LineString jalan', () => {
      const line: Geometry = { type: 'LineString', coordinates: [[0, 0], [1, 1]] };
      expect(validateGeometryAgainstJenis(line, 'jalan')).toEqual({ valid: true });
    });

    it('returns valid:true for matching Point lainnya', () => {
      const point: Geometry = { type: 'Point', coordinates: [0, 0] };
      expect(validateGeometryAgainstJenis(point, 'lainnya')).toEqual({ valid: true });
    });

    it('rejects mismatch: Polygon to lainnya (expected Point)', () => {
      const polygon: Geometry = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
      const result = validateGeometryAgainstJenis(polygon, 'lainnya');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.expected).toEqual(['Point']);
        expect(result.got).toBe('Polygon');
        expect(result.reason).toMatch(/Polygon/);
      }
    });

    it('rejects mismatch: Point to tanah (expected Polygon)', () => {
      const point: Geometry = { type: 'Point', coordinates: [0, 0] };
      const result = validateGeometryAgainstJenis(point, 'tanah');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.expected).toEqual(['Polygon', 'MultiPolygon']);
        expect(result.got).toBe('Point');
      }
    });

    it('rejects mismatch: LineString to bangunan (expected Polygon)', () => {
      const line: Geometry = { type: 'LineString', coordinates: [[0, 0], [1, 1]] };
      const result = validateGeometryAgainstJenis(line, 'bangunan');
      expect(result.valid).toBe(false);
    });

    it('treats empty geometry as valid (UI-side required, not API edge)', () => {
      expect(validateGeometryAgainstJenis(null, 'tanah')).toEqual({ valid: true });
      expect(validateGeometryAgainstJenis(undefined, 'tanah')).toEqual({ valid: true });
    });

    it('fails closed for unknown jenis (schema drift guard)', () => {
      const polygon: Geometry = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
      // Cast to any to simulate runtime drift (e.g. legacy fixture with stale enum)
      const result = validateGeometryAgainstJenis(polygon, 'jenis_lama' as any);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.unknownJenis).toBe(true);
        expect(result.reason).toMatch(/tidak dikenali/);
      }
    });
  });
});
