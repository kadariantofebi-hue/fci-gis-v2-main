<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getAsset, getAssetHistory } from '$lib/services/api/assets';
  import AttachmentList from '$lib/components/crud/AttachmentList.svelte';
  import type { Asset, AssetHistoryItem } from '$shared/schemas/asset';

  let asset: Asset | null = null;
  let history: AssetHistoryItem[] = [];

  onMount(async () => {
    const r = await getAsset($page.params.id as string);
    if (r.success) asset = r.data;
    const h = await getAssetHistory($page.params.id as string);
    if (h.success) history = h.data;
  });
</script>

{#if asset}
  <div class="space-y-4">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold">{asset.name}</h1>
        <p class="text-sm text-slate-500">
          {asset.idPemda} • {asset.ownerOpdName} • version {asset.version}
        </p>
      </div>
      <div class="space-x-2">
        <a class="btn btn-secondary" href={`/assets/${asset.id}/history`}>Riwayat</a>
        <a class="btn btn-primary" href={`/assets/${asset.id}/edit`}>Edit</a>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="card">
        <div class="text-xs text-slate-500">Jenis</div>
        <div class="text-xl font-bold">{asset.jenis}</div>
      </div>
      <div class="card">
        <div class="text-xs text-slate-500">Hak</div>
        <div class="text-xl font-bold">{asset.hak}</div>
      </div>
      <div class="card">
        <div class="text-xs text-slate-500">Geometry</div>
        {#if asset.geom}
          <span class="badge bg-emerald-100 text-emerald-700">{asset.geom.type}</span>
        {:else}
          <span class="badge bg-amber-100 text-amber-700">Belum dipetakan</span>
        {/if}
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="card">
        <h2 class="font-semibold">Atribut & nilai</h2>
        <dl class="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt>Alamat</dt>
          <dd>{asset.alamat}</dd>
          <dt>Luas spasial</dt>
          <dd>{asset.luasSpasial ?? '-'} m²</dd>
          <dt>Panjang spasial</dt>
          <dd>{asset.panjangSpasial ?? '-'} m</dd>
          <dt>SP2D</dt>
          <dd>{asset.sp2dNumber ?? '-'}</dd>
        </dl>
      </div>
      <div class="card">
        <h2 class="font-semibold">Map preview</h2>
        <pre class="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-emerald-200">{JSON.stringify(asset.geom, null, 2)}</pre>
      </div>
    </div>

    <div class="card">
      <h2 class="font-semibold">Lampiran asset_attachments</h2>
      <AttachmentList attachments={asset.attachments} assetId={asset.id} />
    </div>

    <div class="card">
      <h2 class="font-semibold">Ringkasan version/history</h2>
      {#each history as h}
        <div class="border-b border-slate-100 py-2 text-sm">
          <b>{h.action}</b> oleh {h.actor} • {h.at}
          <div class="text-slate-500">{h.summary}</div>
        </div>
      {/each}
    </div>
  </div>
{:else}
  <div class="card">Memuat detail aset...</div>
{/if}
