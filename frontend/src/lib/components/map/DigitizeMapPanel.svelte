<script lang="ts">
  import { onDestroy, onMount, createEventDispatcher } from 'svelte';
  import type MapLibreGL from 'maplibre-gl';
  import type { Geometry } from '$shared/geojson';
  import { Trash2, Undo2, MousePointerClick, Check } from 'lucide-svelte';
  import { basemaps, DEFAULT_BASEMAP, applyLabelTuningToMap, type BasemapKey } from './basemaps';
  import { geometryToFocusTarget } from './coordinate-helpers';

  export let mode: 'polygon' | 'line' | 'point' = 'polygon';
  export let value: Geometry | null = null;
  export let basemap: BasemapKey = DEFAULT_BASEMAP;

  const dispatch = createEventDispatcher<{ change: Geometry | null }>();

  let el: HTMLDivElement;
  let maplibregl: typeof MapLibreGL;
  let map: MapLibreGL.Map | null = null;
  let disposed = false;
  let tileError = '';
  // Lock-out: once a geometry has been committed, ignore further map clicks
  // until the user resets or undoes. Prevents accidental append-after-commit.
  let locked = false;

  /**
   * Vertices stored in [lng, lat] order (GeoJSON spec / MapLibre convention).
   * Previous Leaflet implementation used [lat, lng] — this migration fixes
   * the coordinate order to be spec-compliant.
   */
  let vertices: [number, number][] = [];

  // Layer/source IDs managed by renderPreview()
  const PREVIEW_SOURCE = 'digitize-preview';
  const VERTEX_SOURCE = 'digitize-vertices';
  const PREVIEW_LAYERS = [
    'digitize-preview-fill',
    'digitize-preview-stroke',
    'digitize-preview-line',
    'digitize-vertex-circles',
    'digitize-first-vertex',
  ];

  const modeLabel: Record<typeof mode, string> = {
    polygon: 'Polygon (klik pada vertex pertama untuk tutup)',
    line: 'LineString (double-click untuk akhiri)',
    point: 'Point (klik pada peta untuk tempatkan)'
  };
  let previousMode = mode;
  let lastSyncedValue: Geometry | null = null;

  $: if (mode !== previousMode) {
    previousMode = mode;
    handleModeChange();
  }

  function handleModeChange() {
    locked = false;
    clearPreviewLayers();
    if (value) {
      syncFromValue(value, false);
    } else {
      vertices = [];
    }
  }

  // Reactive sync: when parent passes a new `value` after mount (edit mode / draft import),
  // re-hydrate vertices, re-render the preview, and auto-focus the map.
  $: {
    if (value !== lastSyncedValue) {
      lastSyncedValue = value;
      if (map) {
        syncFromValue(value, true);
      }
    }
  }

  function focusOnGeometry(geom: Geometry | null) {
    if (!map || disposed || !geom) return;
    const target = geometryToFocusTarget(geom);
    if (!target) return;

    if (target.type === 'point') {
      map.flyTo({
        center: target.center,
        zoom: Math.max(map.getZoom(), target.zoom),
        duration: 800
      });
    } else if (target.type === 'bounds') {
      map.fitBounds(target.bounds, {
        padding: 50,
        maxZoom: 17,
        duration: 800
      });
    }
  }

  function syncFromValue(incoming: Geometry | null, shouldFocus = true) {
    if (!incoming) {
      vertices = [];
      locked = false;
      clearPreviewLayers();
      return;
    }
    let next: [number, number][] = [];
    if (incoming.type === 'Point') next = [incoming.coordinates as [number, number]];
    else if (incoming.type === 'LineString') next = incoming.coordinates as [number, number][];
    else if (incoming.type === 'Polygon') next = (incoming.coordinates[0]?.slice(0, -1) ?? []) as [number, number][];

    if (next.length > 0) {
      vertices = next;
      locked = false;
      renderPreview();
      if (shouldFocus) {
        focusOnGeometry(incoming);
      }
    } else {
      vertices = [];
      locked = false;
      clearPreviewLayers();
    }
  }
  $: {
    basemap;
    if (map && !disposed) renderBasemap();
  }

  function reset() {
    vertices = [];
    locked = false;
    clearPreviewLayers();
    dispatch('change', null);
  }

  function undo() {
    if (locked) {
      locked = false;
      renderPreview();
      return;
    }
    if (vertices.length === 0) return;
    vertices = vertices.slice(0, -1);
    renderPreview();
  }

  function buildGeometry(): Geometry | null {
    if (mode === 'point') {
      if (vertices.length === 0) return null;
      return { type: 'Point', coordinates: vertices[0] };
    }
    if (mode === 'line') {
      if (vertices.length < 2) return null;
      return { type: 'LineString', coordinates: vertices as [number, number][] };
    }
    // polygon
    if (vertices.length < 3) return null;
    const firstVertex: [number, number] = [vertices[0][0], vertices[0][1]];
    const ring = [...vertices, firstVertex] as [number, number][];
    return { type: 'Polygon', coordinates: [ring] };
  }

  function commit() {
    const g = buildGeometry();
    if (g) {
      locked = true;
      lastSyncedValue = g;
      dispatch('change', g);
    }
  }

  function clearPreviewLayers() {
    if (!map) return;
    for (const id of PREVIEW_LAYERS) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource(PREVIEW_SOURCE)) map.removeSource(PREVIEW_SOURCE);
    if (map.getSource(VERTEX_SOURCE)) map.removeSource(VERTEX_SOURCE);
  }

  function renderPreview() {
    if (!map) return;
    clearPreviewLayers();
    if (vertices.length === 0) return;

    // Build vertex GeoJSON (for circle markers)
    const vertexFeatures = vertices.map((v, i) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: v },
      properties: { index: i, isFirst: i === 0 },
    }));
    map.addSource(VERTEX_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: vertexFeatures },
    });

    if (mode === 'point') {
      // Single point marker
      map.addLayer({
        id: 'digitize-vertex-circles',
        type: 'circle',
        source: VERTEX_SOURCE,
        paint: {
          'circle-radius': 8,
          'circle-color': '#10b981',
          'circle-stroke-color': '#0f766e',
          'circle-stroke-width': 2,
          'circle-opacity': 0.85,
        },
      });
      return;
    }

    // Build line/polygon preview GeoJSON
    if (mode === 'line' && vertices.length >= 2) {
      const lineGeoJSON = {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: vertices,
        },
        properties: {},
      };
      map.addSource(PREVIEW_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [lineGeoJSON] },
      });
      map.addLayer({
        id: 'digitize-preview-line',
        type: 'line',
        source: PREVIEW_SOURCE,
        paint: {
          'line-color': '#0891b2',
          'line-width': 4,
          'line-dasharray': [6, 6],
        },
      });
    } else if (mode === 'polygon' && vertices.length >= 3) {
      const ring = [...vertices, vertices[0]];
      const polyGeoJSON = {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [ring],
        },
        properties: {},
      };
      map.addSource(PREVIEW_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [polyGeoJSON] },
      });
      map.addLayer({
        id: 'digitize-preview-fill',
        type: 'fill',
        source: PREVIEW_SOURCE,
        paint: {
          'fill-color': '#10b981',
          'fill-opacity': 0.25,
        },
      });
      map.addLayer({
        id: 'digitize-preview-stroke',
        type: 'line',
        source: PREVIEW_SOURCE,
        paint: {
          'line-color': '#047857',
          'line-width': 3,
        },
      });
    } else if (mode === 'line' && vertices.length === 1) {
      // Single vertex, no line yet — just show the vertex
    } else if (mode === 'polygon' && vertices.length < 3 && vertices.length >= 2) {
      // Not enough for polygon, show as line preview
      const lineGeoJSON = {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: vertices,
        },
        properties: {},
      };
      map.addSource(PREVIEW_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [lineGeoJSON] },
      });
      map.addLayer({
        id: 'digitize-preview-line',
        type: 'line',
        source: PREVIEW_SOURCE,
        paint: {
          'line-color': '#047857',
          'line-width': 2,
          'line-dasharray': [4, 4],
        },
      });
    }

    // All vertex markers
    map.addLayer({
      id: 'digitize-vertex-circles',
      type: 'circle',
      source: VERTEX_SOURCE,
      paint: {
        'circle-radius': 5,
        'circle-color': '#22d3ee',
        'circle-stroke-color': '#0f172a',
        'circle-stroke-width': 1,
        'circle-opacity': 1,
      },
    });

    // Highlight first vertex for polygon close affordance
    if (mode === 'polygon') {
      map.addLayer({
        id: 'digitize-first-vertex',
        type: 'circle',
        source: VERTEX_SOURCE,
        filter: ['==', ['get', 'isFirst'], true],
        paint: {
          'circle-radius': 9,
          'circle-color': '#22d3ee',
          'circle-stroke-color': '#0f172a',
          'circle-stroke-width': 2,
          'circle-opacity': 1,
        },
      });
    }
  }

  function onMapClick(e: maplibregl.MapMouseEvent) {
    if (locked || !map) return;
    const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];

    if (mode === 'point') {
      vertices = [coord];
      renderPreview();
      commit();
      return;
    }

    // Check if clicking near first vertex to close polygon
    if (mode === 'polygon' && vertices.length >= 3) {
      const firstVertex = vertices[0];
      const firstPx = map.project(firstVertex as [number, number]);
      const clickPx = e.point;
      const dist = Math.sqrt(
        (firstPx.x - clickPx.x) ** 2 + (firstPx.y - clickPx.y) ** 2,
      );
      if (dist < 15) {
        // Close polygon
        commit();
        return;
      }
    }

    vertices = [...vertices, coord];
    renderPreview();
  }

  function onMapDblClick(e: MapLibreGL.MapMouseEvent) {
    if (mode === 'point') return;
    if (vertices.length < (mode === 'polygon' ? 3 : 2)) return;
    e.preventDefault();
    commit();
  }

  function renderBasemap() {
    if (!map || disposed) return;
    const provider = basemaps[basemap] || basemaps[DEFAULT_BASEMAP];
    map.setStyle(provider.style);
    map.once('style.load', () => {
      applyLabelTuningToMap(map);
      renderPreview();
    });
  }

  onMount(() => {
    if (disposed) return;
    void import('maplibre-gl').then(({ default: module }) => {
      if (disposed) return;
      maplibregl = module;

      const provider = basemaps[basemap] || basemaps[DEFAULT_BASEMAP];
      const mapInstance = new maplibregl.Map({
        container: el,
        style: provider.style,
        center: [112.8, -7.6], // [lng, lat]
        zoom: 12,
        maxZoom: provider.maxzoom,
        doubleClickZoom: false,
      });

      map = mapInstance;

      mapInstance.on('load', () => {
        if (disposed) return;
        el.setAttribute('data-digitize-ready', 'true');
        applyLabelTuningToMap(mapInstance);
        mapInstance.on('click', onMapClick);
        mapInstance.on('dblclick', onMapDblClick);

        // Replay & focus on value if provided
        if (value) {
          lastSyncedValue = value;
          syncFromValue(value, true);
        }
      });

      mapInstance.on('error', () => {
        if (!tileError) {
          tileError = `Gagal memuat basemap "${provider.name}".`;
        }
      });
    });
  });

  onDestroy(() => {
    disposed = true;
    map?.remove();
    map = null;
  });
</script>

<div class="space-y-3">
  <div class="flex flex-wrap items-center gap-2 text-xs">
    <span class="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700" data-testid="digitize-mode">
      Mode: {mode}
    </span>
    <span class="text-slate-500">{modeLabel[mode]}</span>
  </div>
  <div class="relative">
    <div bind:this={el} class="h-80 w-full rounded-2xl border border-slate-200" data-testid="digitize-map"></div>
    {#if tileError}
      <div class="absolute bottom-2 left-2 right-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800" data-testid="digitize-tile-error">
        {tileError}
      </div>
    {/if}
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <button type="button" class="btn btn-secondary !text-xs" on:click={undo} disabled={vertices.length === 0} data-testid="digitize-undo">
      <Undo2 size={14} /> Undo vertex
    </button>
    <button type="button" class="btn btn-secondary !text-xs" on:click={reset} disabled={vertices.length === 0} data-testid="digitize-reset">
      <Trash2 size={14} /> Reset
    </button>
    <button type="button" class="btn btn-primary !text-xs" on:click={commit} disabled={(mode === 'point' ? vertices.length !== 1 : vertices.length < (mode === 'polygon' ? 3 : 2))} data-testid="digitize-commit">
      <Check size={14} /> Commit geometry
    </button>
    <span class="ml-auto text-xs text-slate-500" data-testid="digitize-vertex-count">{vertices.length} vertex</span>
  </div>
  <p class="text-xs text-slate-500">
    <MousePointerClick size={12} class="inline" /> MapLibre GL JS digitizer — WebGL rendering, zoom presisi sampai z22+. Geometry tetap sumber utama; tidak ada kolom lat/lng terpisah.
  </p>
</div>
