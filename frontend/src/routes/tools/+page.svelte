<script lang="ts">
  import { FileSpreadsheet, FileText, FileArchive, BookOpen, UploadCloud, Loader2, CheckCircle2, XCircle } from 'lucide-svelte';
  import { enqueueExportJob, enqueueImportJob, pollJob, type Job, type JobTemplate } from '$lib/services/api/jobs';

  type TileKey = 'excel' | 'pdf' | 'shapefile' | 'atlas' | 'import';

  const tiles: Array<{
    key: TileKey;
    title: string;
    description: string;
    endpoint: string;
    icon: typeof FileSpreadsheet;
    tone: string;
    template: JobTemplate | null;
    label: string;
    ariaLabel: string;
  }> = [
    {
      key: 'excel',
      title: 'Export Excel',
      description: 'Rekap data aset terfilter ke workbook Excel (.xlsx).',
      endpoint: '/api/v1/export/excel',
      icon: FileSpreadsheet,
      tone: 'emerald',
      template: 'excel',
      label: 'Mock / Contract-first',
      ariaLabel: 'Buka mock job Excel'
    },
    {
      key: 'pdf',
      title: 'Export PDF',
      description: 'Cetak laporan ringkas per OPD aktif ke PDF.',
      endpoint: '/api/v1/export/pdf',
      icon: FileText,
      tone: 'cyan',
      template: 'pdf',
      label: 'Mock / Contract-first',
      ariaLabel: 'Buka mock job PDF'
    },
    {
      key: 'shapefile',
      title: 'Export Shapefile ZIP',
      description: 'Shapefile per jenis geometri (polygon/line/point), dipisah sesuai PRD §13.',
      endpoint: '/api/v1/export/shapefile',
      icon: FileArchive,
      tone: 'amber',
      template: 'shapefile',
      label: 'Mock / Contract-first',
      ariaLabel: 'Buka mock job Shapefile'
    },
    {
      key: 'atlas',
      title: 'Atlas PDF (Post-MVP depth, contract-only this iteration)',
      description: 'Booklet multi-halaman berisi peta tematik per area/wilayah.',
      endpoint: '/api/v1/export/atlas',
      icon: BookOpen,
      tone: 'indigo',
      template: 'atlas',
      label: 'Mock / Contract-first',
      ariaLabel: 'Buka mock job Atlas'
    },
    {
      key: 'import',
      title: 'Import Preview',
      description: 'Two-phase import: upload → preview → commit (mock, tanpa CRUD aktif).',
      endpoint: '/api/v1/import/shapefile/preview',
      icon: UploadCloud,
      tone: 'rose',
      template: 'import_preview',
      label: 'Mock / Contract-first',
      ariaLabel: 'Buka mock import preview'
    }
  ];

  const toneClass: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  let activeJob: Job | null = null;
  let activeJobKey: TileKey | null = null;
  let polling = false;
  let pollError = '';
  // Generation counter guards against a stale in-flight pollJob from
  // an earlier tile click clobbering activeJob after the user has moved
  // on to a different tile. (OMP I-3 race condition.)
  let pollGeneration = 0;

  type ExportTemplate = Exclude<JobTemplate, 'import_preview' | 'bulk_asset'>;
  async function startJob(key: TileKey, template: JobTemplate | null) {
    if (!template) return;
    const myGeneration = ++pollGeneration;
    activeJobKey = key;
    activeJob = null;
    pollError = '';
    polling = true;
    try {
      const enq =
        template === 'import_preview'
          ? await enqueueImportJob()
          : await enqueueExportJob(template as ExportTemplate);
      if (myGeneration !== pollGeneration) return; // superseded by a newer click
      if (!enq.success) {
        pollError = enq.message;
        return;
      }
      activeJob = enq.data;
      const kind = template === 'import_preview' ? 'import' : 'export';
      const polled = await pollJob(kind, enq.data.id, 80, 4);
      if (myGeneration !== pollGeneration) return;
      if (polled.success) activeJob = polled.data;
      else pollError = polled.message;
    } finally {
      if (myGeneration === pollGeneration) polling = false;
    }
  }

  function dismissJob() {
    activeJob = null;
    activeJobKey = null;
    pollError = '';
  }
</script>

<svelte:head><title>SIMANTA - Import / Export / Atlas</title></svelte:head>

<div class="space-y-4">
  <div>
    <div class="kicker">Tools · Mock entry tile</div>
    <h1 class="text-2xl font-bold">Import / Export / Atlas</h1>
    <p class="mt-1 text-sm text-slate-500">
      Entry tile untuk alur MVP. Job diproses async via shared <code class="rounded bg-slate-100 px-1 py-0.5 text-xs">jobs.ts</code> service ke endpoint PRD-aligned (lihat deskripsi per tile).
    </p>
  </div>

  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Daftar tile import, export, dan atlas">
    {#each tiles as tile}
      <div class="card flex flex-col gap-3" data-testid="tools-tile" data-tools-tile={tile.key} aria-disabled="false">
        <div class="flex items-start justify-between gap-3">
          <div class={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${toneClass[tile.tone]}`}>
            <svelte:component this={tile.icon} size={18} strokeWidth={2.2} />
          </div>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">{tile.label}</span>
        </div>
        <div>
          <h2 class="text-base font-bold text-slate-950">{tile.title}</h2>
          <p class="mt-1 text-sm text-slate-500">{tile.description}</p>
        </div>
        <div class="mt-auto flex items-center justify-between gap-2 text-xs">
          <code class="truncate rounded bg-slate-50 px-1.5 py-0.5 text-slate-600 ring-1 ring-slate-200">{tile.endpoint}</code>
          <button
            type="button"
            class="btn btn-primary !text-xs"
            on:click={() => startJob(tile.key, tile.template)}
            disabled={polling}
            aria-label={tile.ariaLabel}
            data-testid={`tools-tile-action-${tile.key}`}
          >
            {polling && activeJobKey === tile.key ? 'Membuat job...' : 'Buka mock job'}
          </button>
        </div>
      </div>
    {/each}
  </div>

  {#if activeJob || pollError}
    <div class="card border-l-4 border-l-emerald-400" data-testid="tools-job-status">
      {#if pollError}
        <div class="flex items-start gap-2 text-sm text-rose-700" role="alert">
          <XCircle size={18} />
          <div>
            <div class="font-bold">Job gagal</div>
            <div class="mt-1 text-xs">{pollError}</div>
          </div>
        </div>
      {:else if activeJob}
        <div class="flex items-start gap-3" data-testid="tools-job-card">
          <div class="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            {#if activeJob.state === 'COMPLETED'}
              <CheckCircle2 size={18} />
            {:else if activeJob.state === 'FAILED'}
              <XCircle size={18} />
            {:else}
              <Loader2 size={18} class="animate-spin" />
            {/if}
          </div>
          <div class="flex-1 text-sm">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-bold text-slate-950">{activeJob.template}</span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">{activeJob.state}</span>
              <span class="text-xs text-slate-500">{activeJob.progress}%</span>
            </div>
            <div class="mt-1 text-xs text-slate-500">
              id=<code class="rounded bg-slate-50 px-1">{activeJob.id}</code> · queue=<code class="rounded bg-slate-50 px-1">{activeJob.queue}</code> · kind=<code class="rounded bg-slate-50 px-1">{activeJob.kind}</code>
            </div>
            {#if activeJob.state === 'COMPLETED' && activeJob.resultUrl}
              <div class="mt-1 text-xs text-slate-500">result=<code class="rounded bg-slate-50 px-1">{activeJob.resultUrl}</code></div>
            {/if}
          </div>
          <button class="btn btn-secondary !text-xs" on:click={dismissJob} data-testid="tools-job-dismiss">Tutup</button>
        </div>
      {/if}
    </div>
  {/if}

  <div class="card border-l-4 border-l-amber-400 bg-amber-50/40 text-sm text-amber-900">
    <div class="font-bold">Catatan MVP</div>
    <p class="mt-1">
      Tile di atas adalah representasi kontrak PRD v1.3.7. Job aktual akan diproses oleh
      <code class="rounded bg-white px-1 py-0.5">/api/v1/export/jobs/:id</code>,
      <code class="rounded bg-white px-1 py-0.5">/api/v1/import/jobs/:id</code>, dan
      <code class="rounded bg-white px-1 py-0.5">/api/v1/bulk/jobs/:id</code> saat backend hidup.
      Mock mensimulasikan state machine <code class="rounded bg-white px-1 py-0.5">WAITING → ACTIVE → COMPLETED</code>
      lewat shared <code class="rounded bg-white px-1 py-0.5">jobs.ts</code> service. Backend integration adalah lingkup Go-live.
    </p>
  </div>
</div>
