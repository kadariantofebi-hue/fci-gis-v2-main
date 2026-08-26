/**
 * Asset filter helpers — Phase 2 P0 (PRD §6.8 query-param hydration).
 *
 * The dashboard "Belum dipetakan" stat card drills into `/assets?has_geom=false`.
 * These pure helpers translate between the URL query parameter and the
 * AssetFilters.hasGeom dropdown value, so the query-param sync logic in
 * /assets is unit-testable and the same translation is used in both directions.
 *
 * Single Active OPD mode is preserved: the helpers only translate one
 * dropdown axis (geometry status), never introduce a multi-OPD filter.
 */

export type HasGeomFilter = 'all' | 'yes' | 'no';

/**
 * Translate a URL `has_geom` query value to a dropdown `HasGeomFilter`.
 *
 * @param value - the raw query string value (may be null/undefined if absent)
 * @returns the corresponding filter, or null if the value is missing/invalid
 *
 * Behavior:
 * - `?has_geom=true`  → `'yes'`
 * - `?has_geom=false` → `'no'`
 * - `?has_geom=foo`   → `null` (invalid; caller should normalize the URL)
 * - absent / null     → `null` (caller decides default behavior)
 */
export function hasGeomFromQuery(value: string | null | undefined): HasGeomFilter | null {
  if (value === 'true') return 'yes';
  if (value === 'false') return 'no';
  return null;
}

/**
 * Translate a dropdown `HasGeomFilter` to a URL `has_geom` query value.
 *
 * @param value - the dropdown value
 * @returns the query string value, or null if the filter is 'all' (no param)
 */
export function hasGeomToQuery(value: HasGeomFilter): string | null {
  if (value === 'yes') return 'true';
  if (value === 'no') return 'false';
  return null;
}
