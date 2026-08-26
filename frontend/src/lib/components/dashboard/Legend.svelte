<script lang="ts">
  /**
   * PRD v1.4 §8.1: legend untuk Dashboard Proyek. Items dengan color swatch
   * dan label. Digunakan untuk status group (perencanaan/berjalan/selesai/
   * dibatalkan) di bawah peta.
   */
  export let items: Array<{ label: string; color: string; value?: number | string }> = [];
  export let title: string = 'Legenda';
</script>

<div class="card" data-testid="dashboard-legend">
  <h2 class="section-title">{title}</h2>
  {#if items.length === 0}
    <p class="mt-2 text-xs text-slate-500">Tidak ada item untuk ditampilkan.</p>
  {:else}
    <ul class="mt-3 space-y-2" aria-label={`${title} items`}>
      {#each items as item}
        <li class="flex items-center gap-2 text-sm" data-testid={`legend-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
          <span class="inline-block h-4 w-4 shrink-0 rounded border border-slate-200" style={`background-color: ${item.color};`} aria-hidden="true"></span>
          <span class="font-medium text-slate-700">{item.label}</span>
          {#if item.value !== undefined}
            <span class="ml-auto text-xs font-bold text-slate-500">{item.value}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
