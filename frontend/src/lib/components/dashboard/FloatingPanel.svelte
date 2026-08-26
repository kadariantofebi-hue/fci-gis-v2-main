<script lang="ts">
    /**
     * PRD v1.4 §8.1 (Dashboard Proyek full-maps 2026-06-21): wrapper UI
     * primitive untuk floating panels overlay di atas MapContainer. Tidak
     * coupling ke logic dashboard manapun — children via <slot />.
     *
     * Pattern posisi: absolute relatif terhadap parent yang position:relative
     * (MapContainer wrapper atau .dashboard-map-wrap). Tidak menambah state
     * global; `expanded` internal ke komponen ini.
     *
     * Z-INDEX RATIONALE: MapLibre GL JS canvas + internal controls (zoom,
     * attribution, popup) berada di z-index internal (canvas ~0, controls
     * ~400-700). Default z-30 atau bahkan z-50 akan tertimpa element MapLibre.
     * Pakai z-[1000] supaya selalu di atas semua element MapLibre
     * + MapContainer internal overlays (tile error z-[100], fullscreen error
     * z-[100], basemap menu z-[100]/z-[110], coord display z-[100]).
     *
     * A11y: role="region" + aria-label={title}. Header pakai <h3> agar
     * tidak menggeser heading hierarchy Dashboard (h1 di KPI strip, h2 di
     * section header dalam panel, h3 di panel title).
     */
    export let position:
        | "top-left"
        | "top-right"
        | "top-center"
        | "left-middle"
        | "right-middle"
        | "bottom-right"
        | "bottom-left";
    export let title: string;
    export let icon: string | null = null;
    export let collapsible: boolean = true;
    export let defaultExpanded: boolean = true;
    export let testId: string | undefined = undefined;
    /**
     * Tailwind classes to append to the wrapper — used to nudge a panel
     * away from another overlay (e.g. MapContainer's basemap button at
     * bottom-left internal). Empty by default.
     */
    export let extraClasses: string = '';

    let expanded = defaultExpanded;


    function toggle() {
        if (collapsible) expanded = !expanded;
    }
</script>

<div
    class={`floating-panel z-[1000] ${extraClasses}`}
    data-position={position}
    data-testid={testId}
    role="region"
    aria-label={title}
>
    <div class="flex items-center gap-2 border-b border-slate-200 px-3 py-1.5">
        {#if icon}
            <span aria-hidden="true" class="text-sm leading-none">{icon}</span>
        {/if}
        <h3
            class="text-[11px] font-bold uppercase tracking-wider text-slate-700"
        >
            {title}
        </h3>
        {#if collapsible}
            <button
                type="button"
                class="ml-auto grid h-5 w-5 place-items-center rounded text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                on:click={toggle}
                aria-label={expanded
                    ? `Ciutkan panel ${title}`
                    : `Bentangkan panel ${title}`}
                aria-expanded={expanded}
                data-testid={testId ? `${testId}-toggle` : undefined}
            >
                {expanded ? "−" : "+"}
            </button>
        {/if}
    </div>

    {#if expanded}
        <div class="floating-panel-content">
            <slot />
        </div>
    {/if}
</div>

<style>
    .floating-panel {
        position: absolute;
        width: fit-content;
        min-width: 0;
        background-color: rgba(255, 255, 255, 0.95);
        -webkit-backdrop-filter: blur(8px);
        backdrop-filter: blur(8px);
        border: 1px solid var(--simanta-border);
        border-radius: 0.75rem;
        box-shadow:
            0 10px 25px rgba(15, 23, 42, 0.1),
            0 4px 10px rgba(15, 23, 42, 0.05);
        max-width: min(
            420px,
            calc(
                100% - var(--dashboard-inline-start, var(--dashboard-gutter, 0.75rem)) -
                    var(--dashboard-inline-end, var(--dashboard-gutter, 0.75rem))
            )
        );
    }

    :where(.floating-panel[data-position="top-left"]) {
        top: var(--dashboard-top-safe, var(--dashboard-gutter, 0.75rem));
        inset-inline-start: var(--dashboard-inline-start, var(--dashboard-gutter, 0.75rem));
    }

    :where(.floating-panel[data-position="top-right"]) {
        top: var(--dashboard-gutter, 0.75rem);
        inset-inline-end: var(--dashboard-inline-end, var(--dashboard-gutter, 0.75rem));
        max-width: min(330px, calc(100% - var(--dashboard-inline-start, 0.75rem) - var(--dashboard-inline-end, 0.75rem)));
    }

    :where(.floating-panel[data-position="top-center"]) {
        top: var(--dashboard-gutter, 0.75rem);
        inset-inline-start: 50%;
        transform: translateX(-50%);
    }
    :where(.floating-panel[data-position="left-middle"]) {
        top: calc(var(--dashboard-top-safe, var(--dashboard-gutter, 0.75rem)) + 280px);
        inset-inline-start: var(--dashboard-inline-start, var(--dashboard-gutter, 0.75rem));
    }

    :where(.floating-panel[data-position="right-middle"]) {
        top: calc(50% - var(--dashboard-middle-lift, 2rem));
        inset-inline-end: var(--dashboard-inline-end, var(--dashboard-gutter, 0.75rem));
        transform: translateY(-50%);
    }

    :where(.floating-panel[data-position="bottom-right"]) {
        bottom: var(--dashboard-bottom-safe, 3.5rem);
        inset-inline-end: var(--dashboard-inline-end, var(--dashboard-gutter, 0.75rem));
    }

    :where(.floating-panel[data-position="bottom-left"]) {
        bottom: var(--dashboard-bottom-safe, 3.5rem);
        inset-inline-start: var(--dashboard-inline-start, var(--dashboard-gutter, 0.75rem));
    }

    .floating-panel-content {
        min-width: 0;
        padding: 0.625rem 0.75rem 0.75rem;
        max-height: min(60dvh, 32rem);
        overflow-y: auto;
        overflow-x: hidden;
    }
</style>
