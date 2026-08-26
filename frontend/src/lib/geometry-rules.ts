import type { Geometry } from '$shared/geojson';
import type { JenisAset } from '$shared/enums';

/**
 * Geometry type rules per PRD v1.3.7 §6.7.
 * Mapping follows the asset kind to expected geometry type.
 *   - tanah, bangunan, lapangan, makam, taman → Polygon/MultiPolygon
 *   - jalan, saluran → LineString/MultiLineString
 *   - lainnya → Point only
 */
export const GEOMETRY_RULES: Record<JenisAset, ReadonlyArray<Geometry['type']>> = {
  tanah: ['Polygon', 'MultiPolygon'],
  bangunan: ['Polygon', 'MultiPolygon'],
  lapangan: ['Polygon', 'MultiPolygon'],
  makam: ['Polygon', 'MultiPolygon'],
  taman: ['Polygon', 'MultiPolygon'],
  jalan: ['LineString', 'MultiLineString'],
  saluran: ['LineString', 'MultiLineString'],
  lainnya: ['Point']
};

export function expectedGeometryTypes(jenis: JenisAset): ReadonlyArray<Geometry['type']> {
  return GEOMETRY_RULES[jenis] ?? [];
}

/**
 * Validate a parsed geometry against the asset kind.
 * Returns { valid: true } when geometry is acceptable; otherwise { valid: false, ... }
 * describing the mismatch.
 *
 * Per PRD v1.3.7 §6.7 + §6.8, geometry is the source of truth and a missing
 * (`null`/`undefined`) geometry is allowed at the API edge — that signals
 * "belum dipetakan" and is not a mismatch. The UI surface (digitizer tab)
 * is the one that nudges users to provide a geometry for polygon/line kinds.
 *
 * Unknown `jenis` is treated as a hard mismatch (fail-closed) so that a
 * stale fixture or schema drift cannot silently bypass validation.
 */
export function validateGeometryAgainstJenis(
  geom: Geometry | null | undefined,
  jenis: JenisAset
):
  | { valid: true }
  | {
      valid: false;
      reason: string;
      expected: ReadonlyArray<Geometry['type']>;
      got: string | null;
      unknownJenis?: boolean;
    } {
  if (!geom) return { valid: true }; // PRD §6.8: "belum dipetakan" is allowed
  const expected = expectedGeometryTypes(jenis);
  if (expected.length === 0) {
    return {
      valid: false,
      reason: `Jenis "${jenis}" tidak dikenali oleh GEOMETRY_RULES. Perbarui shared enum/schema.`,
      expected,
      got: geom.type,
      unknownJenis: true
    };
  }
  if (!expected.includes(geom.type)) {
    return {
      valid: false,
      reason: `Geometry type "${geom.type}" tidak sesuai untuk jenis "${jenis}". Diharapkan salah satu dari: ${expected.join(', ')}.`,
      expected,
      got: geom.type
    };
  }
  return { valid: true };
}
