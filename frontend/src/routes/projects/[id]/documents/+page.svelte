<script lang="ts">
  import { page } from '$app/stores';
  import { currentUser } from '$lib/stores/auth';
  import { canReadPaymentHistory, canReadProjectDocumentForProject, canReadSensitiveProjectDocumentForProject, canVerifyProjectDocument, canWriteProjectDocumentForProject } from '$lib/auth/permissions';
  import ProjectSubnav from '$lib/components/projects/ProjectSubnav.svelte';
  import { createProjectDocumentFiles, getProjectBundle, verifyProjectDocument } from '$lib/services/api/projects';
  import { recordDocumentDownload, recordDocumentDownloadBlocked, recordDocumentVerify } from '$lib/stores/audit';
  import { toastStore } from '$lib/stores/toast';

  let docs: any[] = [];
  let projectId = '';
  let errorMessage = '';
  let selectedDocId = '';
  let pendingUploads: Array<{ filename: string; fileLabel: string; sizeBytes: number; fileOrder: number }> = [];
  let documentVisibilityKey = '';
  let loadSeq = 0;

  $: projectId = $page.params.id as string;
  $: canReadDocs = projectId ? canReadProjectDocumentForProject($currentUser, projectId) : false;
  $: canSeeSensitive = projectId ? canReadSensitiveProjectDocumentForProject($currentUser, projectId) : false;
  $: canSeePaymentSensitive = canReadPaymentHistory($currentUser);
  $: canUploadDocuments = projectId ? canWriteProjectDocumentForProject($currentUser, projectId) : false;
  $: nextDocumentVisibilityKey = `${projectId}:${$currentUser?.id ?? 'anonymous'}:${canReadDocs}:${canSeeSensitive}:${canSeePaymentSensitive}:${canUploadDocuments}`;
  $: if (projectId && nextDocumentVisibilityKey !== documentVisibilityKey) {
    documentVisibilityKey = nextDocumentVisibilityKey;
    docs = [];
    selectedDocId = '';
    pendingUploads = [];
    loadDocuments();
  }
  $: if (!canUploadDocuments) pendingUploads = [];

  async function loadDocuments() {
    const seq = ++loadSeq;
    const response = await getProjectBundle(projectId, {
      includeProjectDocuments: canReadDocs,
      includeSensitiveDocuments: canSeeSensitive,
      includeSensitivePayments: canSeePaymentSensitive
    });
    if (seq !== loadSeq) return;
    if (response.success) {
      docs = response.data.documents;
      selectedDocId = docs.some((doc) => doc.id === selectedDocId) ? selectedDocId : docs[0]?.id ?? '';
    }
  }

  function onFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    const start = pendingUploads.length + 1;
    pendingUploads = [
      ...pendingUploads,
      ...Array.from(input.files ?? []).map((file, index) => ({
        filename: file.name,
        fileLabel: 'lampiran',
        sizeBytes: file.size,
        fileOrder: start + index
      }))
    ];
    input.value = '';
  }

  async function commitUploads() {
    if (!selectedDocId || pendingUploads.length === 0) return;
    const response = await createProjectDocumentFiles(projectId, selectedDocId, pendingUploads as any);
    if (response.success) {
      await loadDocuments();
      toastStore.success('PROJECT_DOCUMENT_FILES_CREATED: file mock diunggah ke header dokumen ini.');
      pendingUploads = [];
    } else {
      toastStore.error(`${response.code}: ${response.message}`);
    }
  }

  function downloadPlaceholder(doc: any, file: any) {
    const sensitiveDenied = doc.isSensitive && !canSeeSensitive;

    if (sensitiveDenied || !file.isActive || file.scanStatus !== 'clean') {
      const event = recordDocumentDownloadBlocked({
        documentId: doc.id,
        fileId: file.id,
        projectId: doc.projectId,
        actorName: $currentUser?.name ?? 'Unknown user',
        metadata: sensitiveDenied
          ? { scanStatus: file.scanStatus, reason: 'permission denied' }
          : { kind: doc.kind, filename: file.filename, scanStatus: file.scanStatus, reason: 'not_active_clean' }
      });
      toastStore.warning(`${event.action}: file belum active clean atau permission tidak cukup`);
      return;
    }

    const event = recordDocumentDownload({
      documentId: doc.id,
      fileId: file.id,
      projectId: doc.projectId,
      actorName: $currentUser?.name ?? 'Unknown user',
      metadata: { kind: doc.kind, filename: file.filename, scanStatus: file.scanStatus }
    });
    toastStore.info(`${event.action} tercatat untuk ${event.fileId}`);
  }

  async function verifyDoc(doc: any) {
    const response = await verifyProjectDocument(projectId, doc.id);
    if (response.success) {
      recordDocumentVerify({
        documentId: doc.id,
        projectId,
        actorName: $currentUser?.name ?? 'Unknown user',
        metadata: { kind: doc.kind }
      });
      await loadDocuments();
      toastStore.success('PROJECT_DOCUMENT_VERIFY tercatat.');
    } else {
      errorMessage = `${response.code}: ${response.message}`;
      toastStore.error(errorMessage);
    }
  }

  const counts = (doc: any) => ({
    active: doc.files.filter((file: any) => file.isActive).length,
    clean: doc.files.filter((file: any) => file.isActive && file.scanStatus === 'clean').length,
    pending: doc.files.filter((file: any) => file.isActive && file.scanStatus === 'pending').length,
    blocked: doc.files.filter((file: any) => file.isActive && file.scanStatus === 'blocked').length
  });
</script>

<svelte:head><title>SIMANTA - Dokumen & Checklist Proyek</title></svelte:head>

<div class="space-y-4">
  <div>
    <div class="kicker">Administrasi Proyek GIS</div>
    <h1 class="text-2xl font-bold">Dokumen & Checklist Proyek</h1>
    <p class="text-sm text-slate-500">Header dokumen + multi-file mock upload. Dokumen/file sensitif di-omit total untuk role tanpa permission.</p>
  </div>

  {#if projectId}
    <ProjectSubnav {projectId} />
  {/if}

  {#if errorMessage}
    <div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800" role="alert">{errorMessage}</div>
  {/if}

  {#if canUploadDocuments}
    <div class="card space-y-3">
      <h2 class="font-bold">Mock upload multi-file interaktif</h2>
      <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <label class="text-sm font-semibold text-slate-700">
          Pilih header dokumen
          <select class="input mt-1" bind:value={selectedDocId} aria-label="Pilih header dokumen upload">
            {#each docs as doc}
              <option value={doc.id}>{doc.title} · {doc.verificationStatus}</option>
            {/each}
          </select>
        </label>
        <label class="text-sm font-semibold text-slate-700">
          Pilih multi-file
          <input class="input mt-1" type="file" multiple on:change={onFiles} aria-label="Pilih multi-file dokumen" />
        </label>
      </div>
      {#if pendingUploads.length}
        <div class="space-y-2">
          {#each pendingUploads as upload, index}
            <div class="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-sm md:grid-cols-[minmax(0,1fr)_160px_100px]">
              <div class="font-semibold">{upload.filename}</div>
              <select class="input" bind:value={upload.fileLabel} aria-label={`Label file ${index + 1}`}>
                <option value="dokumen_utama">dokumen_utama</option>
                <option value="lampiran">lampiran</option>
                <option value="revisi">revisi</option>
                <option value="bukti_pendukung">bukti_pendukung</option>
                <option value="dokumentasi">dokumentasi</option>
                <option value="lainnya">lainnya</option>
              </select>
              <input class="input" type="number" bind:value={upload.fileOrder} aria-label={`Urutan file ${index + 1}`} />
            </div>
          {/each}
          <button class="btn btn-primary" type="button" on:click={commitUploads}>Commit upload mock</button>
        </div>
      {/if}
    </div>
  {/if}

  <div class="grid gap-4">
    {#each docs as doc}
      {@const fileCounts = counts(doc)}
      <article class="card space-y-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="kicker">{doc.stage} · {doc.kind}</div>
            <h2 class="text-lg font-black text-slate-950">{doc.title}</h2>
            <p class="text-sm text-slate-500">{doc.documentNumber} · v{doc.version} · {doc.isSensitive ? 'header sensitif' : 'header umum'}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="badge bg-cyan-100 text-cyan-700">{doc.verificationStatus}</span>
            <span class="badge bg-emerald-100 text-emerald-700">clean {fileCounts.clean}</span>
            <span class="badge bg-amber-100 text-amber-700">pending {fileCounts.pending}</span>
            <span class="badge bg-rose-100 text-rose-700">blocked {fileCounts.blocked}</span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="table">
            <thead><tr><th>Urutan/Label</th><th>File</th><th>Scan/Checksum</th><th>Version</th><th>Aksi</th></tr></thead>
            <tbody>
              {#each doc.files as file}
                <tr>
                  <td>{file.fileOrder}. {file.fileLabel}</td>
                  <td>
                    {file.filename}
                    <div class="text-xs text-slate-500">Original: {file.originalFilename ?? file.filename}</div>
                    <div class="text-xs text-slate-500">Uploaded by {file.uploadedBy}</div>
                    <div class="text-xs text-slate-500">Uploaded at {new Date(file.uploadedAt).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}</div>
                  </td>
                  <td>
                    <div>Scan: {file.scanStatus}</div>
                    <div class="text-xs text-slate-500">{file.checksumSha256}</div>
                  </td>
                  <td>{file.fileVersion ?? file.version}</td>
                  <td><button class="btn btn-secondary" disabled={doc.isSensitive && !canSeeSensitive || !file.isActive || file.scanStatus !== 'clean'} on:click={() => downloadPlaceholder(doc, file)}>Download placeholder</button></td>
                </tr>
              {/each}
              {#if doc.files.length === 0}
                <tr><td colspan="5" class="text-slate-500">Belum ada file aktif. Verify akan ditolak dengan PROJECT_DOCUMENT_INCOMPLETE.</td></tr>
              {/if}
            </tbody>
          </table>
        </div>

        {#if canVerifyProjectDocument($currentUser)}
          <button class="btn btn-secondary" type="button" on:click={() => verifyDoc(doc)}>Submit/Verify mock</button>
        {/if}
      </article>
    {/each}
  </div>
</div>
