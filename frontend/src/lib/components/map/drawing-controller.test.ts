import { describe, it, expect } from 'vitest';
import type { Point, LineString, Polygon } from '$shared/geojson';
import {
  addVertex,
  tryClosePolygon,
  tryCompleteLine,
  commit,
  reset,
  type VertexState,
} from './drawing-controller';

const init = (mode: VertexState['mode']): VertexState => ({
  mode,
  vertices: [],
  isComplete: false,
});

describe('addVertex', () => {
  it('appends a vertex for polygon mode without marking complete', () => {
    const s0 = init('polygon');
    const s1 = addVertex(s0, [106.1, -6.2]);
    expect(s1.vertices).toEqual([[106.1, -6.2]]);
    expect(s1.isComplete).toBe(false);
  });

  it('commits a point on the first click (single-click activate)', () => {
    const s0 = init('point');
    const s1 = addVertex(s0, [106.1, -6.2]);
    expect(s1.vertices).toEqual([[106.1, -6.2]]);
    expect(s1.isComplete).toBe(true);
  });

  it('repositions the point instead of accumulating in point mode', () => {
    const s0 = init('point');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const s2 = addVertex(s1, [106.3, -6.4]);
    expect(s2.vertices).toEqual([[106.3, -6.4]]);
    expect(s2.isComplete).toBe(true);
  });

  it('does not mark line mode complete until commit (dblclick)', () => {
    const s0 = init('line');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const s2 = addVertex(s1, [106.2, -6.3]);
    expect(s2.isComplete).toBe(false);
  });
});

describe('tryClosePolygon', () => {
  it('closes when click is within tolerance of first vertex (polygon mode)', () => {
    const s0 = init('polygon');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const s2 = addVertex(s1, [106.2, -6.2]);
    const s3 = addVertex(s2, [106.2, -6.3]);
    // firstVertexPx and clickPx are the same screen position
    const result = tryClosePolygon(s3, [106.1, -6.2], 15, [100, 100], [100, 100]);
    expect(result.closed).toBe(true);
    expect(result.state.isComplete).toBe(true);
  });

  it('does not close when click is outside tolerance', () => {
    const s0 = init('polygon');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const s2 = addVertex(s1, [106.2, -6.2]);
    // firstVertexPx at [100,100], clickPx at [200,200] — far away
    const result = tryClosePolygon(s2, [106.15, -6.25], 15, [100, 100], [200, 200]);
    expect(result.closed).toBe(false);
    expect(result.state.isComplete).toBe(false);
  });

  it('returns closed=false in line mode regardless of distance', () => {
    const s0 = init('line');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const result = tryClosePolygon(s1, [106.1, -6.2], 9999, [0, 0], [0, 0]);
    expect(result.closed).toBe(false);
  });
});

describe('tryCompleteLine', () => {
  it('completes when click is within tolerance of the last vertex (line mode, >= 2 vertices)', () => {
    let s = init('line');
    s = addVertex(s, [106.1, -6.2]);
    s = addVertex(s, [106.2, -6.3]);
    const last = s.vertices[s.vertices.length - 1];
    // lastVertexPx and clickPx are the same screen position → within tolerance
    const result = tryCompleteLine(s, last, 15, [100, 100], [100, 100]);
    expect(result.closed).toBe(true);
    expect(result.state.isComplete).toBe(true);
  });

  it('does not complete when click is outside tolerance (a new vertex is added instead)', () => {
    let s = init('line');
    s = addVertex(s, [106.1, -6.2]);
    s = addVertex(s, [106.2, -6.3]);
    // lastVertexPx at [100,100], clickPx at [200,200] — far away
    const result = tryCompleteLine(s, [106.3, -6.4], 15, [100, 100], [200, 200]);
    expect(result.closed).toBe(false);
    expect(result.state.isComplete).toBe(false);
  });

  it('does not complete a 1-vertex line', () => {
    const s0 = init('line');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const result = tryCompleteLine(s1, [106.1, -6.2], 9999, [0, 0], [0, 0]);
    expect(result.closed).toBe(false);
  });

  it('returns closed=false in polygon mode regardless of distance', () => {
    const s0 = init('polygon');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const result = tryCompleteLine(s1, [106.1, -6.2], 9999, [0, 0], [0, 0]);
    expect(result.closed).toBe(false);
  });
});

describe('commit', () => {
  it('returns null when polygon has fewer than 3 vertices', () => {
    const s0 = init('polygon');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const s2 = addVertex(s1, [106.2, -6.2]);
    expect(commit(s2)).toBeNull();
  });

  it('returns Point geometry for point mode with 1 vertex', () => {
    const s0 = init('point');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const g = commit(s1) as Point;
    expect(g.type).toBe('Point');
    expect(g.coordinates).toEqual([106.1, -6.2]);
  });

  it('returns LineString geometry for line mode with >= 2 vertices', () => {
    const s0 = init('line');
    const s1 = addVertex(s0, [106.1, -6.2]);
    const s2 = addVertex(s1, [106.2, -6.3]);
    const g = commit(s2) as LineString;
    expect(g.type).toBe('LineString');
    expect(g.coordinates).toEqual([[106.1, -6.2], [106.2, -6.3]]);
  });

  it('returns closed Polygon ring when polygon is complete', () => {
    let s = init('polygon');
    s = addVertex(s, [106.1, -6.2]);
    s = addVertex(s, [106.2, -6.2]);
    s = addVertex(s, [106.2, -6.3]);
    s = { ...s, isComplete: true };
    const g = commit(s) as Polygon;
    expect(g.type).toBe('Polygon');
    // ring must be closed: first === last
    expect(g.coordinates[0][0]).toEqual(g.coordinates[0][g.coordinates[0].length - 1]);
    expect(g.coordinates[0].length).toBe(4); // 3 unique + closing
  });

  it('returns null for line mode with only 1 vertex', () => {
    const s0 = init('line');
    const s1 = addVertex(s0, [106.1, -6.2]);
    expect(commit(s1)).toBeNull();
  });
});

describe('reset', () => {
  it('returns a fresh state with the given mode', () => {
    const s = reset('polygon');
    expect(s.mode).toBe('polygon');
    expect(s.vertices).toEqual([]);
    expect(s.isComplete).toBe(false);
  });

  it('defaults to polygon mode when no arg is given', () => {
    const s = reset();
    expect(s.mode).toBe('polygon');
  });
});
