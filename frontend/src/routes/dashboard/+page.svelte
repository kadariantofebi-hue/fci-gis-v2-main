<script lang="ts">
    import { onMount } from "svelte";
    import type {
        Feature,
        FeatureCollection,
        ProjectFeatureProperties,
    } from "$shared/geojson";
    import type { ProjectStatusGroup } from "$shared/enums";
    import { PROJECT_STATUS_GROUPS, projectStatusGroup } from "$shared/enums";
    import MapContainer from "$lib/components/map/MapContainer.svelte";
    import FloatingPanel from "$lib/components/dashboard/FloatingPanel.svelte";
    import DashboardKpiStrip from "$lib/components/dashboard/DashboardKpiStrip.svelte";
    import DashboardFilterPanel from "$lib/components/dashboard/DashboardFilterPanel.svelte";
    import { matchesProjectSearch } from "$lib/components/dashboard/project-search";
    import DashboardZoomRail, {
        type ZoomLevel,
    } from "$lib/components/dashboard/DashboardZoomRail.svelte";
    import DashboardLegendFloater from "$lib/components/dashboard/DashboardLegendFloater.svelte";
    import DashboardDrawSheet from "$lib/components/dashboard/DashboardDrawSheet.svelte";
    import {
        projectGeoJson,
        projectDashboardStats,
    } from "$lib/services/api/projects";
    import { getCurrentOpd } from "$lib/services/api/opd";
    import { savePreferences } from "$lib/services/api/preferences";
    import { preferences } from "$lib/stores/preferences";
    import { projectStatusColors } from "$lib/components/map/styles";
    import type { BasemapKey } from "$lib/components/map/basemaps";
    import { saveDraftGeometry } from "$lib/services/api/draft-geometry";
    import { toastStore } from "$lib/stores/toast";
    import { goto } from "$app/navigation";
    import type { Geometry } from "$shared/geojson";
    import type { DrawMode } from "$shared/enums";

    let geojson: FeatureCollection<ProjectFeatureProperties> | null = null;
    let stats: { totalProyek: number; proyekBerjalan: number } | null = null;
    let statsLoaded = false;
    let visibleStatuses: ProjectStatusGroup[] = [...PROJECT_STATUS_GROUPS];
    let visibleJenis: (
        | "jalan"
        | "sungai"
        | "drainase"
        | "saluran"
        | "bangunan"
        | "lapangan"
        | "taman"
        | "lainnya"
    )[] = [
        "jalan",
        "sungai",
        "drainase",
        "saluran",
        "bangunan",
        "lapangan",
        "taman",
        "lainnya",
    ];
    let basemap = $preferences.defaultBasemap;
    let activeOpd: any = null;
    let mapCenter: { lat: number; lng: number; zoom: number } = {
        lat: -7.4538,
        lng: 112.7176,
        zoom: 8,
    };
    let layerGrouping: "status" | "jenis" = "status";
    // Pencarian proyek (panel "Filter & Layer"): SK Proyek, Proyek, Tahun, Bulan.
    // Filter fitur GeoJSON di sisi dashboard sebelum diturunkan ke MapContainer.
    let searchSkProyek = "";
    let searchProyek = "";
    let searchTahun = "";
    let searchBulan = "";
    // (2026-07-04) Track tombol ZOOM CEPAT terakhir yang diklik supaya parent
    // bisa menurunkan showSidoarjoBoundary ke MapContainer. null = belum ada
    // klik (initial state) → boundary hidden. Tidak dipersist ke localStorage
    // (sesuai spec §6.1 state machine: reset ke null setiap navigasi baru).
    let lastClickedZoomLevelId: "indonesia" | "jawa-timur" | "sidoarjo" | null = null;

    // Hybrid draw (2026-06-28): state for the DashboardDrawSheet.
    let editMode: "view" | "draw" = "view";
    let drawMode: DrawMode = "polygon";
    let draftGeometry: Geometry | null = null;
    let drawStatusText =
        "Buka peta dan klik untuk menggambar.";
    // Incremented by handleReset so the mounted MapDrawController also clears
    // its drawn preview (vertices + draft-* layers) off the map — not just the
    // parent's draftGeometry.
    let drawResetSignal = 0;

    async function handleAddProject(geometry: Geometry) {
        const ok = saveDraftGeometry(geometry);
        if (!ok) {
            toastStore.error(
                "Gagal menyimpan draft — kuota browser penuh",
            );
            return;
        }
        toastStore.info(
            `Geometry disimpan sebagai draft (${geometry.type}). Mengarahkan ke Tambah Proyek…`,
        );
        await goto("/projects/create");
    }

    function handleReset() {
        draftGeometry = null;
        drawResetSignal += 1;
    }

    function handleModeChange(next: DrawMode) {
        drawMode = next;
        draftGeometry = null;
    }

    function handleEditModeChange(next: "view" | "draw") {
        editMode = next;
    }

    async function persistDashboardPreferences() {
        preferences.update((p) => ({ ...p, defaultBasemap: basemap }));
        const r = await savePreferences({
            ...$preferences,
            defaultBasemap: basemap,
        });
        if (r.success) {
            toastStore.success(
                `Preferensi basemap tersimpan ke ${r.meta?.path ?? "/api/v1/prefs"}.`,
            );
        } else {
            toastStore.error(
                `Gagal menyimpan preferensi basemap (${r.code ?? "UNKNOWN"}).`,
            );
        }
    }

    function setZoomLevel(level: ZoomLevel) {
        lastClickedZoomLevelId = level.id;
        mapCenter = { lat: level.lat, lng: level.lng, zoom: level.zoom };
    }

    async function loadProjectGeoJson() {
        const res = await projectGeoJson();
        if (!res.success) {
            geojson = null;
            toastStore.error(
                `Gagal memuat GeoJSON proyek (${res.code ?? "UNKNOWN"}).`,
            );
            return;
        }
        geojson = res.data;
    }

    async function loadProjectStats() {
        const res = await projectDashboardStats();
        if (res.success) {
            stats = res.data;
            statsLoaded = true;
        } else {
            stats = { totalProyek: 0, proyekBerjalan: 0 };
            statsLoaded = true;
        }
    }

    function recomputeProjectStatusCounts(
        features: Feature<ProjectFeatureProperties>[] | null,
    ): Record<ProjectStatusGroup, number> {
        const counts: Record<ProjectStatusGroup, number> = {
            perencanaan: 0,
            berjalan: 0,
            selesai: 0,
            dibatalkan: 0,
        };
        if (!features) return counts;
        for (const feature of features) {
            const group = projectStatusGroup(feature.properties.status as any);
            counts[group] += 1;
        }
        return counts;
    }

    $: searchActive = Boolean(
        searchSkProyek.trim() ||
        searchProyek.trim() ||
        searchTahun.trim() ||
        searchBulan.trim()
    );

    $: filteredGeojson =
        geojson && searchActive
            ? {
                  ...geojson,
                  features: geojson.features.filter((feature) =>
                      matchesProjectSearch(feature.properties, {
                          skProyek: searchSkProyek,
                          proyek: searchProyek,
                          fiscalYear: searchTahun,
                          bulan: searchBulan,
                      }),
                  ),
              }
            : geojson;
    // Legend mengikuti fitur yang tampil di peta (hasil pencarian + layer).
    $: projectStatusCounts = recomputeProjectStatusCounts(
        filteredGeojson?.features ?? null,
    );

    $: legendItems = PROJECT_STATUS_GROUPS.map((group) => ({
        label: group.charAt(0).toUpperCase() + group.slice(1),
        color: projectStatusColors[group],
        value: projectStatusCounts[group] ?? 0,
    }));

    // Persist basemap preference whenever the MapContainer's basemap toolbar
    // emits a `change` event (PRD v1.4 dashboard full-maps 2026-06-19). The
    // toolbar dispatches explicitly because Svelte 4/5 do not propagate one-way
    // prop mutations back up to the parent.
    function handleMapChange(event: CustomEvent<{ basemap: BasemapKey }>) {
        const next = event.detail?.basemap;
        if (!next) return;
        basemap = next;
        void persistDashboardPreferences();
    }

    onMount(async () => {
        await Promise.all([loadProjectGeoJson(), loadProjectStats()]);
        const opdRes = await getCurrentOpd();
        if (opdRes.success) {
            activeOpd = opdRes.data;
            mapCenter = {
                lat: activeOpd.defaultLatitude ?? mapCenter.lat,
                lng: activeOpd.defaultLongitude ?? mapCenter.lng,
                zoom: activeOpd.defaultZoom ?? mapCenter.zoom,
            };
        }
    });
</script>

<svelte:head><title>SIMANTA - Dashboard Proyek GIS</title></svelte:head>

<!--
  Dashboard full-maps layout (PRD v1.4 §8.1 refactor 2026-06-21).
  Struktur: MapContainer full-height di tengah + 4 FloatingPanel overlay.
  AppShell menyediakan kolom flex route-scoped penuh untuk peta.
-->
<div
    class="dashboard-fullmap-layout"
    data-testid="dashboard-fullmap"
>
    <div class="dashboard-map-wrap">
        <MapContainer
            mode="project"
            geojson={filteredGeojson}
            autoFocus={searchActive}
            {visibleStatuses}
            {visibleJenis}
            {basemap}
            centerLat={mapCenter.lat}
            centerLng={mapCenter.lng}
            zoom={mapCenter.zoom}
            fullHeight={true}
            {editMode}
            {drawMode}
            {drawResetSignal}
            showSidoarjoBoundary={lastClickedZoomLevelId === "sidoarjo"}
            onGeometryChange={(detail) => {
                draftGeometry = detail.geometry;
                drawStatusText = detail.statusText;
            }}
            on:change={handleMapChange}
        />
        <div class="dashboard-panel-layer">
            <!-- Floating KPI strip (top-left): heading + OPD badge + 2 KPI cards. -->
            <FloatingPanel
                position="top-left"
                title="Ringkasan"
                icon="📊"
                testId="dashboard-kpi-strip"
            >
                <DashboardKpiStrip
                    totalProyek={statsLoaded && stats ? stats.totalProyek : "…"}
                    proyekBerjalan={statsLoaded && stats
                        ? stats.proyekBerjalan
                        : "…"}
                    {statsLoaded}
                    activeOpdShortName={activeOpd?.shortName ?? null}
                />
            </FloatingPanel>

            <!-- Floating Filter Panel (top-right): status + jenis + grouping -->
            <FloatingPanel
                position="top-right"
                title="Filter & Layer"
                icon="🔍"
                testId="dashboard-filter-panel"
            >
                <DashboardFilterPanel
                    bind:visibleStatuses
                    bind:visibleJenis
                    bind:layerGrouping
                    bind:searchSkProyek
                    bind:searchProyek
                    bind:searchTahun
                    bind:searchBulan
                />
            </FloatingPanel>

            <!-- Floating Zoom Rail (left-middle, non-collapsible) -->
            <FloatingPanel
                position="left-middle"
                title="Zoom Cepat"
                icon="🌍"
                collapsible={false}
                testId="dashboard-zoom-rail"
            >
                <DashboardZoomRail onSetZoomLevel={setZoomLevel} />
            </FloatingPanel>

            <!-- Floating Legend (bottom-right). -->
            <FloatingPanel
                position="bottom-right"
                title="Legenda"
                icon="📋"
                testId="dashboard-legend-floater"
            >
                <DashboardLegendFloater items={legendItems} title="Status Proyek" />
            </FloatingPanel>
        </div>

        <!-- Bottom-sheet draw handle + drawer (2026-06-28 hybrid map). -->
        <DashboardDrawSheet
            bind:mode={drawMode}
            geometry={draftGeometry}
            statusText={drawStatusText}
            {editMode}
            onModeChange={handleModeChange}
            onReset={handleReset}
            onAddProject={handleAddProject}
            onEditModeChange={handleEditModeChange}
        />
    </div>
</div>

<style>
    .dashboard-fullmap-layout {
        position: relative;
        height: 100%;
        min-height: 0;
        width: 100%;
        max-width: 100%;
        overflow: clip;
        --dashboard-gutter: clamp(0.5rem, 1.25vw, 2rem);
        --dashboard-middle-lift: clamp(2rem, 5vh, 3rem);
        --dashboard-top-safe: max(
            clamp(3rem, 6vh, 4rem),
            env(safe-area-inset-top, 0px)
        );
        --dashboard-inline-start: max(
            var(--dashboard-gutter),
            env(safe-area-inset-left, 0px)
        );
        --dashboard-inline-end: max(
            var(--dashboard-gutter),
            env(safe-area-inset-right, 0px)
        );
        --dashboard-bottom-safe: max(
            clamp(3rem, 7vh, 4.5rem),
            env(safe-area-inset-bottom, 0px)
        );
    }

    .dashboard-map-wrap {
        position: relative;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
    }

    .dashboard-map-wrap :global([data-fullheight="true"]) {
        min-height: 0 !important;
    }

    .dashboard-panel-layer {
        position: absolute;
        inset: 0;
        z-index: 1000;
        pointer-events: none;
    }

    .dashboard-panel-layer > :global(*) {
        pointer-events: auto;
    }

    @media (max-width: 767px) {
        .dashboard-panel-layer {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: auto minmax(0, 1fr) auto;
            grid-template-areas:
                "kpi filter"
                ". ."
                "zoom legend";
            gap: var(--dashboard-gutter);
            padding: var(--dashboard-top-safe) var(--dashboard-inline-end)
                var(--dashboard-gutter) var(--dashboard-inline-start);
            overflow: clip;
        }

        .dashboard-panel-layer > :global(.floating-panel) {
            position: static;
            width: 100%;
            min-width: 0;
            max-width: none;
            transform: none;
        }

        .dashboard-panel-layer
            > :global(.floating-panel[data-position="top-left"]) {
            grid-area: kpi;
        }

        .dashboard-panel-layer
            > :global(.floating-panel[data-position="top-right"]) {
            grid-area: filter;
        }

        .dashboard-panel-layer
            > :global(.floating-panel[data-position="left-middle"]),
        .dashboard-panel-layer
            > :global(.floating-panel[data-position="right-middle"]) {
            grid-area: zoom;
        }
        .dashboard-panel-layer
            > :global(.floating-panel[data-position="bottom-right"]) {
            grid-area: legend;
        }

        .dashboard-panel-layer
            > :global(.floating-panel[data-position="left-middle"]),
        .dashboard-panel-layer
            > :global(.floating-panel[data-position="right-middle"]),
        .dashboard-panel-layer
            > :global(.floating-panel[data-position="bottom-right"]),
        .dashboard-panel-layer
            > :global(.floating-panel[data-position="bottom-left"]) {
            align-self: end;
            margin-bottom: var(--dashboard-bottom-safe);
        }

        .dashboard-panel-layer
            > :global(.floating-panel)
            :global(.floating-panel-content) {
            max-height: min(30dvh, 15rem);
        }
    }
    @media (max-width: 767px) and (max-height: 500px) {
        .dashboard-panel-layer
            > :global(.floating-panel)
            :global(.floating-panel-content) {
            max-height: min(12dvh, 2rem);
            overflow-y: auto;
        }
    }
</style>
