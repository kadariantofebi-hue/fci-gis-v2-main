import type { Geometry, Point, LineString, Polygon } from '$shared/geojson';
import type { DrawMode } from '$shared/enums';

/**
 * Pure state for an in-progress draw. Lives in MapDrawController; never escapes
 * to the map or to the store. Coordinates are [lng, lat] in WGS84.
 */
export interface VertexState {
  mode: DrawMode;
  vertices: [number, number][];
  isComplete: boolean;
}

export function reset(mode: DrawMode = 'polygon'): VertexState {
  return { mode, vertices: [], isComplete: false };
}

/**
 * Append a vertex.
 *
 * For 'point' mode: a single click places and commits the point
 * (`isComplete: true`), so the Add Project button is enabled immediately.
 * Clicking a different location repositions it (replace, never accumulate) so
 * the draft never grows into a polygon/line shadow. There is no double-click
 * confirmation in point mode.
 *
 * For 'line' and 'polygon', this only adds a vertex; completion is handled
 * elsewhere.
 */
export function addVertex(state: VertexState, lngLat: [number, number]): VertexState {
  if (state.mode === 'point') {
    return { ...state, vertices: [lngLat], isComplete: true };
  }
  const vertices = [...state.vertices, lngLat];
  return { ...state, vertices };
}

/**
 * Polygon close-detection. Caller pre-projects the first vertex and the
 * current cursor into screen pixels and passes them in so this stays pure.
 */
export function tryClosePolygon(
  state: VertexState,
  lngLat: [number, number],
  tolerancePx: number,
  firstVertexPx: [number, number],
  clickPx: [number, number]
): { closed: boolean; state: VertexState } {
  if (state.mode !== 'polygon' || state.vertices.length < 3) {
    return { closed: false, state };
  }
  const distancePx = Math.hypot(clickPx[0] - firstVertexPx[0], clickPx[1] - firstVertexPx[1]);
  const first = state.vertices[0];
  const isGeoMatch = first && Math.abs(lngLat[0] - first[0]) < 0.0005 && Math.abs(lngLat[1] - first[1]) < 0.0005;

  if (distancePx <= tolerancePx || isGeoMatch) {
    return { closed: true, state: { ...state, isComplete: true } };
  }
  return { closed: false, state };
}

/**
 * Line completing-by-click. Clicking the last placed vertex again signals the
 * line is finished, mirroring the polygon "click the first vertex to close"
 * affordance. Caller pre-projects the last vertex and the current cursor into
 * screen pixels and passes them in so this stays pure. Requires >= 2 vertices
 * before allowing completion.
 */
export function tryCompleteLine(
  state: VertexState,
  _lngLat: [number, number],
  tolerancePx: number,
  lastVertexPx: [number, number],
  clickPx: [number, number]
): { closed: boolean; state: VertexState } {
  if (state.mode !== 'line' || state.vertices.length < 2) {
    return { closed: false, state };
  }
  const last = state.vertices[state.vertices.length - 1];
  const distance = Math.hypot(clickPx[0] - lastVertexPx[0], clickPx[1] - lastVertexPx[1]);
  if (distance <= tolerancePx) {
    return { closed: true, state: { ...state, isComplete: true } };
  }
  return { closed: false, state };
}

/**
 * Convert the in-progress vertex state into a GeoJSON Geometry.
 * Returns null when the state is insufficient (e.g. line with 1 vertex,
 * polygon with < 3 vertices).
 */
export function commit(state: VertexState): Geometry | null {
  if (state.mode === 'point') {
    if (state.vertices.length < 1) return null;
    const [lng, lat] = state.vertices[0];
    return { type: 'Point', coordinates: [lng, lat] as [number, number] };
  }
  if (state.mode === 'line') {
    if (state.vertices.length < 2) return null;
    return { type: 'LineString', coordinates: state.vertices };
  }
  if (state.mode === 'polygon') {
    if (state.vertices.length < 3) return null;
    const ring = [...state.vertices, state.vertices[0]];
    return { type: 'Polygon', coordinates: [ring] };
  }
  return null;
}
