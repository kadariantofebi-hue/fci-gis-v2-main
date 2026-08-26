<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { queryReports } from '$lib/services/api/reports';
  import { enqueueExportJob, pollJob, type Job } from '$lib/services/api/jobs';

  const years = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016'];
  const assetTypes = ['tanah', 'bangunan', 'jalan', 'saluran', 'lapangan', 'makam', 'taman', 'lainnya'];
  const rights = ['SHM', 'HGB', 'HPL', 'HP', 'HM', 'Pakai', 'Pengelolaan', 'Lainnya'];
  const templates = {
    excel: 'Excel Rekap',
    shapefile: 'Shapefile per geometri',
    atlas_pdf: 'Atlas PDF'
  } as const;
  type Template = keyof typeof templates;

  let result = $state<any>(null);
  let exportJob = $state<Job | null>(null);
  let exporting = $state(false);
  let page = $state(1);
  let pageSize = $state(5);
  let template = $state<Template>('excel');
  let filters = $state({ jenis: '', hak: '', hasGeom: 'all', tahun: '', hasAttachment: 'all', hasSp2d: 'all' });

  let totalRows = $derived(result?.rows?.length ?? 0);
  let totalPages = $derived(Math.max(1, Math.ceil(totalRows / Number(pageSize))));
  $effect(() => {
    if (page > totalPages) page = totalPages;
  });
  let pagedRows = $derived(result?.rows?.slice((page - 1) * Number(pageSize), page * Number(pageSize)) ?? []);

  async function load() {
    const r = await queryReports(filters);
    if (r.success) {
      result = r.data;
      page = 1;
    }
  }

  function appliedFilterText() {
    return (
      Object.entries(filters)
        .filter(([, v]) => v && v !== 'all')
        .map(([k, v]) => `${k}=${v}`)
        .join(', ') || 'tanpa filter'
    );
  }

  async function queueExportJob() {
    if (exporting) return;
    exporting = true;
    try {
      // enqueue + first poll driven by the shared jobs.ts service.
      // `template` here maps to the export job's JobTemplate kind.
      const tpl: 'excel' | 'pdf' | 'shapefile' | 'atlas' = template === 'atlas_pdf' ? 'atlas' : (template as 'excel' | 'pdf' | 'shapefile');
      const enq = await enqueueExportJob(tpl, { template: tpl, filters });
      if (!enq.success) {
        exportJob = null;
        return;
      }
      exportJob = enq.data;
      // Drive the WAITING -> ACTIVE -> COMPLETED state machine via pollJob.
      const polled = await pollJob('export', enq.data.id, 80, 4);
      if (polled.success) exportJob = polled.data;
    } finally {
      exporting = false;
    }
  }

  onMount(load);
</script>

<svelte:head><title>SIMANTA - Laporan Interaktif</title></svelte:head>

<div class="space-y-4">
  <h1 class="text-2xl font-bold">Laporan Interaktif</h1>
  <p class="text-sm text-slate-500">
    Scope laporan mengikuti OPD aktif/default implisit sesuai MVP PRD v1.3.7.
  </p>
  <p class="text-xs text-slate-400" data-testid="reports-scope">
    Scope: <code class="rounded bg-slate-100 px-1">{result?.scopeApplied ?? 'own_opd'}</code>
  </p>
  <p class="text-xs text-slate-500">
    <a href={resolve('/reports/presets')} class="text-cyan-700 underline" data-testid="reports-presets-link">Kelola report presets</a>
    (memerlukan izin <code>report:preset_manage</code> per PRD §6.1.2).
  </p>

  <div class="card grid gap-3 md:grid-cols-3 xl:grid-cols-7">
    <select class="input" bind:value={filters.jenis} onchange={load} aria-label="Filter laporan jenis aset">
      <option value="">Semua jenis</option>
      {#each assetTypes as j (j)}<option value={j}>{j}</option>{/each}
    </select>
    <select class="input" bind:value={filters.hak} onchange={load} aria-label="Filter laporan status hak">
      <option value="">Semua hak</option>
      {#each rights as h (h)}<option value={h}>{h}</option>{/each}
    </select>
    <select class="input" bind:value={filters.hasGeom} onchange={load} aria-label="Filter laporan status geometry">
      <option value="all">Semua geom</option>
      <option value="yes">Terpetakan</option>
      <option value="no">Belum dipetakan</option>
    </select>
    <select class="input" bind:value={filters.tahun} onchange={load} aria-label="Filter laporan tahun pengadaan">
      <option value="">Semua tahun</option>
      {#each years as y (y)}<option value={y}>{y}</option>{/each}
    </select>
    <select class="input" bind:value={filters.hasAttachment} onchange={load} aria-label="Filter laporan ada lampiran">
      <option value="all">Semua lampiran</option>
      <option value="yes">Ada lampiran</option>
      <option value="no">Tanpa lampiran</option>
    </select>
    <select class="input" bind:value={filters.hasSp2d} onchange={load} aria-label="Filter laporan status SP2D">
      <option value="all">Semua SP2D</option>
      <option value="yes">Ada SP2D</option>
      <option value="no">Tanpa SP2D</option>
    </select>
    <button class="btn btn-secondary" type="button" onclick={queueExportJob} disabled={exporting} data-testid="reports-create-job">
      {exporting ? 'Membuat job...' : 'Buat job export mock'}
    </button>
  </div>

  {#if exportJob}
    <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status" aria-label="Status export job laporan" data-testid="reports-job-status">
      EXPORT_JOB_QUEUED {exportJob.id}: {exportJob.state} ({exportJob.progress}%) · queue={exportJob.queue} · template={exportJob.template} · filter {appliedFilterText()}
      {#if exportJob.state === 'COMPLETED' && exportJob.resultUrl}
        · result=<code class="rounded bg-white/70 px-1">{exportJob.resultUrl}</code>
      {/if}
    </div>
  {/if}

  {#if result}
    <div class="grid gap-4 md:grid-cols-4">
      <div class="card">Total: <b>{result.summary.totalAssets}</b></div>
      <div class="card">Luas: <b>{Math.round(result.summary.totalLuas)} m²</b></div>
      <div class="card">Panjang: <b>{Math.round(result.summary.totalPanjang)} m</b></div>
      <div class="card">Belum dipetakan: <b>{result.summary.tanpaGeometri}</b></div>
    </div>
    <div class="card overflow-x-auto">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label class="text-sm font-semibold text-slate-700">Baris per halaman
          <select class="input ml-2 w-24" bind:value={pageSize} onchange={() => (page = 1)} aria-label="Jumlah baris laporan per halaman">
            <option value="2">2</option><option value="5">5</option><option value="10">10</option>
          </select>
        </label>
        <div class="text-sm font-semibold text-slate-600">Halaman laporan {page} dari {totalPages}</div>
      </div>
      <table class="table">
        <thead>
          <tr><th>ID</th><th>Nama</th><th>OPD aktif</th><th>Jenis</th><th>Hak</th><th>Tahun</th><th>Lampiran</th><th>SP2D</th><th>Geom</th></tr>
        </thead>
        <tbody>
          {#each pagedRows as r (r.idPemda)}
            <tr>
              <td>{r.idPemda}</td>
              <td>{r.name}</td>
              <td>{r.opdName}</td>
              <td>{r.jenis}</td>
              <td>{r.hak}</td>
              <td>{r.tahun}</td>
              <td>{r.hasAttachment ? 'Ada' : 'Tidak'}</td>
              <td>{r.sp2dNumber || 'Tidak ada'}</td>
              <td>{r.hasGeom ? 'Ya' : 'Tidak'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="mt-4 flex items-center justify-between gap-3">
        <button class="btn btn-secondary" type="button" disabled={page <= 1} onclick={() => (page -= 1)} aria-label="Halaman laporan sebelumnya">Sebelumnya</button>
        <button class="btn btn-secondary" type="button" disabled={page >= totalPages} onclick={() => (page += 1)} aria-label="Halaman laporan berikutnya">Berikutnya</button>
      </div>
    </div>
  {/if}
</div>
