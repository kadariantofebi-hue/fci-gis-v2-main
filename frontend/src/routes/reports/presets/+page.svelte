<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser } from '$lib/stores/auth';
  import { canManageReportPresets } from '$lib/auth/permissions';
  import { listReportPresets, createReportPreset, deleteReportPreset, updateReportPreset } from '$lib/services/api/report-presets';
  import type { ReportPreset } from '$shared/schemas/report';
  import { Save, Trash2, Pencil, ListChecks } from 'lucide-svelte';

  let presets: ReportPreset[] = [];
  let loading = false;
  let mutatingId = '';
  let error = '';
  let successMessage = '';
  let saveFormOpen = false;
  let newName = '';
  let newFilters = '';

  $: canManage = canManageReportPresets($currentUser);

  async function load() {
    if (!$currentUser) return;
    loading = true;
    error = '';
    const res = await listReportPresets($currentUser.id);
    loading = false;
    if (res.success) presets = res.data;
    else error = `${res.code ?? 'ERROR'} — ${res.message}`;
  }

  async function save() {
    if (!$currentUser) return;
    if (!newName.trim()) {
      error = 'Nama preset wajib diisi.';
      return;
    }
    let filters: Record<string, string> = {};
    if (newFilters.trim()) {
      try {
        filters = JSON.parse(newFilters);
      } catch (_e) {
        error = 'Filter JSON tidak valid.';
        return;
      }
    }
    const res = await createReportPreset({ name: newName.trim(), filters }, $currentUser.id);
    if (res.success) {
      presets = [...presets, res.data];
      successMessage = `Preset "${res.data.name}" disimpan.`;
      newName = '';
      newFilters = '';
      saveFormOpen = false;
    } else {
      error = `${res.code ?? 'ERROR'} — ${res.message}`;
    }
  }

  async function remove(id: string) {
    if (!$currentUser) return;
    mutatingId = id;
    error = '';
    successMessage = '';
    const res = await deleteReportPreset(id, $currentUser.id);
    if (res.success) {
      presets = presets.filter((p) => p.id !== id);
      successMessage = `Preset ${res.data.id} dihapus.`;
    } else {
      error = `${res.code ?? 'ERROR'} — ${res.message}`;
    }
    mutatingId = '';
  }

  function openEditForm() {
    saveFormOpen = true;
    newName = '';
    newFilters = '';
  }

  onMount(() => {
    load();
  });
</script>

<svelte:head><title>SIMANTA - Report Presets</title></svelte:head>

<div class="space-y-4">
  <div>
    <div class="kicker">Laporan · Preset</div>
    <h1 class="text-2xl font-bold">Report Presets</h1>
    <p class="text-sm text-slate-500">
      Simpan query laporan yang sering dipakai. Preset disimpan per-user; CRUD via <code>report:preset_manage</code> (PRD §6.1.2, §7.12).
      Endpoint: <code class="rounded bg-slate-100 px-1">/api/v1/reports/presets</code> + <code class="rounded bg-slate-100 px-1">/api/v1/reports/presets/:id</code>.
    </p>
  </div>

  {#if !canManage}
    <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900" data-testid="presets-noaccess">
      Anda tidak memiliki izin <code>report:preset_manage</code>. <a href="/dashboard" class="underline">Kembali ke dashboard</a>.
    </div>
  {:else}
    {#if error}
      <div class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert" data-testid="presets-error">{error}</div>
    {/if}
    {#if successMessage}
      <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status" data-testid="presets-success">{successMessage}</div>
    {/if}

    <div class="card flex flex-wrap items-center justify-between gap-3" data-testid="presets-save-section">
      <div class="flex items-center gap-2 text-sm text-slate-600">
        <ListChecks size={16} /> Daftar preset ({presets.length})
      </div>
      {#if !saveFormOpen}
        <button class="btn btn-primary !text-xs" on:click={openEditForm} data-testid="presets-new-button">
          <Save size={14} /> Simpan preset dari filter
        </button>
      {/if}
    </div>

    {#if saveFormOpen}
      <section class="card space-y-3 border-l-4 border-l-emerald-500" data-testid="presets-form">
        <h2 class="text-base font-bold text-slate-950">Simpan preset baru</h2>
        <label class="block">
          <span class="text-xs font-semibold text-slate-600">Nama preset</span>
          <input class="input" bind:value={newName} placeholder="Contoh: Aset Tanah Belum Dipetakan" data-testid="presets-name" />
        </label>
        <label class="block">
          <span class="text-xs font-semibold text-slate-600">Filter JSON (opsional, sama dengan body /reports/query)</span>
          <textarea class="input font-mono text-xs" rows="4" bind:value={newFilters} placeholder={`{"jenis":"tanah","hasGeom":"no"}`} data-testid="presets-filters"></textarea>
        </label>
        <div class="flex gap-2">
          <button class="btn btn-primary !text-xs" on:click={save} data-testid="presets-save">Simpan</button>
          <button class="btn btn-secondary !text-xs" on:click={() => (saveFormOpen = false)}>Batal</button>
        </div>
      </section>
    {/if}

    {#if loading && presets.length === 0}
      <p class="text-sm text-slate-500">Memuat preset...</p>
    {/if}

    <ul class="space-y-2" data-testid="presets-list">
      {#each presets as p (p.id)}
        <li class="card flex flex-col gap-2 md:flex-row md:items-center md:justify-between" data-testid="presets-row" data-preset-id={p.id}>
          <div class="text-sm">
            <div class="font-bold text-slate-950">{p.name}</div>
            <div class="text-xs text-slate-500">id=<code class="rounded bg-slate-50 px-1">{p.id}</code> · owner=<code class="rounded bg-slate-50 px-1">{p.ownerId}</code> · updatedAt={new Date(p.updatedAt).toLocaleString('id-ID')}</div>
            {#if Object.keys(p.filters).length > 0}
              <div class="mt-1 truncate text-[10px] text-slate-500">filters=<code class="rounded bg-slate-50 px-1">{JSON.stringify(p.filters)}</code></div>
            {/if}
          </div>
          <div class="flex shrink-0 gap-2">
            <button class="btn btn-secondary !text-xs" on:click={() => goto(`/reports?preset=${encodeURIComponent(p.id)}`)} data-testid="presets-apply">
              <Pencil size={14} /> Terapkan
            </button>
            <button class="btn btn-secondary !text-xs" on:click={() => remove(p.id)} disabled={mutatingId === p.id} data-testid="presets-delete">
              <Trash2 size={14} /> {mutatingId === p.id ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
