<script lang="ts" context="module">
  import type { ComponentType } from 'svelte';

  /**
   * Zoom level descriptor. Di-export dari module context supaya dapat
   * di-import oleh parent (dashboard +page.svelte) untuk typing callback.
   */
  export type ZoomLevel = {
    id: 'indonesia' | 'jawa-timur' | 'sidoarjo';
    label: string;
    icon: ComponentType;
    lat: number;
    lng: number;
    zoom: number;
  };
</script>

<script lang="ts">
  import { Globe, Building2, MapPin } from 'lucide-svelte';

  /**
   * PRD v1.4 feedback 2026-06-19: quick-jump zoom rail (Indonesia / Jawa
   * Timur / Kabupaten Sidoarjo). Ekstrak dari dashboard +page.svelte.
   *
   * Contract: parent (dashboard) tangani state `mapCenter` saat user klik;
   * komponen ini emit intent via callback. Testid zoom-level-* dipertahankan.
   */
  export let onSetZoomLevel: (level: ZoomLevel) => void;

  const zoomLevels: ZoomLevel[] = [
    { id: 'indonesia', label: 'Indonesia', icon: Globe, lat: -2.5, lng: 118.0, zoom: 5 },
    { id: 'jawa-timur', label: 'Jawa Timur', icon: Building2, lat: -7.7, lng: 112.7, zoom: 8 },
    { id: 'sidoarjo', label: 'Kabupaten Sidoarjo', icon: MapPin, lat: -7.4538, lng: 112.7176, zoom: 11 }
  ];
</script>

<div class="flex flex-col gap-1" role="group" aria-label="Zoom level">
  {#each zoomLevels as level}
    <button
      type="button"
      class="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
      on:click={() => onSetZoomLevel(level)}
      data-testid={`zoom-level-${level.id}`}
      aria-label={`Zoom ke ${level.label}`}
      title={`${level.label} (zoom ${level.zoom})`}
    >
      <svelte:component this={level.icon} size={14} strokeWidth={2.4} />
      <span class="text-[11px] font-semibold">{level.label}</span>
    </button>
  {/each}
</div>

