import { browser } from '$app/environment';
import type { Geometry } from '$shared/geojson';

/**
 * Dashboard → /projects/create geometry bridge (spec 2026-06-27).
 *
 * Lives in sessionStorage so the draft:
 * - vanishes when the tab closes (no stale data on next visit)
 * - is per-tab (no cross-tab leakage)
 * - is one-shot (consume flips `consumed: true` so a reload of the
 *   create page does not re-import)
 *
 * SSR-safe: all functions no-op when `window` is undefined.
 */

export const STORAGE_KEY = 'simanta.draft.geometry.v1';

type Stored = {
  geometry: Geometry;
  consumed: boolean;
  createdAt: number;
};

function readRaw(): string | null {
  if (!browser || typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeRaw(value: string): boolean {
  if (!browser || typeof window === 'undefined') return false;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

function removeRaw(): void {
  if (!browser || typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function saveDraftGeometry(g: Geometry): boolean {
  const payload: Stored = { geometry: g, consumed: false, createdAt: Date.now() };
  return writeRaw(JSON.stringify(payload));
}

/**
 * Read the draft and mark it consumed. Returns the geometry once;
 * subsequent calls return null until a new `saveDraftGeometry` is made.
 */
export function consumeDraftGeometry(): Geometry | null {
  const raw = readRaw();
  if (!raw) return null;
  let parsed: Stored;
  try {
    parsed = JSON.parse(raw) as Stored;
  } catch {
    removeRaw();
    return null;
  }
  if (parsed.consumed) return null;
  // Mark consumed so a reload of the create page doesn't re-import.
  writeRaw(JSON.stringify({ ...parsed, consumed: true }));
  return parsed.geometry;
}

export function clearDraftGeometry(): void {
  removeRaw();
}
