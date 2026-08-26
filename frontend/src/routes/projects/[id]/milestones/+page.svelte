<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getProjectBundle } from '$lib/services/api/projects';
  import { Calendar, CheckCircle2, Clock } from 'lucide-svelte';
  import ProjectSubnav from '$lib/components/projects/ProjectSubnav.svelte';

  let b: any = null;
  let projectId = '';
  let loading = false;
  let error = '';

  $: projectId = $page.params.id as string;

  onMount(async () => {
    loading = true;
    const res = await getProjectBundle(projectId, { includeProjectDocuments: false, includeSensitiveDocuments: false, includeSensitivePayments: false });
    loading = false;
    if (res.success) b = res.data;
    else error = `${res.code ?? 'ERROR'} — ${res.message}`;
  });
</script>

<svelte:head><title>SIMANTA - Timeline & Milestone</title></svelte:head>

<div class="space-y-4">
  {#if b?.project}
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="kicker">Administrasi Proyek GIS · Milestone</div>
        <h1 class="text-2xl font-bold">Timeline & Milestone</h1>
        <p class="text-sm text-slate-500">
          {b.project.projectName} <span class="text-xs text-slate-400">({b.project.projectCode})</span>
        </p>
      </div>
      <ProjectSubnav projectId={b.project.id} />
    </div>
  {/if}

  {#if error}
    <div class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert" data-testid="milestones-error">{error}</div>
  {/if}

  {#if loading && !b}
    <p class="text-sm text-slate-500">Memuat milestone...</p>
  {/if}

  {#if b}
    <ol class="space-y-3" data-testid="milestones-list" aria-label="Daftar milestone proyek">
      {#each b.milestones as milestone, i}
        <li class="card flex gap-3" data-testid="milestone-row" data-milestone-id={milestone.id}>
          <div class="flex flex-col items-center">
            <div class="grid h-8 w-8 place-items-center rounded-full {milestone.actualDate ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
              {#if milestone.actualDate}
                <CheckCircle2 size={16} />
              {:else}
                <Clock size={16} />
              {/if}
            </div>
            {#if i < b.milestones.length - 1}
              <div class="my-1 w-0.5 grow bg-slate-200" aria-hidden="true"></div>
            {/if}
          </div>
          <div class="flex-1 pb-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-bold text-slate-950">{milestone.name}</span>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider {milestone.actualDate ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                {milestone.actualDate ? 'Selesai' : 'Terjadwal'}
              </span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span class="inline-flex items-center gap-1"><Calendar size={12} /> Rencana {milestone.plannedDate}</span>
              {#if milestone.actualDate}
                <span class="inline-flex items-center gap-1 text-emerald-700">Aktual {milestone.actualDate}</span>
              {:else}
                <span>Belum ada tanggal aktual</span>
              {/if}
            </div>
            {#if milestone.notes}
              <div class="mt-1 text-xs text-slate-500">{milestone.notes}</div>
            {/if}
          </div>
        </li>
      {/each}
    </ol>

    {#if b.milestones.length === 0}
      <div class="rounded-xl bg-slate-50 p-3 text-sm text-slate-500" data-testid="milestones-empty">
        Belum ada milestone yang tercatat untuk proyek ini.
      </div>
    {/if}
  {/if}
</div>
