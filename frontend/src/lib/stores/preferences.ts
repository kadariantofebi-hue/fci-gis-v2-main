import { browser } from '$app/environment'; import { writable } from 'svelte/store'; import type { JenisAset } from '$shared/enums';
import { basemaps, DEFAULT_BASEMAP, type BasemapKey } from '../components/map/basemaps';
export type Preferences = { theme:'light'|'dark'|'system'; defaultBasemap: BasemapKey; visibleLayers: JenisAset[] };
// Default basemap is sourced from the build-time `PUBLIC_DEFAULT_BASEMAP` env
// (resolved via `DEFAULT_BASEMAP` in basemaps.ts, with auto-fallback when the
// configured default requires an empty token). This lets a fresh `npm run dev`
// pick up the env-configured basemap without first clearing localStorage.
const KEY='simanta.preferences'; const defaults: Preferences={theme:'light',defaultBasemap:DEFAULT_BASEMAP,visibleLayers:['tanah','bangunan','jalan','saluran','lapangan','makam','taman','lainnya']};
/**
 * Validates that a localStorage value for `defaultBasemap` is still a known
 * provider key. When the registry shrinks (e.g. `maptiler_satellite` was
 * removed in plan 2026-06-28-vector-native-basemap), users with a stale
 * localStorage value would otherwise have no basemap render. This is the
 * equivalent of the runtime fallback in `basemaps.ts#DEFAULT_BASEMAP`, but
 * for stored user preferences.
 */
function resolveStoredBasemap(stored: unknown): BasemapKey {
  if (typeof stored === 'string' && stored in basemaps) {
    return stored as BasemapKey;
  }
  return DEFAULT_BASEMAP;
}
function initial(): Preferences {
  if (!browser) return defaults;
  const raw = localStorage.getItem(KEY);
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<Preferences> & { _lastDefault?: string };
    const defaultBasemap = parsed._lastDefault !== DEFAULT_BASEMAP
      ? DEFAULT_BASEMAP
      : resolveStoredBasemap(parsed.defaultBasemap);
    return { ...defaults, ...parsed, defaultBasemap };
  } catch {
    return defaults;
  }
}
export const preferences = writable<Preferences>(initial());
preferences.subscribe((p) => {
  if (browser) {
    localStorage.setItem(KEY, JSON.stringify({ ...p, _lastDefault: DEFAULT_BASEMAP }));
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle(
        'dark',
        p.theme === 'dark' ||
          (p.theme === 'system' &&
            typeof matchMedia !== 'undefined' &&
            matchMedia('(prefers-color-scheme: dark)').matches)
      );
    }
  }
});
