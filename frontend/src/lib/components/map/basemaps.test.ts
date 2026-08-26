import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { basemaps, DEFAULT_BASEMAP, getActiveBasemaps, LABEL_OVERRIDES, applyLabelTuningToMap } from './basemaps';

// Mock $env/static/public dengan nilai dari .env. Bypass SvelteKit virtual
// module cache yang stale di vitest (plugin baca process.env saat init,
// sebelum setupFiles jalan; dev server OK karena Vite re-reads per HMR).
// .env adalah source of truth — mock inject nilai yang sama agar module
// output bisa di-verify terhadap .env.
vi.mock('$env/static/public', () => {
  try {
    const content = readFileSync(join(process.cwd(), '.env'), 'utf8');
    const env: Record<string, string> = {};
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^([\w]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    return env;
  } catch {
    return {};
  }
});

describe('basemaps configuration', () => {
  it('exposes the 9 supported basemap providers', () => {
    expect(Object.keys(basemaps).sort()).toEqual(
      [
        'esri_imagery_premium',
        'esri_satellite',
        'google_satellite',
        'google_streets',
        'google_terrain',
        'mapbox_satellite',
        'maptiler_satellite',
        'maptiler_streets',
        'osm_standard'
      ].sort()
    );
  });

  it('esri_imagery_premium caps at env-configurable maxzoom (default z19)', () => {
    // Root cause for "Map data not yet available" di zoom maksimal:
    // hardcoded maxzoom: 22 di style spec meleBIihi kapabilitas MapServer
    // publik (World_Imagery tops at z19). Default 19 matches the public
    // ArcGIS Online service. Admin override via PUBLIC_ARCGIS_MAX_ZOOM
    // untuk institutional MapServer dengan high-res coverage (z20–22).
    // Baca .env langsung karena vitest mock $env/static/public bisa stale.
    const envContent = readFileSync(join(process.cwd(), '.env'), 'utf8');
    const envVars: Record<string, string> = {};
    for (const line of envContent.split(/\r?\n/)) {
      const m = line.match(/^([\w]+)=(.*)$/);
      if (m) envVars[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    const expected = envVars.PUBLIC_ARCGIS_MAX_ZOOM
      ? parseInt(envVars.PUBLIC_ARCGIS_MAX_ZOOM, 10)
      : 19;
    expect(Number.isFinite(expected), '.env PUBLIC_ARCGIS_MAX_ZOOM must be a valid integer').toBe(true);
    expect(basemaps.esri_imagery_premium.maxzoom).toBe(expected);
  });

  it('esri_imagery_premium source spec maxzoom matches provider maxzoom', () => {
    type RasterSource = { maxzoom?: number };
    const source = basemaps.esri_imagery_premium.style.sources?.['esri-premium'] as RasterSource | undefined;
    expect(source?.maxzoom).toBe(basemaps.esri_imagery_premium.maxzoom);
  });

  it('esri_imagery_premium stacks places + roads reference labels for full visibility', () => {
    // Root cause for "tidak ada nama provinsi, kota, jalan": pure raster
    // source tidak punya label apapun. Stack DUA raster reference sources
    // di atas imagery:
    //   1. World_Boundaries_and_Places — country, province, city, district,
    //      water body names (PUBLIC_ARCGIS_REFERENCE_URL)
    //   2. World_Transportation       — highway, road, street names
    //      (PUBLIC_ARCGIS_ROADS_URL)
    // Stacked order: imagery (bottom) → places → roads (top, most specific).
    const sources = basemaps.esri_imagery_premium.style.sources ?? {};
    const imagerySource = sources['esri-premium'] as { tiles?: string[]; maxzoom?: number } | undefined;
    const placesSource = sources['esri-premium-places'] as { tiles?: string[]; maxzoom?: number } | undefined;
    const roadsSource = sources['esri-premium-roads'] as { tiles?: string[]; maxzoom?: number } | undefined;
    expect(imagerySource, 'imagery source must exist').toBeDefined();
    expect(placesSource, 'places reference source (World_Boundaries_and_Places) must be stacked').toBeDefined();
    expect(roadsSource, 'roads reference source (World_Transportation) must be stacked').toBeDefined();
    expect((placesSource?.tiles?.[0] ?? '').length, 'places tiles URL must be non-empty').toBeGreaterThan(0);
    expect((roadsSource?.tiles?.[0] ?? '').length, 'roads tiles URL must be non-empty').toBeGreaterThan(0);
    // Layer order: imagery < places < roads.
    const layers = basemaps.esri_imagery_premium.style.layers ?? [];
    const imageryIdx = layers.findIndex(l => l.id === 'esri-premium-layer');
    const placesIdx = layers.findIndex(l => l.id === 'esri-premium-places-layer');
    const roadsIdx = layers.findIndex(l => l.id === 'esri-premium-roads-layer');
    expect(imageryIdx, 'imagery layer must exist').toBeGreaterThanOrEqual(0);
    expect(placesIdx, 'places layer must exist').toBeGreaterThan(imageryIdx);
    expect(roadsIdx, 'roads layer must exist above places').toBeGreaterThan(placesIdx);
  });

  it('esri_imagery_premium is paid and gated by env', () => {
    expect(basemaps.esri_imagery_premium.isPaid).toBe(true);
    // hasToken reflects module's _ARCGIS_TOKEN && _ARCGIS_URL consts, captured
    // at module-load from .env (via readEnvFile fallback). Don't compare to
    // process.env at test time — vitest worker env differs from module-load
    // env. Both vars are set in .env, so hasToken should be true.
    expect(basemaps.esri_imagery_premium.hasToken).toBe(true);
  });

  it('esri_imagery_premium embeds token in tile URL', () => {
    type RasterSource = { tiles?: string[] };
    const tiles = basemaps.esri_imagery_premium.style.sources?.['esri-premium'] as RasterSource | undefined;
    const url = tiles?.tiles?.[0] ?? '';
    expect(url).toContain('token=');
    const tokenMatch = url.match(/token=([^&]*)/);
    expect(tokenMatch?.[1]?.length ?? 0).toBeGreaterThan(0);
    // Read expected values from .env directly (independent of the SvelteKit
    // $env/static/public virtual module, which caches stale values in vitest).
    // .env is the source of truth — module should reflect it.
    const envContent = readFileSync(join(process.cwd(), '.env'), 'utf8');
    const envVars: Record<string, string> = {};
    for (const line of envContent.split(/\r?\n/)) {
      const m = line.match(/^([\w]+)=(.*)$/);
      if (m) envVars[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    const expectedUrl = envVars.PUBLIC_ARCGIS_IMAGERY_URL;
    const expectedToken = envVars.PUBLIC_ARCGIS_TOKEN;
    expect(expectedUrl, '.env must define PUBLIC_ARCGIS_IMAGERY_URL').toBeTruthy();
    expect(expectedToken, '.env must define PUBLIC_ARCGIS_TOKEN').toBeTruthy();
    expect(url, `tile URL must contain .env URL "${expectedUrl}"`).toContain(expectedUrl);
    expect(url, `tile URL must contain token="${expectedToken}"`).toContain(`token=${expectedToken}`);
  });

  it('getActiveBasemaps hides esri_imagery_premium when no token or no url', () => {
    const active = getActiveBasemaps();
    if (basemaps.esri_imagery_premium.hasToken) {
      expect(active.some(b => b.key === 'esri_imagery_premium')).toBe(true);
    } else {
      expect(active.some(b => b.key === 'esri_imagery_premium')).toBe(false);
    }
  });

  it('DEFAULT_BASEMAP resolves to google_satellite from env', () => {
    expect(DEFAULT_BASEMAP).toBe('google_satellite');
  });

   it('maptiler_streets points to the streets-v2 vector style URL', () => {
    // Vector style: the value is a URL string, not an inline StyleSpecification.
    const style = basemaps.maptiler_streets.style as unknown as string;
    expect(typeof style).toBe('string');
    expect(style).toContain('streets-v2');
    expect(style).toContain('style.json');
    expect(style).toContain('key=');
  });

  it('maptiler_streets is a free-tier basemap with overscale to z22', () => {
    expect(basemaps.maptiler_streets.isPaid).toBe(false);
    expect(basemaps.maptiler_streets.maxzoom).toBe(22);
  });

  it('maptiler_satellite points to the MapTiler hybrid style URL (satellite + labels)', () => {
    // Hybrid style = raster satellite tile source + vector label overlay
    // (road, city, state, country). This is what makes the labels readable
    // on top of imagery; a pure raster URL would not.
    const style = basemaps.maptiler_satellite.style as unknown as string;
    expect(typeof style).toBe('string');
    expect(style).toContain('hybrid');
    expect(style).toContain('style.json');
    expect(style).toContain('key=');
  });

  it('maptiler_satellite is a free-tier basemap with overscale to z22', () => {
    // Hybrid style inherits overscale from the vector label layer stack,
    // not from the underlying raster. Match maptiler_streets.
    expect(basemaps.maptiler_satellite.isPaid).toBe(false);
    expect(basemaps.maptiler_satellite.maxzoom).toBe(22);
  });
  it('google maps basemaps are free-tier with maxzoom 20', () => {
    expect(basemaps.google_streets.isPaid).toBe(false);
    expect(basemaps.google_streets.maxzoom).toBe(20);
    expect(basemaps.google_satellite.isPaid).toBe(false);
    expect(basemaps.google_satellite.maxzoom).toBe(20);
    expect(basemaps.google_terrain.isPaid).toBe(false);
    expect(basemaps.google_terrain.maxzoom).toBe(20);
  });

  it('google maps styles use multiple subdomains', () => {
    type RasterSource = { tiles?: string[] };
    const streetTiles = (basemaps.google_streets.style.sources?.['google-streets'] as RasterSource | undefined)?.tiles;
    expect(Array.isArray(streetTiles)).toBe(true);
    expect(streetTiles?.length).toBe(4);
    expect(streetTiles?.[0]).toContain('mt0.google.com/vt/lyrs=m');
    expect(streetTiles?.[1]).toContain('mt1.google.com/vt/lyrs=m');
  });

  it('caps raster basemaps at z19 to avoid "Map data not yet available" placeholder', () => {
    // Root cause: raster sources (ESRI, OSM) top out at z19 on the upstream
    // servers. Declaring maxzoom: 22 in the style spec let MapLibre allow
    // zoom-in beyond what the provider can serve, at which point MapLibre
    // draws the "Map data not yet available" placeholder. Hybrid / vector
    // styles (MapTiler) support overscale to z22 via the vector label stack.
    expect(basemaps.osm_standard.maxzoom).toBe(19);
    expect(basemaps.esri_satellite.maxzoom).toBe(19);
    expect(basemaps.mapbox_satellite.maxzoom).toBe(19);
    expect(basemaps.maptiler_streets.maxzoom).toBe(22);
    expect(basemaps.maptiler_satellite.maxzoom).toBe(22);
  });

  it('source spec maxzoom matches provider maxzoom for raster basemaps', () => {
    // The source's maxzoom must match the provider's effective max so
    // MapLibre does not over-zoom relative to what the tiles can serve.
    type RasterSource = { type?: string; maxzoom?: number };
    for (const key of ['osm_standard', 'esri_satellite', 'mapbox_satellite'] as const) {
      const provider = basemaps[key];
      const sourceId = key === 'esri_satellite' ? 'esri' : key === 'osm_standard' ? 'osm' : 'mapbox';
      const source = provider.style.sources?.[sourceId] as RasterSource | undefined;
      expect(source?.maxzoom).toBe(provider.maxzoom);
    }
  });

  it('embeds paid API tokens in raster style URLs', () => {
    // MapLibre style spec: tiles array is on sources[sourceId].tiles
    type RasterSource = { tiles?: string[] };
    const mapboxTiles = (basemaps.mapbox_satellite.style.sources?.['mapbox'] as RasterSource | undefined)?.tiles;
    expect(Array.isArray(mapboxTiles)).toBe(true);
    expect(mapboxTiles?.[0]).toContain('access_token=');
  });

  it('filters active basemaps correctly', () => {
    const active = getActiveBasemaps();
    expect(active.length).toBeGreaterThanOrEqual(2);
    // osm_standard and esri_satellite should always be present as they are not paid
    expect(active.some(b => b.key === 'osm_standard')).toBe(true);
    expect(active.some(b => b.key === 'esri_satellite')).toBe(true);
  });

  it('declares label overrides for state (province) and road layers', () => {
    // Root cause for "tidak ada nama jalan, kota, provinsi": MapTiler
    // streets-v2 ships with `State labels maxzoom: 9` (province disappears
    // at z10+) and `Road labels minzoom: 8` (no street names at z<8). The
    // digitise workflow needs both visible at z8–14.
    const stateOverride = LABEL_OVERRIDES.find(([id]) => id === 'State labels');
    const roadOverride = LABEL_OVERRIDES.find(([id]) => id === 'Road labels');
    expect(stateOverride).toEqual(['State labels', 'maxzoom', 14]);
    expect(roadOverride).toEqual(['Road labels', 'minzoom', 5]);
  });

  it('applyLabelTuningToMap calls setLayoutProperty for each override', () => {
    const calls: Array<[string, string, number]> = [];
    const fakeMap: { setLayoutProperty: (layer: string, prop: string, value: unknown) => void } = {
      setLayoutProperty: (layer, prop, value) => {
        calls.push([layer, prop, value as number]);
      },
    };
    applyLabelTuningToMap(fakeMap);
    expect(calls).toEqual([...LABEL_OVERRIDES]);
  });

  it('applyLabelTuningToMap swallows errors for unknown layer ids', () => {
    // Raster basemaps (ESRI, OSM) do not have a `State labels` layer.
    // setLayoutProperty throws — we must catch and continue.
    const fakeMap: { setLayoutProperty: (layer: string, prop: string, value: unknown) => void } = {
      setLayoutProperty: () => {
        throw new Error("layer 'State labels' not found");
      },
    };
    expect(() => applyLabelTuningToMap(fakeMap)).not.toThrow();
  });
});
