import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the svelte/environment dynamically
vi.mock('$app/environment', () => ({
  get browser() {
    return typeof window !== 'undefined';
  }
}));

import {
  saveDraftGeometry,
  consumeDraftGeometry,
  clearDraftGeometry,
  STORAGE_KEY
} from './draft-geometry';
import type { Geometry } from '$shared/geojson';

// In-memory sessionStorage stub (matches the Web Storage API surface we use)
function makeSessionStorageStub() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; }
  };
}

describe('draft-geometry', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { sessionStorage: makeSessionStorageStub() });
    vi.stubGlobal('sessionStorage', (window as any).sessionStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const polygon: Geometry = {
    type: 'Polygon',
    coordinates: [[[112.7, -7.4], [112.71, -7.4], [112.71, -7.41], [112.7, -7.4]]]
  };
  const line: Geometry = {
    type: 'LineString',
    coordinates: [[112.7, -7.4], [112.71, -7.4]]
  };
  const point: Geometry = {
    type: 'Point',
    coordinates: [112.7, -7.4]
  };

  it('round-trips a polygon through save + consume', () => {
    expect(saveDraftGeometry(polygon)).toBe(true);
    const out = consumeDraftGeometry();
    expect(out).toEqual(polygon);
  });

  it('round-trips a linestring', () => {
    expect(saveDraftGeometry(line)).toBe(true);
    expect(consumeDraftGeometry()).toEqual(line);
  });

  it('round-trips a point', () => {
    expect(saveDraftGeometry(point)).toBe(true);
    expect(consumeDraftGeometry()).toEqual(point);
  });

  it('consume returns null on second call (consumed flag)', () => {
    saveDraftGeometry(polygon);
    expect(consumeDraftGeometry()).toEqual(polygon);
    expect(consumeDraftGeometry()).toBeNull();
  });

  it('returns null when storage is empty', () => {
    expect(consumeDraftGeometry()).toBeNull();
  });

  it('returns null and clears key on corrupted JSON', () => {
    (window as any).sessionStorage.setItem(STORAGE_KEY, '{not-valid-json');
    expect(consumeDraftGeometry()).toBeNull();
    expect((window as any).sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clearDraftGeometry removes the key', () => {
    saveDraftGeometry(polygon);
    clearDraftGeometry();
    expect(consumeDraftGeometry()).toBeNull();
  });

  it('is safe when window is undefined (SSR guard)', () => {
    vi.unstubAllGlobals();
    expect(() => saveDraftGeometry(polygon)).not.toThrow();
    expect(consumeDraftGeometry()).toBeNull();
    expect(() => clearDraftGeometry()).not.toThrow();
  });

  it('returns false when sessionStorage.setItem throws (quota / private mode)', () => {
    // Override the stub to simulate quota exceeded / Safari Private mode
    // where sessionStorage.setItem throws a QuotaExceededError.
    (window as any).sessionStorage.setItem = () => {
      const err = new Error('QuotaExceededError');
      (err as any).name = 'QuotaExceededError';
      throw err;
    };
    expect(saveDraftGeometry(polygon)).toBe(false);
    // consumeDraftGeometry should still return null (no draft was written)
    expect(consumeDraftGeometry()).toBeNull();
  });

  it('uses the v1 storage key', () => {
    expect(STORAGE_KEY).toBe('simanta.draft.geometry.v1');
  });
});
