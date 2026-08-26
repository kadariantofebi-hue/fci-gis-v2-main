<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { currentUser } from '$lib/stores/auth';
  import { canWriteProjectDocument } from '$lib/auth/permissions';
  import { createProjectWithDocuments } from '$lib/services/api/projects';
  import { toastStore } from '$lib/stores/toast';
  import DigitizeMapPanel from '$lib/components/map/DigitizeMapPanel.svelte';
  import { geometryToLatLng, latLngToPoint, parseCoordInput } from '$lib/components/map/coordinate-helpers';
  import { consumeDraftGeometry } from '$lib/services/api/draft-geometry';
  import type { ProjectDocumentFileLabel, ProjectDocumentKind, ProjectStage } from '$shared/enums';
  import type { Geometry } from '$shared/geojson';

  type HeaderRow = {
    id: string;
    stage: ProjectStage;
    kind: ProjectDocumentKind;
    title: string;
    isSensitive: boolean;
  };
  type PendingFileRow = {
    filename: string;
    fileLabel: ProjectDocumentFileLabel;
    sizeBytes: number;
    fileOrder: number;
  };

  const STAGES: ProjectStage[] = ['planning', 'procurement', 'contract', 'implementation', 'handover', 'payment', 'post_project'];
  const KINDS: ProjectDocumentKind[] = [
    'kak_tor', 'hps', 'rup_reference', 'tender_document', 'aanwijzing_ba',
    'vendor_proposal', 'evaluation_ba', 'winner_appointment', 'contract', 'spmk',
    'progress_report', 'deliverable_list', 'uat_document', 'bast_final', 'receipt',
    'maintenance_report', 'change_request', 'invoice', 'tax_invoice', 'sp2d_reference',
    'payment_proof', 'other'
  ];
  const FILE_LABELS: ProjectDocumentFileLabel[] = ['dokumen_utama', 'lampiran', 'revisi', 'bukti_pendukung', 'dokumentasi', 'lainnya'];

  const DEFAULT_HEADERS: Array<Omit<HeaderRow, 'id'>> = [
    { stage: 'planning', kind: 'kak_tor', title: 'KAK/TOR', isSensitive: false },
    { stage: 'planning', kind: 'hps', title: 'HPS', isSensitive: true },
    { stage: 'contract', kind: 'contract', title: 'Kontrak', isSensitive: true },
    { stage: 'implementation', kind: 'progress_report', title: 'Laporan progres', isSensitive: false },
    { stage: 'payment', kind: 'invoice', title: 'Invoice termin', isSensitive: true }
  ];

  let statusMessage = '';
  let errorMessage = '';
  let isSubmitting = false;

  let form = {
    projectCode: '',
    projectName: '',
    fiscalYear: 2026,
    vendorName: '',
    contractNumber: '',
    skProyek: '',
    contractValue: 0,
    startDate: '2026-06-01',
    endDate: '2026-08-30',
    status: 'planning',
    description: '',
    // Alamat (PRD v1.3.7 §6.1 + 2026-06-27 revisi)
    roadName: '',
    rt: '',
    rw: '',
    kelurahan: '',
    kecamatan: '',
    // Koordinat (manual, auto-fill dari peta)
    coordLat: '' as string | number,
    coordLng: '' as string | number,
    // Geometry (sumber utama — see PRD §6.7/6.8)
    geometry: null as Geometry | null
  };
  let digitizeMode: 'point' | 'line' | 'polygon' = 'polygon';
  let coordErrors: { lat: string; lng: string } = { lat: '', lng: '' };

  // Bridge dari Dashboard "Digitasi Cepat" (spec 2026-06-27): kalau ada draft
  // geometry di sessionStorage, pre-load ke form saat mount. Consume flag
  // di-handle oleh helper supaya reload tidak auto-import ulang.
  const geometry = writable<Geometry | null>(null);
  onMount(() => {
    const draft = consumeDraftGeometry();
    if (!draft) return;
    form.geometry = draft;
    geometry.set(draft);
    if (draft.type === 'Point') digitizeMode = 'point';
    else if (draft.type === 'LineString') digitizeMode = 'line';
    else digitizeMode = 'polygon';
    const derived = geometryToLatLng(draft);
    if (derived) {
      form.coordLat = derived.lat.toFixed(6);
      form.coordLng = derived.lng.toFixed(6);
      coordErrors = { lat: '', lng: '' };
    }
    toastStore.info(`Geometry diimpor dari Dashboard (${draft.type}).`);
    // badge text does not update despite `geometry.set(draft)` being called
    // synchronously — empirically verified in E2E debug session 2026-06-27.
    // (Removing the rAF caused the badge to stay at "belum dipetakan" while
    // the toast did fire, so the rAF is a real fix, not speculative.) The
    // tick forces a second reactive pass so the badge / DigitizeMapPanel
    // value prop pick up the fresh store value.
    requestAnimationFrame(() => {
      geometry.set(draft);
    });
  });

  let headers: HeaderRow[] = DEFAULT_HEADERS.map((h, i) => ({ ...h, id: `hdr-${Date.now()}-${i}` }));
  let pendingFilesByHeader: Record<string, PendingFileRow[]> = {};

  // Drag-and-drop state (header rows only)
  let draggedHeaderId: string | null = null;
  let dropIndicatorIndex: number | null = null;

  $: canAttachFiles = canWriteProjectDocument($currentUser);
  $: totalPendingFiles = Object.values(pendingFilesByHeader).reduce((sum, arr) => sum + arr.length, 0);

  let headerCounter = 0;
  function addHeader() {
    headerCounter += 1;
    headers = [
      ...headers,
      { id: `hdr-new-${Date.now()}-${headerCounter}`, stage: 'planning', kind: 'other', title: 'Dokumen lainnya', isSensitive: false }
    ];
  }
  function removeHeader(headerId: string) {
    headers = headers.filter((h) => h.id !== headerId);
    const { [headerId]: _removed, ...rest } = pendingFilesByHeader;
    pendingFilesByHeader = rest;
  }
  function moveHeader(headerId: string, direction: -1 | 1) {
    const fromIndex = headers.findIndex((h) => h.id === headerId);
    if (fromIndex < 0) return;
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= headers.length) return;
    const next = [...headers];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    headers = next;
  }
  function onDragStart(headerId: string, event: DragEvent) {
    if (isSubmitting) return;
    draggedHeaderId = headerId;
    dropIndicatorIndex = null;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', headerId);
    }
  }
  function onDragOver(headerId: string, event: DragEvent) {
    if (isSubmitting || !draggedHeaderId) return;
    event.preventDefault();
    const row = (event.currentTarget as HTMLElement).closest('tr.dnd-row') as HTMLElement | null;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const targetIndex = headers.findIndex((h) => h.id === headerId);
    if (targetIndex < 0) return;
    // If dragging over self at the same edge, skip
    if (draggedHeaderId === headerId && (offsetY < rect.height / 2 ? targetIndex === 0 : targetIndex === headers.length - 1)) {
      dropIndicatorIndex = null;
      return;
    }
    dropIndicatorIndex = offsetY < rect.height / 2 ? targetIndex : targetIndex + 1;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }
  function onDrop(headerId: string, event: DragEvent) {
    if (isSubmitting) return;
    event.preventDefault();
    const draggedId = draggedHeaderId ?? event.dataTransfer?.getData('text/plain') ?? '';
    if (!draggedId) {
      clearDndState();
      return;
    }
    const fromIndex = headers.findIndex((h) => h.id === draggedId);
    let toIndex = dropIndicatorIndex ?? headers.findIndex((h) => h.id === headerId);
    if (fromIndex < 0 || toIndex < 0) {
      clearDndState();
      return;
    }
    if (fromIndex < toIndex) toIndex -= 1;
    if (fromIndex === toIndex) {
      clearDndState();
      return;
    }
    const next = [...headers];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    headers = next;
    clearDndState();
  }
  function onDragEnd() {
    clearDndState();
  }
  function clearDndState() {
    draggedHeaderId = null;
    dropIndicatorIndex = null;
  }
  // Form controls inside a draggable row need to stop mousedown propagation,
  // otherwise the browser starts an HTML5 drag instead of focusing the input.
  function swallowDragStart(event: MouseEvent) {
    event.stopPropagation();
  }
  function onFiles(headerId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const start = (pendingFilesByHeader[headerId]?.length ?? 0) + 1;
    const additions: PendingFileRow[] = Array.from(input.files ?? []).map((file, index) => ({
      filename: file.name,
      fileLabel: 'lampiran',
      sizeBytes: file.size,
      fileOrder: start + index
    }));
    pendingFilesByHeader = {
      ...pendingFilesByHeader,
      [headerId]: [...(pendingFilesByHeader[headerId] ?? []), ...additions]
    };
    input.value = '';
  }
  function removePendingFile(headerId: string, index: number) {
    const current = pendingFilesByHeader[headerId] ?? [];
    pendingFilesByHeader = {
      ...pendingFilesByHeader,
      [headerId]: current.filter((_, i) => i !== index)
    };
  }
  function clearPendingFiles(headerId: string) {
    pendingFilesByHeader = { ...pendingFilesByHeader, [headerId]: [] };
  }

  // Peta wilayah handlers (PRD §6.7/6.8 — geometry is canonical, lat/lng derived)
  function onGeometryChange(event: CustomEvent<Geometry | null>) {
    form.geometry = event.detail;
    geometry.set(event.detail);
    const derived = geometryToLatLng(form.geometry);
    if (derived) {
      form.coordLat = derived.lat.toFixed(6);
      form.coordLng = derived.lng.toFixed(6);
      coordErrors = { lat: '', lng: '' };
    } else {
      form.coordLat = '';
      form.coordLng = '';
    }
  }

  function onCoordLatInput() {
    coordErrors = { ...coordErrors, lat: '' };
    const parsed = parseCoordInput(form.coordLat);
    if (parsed === null) {
      if (String(form.coordLat).trim() !== '') {
        coordErrors = { ...coordErrors, lat: 'Latitude harus angka (-90 sampai 90)' };
      }
      return;
    }
    if (parsed < -90 || parsed > 90) {
      coordErrors = { ...coordErrors, lat: 'Latitude di luar jangkauan (-90 sampai 90)' };
      return;
    }
    if (digitizeMode === 'point') {
      const lng = parseCoordInput(form.coordLng);
      if (lng !== null) {
        form.geometry = latLngToPoint(parsed, lng);
        geometry.set(form.geometry);
      }
    }
  }

  function onCoordLngInput() {
    coordErrors = { ...coordErrors, lng: '' };
    const parsed = parseCoordInput(form.coordLng);
    if (parsed === null) {
      if (String(form.coordLng).trim() !== '') {
        coordErrors = { ...coordErrors, lng: 'Longitude harus angka (-180 sampai 180)' };
      }
      return;
    }
    if (parsed < -180 || parsed > 180) {
      coordErrors = { ...coordErrors, lng: 'Longitude di luar jangkauan (-180 sampai 180)' };
      return;
    }
    if (digitizeMode === 'point') {
      const lat = parseCoordInput(form.coordLat);
      if (lat !== null) {
        form.geometry = latLngToPoint(lat, parsed);
        geometry.set(form.geometry);
      }
    }
  }

  async function submit() {
    errorMessage = '';
    statusMessage = '';
    if (digitizeMode === 'point') {
      const lat = parseCoordInput(form.coordLat);
      const lng = parseCoordInput(form.coordLng);
      if (lat !== null && (lat < -90 || lat > 90)) {
        coordErrors = { ...coordErrors, lat: 'Latitude di luar jangkauan (-90 sampai 90)' };
      }
      if (lng !== null && (lng < -180 || lng > 180)) {
        coordErrors = { ...coordErrors, lng: 'Longitude di luar jangkauan (-180 sampai 180)' };
      }
      if (coordErrors.lat || coordErrors.lng) {
        errorMessage = 'VALIDATION_FAILED: Perbaiki koordinat terlebih dahulu.';
        toastStore.error(errorMessage);
        return;
      }
    }
    isSubmitting = true;

    const response = await createProjectWithDocuments({
      project: {
        projectCode: form.projectCode,
        projectName: form.projectName,
        fiscalYear: Number(form.fiscalYear),
        vendorName: form.vendorName,
        contractNumber: form.contractNumber,
        contractValue: Number(form.contractValue),
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        description: form.description,
        roadName: form.roadName,
        rt: form.rt,
        rw: form.rw,
        kelurahan: form.kelurahan,
        kecamatan: form.kecamatan,
        geometry: form.geometry
      } as any,
      documents: headers.map((h) => ({
        stage: h.stage,
        kind: h.kind,
        title: h.title,
        isSensitive: h.isSensitive,
        files: pendingFilesByHeader[h.id] ?? []
      }))
    });

    isSubmitting = false;

    if (response.success) {
      const { project, documents: createdDocs, files: createdFiles } = response.data;
      statusMessage = `PROJECT_WITH_DOCUMENTS_CREATED: ${project.projectName} + ${createdDocs.length} header + ${createdFiles.length} file.`;
      toastStore.success(statusMessage);
      await goto(`/projects/${project.id}/documents`);
    } else {
      errorMessage = `${response.code}: ${response.message}`;
      toastStore.error(errorMessage);
    }
  }
</script>

<svelte:head><title>SIMANTA - Tambah Proyek GIS</title></svelte:head>

<div class="space-y-4">
  <div>
    <div class="kicker">Administrasi Proyek GIS</div>
    <h1 class="text-2xl font-bold">Tambah Proyek GIS</h1>
  </div>

  {#if statusMessage}
    <div role="status" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{statusMessage}</div>
  {/if}
  {#if errorMessage}
    <div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{errorMessage}</div>
  {/if}

  <div class="card grid gap-4 md:grid-cols-2">
    <label class="text-sm font-semibold text-slate-700">Kode proyek<input class="input mt-1" bind:value={form.projectCode} aria-label="Kode proyek" placeholder="cth. GIS-2026-099" /></label>
    <label class="text-sm font-semibold text-slate-700">Nama proyek<input class="input mt-1" bind:value={form.projectName} aria-label="Nama proyek" /></label>
    <label class="text-sm font-semibold text-slate-700">Tahun anggaran<input class="input mt-1" type="number" bind:value={form.fiscalYear} aria-label="Tahun anggaran" /></label>
    <label class="text-sm font-semibold text-slate-700">Vendor proyek<input class="input mt-1" bind:value={form.vendorName} aria-label="Vendor proyek" /></label>
    <label class="text-sm font-semibold text-slate-700">Nomor kontrak<input class="input mt-1" bind:value={form.contractNumber} aria-label="Nomor kontrak" /></label>
    <label class="text-sm font-semibold text-slate-700">SK Proyek / Juklak<input class="input mt-1" bind:value={form.skProyek} aria-label="SK Proyek atau Juklak" placeholder="cth. SK.050/118/438.5.2/2026" /></label>
    <label class="text-sm font-semibold text-slate-700">Nilai kontrak<input class="input mt-1" type="number" bind:value={form.contractValue} aria-label="Nilai kontrak" /></label>
    <label class="text-sm font-semibold text-slate-700">Tanggal mulai<input class="input mt-1" type="date" bind:value={form.startDate} aria-label="Tanggal mulai" /></label>
    <label class="text-sm font-semibold text-slate-700">Tanggal selesai<input class="input mt-1" type="date" bind:value={form.endDate} aria-label="Tanggal selesai" /></label>
    <label class="text-sm font-semibold text-slate-700">Status proyek
      <select class="input mt-1" bind:value={form.status} aria-label="Status proyek">
        <option value="planning">planning</option>
        <option value="procurement">procurement</option>
        <option value="contracted">contracted</option>
        <option value="in_progress">in_progress</option>
        <option value="handover">handover</option>
        <option value="completed">completed</option>
        <option value="cancelled">cancelled</option>
        <option value="archived">archived</option>
      </select>
    </label>
    <label class="text-sm font-semibold text-slate-700 md:col-span-2">Deskripsi<textarea class="input mt-1" bind:value={form.description} rows="3" aria-label="Deskripsi proyek"></textarea></label>
  </div>

  <div class="card space-y-4" data-testid="project-address-card">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <div class="kicker">Administrasi Proyek GIS · lokasi &amp; peta wilayah</div>
        <h2 class="text-lg font-bold text-slate-950">Lokasi &amp; Peta wilayah</h2>
      </div>
      <div class="flex flex-wrap gap-2">
        <span class="badge bg-slate-100 text-slate-700" data-testid="project-geometry-state">
          {`Geometry: ${$geometry ? $geometry.type : 'belum dipetakan'}`}
        </span>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-6">
      <label class="text-sm font-semibold text-slate-700 md:col-span-2">Jalan<input class="input mt-1" bind:value={form.roadName} aria-label="Jalan" placeholder="cth. Jl. Raya Buduran No. 12" /></label>
      <label class="text-sm font-semibold text-slate-700">RT<input class="input mt-1" bind:value={form.rt} aria-label="RT" placeholder="cth. 03" inputmode="numeric" maxlength="4" /></label>
      <label class="text-sm font-semibold text-slate-700">RW<input class="input mt-1" bind:value={form.rw} aria-label="RW" placeholder="cth. 02" inputmode="numeric" maxlength="4" /></label>
      <label class="text-sm font-semibold text-slate-700">Kelurahan<input class="input mt-1" bind:value={form.kelurahan} aria-label="Kelurahan" placeholder="cth. Buduran" /></label>
      <label class="text-sm font-semibold text-slate-700">Kecamatan<input class="input mt-1" bind:value={form.kecamatan} aria-label="Kecamatan" placeholder="cth. Buduran" /></label>
    </div>

    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="font-semibold text-slate-700">Mode digitasi:</span>
        <div class="inline-flex overflow-hidden rounded-xl border border-slate-200" role="radiogroup" aria-label="Mode digitasi peta">
          {#each (['point', 'line', 'polygon'] as const) as mode}
            <button type="button" role="radio" aria-checked={digitizeMode === mode} class={`px-3 py-1.5 text-xs font-semibold transition ${digitizeMode === mode ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`} on:click={() => (digitizeMode = mode)} data-testid={`digitize-mode-${mode}`}>{mode === 'point' ? 'Titik' : mode === 'line' ? 'Garis' : 'Area'}</button>
          {/each}
        </div>
        <span class="ml-2 text-slate-500">Default: <b>Area (polygon)</b> untuk plot kawasan</span>
      </div>

      <DigitizeMapPanel mode={digitizeMode} value={$geometry} on:change={onGeometryChange} />

      <div class="grid gap-3 md:grid-cols-2">
        <label class="text-sm font-semibold text-slate-700">
          Latitude (auto-fill dari klik peta)
          <input class="input mt-1" type="text" inputmode="decimal" bind:value={form.coordLat} on:input={onCoordLatInput} aria-label="Latitude" aria-invalid={coordErrors.lat ? 'true' : 'false'} placeholder="-7.45123" data-testid="project-coord-lat" disabled={digitizeMode !== 'point'} />
          {#if coordErrors.lat}<p class="mt-1 text-xs text-rose-700" data-testid="project-coord-lat-error">{coordErrors.lat}</p>{/if}
        </label>
        <label class="text-sm font-semibold text-slate-700">
          Longitude (auto-fill dari klik peta)
          <input class="input mt-1" type="text" inputmode="decimal" bind:value={form.coordLng} on:input={onCoordLngInput} aria-label="Longitude" aria-invalid={coordErrors.lng ? 'true' : 'false'} placeholder="112.67890" data-testid="project-coord-lng" disabled={digitizeMode !== 'point'} />
          {#if coordErrors.lng}<p class="mt-1 text-xs text-rose-700" data-testid="project-coord-lng-error">{coordErrors.lng}</p>{/if}
        </label>
      </div>
      {#if digitizeMode !== 'point'}
        <p class="text-xs text-slate-500" data-testid="project-coord-disabled-hint">Lat/lng textbox hanya berlaku untuk mode titik. Untuk mode garis/area, geometry adalah sumber utama.</p>
      {/if}
    </div>
  </div>

  <div class="card space-y-3">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <div class="kicker">Administrasi Proyek GIS · dokumen &amp; multi-file</div>
        <h2 class="text-lg font-bold text-slate-950">Header dokumen &amp; lampiran file mock</h2>
      </div>
      <div class="flex flex-wrap gap-2">
        <span class="badge bg-cyan-100 text-cyan-700">{headers.length} header</span>
        <span class="badge bg-emerald-100 text-emerald-700">{totalPendingFiles} file mock diantrikan</span>
        {#if headers.some((h) => h.isSensitive)}<span class="badge bg-rose-100 text-rose-700">sensitif</span>{/if}
      </div>
    </div>

    {#if !canAttachFiles}
      <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800" role="status">
        Role <b>{$currentUser?.role ?? 'unknown'}</b> tidak memiliki <code>project:document_write</code>. Header dokumen tetap tersimpan, namun picker file di-disable.
      </div>
    {/if}

    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th class="w-10">#</th>
            <th>Tahapan</th>
            <th>Header Document</th>
            <th>Custom Header Doc.</th>
            <th class="w-24">Sensitif</th>
            <th class="w-20">File</th>
            <th class="w-20">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each headers as header, i (header.id)}
            {@const pending = pendingFilesByHeader[header.id] ?? []}
            {@const isDragging = draggedHeaderId === header.id}
            {@const isDropBefore = dropIndicatorIndex === i}
            {@const isDropAfter = dropIndicatorIndex === i + 1 && i === headers.length - 1}
            <tr
              class="dnd-row {isDragging ? 'opacity-50' : ''} {isDropBefore ? '!border-t-2 !border-sky-400' : ''} {isDropAfter ? '!border-b-2 !border-sky-400' : ''} {isSubmitting ? 'cursor-not-allowed' : 'cursor-grab'}"
              draggable={!isSubmitting}
              aria-grabbed={isDragging}
              on:dragstart={(e) => onDragStart(header.id, e)}
              on:dragover={(e) => onDragOver(header.id, e)}
              on:drop={(e) => onDrop(header.id, e)}
              on:dragend={onDragEnd}
            >
              <td class="text-xs text-slate-500" on:mousedown={swallowDragStart}>{i + 1}</td>
              <td>
                <select class="input" bind:value={header.stage} aria-label={`Stage header ${i + 1}`} on:mousedown={swallowDragStart} disabled={isSubmitting}>
                  {#each STAGES as stage}<option value={stage}>{stage}</option>{/each}
                </select>
              </td>
              <td>
                <select class="input" bind:value={header.kind} aria-label={`Kind header ${i + 1}`} on:mousedown={swallowDragStart} disabled={isSubmitting}>
                  {#each KINDS as kind}<option value={kind}>{kind}</option>{/each}
                </select>
              </td>
              <td>
                <input class="input" bind:value={header.title} aria-label={`Title header ${i + 1}`} on:mousedown={swallowDragStart} disabled={isSubmitting} />
              </td>
              <td>
                <label class="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input type="checkbox" bind:checked={header.isSensitive} aria-label={`Sensitif header ${i + 1}`} disabled={isSubmitting} on:mousedown={swallowDragStart} />
                  {header.isSensitive ? 'ya' : 'tidak'}
                </label>
              </td>
              <td>
                <span class="badge {pending.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
                  {pending.length}
                </span>
              </td>
              <td>
                <div class="flex items-center gap-1">
                  <button class="btn btn-secondary !px-2 !py-1 text-xs" type="button" on:click={() => moveHeader(header.id, -1)} disabled={isSubmitting || i === 0} aria-label={`Pindahkan header ${i + 1} ke atas`} title="Pindahkan ke atas">↑</button>
                  <button class="btn btn-secondary !px-2 !py-1 text-xs" type="button" on:click={() => moveHeader(header.id, 1)} disabled={isSubmitting || i === headers.length - 1} aria-label={`Pindahkan header ${i + 1} ke bawah`} title="Pindahkan ke bawah">↓</button>
                  <button class="btn btn-secondary !px-2 !py-1 text-xs" type="button" on:click={() => removeHeader(header.id)} aria-label={`Hapus header ${i + 1}`} disabled={isSubmitting}>Hapus</button>
                </div>
              </td>
            </tr>
            <tr>
              <td colspan="7" class="!p-0">
                <details class="rounded-xl border border-slate-200 bg-slate-50">
                  <summary class="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-slate-700">
                    Multi-file mock untuk header <b class="mx-1">{header.title}</b>
                    <span class="ml-2 text-xs text-slate-500">{pending.length} file diantrikan · klik untuk buka/tutup</span>
                  </summary>
                  <div class="space-y-2 px-3 pb-3">
                    {#if canAttachFiles}
                      <label class="block text-sm font-semibold text-slate-700">
                        Pilih multi-file
                        <input class="input mt-1" type="file" multiple on:change={(e) => onFiles(header.id, e)} aria-label={`Pilih multi-file untuk ${header.title}`} disabled={isSubmitting} />
                      </label>
                    {/if}
                    {#if pending.length}
                      <div class="space-y-1">
                        {#each pending as file, idx}
                          <div class="grid gap-2 rounded-xl border border-slate-200 bg-white p-2 text-sm md:grid-cols-[minmax(0,1fr)_180px_80px_60px]">
                            <div class="truncate font-semibold" title={file.filename}>{file.filename}</div>
                            <select class="input" bind:value={pending[idx].fileLabel} aria-label={`Label file ${idx + 1}`} disabled={!canAttachFiles || isSubmitting}>
                              {#each FILE_LABELS as label}<option value={label}>{label}</option>{/each}
                            </select>
                            <input class="input" type="number" bind:value={pending[idx].fileOrder} aria-label={`Urutan file ${idx + 1}`} disabled={!canAttachFiles || isSubmitting} />
                            <button class="btn btn-secondary !px-2 !py-1 text-xs" type="button" on:click={() => removePendingFile(header.id, idx)} disabled={!canAttachFiles || isSubmitting} aria-label={`Hapus file ${idx + 1}`}>×</button>
                          </div>
                        {/each}
                        <div class="flex justify-end">
                          <button class="btn btn-secondary !px-2 !py-1 text-xs" type="button" on:click={() => clearPendingFiles(header.id)} disabled={!canAttachFiles || isSubmitting}>Bersihkan antrian</button>
                        </div>
                      </div>
                    {:else}
                      <p class="text-xs text-slate-500">Belum ada file mock diantrikan untuk header ini.</p>
                    {/if}
                  </div>
                </details>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="flex justify-end">
      <button class="btn btn-secondary" type="button" on:click={addHeader} disabled={isSubmitting}>+ Tambah header</button>
    </div>
  </div>

  <div class="flex justify-end gap-2">
    <a class="btn btn-secondary" href="/projects">Kembali</a>
    <button class="btn btn-primary" type="button" on:click={submit} disabled={isSubmitting}>
      {isSubmitting ? 'Menyimpan…' : 'Simpan proyek + dokumen'}
    </button>
  </div>
</div>
