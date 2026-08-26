<script lang="ts">
  import { page } from '$app/stores';
  import { currentUser } from '$lib/stores/auth';
  import { canReadPaymentHistory, canReadProjectDocumentForProject, canReadSensitiveProjectDocumentForProject, canSeeSensitiveProjectData } from '$lib/auth/permissions';
  import ProjectSubnav from '$lib/components/projects/ProjectSubnav.svelte';
  import { getProjectBundle } from '$lib/services/api/projects';

  let b: any = null;
  let projectId = '';
  let projectVisibilityKey = '';
  let loadSeq = 0;
  const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

  $: projectId = $page.params.id as string;
  $: canReadDocs = projectId ? canReadProjectDocumentForProject($currentUser, projectId) : false;
  $: canReadSensitiveDocs = projectId ? canReadSensitiveProjectDocumentForProject($currentUser, projectId) : false;
  $: nextProjectVisibilityKey = `${projectId}:${$currentUser?.id ?? 'anonymous'}:${canReadDocs}:${canReadSensitiveDocs}:${canReadPaymentHistory($currentUser)}`;
  $: if (projectId && nextProjectVisibilityKey !== projectVisibilityKey) {
    projectVisibilityKey = nextProjectVisibilityKey;
    b = null;
    loadProjectBundle();
  }

  async function loadProjectBundle() {
    const seq = ++loadSeq;
    const response = await getProjectBundle(projectId, {
      includeProjectDocuments: canReadDocs,
      includeSensitiveDocuments: canReadSensitiveDocs,
      includeSensitivePayments: canReadPaymentHistory($currentUser)
    });
    if (seq !== loadSeq) return;
    if (response.success) b = response.data;
  }
</script>

<svelte:head><title>SIMANTA - Detail Administrasi Proyek GIS</title></svelte:head>

{#if b}
  <div class="space-y-4">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="kicker">Administrasi Proyek GIS · audit-ready repository</div>
        <h1 class="text-2xl font-bold">Administrasi Proyek GIS</h1>
        <h2 class="mt-1 text-lg font-semibold text-slate-700">{b.project.projectName}</h2>
        <p class="text-sm text-slate-500">{b.project.projectCode} • {b.project.contractNumber}{b.project.skProyek ? ` • ${b.project.skProyek}` : ''}</p>
      </div>
      <ProjectSubnav projectId={b.project.id} />
    </div>

    <div class="grid gap-4 md:grid-cols-4">
      <div class="card"><div class="text-xs text-slate-500">Vendor</div><b>{b.project.vendorName}</b></div>
      <div class="card"><div class="text-xs text-slate-500">Nilai Kontrak</div><b>{canSeeSensitiveProjectData($currentUser) ? money(b.project.contractValue) : 'Disembunyikan'}</b></div>
      <div class="card"><div class="text-xs text-slate-500">Status</div><span class="badge bg-cyan-100 text-cyan-700">{b.project.status}</span></div>
      <div class="card"><div class="text-xs text-slate-500">Checklist terlihat</div><b>{b.project.documentSummary.verified}/{b.project.documentSummary.total} verified</b></div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div id="timeline" class="card scroll-mt-24">
        <h2 class="font-semibold">Timeline & Milestone</h2>
        {#each b.milestones as milestone}
          <div class="border-b py-2"><b>{milestone.name}</b><div class="text-sm text-slate-500">Rencana {milestone.plannedDate}{milestone.actualDate ? ` • Aktual ${milestone.actualDate}` : ' • Belum aktual'}</div>{#if milestone.notes}<div class="text-xs text-slate-500">{milestone.notes}</div>{/if}</div>
        {/each}
      </div>

      {#if canReadDocs}
        <div class="card">
          <h2 class="font-semibold">Dokumen & Checklist</h2>
          <p class="mb-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Dokumen/file sensitif di-omit total untuk role tanpa permission; angka di halaman ini hanya menghitung dokumen yang boleh terlihat.</p>
          {#each b.documents.slice(0, 8) as document}
            <div class="flex justify-between border-b py-2 text-sm">
              <span>{document.title}</span>
              <span class={`badge ${document.isSensitive ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{document.isSensitive ? 'sensitif' : 'umum'} · {document.files.length} file</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      {#if canReadPaymentHistory($currentUser)}
        <div class="card">
          <h2 class="font-semibold">Riwayat Pembayaran</h2>
          <p class="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Riwayat pembayaran read-only; SIMANTA hanya menyimpan referensi administratif invoice/termin/SP2D dan bukan sumber transaksi resmi.</p>
          {#each b.payments as payment}
            <div class="border-b py-2">
              <b>{payment.paymentTerm}</b>
              <div class="text-sm text-slate-500">{payment.invoiceNumber} • {money(payment.invoiceValue)} • {payment.paymentStatus}</div>
            </div>
          {/each}
        </div>
      {/if}

      <div id="output-assets" class="card scroll-mt-24">
        <h2 class="font-semibold">Output ke Aset GIS</h2>
        <p class="mb-3 text-sm text-slate-500">Relasi read-only antara output proyek dan aset/layer GIS hasil survey, update, migrasi, atau deliverable.</p>
        {#each b.linkedAssets as link}
          <div class="border-b py-2 text-sm">
            <b>{link.asset.name}</b>
            <div class="text-slate-500">{link.relation} • {link.asset.idPemda} • {link.asset.jenis}</div>
          </div>
        {/each}
        {#if b.linkedAssets.length === 0}
          <div class="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Belum ada output proyek yang ditautkan ke aset GIS.</div>
        {/if}
      </div>
    </div>
  </div>
{/if}
