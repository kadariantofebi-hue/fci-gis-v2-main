<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import type { GeoJSONSource, Map as MaplibreMap } from 'maplibre-gl';
  import type {
    Feature,
    FeatureCollection,
    Geometry as GeoJSONGeometry,
  } from 'geojson';
  import type { Geometry } from '$shared/geojson';
  import type { DrawMode } from '$shared/enums';
  import { addVertex, tryClosePolygon, tryCompleteLine, commit, reset, type VertexState } from './drawing-controller';

  // Svelte 5 runes API: callback props replace createEventDispatcher.
  interface Props {
    map: MaplibreMap;
    mode?: DrawMode;
    /** Increment to clear the in-progress draft (vertices + map preview). */
    resetSignal?: number;
    onGeometryChange?: (detail: { geometry: Geometry | null; statusText: string; isComplete: boolean }) => void;
  }
  let { map, mode = 'polygon', resetSignal = 0, onGeometryChange }: Props = $props();

  const POLYGON_CLOSE_TOLERANCE_PX = 25;
  const DBLCLICK_SUPPRESS_MS = 250;

  // Use distinct names to avoid svelte-check's Svelte-4-store confusion. The
  // runes (`$state`, `$effect`) work fine; only the legacy type checker
  // mis-resolves `let x = $state(...)` when `x` contains `state`/`store`.
  const initialDraw: VertexState = untrack(() => reset(mode));
  const initialStyleLoaded: boolean = untrack(() => Boolean(map.isStyleLoaded()));
  let draw: VertexState = $state(initialDraw);
  let lastClickAt: number = $state(0);
  let styleLoaded: boolean = $state(initialStyleLoaded);
  let installed: boolean = $state(false);

  function statusTextFor(s: VertexState): string {
    if (s.isComplete) {
      return s.mode === 'point'
        ? 'Titik ditempatkan. Tambah Proyek untuk lanjut.'
        : s.mode === 'line'
          ? 'Garis selesai. Tambah Proyek untuk lanjut.'
          : 'Polygon ditutup. Tambah Proyek untuk lanjut.';
    }
    if (s.vertices.length === 0) return 'Klik untuk tambah vertex.';
    if (s.mode === 'line') return `Vertex ${s.vertices.length}. Klik vertex terakhir lagi untuk selesai.`;
    return `Vertex ${s.vertices.length}. Klik vertex pertama untuk tutup.`;
  }

  function toFeatureCollection(
    s: VertexState,
  ): FeatureCollection<GeoJSONGeometry, Record<string, unknown>> {
    if (s.vertices.length === 0) return { type: 'FeatureCollection', features: [] };
    // Point mode always renders a single point marker (never an accumulating
    // MultiPoint/line), so the draft cannot grow into a polygon/line shadow
    // while the user places or repositions tentative points.
    if (s.mode === 'point') {
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { kind: 'vertices' },
            geometry: { type: 'Point', coordinates: s.vertices[0] },
          },
        ],
      };
    }
    const features: Feature<GeoJSONGeometry, Record<string, unknown>>[] = [
      {
        type: 'Feature',
        properties: { kind: 'vertices' },
        geometry: { type: 'MultiPoint', coordinates: s.vertices },
      },
    ];
    if (s.mode === 'line' && s.vertices.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { kind: 'line' },
        geometry: { type: 'LineString', coordinates: s.vertices },
      });
    }
    if (s.mode === 'polygon' && s.vertices.length >= 3) {
      const ring = [...s.vertices, s.vertices[0]];
      features.push({
        type: 'Feature',
        properties: { kind: 'polygon' },
        geometry: { type: 'Polygon', coordinates: [ring] },
      });
    }
    return { type: 'FeatureCollection', features };
  }

  function refreshSource(): void {
    if (!styleLoaded) return;
    const src = map.getSource('draft-shape') as GeoJSONSource | undefined;
    src?.setData(toFeatureCollection(draw));
  }

  function emit(): void {
    const current = untrack(() => draw);
    const geometry = current.isComplete ? commit(current) : null;
    onGeometryChange?.({ geometry, statusText: statusTextFor(current), isComplete: current.isComplete });
  }

  function onMapClick(e: { lngLat: { lng: number; lat: number } }): void {
    if (draw.mode === 'line' && Date.now() - lastClickAt < DBLCLICK_SUPPRESS_MS) return;
    const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    if (draw.mode === 'polygon' && draw.vertices.length >= 3) {
      const first = draw.vertices[0];
      const firstPx = map.project(first as [number, number]);
      const clickPx = map.project(lngLat);
      const r = tryClosePolygon(draw, lngLat, POLYGON_CLOSE_TOLERANCE_PX, [firstPx.x, firstPx.y], [clickPx.x, clickPx.y]);
      if (r.closed) {
        draw = r.state;
        refreshSource();
        emit();
        return;
      }
    }
    // the line (mirrors the polygon "click first vertex to close" affordance).
    if (draw.mode === 'line' && draw.vertices.length >= 2) {
      const last = draw.vertices[draw.vertices.length - 1];
      const lastPx = map.project(last as [number, number]);
      const clickPx = map.project(lngLat);
      const r = tryCompleteLine(draw, lngLat, POLYGON_CLOSE_TOLERANCE_PX, [lastPx.x, lastPx.y], [clickPx.x, clickPx.y]);
      if (r.closed) {
        draw = r.state;
        refreshSource();
        emit();
        return;
      }
    }
    draw = addVertex(draw, lngLat);
    refreshSource();
    emit();
  }

  function onMapDblclick(_e: { lngLat: { lng: number; lat: number } }): void {
    if (draw.mode === 'line' && draw.vertices.length >= 2) {
      lastClickAt = Date.now();
      draw = { ...draw, isComplete: true };
      refreshSource();
      emit();
    }
  }
  function ensureLayers(): void {
    if (!map.isStyleLoaded()) {
      map.once('style.load', ensureLayers);
      return;
    }
    styleLoaded = true;
    try {
      if (!map.getSource('draft-shape')) {
        map.addSource('draft-shape', {
          type: 'geojson',
          data: toFeatureCollection(draw),
        });
        map.addLayer({ id: 'draft-fill', type: 'fill', source: 'draft-shape', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': '#1d4ed8', 'fill-opacity': 0.15 } });
        map.addLayer({ id: 'draft-outline', type: 'line', source: 'draft-shape', paint: { 'line-color': '#1d4ed8', 'line-width': 2 } });
        map.addLayer({ id: 'draft-vertices', type: 'circle', source: 'draft-shape', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 4, 'circle-color': '#1d4ed8' } });
      }
    } catch (err) {
      console.warn('MapDrawController: could not add source/layer', err);
    }
  }

  // React to mode change: only reset when mode actually changes from previous.
  let previousMode: DrawMode | null = $state(null);
  $effect(() => {
    const currentMode = mode;
    if (previousMode !== null && currentMode !== previousMode) {
      untrack(() => {
        draw = reset(currentMode);
        if (styleLoaded) refreshSource();
        emit();
      });
    }
    previousMode = currentMode;
  });

  // React to an externally requested reset (e.g. the sheet's Reset button).
  // Clear the in-progress draft while keeping the current mode, and blank the
  // preview so the drawn point/line/area is removed from the map.
  $effect(() => {
    const signal = resetSignal; // dependency
    if (signal === 0) return;
    untrack(() => {
      draw = reset(draw.mode);
      if (styleLoaded) refreshSource();
      emit();
    });
  });

  onMount(() => {
    map.on('click', onMapClick);
    map.on('dblclick', onMapDblclick);
    map.on('style.load', ensureLayers);
    ensureLayers();
    return () => {
      map.off('click', onMapClick);
      map.off('dblclick', onMapDblclick);
      map.off('style.load', ensureLayers);
    };
  });

  onDestroy(() => {
    try {
      if (map.getLayer && map.getLayer('draft-vertices')) map.removeLayer('draft-vertices');
      if (map.getLayer && map.getLayer('draft-outline')) map.removeLayer('draft-outline');
      if (map.getLayer && map.getLayer('draft-fill')) map.removeLayer('draft-fill');
      if (map.getSource && map.getSource('draft-shape')) map.removeSource('draft-shape');
    } catch {
      // map may already be disposed; ignore
    }
  });
</script>

<!-- controller-only component; renders nothing -->
