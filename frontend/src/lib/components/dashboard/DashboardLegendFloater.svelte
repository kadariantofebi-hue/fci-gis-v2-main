<script lang="ts">
  import Legend from './Legend.svelte';

  /**
   * PRD v1.4 §8.1: legend ringkas untuk floating panel. Wrap Legend.svelte
   * apa adanya (testid dashboard-legend, legend-item-* dipertahankan). Pass
   * `title` ke Legend sehingga tidak double heading (FloatingPanel sudah
   * ada header sendiri).
   */
  export let items: Array<{ label: string; color: string; value?: number | string }> = [];
  export let title: string = 'Status Proyek';
</script>

<Legend items={items} {title} />
