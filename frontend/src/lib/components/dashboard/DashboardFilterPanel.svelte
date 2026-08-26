<script lang="ts">
    import type { JenisInfrastruktur, ProjectStatusGroup } from "$shared/enums";
    import { PROJECT_STATUS_GROUPS } from "$shared/enums";
    import { BULAN } from "$lib/bulan";

    /**
     * PRD v1.4 §8.1: filter layer per status group (4) + per jenis infrastruktur
     * (8) + grouping selector. Ekstrak dari dashboard +page.svelte.
     *
     * Contract: parent (dashboard) mempertahankan state array untuk
     * `visibleStatuses` & `visibleJenis`; komponen ini hanya emit intent via
     * callbacks. Testid layer-status-* & layer-jenis-* dan label 'Grouping
     * layer' dipertahankan untuk kompatibilitas E2E.
     */
    export let visibleStatuses: ProjectStatusGroup[];
    export let visibleJenis: JenisInfrastruktur[];
    export let layerGrouping: "status" | "jenis";
    // Pencarian proyek (panel "Filter & Layer"): SK Proyek, Proyek, Tahun,
    // Bulan. State dipegang parent (dashboard) via two-way binding; komponen
    // ini hanya menampilkan kontrol input/select.
    export let searchSkProyek = "";
    export let searchProyek = "";
    export let searchTahun = "";
    export let searchBulan = "";

    const statusLabels: Record<ProjectStatusGroup, string> = {
        perencanaan: "Perencanaan",
        berjalan: "Berjalan",
        selesai: "Selesai",
        dibatalkan: "Dibatalkan",
    };

    const jenisLabels: Record<JenisInfrastruktur, string> = {
        jalan: "Jalan",
        sungai: "Sungai",
        drainase: "Drainase",
        saluran: "Saluran",
        bangunan: "Bangunan",
        lapangan: "Lapangan",
        taman: "Taman",
        lainnya: "Lainnya",
    };

    const JENIS_OPTIONS: JenisInfrastruktur[] = [
        "jalan",
        "sungai",
        "drainase",
        "saluran",
        "bangunan",
        "lapangan",
        "taman",
        "lainnya",
    ];

    function selectAllStatuses() {
        visibleStatuses = [...PROJECT_STATUS_GROUPS];
    }
    function clearAllStatuses() {
        visibleStatuses = [];
    }
    function selectAllJenis() {
        visibleJenis = [...JENIS_OPTIONS];
    }
    function clearAllJenis() {
        visibleJenis = [];
    }
</script>

<div class="space-y-3">
    <div>
        <div
            class="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500"
        >
            Cari Proyek
        </div>
        <div class="grid grid-cols-2 gap-1.5">
            <label class="block">
                <span class="text-[10px] font-semibold text-slate-600"
                    >SK Proyek</span
                >
                <input
                    class="input mt-0.5 w-full! max-w-full py-1! text-xs"
                    placeholder="SK.050/118…"
                    bind:value={searchSkProyek}
                    aria-label="Cari SK Proyek"
                    data-testid="dashboard-search-skproyek"
                />
            </label>
            <label class="block">
                <span class="text-[10px] font-semibold text-slate-600"
                    >Proyek</span
                >
                <input
                    class="input mt-0.5 w-full! max-w-full py-1! text-xs"
                    placeholder="kode/nama…"
                    bind:value={searchProyek}
                    aria-label="Cari nama atau kode proyek"
                    data-testid="dashboard-search-proyek"
                />
            </label>
            <label class="block">
                <span class="text-[10px] font-semibold text-slate-600"
                    >Bulan</span
                >
                <select
                    class="input mt-0.5 w-full! max-w-full py-1! text-xs"
                    bind:value={searchBulan}
                    aria-label="Cari bulan mulai proyek"
                    data-testid="dashboard-search-bulan"
                >
                    <option value="">Semua</option>
                    {#each BULAN as bulan, i}
                        <option value={String(i + 1).padStart(2, "0")}
                            >{bulan}</option
                        >
                    {/each}
                </select>
            </label>
            <label class="block">
                <span class="text-[10px] font-semibold text-slate-600"
                    >Tahun</span
                >
                <input
                    class="input mt-0.5 w-full! max-w-full py-1! text-xs"
                    placeholder="YYYY"
                    inputmode="numeric"
                    bind:value={searchTahun}
                    aria-label="Cari tahun anggaran"
                    data-testid="dashboard-search-tahun"
                />
            </label>
        </div>
    </div>

    <div>
        <div class="mb-1 flex items-center justify-between">
            <span
                class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
            >
                Status Proyek
            </span>
            <div class="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                <button
                    class="text-slate-500 hover:text-emerald-700 hover:underline"
                    type="button"
                    on:click={selectAllStatuses}>Semua</button
                >
                <span class="text-slate-300" aria-hidden="true">/</span>
                <button
                    class="text-slate-500 hover:text-rose-600 hover:underline"
                    type="button"
                    on:click={clearAllStatuses}>None</button
                >
            </div>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
            {#each PROJECT_STATUS_GROUPS as group}
                <label
                    class="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-700 transition hover:border-slate-300"
                >
                    <input
                        type="checkbox"
                        class="h-3 w-3 accent-emerald-600"
                        bind:group={visibleStatuses}
                        value={group}
                        data-testid={`layer-status-${group}`}
                    />
                    {statusLabels[group]}
                </label>
            {/each}
        </div>
    </div>

    <div>
        <div class="mb-1 flex items-center justify-between">
            <span
                class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
            >
                Jenis Infrastruktur
            </span>
            <div class="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                <button
                    class="text-slate-500 hover:text-emerald-700 hover:underline"
                    type="button"
                    on:click={selectAllJenis}>Semua</button
                >
                <span class="text-slate-300" aria-hidden="true">/</span>
                <button
                    class="text-slate-500 hover:text-rose-600 hover:underline"
                    type="button"
                    on:click={clearAllJenis}>None</button
                >
            </div>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
            {#each JENIS_OPTIONS as jenis}
                <label
                    class="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-700 transition hover:border-slate-300"
                >
                    <input
                        type="checkbox"
                        class="h-3 w-3 accent-emerald-600"
                        bind:group={visibleJenis}
                        value={jenis}
                        data-testid={`layer-jenis-${jenis}`}
                    />
                    {jenisLabels[jenis]}
                </label>
            {/each}
        </div>
    </div>

    <div>
        <label
            for="layer-grouping"
            class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500"
            >Grouping layer</label
        >
        <select
            id="layer-grouping"
            bind:value={layerGrouping}
            aria-label="Grouping layer"
            class="input w-full! max-w-full py-1! text-xs"
        >
            <option value="status">Group by status</option>
            <option value="jenis">Group by jenis infrastruktur</option>
        </select>
    </div>
</div>
