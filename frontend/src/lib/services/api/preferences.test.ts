import { describe, expect, it } from 'vitest';
import type { Preferences } from '$lib/stores/preferences';
import { getPreferences, savePreferences } from './preferences';

const prefs: Preferences = {
  theme: 'light',
  defaultBasemap: 'osm_standard',
  visibleLayers: ['tanah', 'bangunan', 'jalan']
};

describe('preferences API contract', () => {
  it('uses /api/v1/prefs in mock metadata for save and read', async () => {
    const saved = await savePreferences(prefs);
    expect(saved.success).toBe(true);
    if (saved.success) {
      expect(saved.meta?.path).toBe('/api/v1/prefs');
      expect(saved.data.visibleLayers).toEqual(['tanah', 'bangunan', 'jalan']);
    }

    const loaded = await getPreferences();
    expect(loaded.success).toBe(true);
    if (loaded.success) {
      expect(loaded.meta?.path).toBe('/api/v1/prefs');
      expect(loaded.data?.defaultBasemap).toBe('osm_standard');
    }
  });
});
