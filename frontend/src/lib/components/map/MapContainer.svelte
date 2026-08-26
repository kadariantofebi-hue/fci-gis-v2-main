<script lang="ts">
    import { onMount, createEventDispatcher } from "svelte";
    import { Maximize2, Minimize2, Layers } from "lucide-svelte";
    import type MapLibreGL from "maplibre-gl";
    import type { FeatureCollection } from "$shared/geojson";
    import type {
        AssetFeatureProperties,
        ProjectFeatureProperties,
    } from "$shared/geojson";
    import type { DrawMode } from "$shared/enums";
    import MapDrawController from "./MapDrawController.svelte";
    import type {
        JenisAset,
        JenisInfrastruktur,
        ProjectStatusGroup,
    } from "$shared/enums";
    import { projectStatusGroup } from "$shared/enums";
    import {
        assetColors,
        assetStrokeColors,
        projectStatusColors,
        projectStatusStrokeColors,
    } from "./styles";
    import {
        basemaps,
        getActiveBasemaps,
        DEFAULT_BASEMAP,
        applyLabelTuningToMap,
        type BasemapKey,
    } from "./basemaps";
    import { SIDOARJO_BOUNDARY } from "$lib/mocks/sidoarjo-boundary";
    import { bulanLabel } from "$lib/bulan";

    /**
     * PRD v1.4 §8.1: MapContainer mendukung 2 mode render:
     * - 'asset' (default, backward compat): filter by `visible: JenisAset[]`,
     *   warna per jenis aset, popup link ke /assets/[id].
     * - 'project' (Dashboard Proyek): filter by `visibleStatuses: ProjectStatusGroup[]`
     *   AND `visibleJenis: JenisInfrastruktur[]`, warna per status group,
     *   popup link ke /projects/[id].
     *
     * MapLibre GL JS migration (ADR-002 trigger: drawing presisi + zoom tinggi).
     */
    export let mode: "asset" | "project" = "asset";
    export let geojson: FeatureCollection<
        AssetFeatureProperties | ProjectFeatureProperties
    > | null = null;
    export let visible: JenisAset[] = [
        "tanah",
        "bangunan",
        "jalan",
        "saluran",
        "lapangan",
        "makam",
        "taman",
        "lainnya",
    ];
    export let visibleStatuses: ProjectStatusGroup[] = [
        "perencanaan",
        "berjalan",
        "selesai",
        "dibatalkan",
    ];
    export let visibleJenis: JenisInfrastruktur[] = [
        "jalan",
        "sungai",
        "drainase",
        "saluran",
        "bangunan",
        "lapangan",
        "taman",
        "lainnya",
    ];
    export let basemap: BasemapKey = DEFAULT_BASEMAP;

    /**
     * Auto-focus kamera peta ke fitur yang sedang dicari / difilter.
     * Saat true dan fitur ditemukan, map akan otomatis flyTo / fitBounds ke
     * geometri proyek (poligon, garis jalan/sungai/drainase, atau titik).
     */
    export let autoFocus: boolean = false;
    /**
     * PRD v1.4 §8.1.1: default center & zoom peta. Sumber: profil OPD aktif.
     * MapLibre uses [lng, lat] order (GeoJSON spec).
     */
    export let centerLat: number = -6.2;
    export let centerLng: number = 106.8;
    export let zoom: number = 8;

    /**
     * Dashboard full-maps refactor 2026-06-21: saat true, map element
     * memenuhi parent container (h-full w-full) bukan fixed h-[480px].
     */
    export let fullHeight: boolean = false;

    /**
     * Hybrid edit mode (PRD v1.3.7 Go-Live Hardening, 2026-06-28 hybrid map).
     * - 'view' (default): read-only, no drawing layer. Existing behavior.
     * - 'draw': mounts <MapDrawController> as a child of the same MapLibre
     *   instance, allowing the user to digitize directly on the basemap.
     *   Renamed from `mode` to avoid collision with the existing
     *   `mode: "asset" | "project"` prop (data render mode).
     */
    export let editMode: "view" | "draw" = "view";

    /**
     * Increment this to clear the in-progress draft (vertices + map preview)
     * inside the mounted <MapDrawController> (PRD v1.3.7 hybrid draw).
     */
    export let drawResetSignal: number = 0;

    const dispatch = createEventDispatcher<{
        change: { basemap: BasemapKey };
    }>();

    let wrapperEl: HTMLDivElement;
    let mapEl: HTMLDivElement;
    let maplibregl: typeof MapLibreGL;
    let map: MapLibreGL.Map | null = null;

    /**
     * Hybrid draw mode (2026-06-28): parent can `bind:mapInstance` to receive
     * the MapLibre instance after mount, so it can pass it to a child
     * MapDrawController. We use a separate `mapInstance` prop (not `map`) to
     * avoid colliding with the internal `let map` shadow.
     */
    export let mapInstance: MapLibreGL.Map | null = null;
    $: mapInstance = map;

    /**
     * Current drawing mode for the hybrid draw controller. Parent sets this
     * (e.g. via the bottom sheet radio). Default 'polygon' to match the
     * previous DashboardDigitizePanel default.
     */
    export let drawMode: DrawMode = "polygon";

    /**
     * Hybrid mode: emitted by the inner MapDrawController. Forwarded to the
     * parent so it can update the sheet's `committedGeometry` and `statusText`.
     */
    type GeometryChange = {
        geometry: import("$shared/geojson").Geometry | null;
        statusText: string;
        isComplete: boolean;
    };
    export let onGeometryChange: ((detail: GeometryChange) => void) | null =
        null;

    /**
     * Boundary area overlay (2026-07-04): saat true, MapContainer
     * menampilkan outline poligon administratif Kabupaten Sidoarjo
     * (stroke biru + fill biru 12% alpha). Toggled by parent
     * (Dashboard Proyek) berdasarkan last-clicked zoom level di
     * ZOOM CEPAT rail. Hidden by default.
     */
    export let showSidoarjoBoundary: boolean = false;
    let activeBasemap = "";
    let disposed = false;

    let cursorLatLng: { lat: number; lng: number } | null = null;
    let isFullscreen = false;
    let showBasemapMenu = false;
    let fullscreenError = "";
    let tileError = "";

    // Layer IDs managed by render()
    const LAYER_IDS = [
        "features-fill",
        "features-stroke",
        "features-line",
        "features-circle",
    ];
    const SOURCE_ID = "features";
    // Boundary layer ids (sidoarjo-boundary-*). Hidden by default;
    // visibility di-toggle oleh reactive block §showSidoarjoBoundary.
    const SIDOARJO_BOUNDARY_SOURCE_ID = "sidoarjo-boundary";
    const SIDOARJO_BOUNDARY_FILL_LAYER_ID = "sidoarjo-boundary-fill";
    const SIDOARJO_BOUNDARY_LINE_LAYER_ID = "sidoarjo-boundary-line";

    const escapeHtml = (value: unknown) =>
        String(value ?? "").replace(
            /[&<>"']/g,
            (char) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                })[char] ?? char,
        );

    function assetPopupHtml(feature: any) {
        const props = feature.properties ?? {};
        const assetId = encodeURIComponent(String(props.id ?? ""));
        return `<b>${escapeHtml(props.name)}</b><br>${escapeHtml(props.idPemda)}<br><a href="/assets/${assetId}">Buka detail</a>`;
    }

    function projectPopupHtml(feature: any) {
        const props = feature.properties ?? {};
        const projectId = encodeURIComponent(String(props.id ?? ""));
        const status = escapeHtml(props.status);
        const jenis = escapeHtml(props.jenisInfrastruktur);
        const year = escapeHtml(props.fiscalYear);
        const skProyek = escapeHtml(props.skProyek || "—");
        const bulan = bulanLabel(props.startDate);
        return `<div class="p-0.5 space-y-1 text-slate-800 pr-4"><div class="text-xs font-bold text-slate-900 leading-tight">${escapeHtml(props.projectName)}</div><div class="font-mono text-[11px] break-all text-slate-500">${skProyek}</div><div class="font-mono text-[11px] text-slate-500">${escapeHtml(props.projectCode)}</div><div class="text-[11px] font-bold text-slate-800">${bulan} / ${year}</div><div class="text-[11px] text-slate-600">Status: <b class="capitalize text-slate-700">${status}</b> · Jenis: <b class="capitalize text-slate-700">${jenis}</b></div><div class="pt-1.5"><a href="/projects/${projectId}" class="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow transition hover:bg-emerald-700">Buka Detail Proyek →</a></div></div>`;
    }

    function isFeatureVisible(feature: any): boolean {
        const props = feature.properties ?? {};
        if (mode === "project") {
            const statusGroup = projectStatusGroup(props.status);
            const jenisMatch = visibleJenis.includes(
                props.jenisInfrastruktur ?? "lainnya",
            );
            const statusMatch = visibleStatuses.includes(statusGroup);
            return statusMatch && jenisMatch;
        }
        return visible.includes(props.jenis);
    }

    /**
     * Pre-process features: inject `_statusGroup` property for project mode
     * so MapLibre data-driven expressions can use it directly (expressions
     * cannot call TS functions).
     */
    function preprocessFeatures(
        features: any[],
    ): any[] {
        if (mode !== "project") return features.filter(isFeatureVisible);
        return features
            .filter(isFeatureVisible)
            .map((f) => ({
                ...f,
                properties: {
                    ...f.properties,
                    _statusGroup: projectStatusGroup(f.properties?.status),
                },
            }));
    }

    /** Build MapLibre match expression for fill/circle color. */
    function buildColorExpression(): any {
        if (mode === "project") {
            return [
                "match",
                ["get", "_statusGroup"],
                "perencanaan", projectStatusColors.perencanaan,
                "berjalan", projectStatusColors.berjalan,
                "selesai", projectStatusColors.selesai,
                "dibatalkan", projectStatusColors.dibatalkan,
                "#94a3b8",
            ];
        }
        return [
            "match",
            ["get", "jenis"],
            "tanah", assetColors.tanah,
            "bangunan", assetColors.bangunan,
            "jalan", assetColors.jalan,
            "saluran", assetColors.saluran,
            "lapangan", assetColors.lapangan,
            "makam", assetColors.makam,
            "taman", assetColors.taman,
            "lainnya", assetColors.lainnya,
            "#eab308",
        ];
    }

    /** Build MapLibre match expression for stroke/line color. */
    function buildStrokeColorExpression(): any {
        if (mode === "project") {
            return [
                "match",
                ["get", "_statusGroup"],
                "perencanaan", projectStatusStrokeColors.perencanaan,
                "berjalan", projectStatusStrokeColors.berjalan,
                "selesai", projectStatusStrokeColors.selesai,
                "dibatalkan", projectStatusStrokeColors.dibatalkan,
                "#475569",
            ];
        }
        return [
            "match",
            ["get", "jenis"],
            "tanah", assetStrokeColors.tanah,
            "bangunan", assetStrokeColors.bangunan,
            "jalan", assetStrokeColors.jalan,
            "saluran", assetStrokeColors.saluran,
            "lapangan", assetStrokeColors.lapangan,
            "makam", assetStrokeColors.makam,
            "taman", assetStrokeColors.taman,
            "lainnya", assetStrokeColors.lainnya,
            "#854d0e",
        ];
    }

    function setBasemap(key: BasemapKey) {
        basemap = key;
        showBasemapMenu = false;
        if (map && !disposed) {
            const provider = basemaps[key] || basemaps[DEFAULT_BASEMAP];
            map.setStyle(provider.style);
            map.once("style.load", () => {
                activeBasemap = key;
                applyLabelTuningToMap(mapInstance);
                renderSidoarjoBoundary();
                render();
            });
        }
        dispatch("change", { basemap: key });
    }

    async function toggleFullscreen() {
        if (!wrapperEl) return;
        try {
            if (!document.fullscreenElement) {
                await wrapperEl.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
            fullscreenError = "";
        } catch (err) {
            fullscreenError = `Fullscreen tidak dapat diaktifkan (${(err as Error)?.message ?? "unknown"}). Coba klik tombol langsung atau gunakan F11.`;
        }
    }

    function handleFullscreenChange() {
        isFullscreen = document.fullscreenElement === wrapperEl;
        if (map && !disposed) {
            requestAnimationFrame(() => {
                if (map && !disposed) map.resize();
            });
        }
    }

    let pendingCursorFrame: number | null = null;
    function handleMapMouseMove(ev: MapLibreGL.MapMouseEvent) {
        if (pendingCursorFrame !== null) return;
        pendingCursorFrame = requestAnimationFrame(() => {
            pendingCursorFrame = null;
            cursorLatLng = { lat: ev.lngLat.lat, lng: ev.lngLat.lng };
        });
    }

    function handleTileError(failedKey: BasemapKey) {
        if (tileError) return;
        const fallbackKey: BasemapKey =
            failedKey === "osm_standard" ? "esri_satellite" : "osm_standard";
        tileError = `Gagal memuat basemap "${basemaps[failedKey]?.name || failedKey}". Menggunakan fallback "${basemaps[fallbackKey]?.name || fallbackKey}".`;
        basemap = fallbackKey;
        if (map && !disposed) {
            const provider = basemaps[fallbackKey] || basemaps[DEFAULT_BASEMAP];
            map.setStyle(provider.style);
            map.once("style.load", () => {
                activeBasemap = fallbackKey;
                renderSidoarjoBoundary();
                render();
            });
        }
    }

    /**
     * Compute LngLatBounds from a GeoJSON FeatureCollection.
     * Walks all coordinate arrays to find the extent.
     */
    function computeBounds(
        fc: FeatureCollection<any>,
    ): MapLibreGL.LngLatBounds | null {
        const bounds = new maplibregl.LngLatBounds();
        let hasCoords = false;

        function extendFromCoords(coords: any) {
            if (typeof coords[0] === "number") {
                // [lng, lat]
                bounds.extend(coords as [number, number]);
                hasCoords = true;
            } else {
                for (const c of coords) extendFromCoords(c);
            }
        }

        for (const feature of fc.features) {
            if (feature.geometry?.coordinates) {
                extendFromCoords(feature.geometry.coordinates);
            }
        }

        return hasCoords ? bounds : null;
    }

    function clearFeatureLayers() {
        if (!map) return;
        for (const id of LAYER_IDS) {
            if (map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    }

    function applyBoundaryVisibility() {
        if (!map) return;
        const v = showSidoarjoBoundary ? "visible" : "none";
        for (const id of [SIDOARJO_BOUNDARY_FILL_LAYER_ID, SIDOARJO_BOUNDARY_LINE_LAYER_ID]) {
            if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
        }
    }

    function renderSidoarjoBoundary() {
        if (!map) return;
        if (!map.getSource(SIDOARJO_BOUNDARY_SOURCE_ID)) {
            map.addSource(SIDOARJO_BOUNDARY_SOURCE_ID, {
                type: "geojson",
                data: SIDOARJO_BOUNDARY,
            });
            // Fill layer — di-add SEBELUM features-fill agar project
            // markers tetap di atas boundary.
            map.addLayer({
                id: SIDOARJO_BOUNDARY_FILL_LAYER_ID,
                type: "fill",
                source: SIDOARJO_BOUNDARY_SOURCE_ID,
                paint: {
                    "fill-color": "rgb(37, 99, 235)",
                    "fill-opacity": 0.12,
                },
                layout: { visibility: "none" },
            });
            map.addLayer({
                id: SIDOARJO_BOUNDARY_LINE_LAYER_ID,
                type: "line",
                source: SIDOARJO_BOUNDARY_SOURCE_ID,
                paint: {
                    "line-color": "rgb(37, 99, 235)",
                    "line-width": 2.5,
                },
                layout: { visibility: "none" },
            });
        }
        applyBoundaryVisibility();
    }

    function render() {
        if (!map || disposed) return;

        clearFeatureLayers();

        if (!geojson) return;

        const processedFeatures = preprocessFeatures(geojson.features);
        const filtered: any = {
            type: "FeatureCollection",
            features: processedFeatures,
        };

        map.addSource(SOURCE_ID, {
            type: "geojson",
            data: filtered,
        });

        // Polygon fill layer
        map.addLayer({
            id: "features-fill",
            type: "fill",
            source: SOURCE_ID,
            filter: ["==", "$type", "Polygon"],
            paint: {
                "fill-color": buildColorExpression(),
                "fill-opacity": 0.25,
            },
        });

        // Polygon stroke layer
        map.addLayer({
            id: "features-stroke",
            type: "line",
            source: SOURCE_ID,
            filter: ["==", "$type", "Polygon"],
            paint: {
                "line-color": buildStrokeColorExpression(),
                "line-width": 3,
            },
        });

        // LineString layer
        map.addLayer({
            id: "features-line",
            type: "line",
            source: SOURCE_ID,
            filter: ["==", "$type", "LineString"],
            paint: {
                "line-color": buildStrokeColorExpression(),
                "line-width": 3,
            },
        });

        // Point layer (CircleMarker equivalent)
        map.addLayer({
            id: "features-circle",
            type: "circle",
            source: SOURCE_ID,
            filter: ["==", "$type", "Point"],
            paint: {
                "circle-radius": 8,
                "circle-color": buildColorExpression(),
                "circle-stroke-color": buildStrokeColorExpression(),
                "circle-stroke-width": 1,
                "circle-opacity": 0.7,
            },
        });

        // Fit bounds for asset mode or when autoFocus is enabled (e.g. active project search)
        if (mode !== "project" || autoFocus) {
            const bounds = computeBounds(filtered);
            if (bounds) {
                if (
                    filtered.features.length === 1 &&
                    filtered.features[0].geometry?.type === "Point"
                ) {
                    const coords = filtered.features[0].geometry.coordinates as [
                        number,
                        number,
                    ];
                    map.flyTo({
                        center: [coords[0], coords[1]],
                        zoom: Math.max(map.getZoom(), 15),
                        duration: 800,
                    });
                } else {
                    map.fitBounds(bounds, {
                        padding: 60,
                        maxZoom: 16,
                        duration: 800,
                    });
                }
            }
        }
    }

    // Popup click handlers — MapLibre fires on layer click, not per-feature bind.
    function setupPopupHandlers() {
        if (!map) return;
        const popupHtml =
            mode === "project" ? projectPopupHtml : assetPopupHtml;

        const clickableLayers = ["features-fill", "features-stroke", "features-circle", "features-line"];

        for (const layerId of clickableLayers) {
            map.on("click", layerId, (e) => {
                if (editMode === "draw") return;
                const feature = e.features?.[0];
                if (!feature || !map) return;
                new maplibregl.Popup({ maxWidth: "none" })
                    .setLngLat(e.lngLat)
                    .setHTML(popupHtml(feature))
                    .addTo(map);
            });
            map.on("mouseenter", layerId, () => {
                if (map) map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", layerId, () => {
                if (map) map.getCanvas().style.cursor = "";
            });
        }
    }

    // Resize handling (replaces Leaflet invalidateSize)
    let pendingResizeFrame: number | null = null;
    function scheduleResize() {
        if (pendingResizeFrame !== null) return;
        pendingResizeFrame = requestAnimationFrame(() => {
            pendingResizeFrame = null;
            if (map && !disposed) map.resize();
        });
    }
    function handleWindowResize() {
        scheduleResize();
    }
    function handleResizeObserver() {
        scheduleResize();
    }

    onMount(() => {
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        if (fullHeight) {
            window.addEventListener("resize", handleWindowResize);
        }

        void import("maplibre-gl").then(({ default: module }) => {
            if (disposed) return;
            maplibregl = module;

            const provider = basemaps[basemap] || basemaps[DEFAULT_BASEMAP];
            const mapInstance = new maplibregl.Map({
            container: mapEl,
            style: provider.style,
            center: [centerLng, centerLat], // MapLibre: [lng, lat]
            zoom: zoom,
            // Cap map maxZoom at the basemap's effective maxzoom. Without this
            // cap, MapLibre allows zoom-in past what the raster source can
            // serve and renders the "Map data not yet available" placeholder.
            // Vector styles (MapTiler OpenMapTiles) declare maxzoom: 22 and
            // support overscale, so they still allow z22 zoom-in.
            maxZoom: provider.maxzoom,
            // Disable double-click zoom so a double-click in the hybrid draw
            // 'Garis' (line) mode reaches MapDrawController as its commit
            // signal (PRD §8.1 hybrid map). DigitizeMapPanel already sets
            // doubleClickZoom: false; the full-map draw controller needs the
            // same so dblclick is not consumed as a zoom gesture.
            doubleClickZoom: false,
        });

        map = mapInstance;
        activeBasemap = basemap;

        mapInstance.on("load", () => {
            if (disposed) return;
            mapEl.setAttribute("data-map-ready", "true");
            // Apply vector basemap label overrides (province, road) so street
            // and province names remain visible at the zoom levels the
            // digitise workflow actually operates at. See basemaps.ts
            // LABEL_OVERRIDES for the rationale.
            applyLabelTuningToMap(mapInstance);

            // E2E test hooks
            (mapEl as any)._simantaTriggerTileError = () => {
                handleTileError(basemap);
            };
            (mapEl as any)._simantaFeatureCount = () => {
                if (!map) return 0;
                // Query only the primary layer per geometry type to avoid counting
                // the same source feature multiple times across fill+stroke layers.
                const primaryLayers = ["features-fill", "features-line", "features-circle"].filter(
                    (id) => map!.getLayer(id),
                );
                const rendered = map.queryRenderedFeatures(undefined, {
                    layers: primaryLayers,
                });
                // Dedupe by feature id (a feature may still appear in multiple layers).
                const seen = new Set<string>();
                let count = 0;
                for (const f of rendered) {
                    const key = f.id != null ? String(f.id) : JSON.stringify(f.properties);
                    if (!seen.has(key)) {
                        seen.add(key);
                        count++;
                    }
                }
                return count;
            };
            // Test hook: trigger a popup for the first rendered feature.
            // E2E popup test bypasses WebGL canvas (no per-feature DOM to click).
            // Queries the whole viewport (not just center point) since at zoom 8
            // no feature sits exactly at the map center. Primary layers only to
            // avoid duplicate features across fill+stroke layers.
            (mapEl as any)._simantaClickCenter = () => {
                if (!map) return;
                const primaryLayers = ["features-fill", "features-line", "features-circle"].filter(
                    (id) => map!.getLayer(id),
                );
                const features = map.queryRenderedFeatures(undefined, {
                    layers: primaryLayers,
                });
                if (features.length > 0) {
                    const center = map.getCenter();
                    const html =
                        mode === "project"
                            ? projectPopupHtml(features[0])
                            : assetPopupHtml(features[0]);
                    new maplibregl.Popup({ maxWidth: "none" })
                        .setLngLat(center)
                        .setHTML(html)
                        .addTo(map);
                }
            };
            // Test hook: read current map center/zoom. Used by E2E tests
            // (frontend-mvp.spec.ts) to assert ZOOM CEPAT buttons trigger
            // a flyTo to the expected region. Returns [lng, lat] order
            // (MapLibre convention) and current zoom.
            (mapEl as any)._simantaGetMapState = () => {
                if (!map) return null;
                const c = map.getCenter();
                return { center: [c.lng, c.lat], zoom: map.getZoom() };
            };

            (mapEl as any)._simantaGetSidoarjoBoundary = () => {
                if (!map) return { layerExists: false, visibility: null };
                const layer = map.getLayer(SIDOARJO_BOUNDARY_LINE_LAYER_ID);
                if (!layer) return { layerExists: false, visibility: null };
                return {
                    layerExists: true,
                    visibility:
                        map.getLayoutProperty(SIDOARJO_BOUNDARY_LINE_LAYER_ID, "visibility") || "visible",
                };
            };
            renderSidoarjoBoundary();
            render();
            setupPopupHandlers();
        });

        mapInstance.on("mousemove", handleMapMouseMove);

        mapInstance.on("error", (e) => {
            // Tile load errors surface here (only handle actual source/tile loading errors)
            const ev = e as unknown as { sourceId?: string; dataType?: string; error?: { status?: number } };
            const isTileOrSourceError =
                ev.sourceId != null ||
                ev.dataType === "source" ||
                (ev.error != null && ev.error.status === 404);
            if (e.error && isTileOrSourceError && !tileError) {
                handleTileError(basemap);
            }
        });

            // ResizeObserver for fullHeight mode
            if (fullHeight && typeof ResizeObserver !== "undefined") {
                const ro = new ResizeObserver(handleResizeObserver);
                ro.observe(wrapperEl);
                (mapEl as any)._simantaResizeObserver = ro;
            }
        });

        return () => {
            disposed = true;
            if (map) {
                map.remove();
                map = null;
            }
            if (pendingCursorFrame !== null) {
                cancelAnimationFrame(pendingCursorFrame);
                pendingCursorFrame = null;
            }
            if (pendingResizeFrame !== null) {
                cancelAnimationFrame(pendingResizeFrame);
                pendingResizeFrame = null;
            }
            if (mapEl && (mapEl as any)._simantaResizeObserver) {
                (
                    (mapEl as any)._simantaResizeObserver as ResizeObserver
                ).disconnect();
                delete (mapEl as any)._simantaResizeObserver;
            }
            if (fullHeight) {
                window.removeEventListener("resize", handleWindowResize);
            }
            document.removeEventListener(
                "fullscreenchange",
                handleFullscreenChange,
            );
        };
    });

    $: {
        geojson;
        visible;
        visibleStatuses;
        visibleJenis;
        mode;
        if (map && !disposed && mapEl?.getAttribute("data-map-ready") === "true") {
            render();
        }
    }

    // Basemap reactive update (separate from data reactivity to avoid
    // clearing layers on every filter change)
    $: {
        basemap;
        if (
            map &&
            !disposed &&
            activeBasemap !== basemap &&
            mapEl?.getAttribute("data-map-ready") === "true"
        ) {
            const provider = basemaps[basemap] || basemaps[DEFAULT_BASEMAP];
            map.setStyle(provider.style);
            map.once("style.load", () => {
                activeBasemap = basemap;
                applyLabelTuningToMap(mapInstance);
                renderSidoarjoBoundary();
                render();
            });
        }
    }

    // Center/zoom prop reactivity (bug fix 2026-07-04): parent (Dashboard
    // Proyek GIS) bisa update centerLat/centerLng/zoom kapan saja — misalnya
    // saat user klik tombol "Indonesia / Jawa Timur / Kabupaten Sidoarjo" di
    // ZOOM CEPAT rail. Sebelumnya props ini hanya dibaca sekali di onMount
    // untuk inisialisasi map, sehingga perubahan prop diabaikan dan tombol
    // quick-jump terasa tidak berfungsi. Sekarang setiap perubahan prop
    // memicu flyTo dengan durasi singkat supaya perpindahan regional
    // (Indonesia ↔ Jawa Timur ↔ Sidoarjo) terasa smooth. Guard yang sama
    // dengan reactive block basemap: skip sampai map siap dan disposed
    // belum triggered.
    $: {
        centerLat;
        centerLng;
        zoom;
        if (
            map &&
            !disposed &&
            mapEl?.getAttribute("data-map-ready") === "true" &&
            Number.isFinite(centerLat) &&
            Number.isFinite(centerLng) &&
            Number.isFinite(zoom)
        ) {
            map.flyTo({
                center: [centerLng, centerLat],
                zoom,
                duration: 800
            });
        }
    }

    // Boundary visibility reactive block (bug fix 2026-07-04 follow-up):
    // parent toggle showSidoarjoBoundary kapan saja, kita propagate
    // via setLayoutProperty ke 2 layer boundary. Guard sama dengan
    // basemap/center blocks: skip sampai map siap dan disposed
    // belum triggered.
    $: {
        showSidoarjoBoundary;
        if (map && !disposed && mapEl?.getAttribute("data-map-ready") === "true") {
            applyBoundaryVisibility();
        }
    }
</script>

<div
    bind:this={wrapperEl}
    class="relative"
    class:fullheight={fullHeight}
    class:hybrid-draw={editMode === "draw"}
    data-fullscreen={isFullscreen}
    data-fullheight={fullHeight}
>
    <div
        bind:this={mapEl}
        class={`${fullHeight ? "h-full w-full" : "h-120 w-full"} border border-slate-200 bg-slate-100 dark:border-slate-800 ${isFullscreen ? "bg-white" : ""}`}
    ></div>

    {#if editMode === "draw" && map}
        <MapDrawController
            {map}
            mode={drawMode}
            resetSignal={drawResetSignal}
            onGeometryChange={(detail) => onGeometryChange?.(detail)}
        />
    {/if}

    <!-- Basemap dropdown toolbar (bottom-left floating) -->
    <div
        class="absolute left-3 bottom-12 z-[100] flex flex-col items-start gap-2 text-xs"
    >
        <div class="relative">
            <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 font-bold text-slate-800 shadow ring-1 ring-slate-200 transition hover:bg-white"
                on:click={() => (showBasemapMenu = !showBasemapMenu)}
                aria-label="Pilih basemap"
                aria-haspopup="menu"
                aria-expanded={showBasemapMenu}
                data-testid="map-basemap-button"
            >
                <Layers size={13} strokeWidth={2.4} />
                <span data-testid="map-basemap-state"
                    >{basemaps[basemap]?.name || basemap}</span
                >
            </button>
            {#if showBasemapMenu}
                <div
                    class="absolute left-0 bottom-full z-[110] mb-1 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                    role="menu"
                >
                    {#each getActiveBasemaps() as provider}
                        <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={provider.key === basemap}
                            class={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition hover:bg-slate-50 ${provider.key === basemap ? "font-bold text-emerald-700" : "text-slate-700"}`}
                            on:click={() => setBasemap(provider.key)}
                            data-testid={`basemap-option-${provider.key}`}
                        >
                            <span>{provider.name}</span>
                            {#if provider.key === basemap}<span
                                    aria-hidden="true">✓</span
                                >{/if}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    <!-- Top-left: layer count badge + fullscreen button -->
    <div
        class="pointer-events-none absolute left-3 top-3 z-[100] flex flex-wrap items-start gap-2 text-xs font-bold"
    >
        <span
            class="whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-emerald-800 shadow"
            data-testid="map-active-layer-count"
        >
            {mode === "project"
                ? `${visibleStatuses.length} status · ${visibleJenis.length} jenis`
                : `${visible.length} layer aktif`}
        </span>
        <button
            type="button"
            class="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 font-bold text-slate-700 shadow ring-1 ring-slate-200 transition hover:bg-white"
            on:click={toggleFullscreen}
            aria-label={isFullscreen ? "Keluar fullscreen" : "Masuk fullscreen"}
            title={isFullscreen
                ? "Keluar fullscreen (ESC)"
                : "Masuk fullscreen"}
            data-testid="map-fullscreen-button"
        >
            {#if isFullscreen}
                <Minimize2 size={13} strokeWidth={2.4} />
            {:else}
                <Maximize2 size={13} strokeWidth={2.4} />
            {/if}
        </button>
    </div>

    <!-- Coordinate display (bottom-left) -->
    <div
        class="pointer-events-none absolute bottom-3 left-3 z-[100] rounded-md bg-white/90 px-2 py-1 font-mono text-[10px] font-bold text-slate-700 shadow ring-1 ring-slate-200"
        aria-label="Cursor coordinates"
        data-testid="map-coord-display"
    >
        {#if cursorLatLng}
            Lat: {cursorLatLng.lat.toFixed(5)}, Lng: {cursorLatLng.lng.toFixed(
                5,
            )}
        {:else}
            Lat: 0.00000, Lng: 0.00000
        {/if}
    </div>

    <!-- Fullscreen error -->
    {#if fullscreenError}
        <div
            role="alert"
            class="absolute bottom-12 right-3 z-[100] max-w-md rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 shadow-lg"
            data-testid="map-fullscreen-error"
        >
            <span>{fullscreenError}</span>
            <button
                class="ml-2 font-bold hover:underline"
                on:click={() => (fullscreenError = "")}>Tutup</button
            >
        </div>
    {/if}

    {#if tileError}
        <div
            class="absolute bottom-3 right-3 z-[100] flex max-w-md items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 shadow-lg"
            data-testid="map-tile-error"
        >
            <span>{tileError}</span>
            <button
                class="ml-2 font-bold hover:underline"
                on:click={() => (tileError = "")}>Tutup</button
            >
        </div>
    {/if}
</div>

<style>
    .fullheight {
        height: 100%;
        min-height: 0;
        min-width: 0;
    }
    .fullheight :global(.maplibregl-map) {
        min-height: 0;
        min-width: 0;
    }
    /* Hybrid draw mode (2026-06-28): crosshair cursor on the basemap so
       users know the map is in drawing mode. */
    .hybrid-draw :global(.maplibregl-canvas) {
        cursor: crosshair !important;
    }
    .hybrid-draw :global(.maplibregl-canvas-container) {
        cursor: crosshair !important;
    }
:global(.maplibregl-popup) {
        max-width: min(90vw, 480px) !important;
    }
    :global(.maplibregl-popup-content) {
        width: max-content !important;
        max-width: min(calc(100vw - 32px), 480px) !important;
        border-radius: 0.875rem !important;
        padding: 0.875rem 1rem !important;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1) !important;
        border: 1px solid rgba(226, 232, 240, 0.9) !important;
        font-family: inherit !important;
    }
    :global(.maplibregl-popup-close-button) {
        top: 0.5rem !important;
        right: 0.5rem !important;
        width: 1.5rem !important;
        height: 1.5rem !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 9999px !important;
        background-color: #f1f5f9 !important;
        color: #64748b !important;
        font-size: 1.125rem !important;
        line-height: 1 !important;
        font-family: inherit !important;
        border: none !important;
        cursor: pointer !important;
        transition: all 0.15s ease-in-out !important;
    }
    :global(.maplibregl-popup-close-button:hover) {
        background-color: #e2e8f0 !important;
        color: #0f172a !important;
    }
    :global(.maplibregl-popup-close-button:focus-visible) {
        outline: 2px solid #059669 !important;
        outline-offset: 1px !important;
    }
</style>
