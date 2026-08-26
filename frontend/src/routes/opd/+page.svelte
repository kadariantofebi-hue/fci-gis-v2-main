<script lang="ts">
  import { onMount } from 'svelte';
  import { currentUser } from '$lib/stores/auth';
  import { canUpdateCurrentOpd } from '$lib/auth/permissions';
  import { getCurrentOpd, updateCurrentOpd } from '$lib/services/api/opd';

  let opd: any = null;
  let editing: any = null;
  let statusMessage = '';
  let errorMessage = '';

  async function load() { const r = await getCurrentOpd(); if (r.success) opd = r.data; }
  function openEdit() { editing = { ...opd }; statusMessage = ''; errorMessage = ''; }
  async function saveEdit() {
    if (!editing) return;
    const r = await updateCurrentOpd(editing);
    if (r.success) { opd = r.data; editing = null; statusMessage = r.message; errorMessage = ''; }
    else { errorMessage = `${r.code}: ${r.message}`; statusMessage = ''; }
  }
  onMount(load);
</script>

<svelte:head><title>SIMANTA - Profil OPD Pengguna</title></svelte:head>

<div class="space-y-4">
  <div>
    <div class="kicker">Single active OPD · Frontend MVP Mock</div>
    <h1 class="text-2xl font-bold">Profil OPD Pengguna</h1>
    <p class="text-sm text-slate-500">MVP ini hanya menampilkan Profil OPD aktif/default sesuai PRD v1.3.7. Fitur lintas OPD tidak termasuk scope aktif.</p>
  </div>
  {#if statusMessage}<div role="status" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{statusMessage}</div>{/if}
  {#if errorMessage}<div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{errorMessage}</div>{/if}

  {#if opd}
    <div class="card grid gap-4 md:grid-cols-4">
      <div><div class="text-xs text-slate-500">Kode OPD</div><div class="text-xl font-black text-slate-950">{opd.kode}</div></div>
      <div><div class="text-xs text-slate-500">Singkatan</div><div class="text-xl font-black text-slate-950">{opd.shortName}</div></div>
      <div class="md:col-span-2"><div class="text-xs text-slate-500">Nama OPD</div><div class="text-lg font-bold text-slate-950">{opd.name}</div></div>
      <div><div class="text-xs text-slate-500">Kepala OPD</div><div class="font-semibold">{opd.kepala ?? '-'}</div></div>
      <div><div class="text-xs text-slate-500">Jumlah aset mock</div><div class="font-semibold">{opd.assetCount ?? 0}</div></div>
      <div><div class="text-xs text-slate-500">Status</div><span class="badge bg-emerald-100 text-emerald-700">Aktif/default</span></div>
      <div><div class="text-xs text-slate-500">Version</div><div class="font-semibold">{opd.version}</div></div>
      <div class="md:col-span-4 flex justify-end">{#if canUpdateCurrentOpd($currentUser)}<button class="btn btn-primary" type="button" on:click={openEdit}>Edit profil OPD</button>{:else}<span class="text-sm text-slate-500">Mode baca saja. Role Anda tidak memiliki opd:update.</span>{/if}</div>
    </div>
  {/if}

  {#if editing}
    <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <div class="card w-full max-w-xl" role="dialog" aria-modal="true" aria-label="Edit Profil OPD Pengguna">
        <h2 class="text-xl font-bold">Edit Profil OPD Pengguna</h2>
        <div class="mt-4 grid gap-3">
          <label class="text-sm font-semibold text-slate-700">Kode OPD edit<input class="input mt-1" bind:value={editing.kode} /></label>
          <label class="text-sm font-semibold text-slate-700">Nama OPD edit<input class="input mt-1" bind:value={editing.name} /></label>
          <label class="text-sm font-semibold text-slate-700">Singkatan OPD edit<input class="input mt-1" bind:value={editing.shortName} /></label>
          <label class="text-sm font-semibold text-slate-700">Kepala OPD edit<input class="input mt-1" bind:value={editing.kepala} /></label>
        </div>
        <div class="mt-4 flex justify-end gap-2"><button class="btn btn-secondary" type="button" on:click={() => (editing = null)}>Batal</button><button class="btn btn-primary" type="button" on:click={saveEdit}>Simpan profil OPD</button></div>
      </div>
    </div>
  {/if}
</div>