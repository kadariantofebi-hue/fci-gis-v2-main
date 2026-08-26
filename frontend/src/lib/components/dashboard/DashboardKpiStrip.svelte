<script lang="ts">
    import { FolderKanban, Activity } from "lucide-svelte";
    import KpiCard from "./KpiCard.svelte";

    /**
     * PRD v1.4 §8.1: KPI ringkas Proyek GIS (Total Proyek + Proyek Berjalan).
     * Ekstrak dari dashboard +page.svelte untuk komposisi ulang sebagai floating
     * panel. Heading utama Dashboard pindah ke sini (h1).
     */
    export let totalProyek: string | number;
    export let proyekBerjalan: string | number;
    export let statsLoaded: boolean;
    export let activeOpdShortName: string | null = null;
</script>

<div class="space-y-2">
    <div class="space-y-0.5">
        <!--
      Kicker "Pusat Kendali SIMANTA · Single active OPD" di-remove dari sini
      pada full-maps refactor 2026-06-21: Navbar sudah menyediakan kicker +
      subtitle dengan info yang sama. Duplikasi akan muncul di viewport dan
      menambah cognitive load. OPD badge + h1 tetap di sini sebagai anchor
      visual untuk floating panel.
    -->
        <div
            class="text-[11px] font-semibold text-emerald-700"
            data-testid="dashboard-active-opd"
        >
            {activeOpdShortName ?? "Memuat OPD"}
        </div>
        <h1 class="page-title text-xl!">Dashboard Proyek GIS</h1>
    </div>

    <div
        class="grid gap-2 md:grid-cols-2"
        aria-label="KPI ringkas Proyek GIS"
        data-testid="kpi-section"
    >
        <KpiCard
            label="Total Proyek"
            value={totalProyek}
            hint={statsLoaded
                ? "Semua status aktif/non-soft-deleted"
                : "Memuat…"}
            tone="cyan"
            icon={FolderKanban}
        />
        <KpiCard
            label="Proyek Berjalan"
            value={proyekBerjalan}
            hint={statsLoaded ? "Status in_progress" : "Memuat…"}
            tone="amber"
            icon={Activity}
        />
    </div>
</div>
