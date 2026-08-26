import {
  PUBLIC_DEFAULT_BASEMAP,
  PUBLIC_MAPTILER_API_KEY,
  PUBLIC_MAPBOX_ACCESS_TOKEN,
  PUBLIC_ARCGIS_TOKEN,
  PUBLIC_ARCGIS_IMAGERY_URL,
  PUBLIC_ARCGIS_REFERENCE_URL,
  PUBLIC_ARCGIS_ROADS_URL,
  PUBLIC_ARCGIS_MAX_ZOOM,
  PUBLIC_GOOGLE_MAPS_API_KEY,
} from '$env/static/public';
import type { StyleSpecification } from 'maplibre-gl';

// Rename PUBLIC_* imports to local non-PUBLIC consts. Vite/Vitest treats any
// `PUBLIC_*` identifier in client code as a global to resolve via the SvelteKit
// $env/static/public virtual module; if the module hasn't been re-synced after
// adding a new var, accessing it throws ReferenceError. By aliasing to local
// `_ARCGIS_*` names we sidestep that lookup path — the SvelteKit build still
// inlines the values at build time, and the test transform replaces the
// $env/static/public import with the literal from .env. No Node.js APIs needed
// in the browser bundle.
const _ARCGIS_TOKEN = PUBLIC_ARCGIS_TOKEN;
const _ARCGIS_URL = PUBLIC_ARCGIS_IMAGERY_URL;
const _GOOGLE_KEY = PUBLIC_GOOGLE_MAPS_API_KEY;

function googleTileUrls(lyrs: string): string[] {
  const keyParam = _GOOGLE_KEY && _GOOGLE_KEY !== 'YOUR_DEMO_KEY' ? `&key=${_GOOGLE_KEY}` : '';
  return [
    `https://mt0.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}${keyParam}`,
    `https://mt1.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}${keyParam}`,
    `https://mt2.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}${keyParam}`,
    `https://mt3.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}${keyParam}`,
  ];
}
// ArcGIS reference service URLs untuk label overlay di atas imagery.
// Default ke public services (tidak butuh token); admin override via env
// untuk institutional deployment.
//   - places: administrative boundaries, place names (province, city,
//     district, water body, country)
//   - roads:  transportation labels (highway, road, street name)
// Stacked together untuk full administrative + street name visibility.
const _ARCGIS_REFERENCE_URL = PUBLIC_ARCGIS_REFERENCE_URL ||
  'https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer';
const _ARCGIS_ROADS_URL = PUBLIC_ARCGIS_ROADS_URL ||
  'https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Transportation/MapServer';
// Max zoom yang dilayani MapServer aktual. Default 19 (matches the public
// ArcGIS World_Imagery service). Admin override higher (20–22) untuk
// institutional MapServer dengan high-res tile cache. Capping di actual
// server capability mencegah MapLibre "Map data not yet available"
// placeholder di zoom > maxzoom.
function _parseMaxZoom(raw: string | undefined): number {
  if (!raw) return 19;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 && n <= 24 ? n : 19;
}
const _ARCGIS_MAX_ZOOM = _parseMaxZoom(PUBLIC_ARCGIS_MAX_ZOOM);
// Label overlay sources di-cap ke z19 (ArcGIS reference services top out
// at z19); di atas itu labels tidak tersedia sehingga tidak render apa-apa.
const _ARCGIS_REFERENCE_MAX_ZOOM = Math.min(_ARCGIS_MAX_ZOOM, 19);

export type BasemapKey =
  | 'osm_standard'
  | 'esri_satellite'
  | 'esri_imagery_premium'
  | 'maptiler_satellite'
  | 'maptiler_streets'
  | 'mapbox_satellite'
  | 'google_streets'
  | 'google_satellite'
  | 'google_terrain';

export interface BasemapProvider {
  key: BasemapKey;
  name: string;
  /** MapLibre style spec — inline object for raster tile sources,
   *  or a style URL (string) for vector tile providers. */
  style: StyleSpecification;
  isPaid: boolean;
  hasToken: boolean;
  /**
   * Effective max zoom the basemap can serve. Used to cap `map.maxZoom`
   * so the map does not allow zoom-in beyond what the provider can render
   * — otherwise MapLibre draws the "Map data not yet available" placeholder
   * for raster sources that top out at z19 (ESRI, OSM).
   *
   * - Vector tile styles (MapTiler streets, Mapbox) support overscale to z22.
   * - Raster sources (ESRI, OSM, MapTiler satellite hybrid) cap at z19.
   */
  maxzoom: number;
}

function rasterStyle(
  sourceId: string,
  tiles: string[],
  attribution: string,
  maxzoom: number = 19,
  tileSize: number = 256,
  // Optional reference raster sources stacked on top of imagery, rendered
  // in array order (first item directly above imagery, last item on top).
  // Used by Esri Premium untuk label overlay: places (admin boundaries,
  // place names) + roads (street names). Together mereka menyediakan
  // full administrative + street name visibility on high-res imagery.
  references?: Array<{ id: string; tiles: string[]; maxzoom?: number }>
): StyleSpecification {
  const sources: Record<string, unknown> = {
    [sourceId]: {
      type: 'raster',
      tiles,
      tileSize,
      attribution,
      maxzoom
    }
  };
  const layers: Array<Record<string, unknown>> = [
    { id: `${sourceId}-layer`, type: 'raster', source: sourceId }
  ];
  if (references) {
    for (const ref of references) {
      sources[ref.id] = {
        type: 'raster',
        tiles: ref.tiles,
        tileSize,
        maxzoom: ref.maxzoom ?? maxzoom
      };
      layers.push({
        id: `${ref.id}-layer`,
        type: 'raster',
        source: ref.id
      });
    }
  }
  return {
    version: 8,
    sources: sources as StyleSpecification['sources'],
    layers: layers as StyleSpecification['layers']
  };
}

export const basemaps: Record<BasemapKey, BasemapProvider> = {
  osm_standard: {
    key: 'osm_standard',
    name: 'OSM Standard',
    style: rasterStyle(
      'osm',
      ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      '© OpenStreetMap contributors',
      19
    ),
    isPaid: false,
    hasToken: true,
    maxzoom: 19
  },
  esri_satellite: {
    key: 'esri_satellite',
    name: 'Esri Satellite',
    style: rasterStyle(
      'esri',
      ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      'Tiles © Esri',
      19
    ),
    isPaid: false,
    hasToken: true,
    maxzoom: 19
  },
  // Esri/ArcGIS World Imagery (institutional subscription) — custom MapServer
  // dengan high-res tile cache. Requires PUBLIC_ARCGIS_TOKEN dan
  // PUBLIC_ARCGIS_IMAGERY_URL. PDF/Atlas export mengikuti ToS subscription —
  // admin konfirmasi sebelum export (cek PRD §3.5 PRINT_ALLOWED_BASEMAPS).
  //
  // Pure raster source tidak punya label. Kami stack DUA raster reference
  // sources di atas imagery untuk full label coverage:
  //   1. World_Boundaries_and_Places — country, province, city, district,
  //      water body names. URL: PUBLIC_ARCGIS_REFERENCE_URL
  //   2. World_Transportation       — highway, road, street names.
  //      URL: PUBLIC_ARCGIS_ROADS_URL
  // Order: imagery (bottom) → places → roads (top, most specific).
  //
  // maxzoom env-driven (PUBLIC_ARCGIS_MAX_ZOOM, default 19) untuk match
  // actual MapServer capability. Capping prevents the MapLibre
  // "Map data not yet available" placeholder above the server's real cap.
  esri_imagery_premium: {
    key: 'esri_imagery_premium',
    name: 'Esri Imagery (Premium)',
    style: rasterStyle(
      'esri-premium',
      [`${_ARCGIS_URL || ''}/tile/{z}/{y}/{x}?token=${_ARCGIS_TOKEN || ''}`],
      'Tiles © Esri (institutional subscription)',
      _ARCGIS_MAX_ZOOM,
      256,
      [
        {
          id: 'esri-premium-places',
          tiles: [`${_ARCGIS_REFERENCE_URL}/tile/{z}/{y}/{x}?token=${_ARCGIS_TOKEN || ''}`],
          maxzoom: _ARCGIS_REFERENCE_MAX_ZOOM
        },
        {
          id: 'esri-premium-roads',
          tiles: [`${_ARCGIS_ROADS_URL}/tile/{z}/{y}/{x}?token=${_ARCGIS_TOKEN || ''}`],
          maxzoom: _ARCGIS_REFERENCE_MAX_ZOOM
        }
      ]
    ),
    isPaid: true,
    hasToken: !!_ARCGIS_TOKEN && !!_ARCGIS_URL,
    maxzoom: _ARCGIS_MAX_ZOOM
  },
  // MapTiler streets-v2 vector style — free tier. Vector tiles (pbf) plus
  // sprite/glyphs; supports overscale to z22 without rasterization. Style is
  // fetched as a JSON document via the style URL (no inline spec needed), per
  // MapLibre/MapTiler docs.
  maptiler_streets: {
    key: 'maptiler_streets',
    name: 'MapTiler Streets',
    style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${PUBLIC_MAPTILER_API_KEY || ''}` as unknown as StyleSpecification,
    isPaid: false,
    hasToken: !!PUBLIC_MAPTILER_API_KEY,
    maxzoom: 22
  },
  // MapTiler `hybrid` style — satellite imagery raster source + vector label
  // overlay (road, place, city, state, country). This is what makes labels
  // readable on top of satellite imagery; a pure raster satellite URL has no
  // labels and is useless for digitisation. Free tier; the same label layer
  // ids as streets-v2, so `applyLabelTuningToMap` (State labels / Road labels
  // overrides) works for both styles out of the box.
  maptiler_satellite: {
    key: 'maptiler_satellite',
    name: 'MapTiler Satellite (Hybrid)',
    style: `https://api.maptiler.com/maps/hybrid/style.json?key=${PUBLIC_MAPTILER_API_KEY || ''}` as unknown as StyleSpecification,
    isPaid: false,
    hasToken: !!PUBLIC_MAPTILER_API_KEY,
    maxzoom: 22
  },
  mapbox_satellite: {
    key: 'mapbox_satellite',
    name: 'Mapbox Satellite',
    style: rasterStyle(
      'mapbox',
      [`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}?access_token=${PUBLIC_MAPBOX_ACCESS_TOKEN || ''}`],
      '© Mapbox © OpenStreetMap contributors',
      19
    ),
    isPaid: true,
    hasToken: !!PUBLIC_MAPBOX_ACCESS_TOKEN,
    maxzoom: 19
  },
  // Google Maps raster styles (Roadmap / Streets, Satellite Hybrid, Terrain).
  // Mendukung zoom hingga level 20. Token/demo key diteruskan via PUBLIC_GOOGLE_MAPS_API_KEY.
  google_streets: {
    key: 'google_streets',
    name: 'Google Streets',
    style: rasterStyle('google-streets', googleTileUrls('m'), '© Google Maps', 20),
    isPaid: false,
    hasToken: true,
    maxzoom: 20
  },
  google_satellite: {
    key: 'google_satellite',
    name: 'Google Satellite (Hybrid)',
    style: rasterStyle('google-satellite', googleTileUrls('y'), '© Google Maps', 20),
    isPaid: false,
    hasToken: true,
    maxzoom: 20
  },
  google_terrain: {
    key: 'google_terrain',
    name: 'Google Terrain',
    style: rasterStyle('google-terrain', googleTileUrls('p'), '© Google Maps', 20),
    isPaid: false,
    hasToken: true,
    maxzoom: 20
  }
};

/**
 * Resolved default basemap. Honours `PUBLIC_DEFAULT_BASEMAP` dari env, tapi
 * fallback ke chain esri_imagery_premium -> maptiler_streets -> osm_standard
 * kalau requested default invalid atau token kosong. Chain ini memastikan
 * dashboard tetap render basemap tiles out-of-the-box.
 */
export const DEFAULT_BASEMAP: BasemapKey = (() => {
  const requested = PUBLIC_DEFAULT_BASEMAP as BasemapKey;
  if (requested in basemaps && (!basemaps[requested].isPaid || basemaps[requested].hasToken)) {
    return requested;
  }
  if (basemaps.google_satellite.hasToken) return 'google_satellite';
  if (basemaps.esri_imagery_premium.hasToken) return 'esri_imagery_premium';
  if (basemaps.maptiler_streets.hasToken) return 'maptiler_streets';
  return 'osm_standard';
})();

export function getActiveBasemaps(): BasemapProvider[] {
  return Object.values(basemaps).filter(b => !b.isPaid || b.hasToken);
}

 /**
 * Runtime label overrides applied to vector basemaps after `style.load`.
 *
 * Root cause for "tidak ada nama jalan, kota, provinsi": MapTiler streets-v2
 * ships with `State labels maxzoom: 9` (province disappears at z10+) and
 * `Road labels minzoom: 8` (no street names at z<8). The digitise workflow
 * needs both visible at z8–14.
 */
export const LABEL_OVERRIDES: ReadonlyArray<readonly [layerId: string, prop: 'minzoom' | 'maxzoom', value: number]> = [
  ['State labels', 'maxzoom', 14],
  ['Road labels', 'minzoom', 5]
];

export function applyLabelTuningToMap(
  map: {
    getLayer?: (layer: string) => unknown;
    setLayoutProperty: (layer: string, prop: string, value: unknown) => void;
  } | null
): void {
  if (!map) return;
  for (const [layerId, prop, value] of LABEL_OVERRIDES) {
    try {
      if (typeof map.getLayer === 'function' && !map.getLayer(layerId)) {
        continue;
      }
      map.setLayoutProperty(layerId, prop, value);
    } catch {
      // Layer not present in this style (e.g. raster basemap). Ignore.
    }
  }
}
