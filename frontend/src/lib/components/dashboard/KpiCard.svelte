<script lang="ts">
  import type { ComponentType } from 'svelte';

  /**
   * PRD v1.4 §8.1: kartu KPI ringkas untuk Dashboard Proyek.
   * Tone palette: emerald | cyan | amber | rose | blue | indigo | sky.
   * Icon optional (lucide-svelte component).
   */
  export let label: string;
  export let value: string | number;
  export let hint: string = '';
  export let tone: 'emerald' | 'cyan' | 'amber' | 'rose' | 'blue' | 'indigo' | 'sky' = 'emerald';
  export let icon: ComponentType | null = null;

  const toneBgClass: Record<typeof tone, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    cyan: 'bg-cyan-50 text-cyan-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    blue: 'bg-blue-50 text-blue-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    sky: 'bg-sky-50 text-sky-700'
  };

  $: toneClass = toneBgClass[tone] ?? toneBgClass.emerald;
  $: testId = `kpi-card-${label.toLowerCase().replace(/\s+/g, '-')}`;
</script>

<div class="card !p-0" data-testid={testId} aria-label={`${label}: ${value}`}>
  <div class="relative p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs font-semibold text-slate-500">{label}</div>
        <div class="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</div>
        {#if hint}
          <div class="mt-2 text-xs text-slate-400">{hint}</div>
        {/if}
      </div>
      {#if icon}
        <div class={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${toneClass}`}>
          <svelte:component this={icon} size={18} strokeWidth={2.2} />
        </div>
      {/if}
    </div>
  </div>
</div>
