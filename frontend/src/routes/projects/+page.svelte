<script lang="ts">
  import { currentUser } from '$lib/stores/auth';
  import { canCreateProjects, canReadPaymentHistory, canReadProjectDocumentsAggregate, canReadSensitiveProjectDocumentsAggregate, canSeeSensitiveProjectData } from '$lib/auth/permissions';
  import { listProjects } from '$lib/services/api/projects';
  import type { JenisInfrastruktur, ProjectStatus } from '$shared/enums';

  let items: any[] = [];
  let filters = {
    q: '',
    skProyek: '',
    contractNumber: '',
    jenisInfrastruktur: '',
    district: '',
    status: '',
    fiscalYear: ''
  };
  let projectListVisibilityKey = '';
  let loadSeq = 0;

  const STATUSES: ProjectStatus[] = ['planning', 'procurement', 'contracted', 'in_progress', 'handover', 'completed', 'cancelled', 'archived'];
  const JENIS: JenisInfrastruktur[] = ['jalan', 'sungai', 'drainase', 'saluran', 'bangunan', 'lapangan', 'taman', 'lainnya'];

  async function load() {
    const seq = ++loadSeq;
    const r = await listProjects(filters, {
      includeProjectDocuments: canReadProjectDocumentsAggregate($currentUser),
      includeSensitiveDocuments: canReadSensitiveProjectDocumentsAggregate($currentUser),
      includeSensitivePayments: canReadPaymentHistory($currentUser)
    });
    if (seq !== loadSeq) return;
    if (r.success) items = r.data.items;
  }

  const money = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  $: nextProjectListVisibilityKey = `${$currentUser?.id ?? 'anonymous'}:${canReadProjectDocumentsAggregate($currentUser)}:${canReadSensitiveProjectDocumentsAggregate($currentUser)}:${canReadPaymentHistory($currentUser)}`;
  $: if (nextProjectListVisibilityKey !== projectListVisibilityKey) {
    projectListVisibilityKey = nextProjectListVisibilityKey;
    items = [];
    load();
  }
</script>

<svelte:head><title>SIMANTA - Administrasi Proyek GIS</title></svelte:head>

<div class="space-y-4">
  <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <div class="kicker">Pilar Administrasi</div>
      <h1 class="text-2xl font-bold">Administrasi Proyek GIS</h1>
    </div>
    {#if canCreateProjects($currentUser)}
      <a class="btn btn-secondary" href="/projects/create">Tambah proyek mock</a>
    {/if}
  </div>

  <div class="card overflow-x-auto">
    <table class="table">
      <thead>
        <tr>
          <th>
            <div>SK Proyek/Juklak</div>
            <input class="input !py-1 !text-xs mt-1 w-full" placeholder="filter..." bind:value={filters.skProyek} on:input={load} aria-label="Filter SK proyek atau juklak" />
          </th>
          <th>
            <div>Kode/Nama</div>
            <input class="input !py-1 !text-xs mt-1 w-full" placeholder="filter..." bind:value={filters.q} on:input={load} aria-label="Filter kode atau nama proyek" />
          </th>
          <th>
            <div>Kontrak</div>
            <input class="input !py-1 !text-xs mt-1 w-full" placeholder="filter..." bind:value={filters.contractNumber} on:input={load} aria-label="Filter nomor kontrak" />
          </th>
          <th>
            <div>Jenis Proyek</div>
            <select class="input !py-1 !text-xs mt-1 w-full" bind:value={filters.jenisInfrastruktur} on:change={load} aria-label="Filter jenis proyek">
              <option value="">Semua</option>
              {#each JENIS as j}<option value={j}>{j}</option>{/each}
            </select>
          </th>
          <th>
            <div>Daerah</div>
            <input class="input !py-1 !text-xs mt-1 w-full" placeholder="filter kecamatan..." bind:value={filters.district} on:input={load} aria-label="Filter kecamatan" />
          </th>
          <th>
            <div>Status</div>
            <select class="input !py-1 !text-xs mt-1 w-full" bind:value={filters.status} on:change={load} aria-label="Filter status">
              <option value="">Semua</option>
              {#each STATUSES as s}<option value={s}>{s}</option>{/each}
            </select>
          </th>
          <th>
            <div>Tahun</div>
            <input class="input !py-1 !text-xs mt-1 w-full" placeholder="YYYY" bind:value={filters.fiscalYear} on:input={load} aria-label="Filter tahun anggaran" />
          </th>
          <th>Dokumen</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {#each items as p}
          <tr>
            <td>
              <span class="font-medium text-slate-800">{p.skProyek ?? '—'}</span>
            </td>
            <td><a class="font-semibold text-emerald-700" href={`/projects/${p.id}`}>{p.projectCode}</a><div>{p.projectName}</div></td>
            <td>{p.contractNumber}<div class="text-xs text-slate-500">{canSeeSensitiveProjectData($currentUser) ? money(p.contractValue) : 'Nilai kontrak disembunyikan RBAC'}</div></td>
            <td>
              {#if p.jenisInfrastruktur}
                <span class="badge bg-emerald-100 text-emerald-700">{p.jenisInfrastruktur}</span>
              {:else}
                <span class="text-xs text-slate-400">—</span>
              {/if}
            </td>
            <td>
              <span class="badge bg-slate-100 text-slate-700">
                {p.district ?? '—'} - {p.roadName ?? '—'}
              </span>
            </td>
            <td><span class="badge bg-cyan-100 text-cyan-700">{p.status}</span></td>
            <td>{p.fiscalYear}</td>
            <td>{p.documentSummary?.verified ?? 0}/{p.documentSummary?.total ?? 0} verified</td>
            <td><a class="text-sm font-semibold text-emerald-700" href={`/projects/${p.id}`}>Ringkasan</a></td>
          </tr>
        {/each}
        {#if items.length === 0}
          <tr><td colspan="9" class="text-center text-sm text-slate-500">Tidak ada proyek yang cocok dengan filter saat ini.</td></tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
