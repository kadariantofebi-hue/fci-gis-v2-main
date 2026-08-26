import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  const memStore = new Map<string, string>();
  const localStoragePolyfill = {
    getItem: (k: string) => memStore.get(k) ?? null,
    setItem: (k: string, v: string) => memStore.set(k, v),
    removeItem: (k: string) => memStore.delete(k),
    clear: () => memStore.clear(),
    key: (i: number) => Array.from(memStore.keys())[i] ?? null,
    get length() {
      return memStore.size;
    }
  };
  (globalThis as unknown as { localStorage: Storage }).localStorage = localStoragePolyfill as unknown as Storage;
});
vi.mock('$app/environment', () => ({ browser: true }));
import { get } from 'svelte/store';
import { preferences } from './preferences';
import { DEFAULT_BASEMAP } from '../components/map/basemaps';

describe('preferences store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults defaultBasemap to DEFAULT_BASEMAP (google_satellite)', () => {
    const p = get(preferences);
    expect(p.defaultBasemap).toBe(DEFAULT_BASEMAP);
    expect(p.defaultBasemap).toBe('google_satellite');
  });

  it('persists preferences with _lastDefault in localStorage', () => {
    preferences.update((prev) => ({ ...prev, theme: 'dark' }));
    const raw = localStorage.getItem('simanta.preferences');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed._lastDefault).toBe('google_satellite');
    expect(parsed.theme).toBe('dark');
  });
});
