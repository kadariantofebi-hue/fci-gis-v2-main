<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getProjectBundle } from '$lib/services/api/projects';
  import { Link2, MapPin } from 'lucide-svelte';
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

  function relationTone(relation: string) {
    if (relation === 'migrated' || relation === 'created') return 'bg-emerald-100 text-emerald-700';
    if (relation === 'updated' || relation === 'surveyed') return 'bg-cyan-100 text-cyan-700';
    return 'bg-slate-100 text-slate-700';
  }
</script>

<svelte:head><title>SIMANTA - Output ke Aset GIS</title></svelte:head>

<div class="space-y-4">
  {#if b?.project}
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="kicker">Administrasi Proyek GIS · Output GIS</div>
        <h1 class="text-2xl font-bold">Output ke Aset GIS</h1>
        <p class="text-sm text-slate-500">
          {b.project.projectName} <span class="text-xs text-slate-400">({b.project.projectCode})</span>
        </p>
        <p class="mt-1 text-xs text-slate-500">Relasi read-only antara output proyek dan aset/layer GIS hasil survey, update, migrasi, atau deliverable.</p>
      </div>
      <ProjectSubnav projectId={b.project.id} />
    </div>
  {/if}

  {#if error}
    <div class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert" data-testid="project-assets-error">{error}</div>
  {/if}

  {#if loading && !b}
    <p class="text-sm text-slate-500">Memuat output aset...</p>
  {/if}

  {#if b}
    <ul class="space-y-2" data-testid="project-assets-list" aria-label="Daftar output proyek ke aset GIS">
      {#each b.linkedAssets as link}
        <li class="card flex flex-col gap-2 md:flex-row md:items-center md:justify-between" data-testid="project-asset-row" data-asset-id={link.assetId}>
          <div class="flex items-start gap-3">
            <div class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
              <MapPin size={18} />
            </div>
            <div class="text-sm">
              <div class="font-bold text-slate-950">{link.asset.name}</div>
              <div class="text-xs text-slate-500">{link.asset.idPemda} • {link.asset.jenis}</div>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider {relationTone(link.relation)}">{link.relation}</span>
            <a href={`/assets/${link.assetId}`} class="btn btn-secondary !text-xs" data-testid="project-asset-link">
              <Link2 size={14} /> Buka detail aset
            </a>
          </div>
        </li>
      {/each}
    </ul>

    {#if b.linkedAssets.length === 0}
      <div class="rounded-xl bg-slate-50 p-3 text-sm text-slate-500" data-testid="project-assets-empty">
        Belum ada output proyek yang ditautkan ke aset GIS.
      </div>
    {/if}
  {/if}
</div>
