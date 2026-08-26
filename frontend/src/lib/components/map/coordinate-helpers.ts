import type { Geometry } from '$shared/geojson';

/**
 * Convert a geometry to a single (lat, lng) coordinate for display in the
 * project's coordinate textbox. Returns null when geometry is null/undefined
 * (PRD §6.8 "belum dipetakan" state).
 *
 * - Point → coordinates directly (lng, lat → {lat, lng})
 * - LineString → midpoint of vertices
 * - Polygon → centroid of ring (excluding the closing duplicate vertex)
 */
export function geometryToLatLng(geom: Geometry | null | undefined): { lat: number; lng: number } | null {
  if (!geom) return null;

  if (geom.type === 'Point') {
    const [lng, lat] = geom.coordinates as [number, number];
    return { lat, lng };
  }

  let coords: [number, number][] = [];
  if (geom.type === 'LineString') {
    coords = geom.coordinates as [number, number][];
  } else if (geom.type === 'Polygon') {
    // Polygon ring includes closing duplicate; drop last for centroid accuracy.
    const ring = geom.coordinates[0] ?? [];
    coords = ring.slice(0, ring.length > 1 ? ring.length - 1 : ring.length) as [number, number][];
  } else {
    // MultiPoint/MultiLineString/MultiPolygon not yet supported in create form.
    return null;
  }

  if (coords.length === 0) return null;

  // Centroid (simple average — sufficient for preview display).
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of coords) {
    sumLng += lng;
    sumLat += lat;
  }
  return { lat: sumLat / coords.length, lng: sumLng / coords.length };
}

/**
 * Build a Point geometry from lat/lng user input. Used when user types
 * coordinates manually and we need to push back to DigitizeMapPanel preview.
 * Coordinate order is [lng, lat] per GeoJSON spec / MapLibre convention.
 */
export function latLngToPoint(lat: number, lng: number): Extract<Geometry, { type: 'Point' }> {
  return { type: 'Point', coordinates: [lng, lat] };
}

/**
 * Parse a coord input string/number to a valid number, or null.
 * Whitespace-only and non-numeric strings return null (will surface as
 * validation error in the form).
 */
export function parseCoordInput(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export type FocusTarget =
  | { type: 'point'; center: [number, number]; zoom: number }
  | { type: 'bounds'; bounds: [[number, number], [number, number]] };

/**
 * Compute the camera focus target for a geometry (auto-focus).
 * - Point: center coordinate [lng, lat] and zoom 16
 * - LineString / Polygon: bounding box [[minLng, minLat], [maxLng, maxLat]]
 */
export function geometryToFocusTarget(geom: Geometry | null | undefined): FocusTarget | null {
  if (!geom) return null;

  if (geom.type === 'Point') {
    const coords = geom.coordinates as [number, number];
    return { type: 'point', center: [coords[0], coords[1]], zoom: 16 };
  }

  let coords: [number, number][] = [];
  if (geom.type === 'LineString') {
    coords = geom.coordinates as [number, number][];
  } else if (geom.type === 'Polygon') {
    coords = (geom.coordinates[0] ?? []) as [number, number][];
  } else {
    return null;
  }

  if (coords.length === 0) return null;
  if (coords.length === 1) {
    return { type: 'point', center: [coords[0][0], coords[0][1]], zoom: 16 };
  }

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  if (minLng === maxLng && minLat === maxLat) {
    return { type: 'point', center: [minLng, minLat], zoom: 16 };
  }

  return {
    type: 'bounds',
    bounds: [
      [minLng, minLat],
      [maxLng, maxLat]
    ]
  };
}
