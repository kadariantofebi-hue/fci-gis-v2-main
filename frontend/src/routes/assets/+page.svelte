<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { currentUser } from '$lib/stores/auth';
  import { canCreateAssets } from '$lib/auth/permissions';
  import { listAssets } from '$lib/services/api/assets';
  import { getCurrentOpd } from '$lib/services/api/opd';
  import { hasGeomFromQuery, hasGeomToQuery, type HasGeomFilter } from '$lib/assets-filters';
  import type { Asset, AssetFilters } from '$shared/schemas/asset';

  let items: Asset[] = [];
  let activeOpd: any = null;
  // Default filter: 'all' untuk semua dropdown; di-hydrate dari query param
  // `?has_geom=false` agar klik dari dashboard stat card "Belum dipetakan"
  // langsung menampilkan daftar aset tanpa geometri (PRD §6.8).
  let filters: AssetFilters = { q: '', jenis: '', hasGeom: 'all' };

  // Hydrate filters.hasGeom dari query param (PRD §6.8 use case).
  // Sinkron satu arah: query param ke filter, plus sanitize invalid values.
  $: hydrateHasGeomFromQuery($page.url.searchParams);

  function hydrateHasGeomFromQuery(params: URLSearchParams) {
    const raw = params.get('has_geom');
    if (raw === null) return; // no query param; keep current filter
    const fromQuery = hasGeomFromQuery(raw);
    if (fromQuery === null) {
      // Invalid value (e.g. ?has_geom=foo) — strip the bad param so URL is
      // normalized, then keep the existing filter. Single reactive
      // statement avoids an extra render cycle.
      const url = new URL($page.url);
      url.searchParams.delete('has_geom');
      void goto(url.pathname + url.search, { replaceState: true, noScroll: true });
      return;
    }
    if (filters.hasGeom !== fromQuery) {
      filters.hasGeom = fromQuery;
      load();
    }
  }

  // Saat user ganti dropdown, sync ke URL (drop param jika 'all').
  $: syncHasGeomToUrl(filters.hasGeom ?? 'all');

  async function syncHasGeomToUrl(value: HasGeomFilter) {
    const url = new URL($page.url);
    const target = hasGeomToQuery(value);
    if (target === null) {
      if (url.searchParams.has('has_geom')) {
        url.searchParams.delete('has_geom');
        await goto(url.pathname + url.search, { replaceState: true, noScroll: true });
      }
    } else {
      if (url.searchParams.get('has_geom') !== target) {
        url.searchParams.set('has_geom', target);
        await goto(url.pathname + url.search, { replaceState: true, noScroll: true });
      }
    }
  }

  async function load() {
    const [a, o] = await Promise.all([listAssets(filters), getCurrentOpd()]);
    if (a.success) items = a.data.items;
    if (o.success) activeOpd = o.data;
  }

  onMount(load);
</script>

<svelte:head><title>SIMANTA - Daftar Aset</title></svelte:head>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Daftar Aset</h1>
      <p class="text-sm text-slate-500">
        Filter q, jenis, dan status geometry untuk OPD aktif/default
        {activeOpd?.shortName ?? ''}.
      </p>
    </div>
    {#if canCreateAssets($currentUser)}
      <a class="btn btn-primary" href="/assets/create">Tambah aset</a>
    {/if}
  </div>

  <div class="card grid gap-3 md:grid-cols-4">
    <input
      class="input"
      bind:value={filters.q}
      on:input={load}
      placeholder="Cari ID/Nama/Alamat"
      aria-label="Cari aset"
    />
    <select
      class="input"
      bind:value={filters.jenis}
      on:change={load}
      aria-label="Filter jenis aset"
    >
      <option value="">Semua jenis</option>
      {#each ['tanah', 'bangunan', 'jalan', 'saluran', 'lapangan', 'makam', 'taman', 'lainnya'] as j}
        <option value={j}>{j}</option>
      {/each}
    </select>
    <select
      class="input"
      bind:value={filters.hasGeom}
      on:change={load}
      aria-label="Filter status geometry"
      data-testid="filter-has-geom"
    >
      <option value="all">Semua geometry</option>
      <option value="yes">Sudah dipetakan</option>
      <option value="no">Belum dipetakan</option>
    </select>
    <button class="btn btn-secondary" on:click={load}>Refresh</button>
  </div>

  <div class="card overflow-x-auto">
    <table class="table">
      <thead>
        <tr>
          <th>ID Pemda</th>
          <th>Nama</th>
          <th>Jenis</th>
          <th>OPD aktif</th>
          <th>Geometry</th>
          <th>Version</th>
        </tr>
      </thead>
      <tbody>
        {#each items as a}
          <tr>
            <td>
              <a class="font-semibold text-emerald-700" href={`/assets/${a.id}`}>{a.idPemda}</a>
            </td>
            <td>
              {a.name}
              <div class="text-xs text-slate-500">{a.alamat}</div>
            </td>
            <td>{a.jenis}</td>
            <td>{a.ownerOpdName}</td>
            <td>
              {#if a.geom}
                <span class="badge bg-emerald-100 text-emerald-700">Terpetakan</span>
              {:else}
                <span class="badge bg-amber-100 text-amber-700">Belum dipetakan</span>
              {/if}
            </td>
            <td>v{a.version}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
