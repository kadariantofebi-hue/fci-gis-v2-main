<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { saveAsset } from '$lib/services/api/assets';
  import { getCurrentOpd } from '$lib/services/api/opd';
  import { expectedGeometryTypes, validateGeometryAgainstJenis } from '$lib/geometry-rules';
  import type { Opd } from '$shared/schemas/opd';
  import type { Geometry } from '$shared/geojson';
  import type { JenisAset } from '$shared/enums';
  import DigitizeMapPanel from '$lib/components/map/DigitizeMapPanel.svelte';

  export let asset: any = null;

  let activeOpd: Opd | null = null;
  let conflict = false;
  let validationError = '';
  let errors: Record<string, string> = {};
  let form: any = {
    id: asset?.id,
    idPemda: asset?.idPemda || '',
    name: asset?.name || '',
    jenis: asset?.jenis || 'tanah',
    ownerOpdId: asset?.ownerOpdId || 'opd-1',
    ownerOpdName: asset?.ownerOpdName || 'DPUBMCK',
    kodeBarang: asset?.kodeBarang || '',
    register: asset?.register || '',
    penggunaan: asset?.penggunaan || '',
    hak: asset?.hak || 'Lainnya',
    certificateNumber: asset?.certificateNumber || '',
    certificateDate: asset?.certificateDate || '',
    sp2dNumber: asset?.sp2dNumber || '',
    sp2dDate: asset?.sp2dDate || '',
    sp2dValue: asset?.sp2dValue || 0,
    sp2dIssuer: asset?.sp2dIssuer || '',
    description: asset?.description || '',
    geometryJson: asset?.geom ? JSON.stringify(asset.geom, null, 2) : '',
    tahunPengadaan: asset?.tahunPengadaan || 2026,
    alamat: asset?.alamat || '',
    luasSertifikat: asset?.luasSertifikat || 0,
    luasSpasial: asset?.luasSpasial || 0,
    panjangSpasial: asset?.panjangSpasial || 0,
    harga: asset?.harga || 0,
    version: asset?.version || 1,
    simulateConflict: false
  };

  let geometryTab: 'peta' | 'geojson' = 'peta';
  // Empty-geometry pre-submit warning state (PRD §6.8 allows saving without
  // geometry as "belum dipetakan"; reviewer/stakeholder should be informed).
  let emptyGeometryWarning = false;
  const geometryPlaceholder = '{"type":"Polygon","coordinates":[[...]]}';
  const jenisOptions = ['tanah', 'bangunan', 'jalan', 'saluran', 'lapangan', 'makam', 'taman', 'lainnya'] as const;
  const hakOptions = ['SHM', 'HGB', 'HPL', 'HP', 'HM', 'Pakai', 'Pengelolaan', 'Lainnya'] as const;

  $: digitizeMode = (['tanah', 'bangunan', 'lapangan', 'makam', 'taman'].includes(form.jenis)
    ? 'polygon'
    : ['jalan', 'saluran'].includes(form.jenis)
      ? 'line'
      : 'point') as 'polygon' | 'line' | 'point';

  $: digitizeValue = (() => {
    if (!form.geometryJson.trim()) return null;
    try {
      return JSON.parse(form.geometryJson) as Geometry;
    } catch {
      return null;
    }
  })();

  $: form.ownerOpdId = activeOpd?.id || form.ownerOpdId;
  $: form.ownerOpdName = activeOpd?.shortName || form.ownerOpdName;

  onMount(async () => {
    const r = await getCurrentOpd();
    if (r.success) activeOpd = r.data;
  });

  function validate() {
    const next: Record<string, string> = {};
    if (!String(form.name).trim()) next.name = 'Nama aset wajib diisi.';
    if (!String(form.idPemda).trim()) next.idPemda = 'ID Pemda wajib diisi.';
    if (Number(form.harga) < 0) next.harga = 'Harga/nilai aset tidak boleh negatif.';
    if (Number(form.sp2dValue) < 0) next.sp2dValue = 'Nilai SP2D tidak boleh negatif.';
    if (Number(form.luasSertifikat) < 0) next.luasSertifikat = 'Luas sertifikat tidak boleh negatif.';
    if (form.geometryJson.trim()) {
      let parsed: any = null;
      try {
        parsed = JSON.parse(form.geometryJson);
        if (!parsed?.type || !parsed?.coordinates) next.geometryJson = 'Geometry JSON harus memiliki type dan coordinates.';
      } catch (_error) {
        next.geometryJson = 'Geometry JSON tidak valid.';
      }
      if (!next.geometryJson && parsed) {
        const v = validateGeometryAgainstJenis(parsed, form.jenis as JenisAset);
        if (!v.valid) {
          next.geometryJson = v.reason;
        }
      }
    }
    errors = next;
    validationError = Object.keys(next).length ? 'VALIDATION_FAILED — Periksa field bertanda merah sebelum menyimpan.' : '';
    return !validationError;
  }

  function onDigitizeChange(event: CustomEvent<Geometry | null>) {
    const g = event.detail;
    if (g) {
      form.geometryJson = JSON.stringify(g, null, 2);
      errors = { ...errors, geometryJson: '' };
    } else {
      form.geometryJson = '';
    }
  }

  async function submit() {
    conflict = false;
    validationError = '';
    if (!validate()) return;
    // PRD §6.8: "belum dipetakan" (geom null) is a valid state, but reviewer
    // and stakeholder should be informed. Show soft warning inline, not modal.
    if (!form.geometryJson.trim() && digitizeValue === null) {
      emptyGeometryWarning = true;
      return;
    }
    await performSubmit();
  }

  async function performSubmit() {
    emptyGeometryWarning = false;
    const payload = { ...form };
    try {
      payload.geom = form.geometryJson.trim() ? JSON.parse(form.geometryJson) : asset?.geom ?? null;
    } catch (_e) {
      errors = { ...errors, geometryJson: 'Geometry JSON tidak valid.' };
      validationError = 'VALIDATION_FAILED — Periksa field bertanda merah sebelum menyimpan.';
      return;
    }
    // Strip frontend-only fields before save; saveAsset mock and future
    // backend audit log should never see these as ghost fields.
    delete payload.geometryJson;
    delete payload.simulateConflict;
    const res = await saveAsset(payload);
    if (res.success) goto(`/assets/${res.data.id}`);
    else if (res.code === 'CONFLICT_VERSION') conflict = true;
    else if (res.code === 'VALIDATION_FAILED') {
      // The client-side validate() should have caught this; surface the server message anyway.
      validationError = `${res.code} — ${res.message}`;
    }
  }

  function cancelEmptyGeometryWarning() {
    emptyGeometryWarning = false;
    geometryTab = 'peta';
  }
</script>

<form class="space-y-4" on:submit|preventDefault={submit} novalidate>
  {#if conflict}
    <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
      <b>CONFLICT_VERSION</b> — versi aset berubah. Muat ulang data sebelum menyimpan.
    </div>
  {/if}
  {#if validationError}
    <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700" role="alert" data-testid="form-validation-error">
      {validationError}
    </div>
  {/if}
  {#if emptyGeometryWarning}
    <div
      class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
      role="alert"
      data-testid="form-empty-geometry-warning"
      aria-live="polite"
    >
      <div class="flex items-start gap-2">
        <div class="flex-1">
          <b>Simpan tanpa geometri?</b>
          <p class="mt-1 text-sm">
            Aset akan disimpan tanpa geometri. Status <code class="rounded bg-amber-100 px-1">tanpaGeometri</code>
            akan muncul di daftar aset dan laporan hingga Anda menambahkan geometry
            (PRD §6.8 mengizinkan state ini; tujuan: agar aset tidak tertunda hanya karena belum dipetakan).
          </p>
        </div>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-primary !text-sm"
          on:click={performSubmit}
          data-testid="form-empty-geometry-confirm"
          aria-label="Lanjut simpan tanpa geometri"
        >
          Lanjut simpan tanpa geometri
        </button>
        <button
          type="button"
          class="btn btn-secondary !text-sm"
          on:click={cancelEmptyGeometryWarning}
          data-testid="form-empty-geometry-cancel"
          aria-label="Batal, tambahkan geometry dulu"
        >
          Tambah geometry dulu
        </button>
      </div>
    </div>
  {/if}

  <section class="card space-y-4" aria-labelledby="asset-identity-title">
    <h2 id="asset-identity-title" class="section-title">Identitas aset</h2>
    <div class="grid gap-4 md:grid-cols-2">
      <label>Nama aset<input class="input" bind:value={form.name} maxlength="120" aria-invalid={errors.name ? 'true' : 'false'} aria-describedby="asset-name-help asset-name-error" /></label>
      {#if errors.name}<p id="asset-name-error" class="text-sm text-red-700">{errors.name}</p>{/if}
      <label>ID Pemda<input class="input" bind:value={form.idPemda} aria-invalid={errors.idPemda ? 'true' : 'false'} aria-describedby="asset-idpemda-error" /></label>
      {#if errors.idPemda}<p id="asset-idpemda-error" class="text-sm text-red-700">{errors.idPemda}</p>{/if}
      <label>Kode barang<input class="input" bind:value={form.kodeBarang} placeholder="Contoh: 1.3.1.01" /></label>
      <label>Register<input class="input" bind:value={form.register} placeholder="Nomor register aset" /></label>
      <label>Penggunaan<input class="input" bind:value={form.penggunaan} placeholder="Kantor, jalan, sekolah, drainase, dll." /></label>
      <label>Tahun pengadaan<input class="input" type="number" min="1900" max="2026" bind:value={form.tahunPengadaan} /></label>
      <label>Harga/nilai aset<input class="input" type="number" bind:value={form.harga} aria-invalid={errors.harga ? 'true' : 'false'} aria-describedby="asset-harga-error" /></label>
      {#if errors.harga}<p id="asset-harga-error" class="text-sm text-red-700">{errors.harga}</p>{/if}
      <label>Version optimistic locking<input class="input" readonly bind:value={form.version} /></label>
    </div>
    <p id="asset-name-help" class="text-xs text-slate-500">Nama maksimal 120 karakter sesuai validasi PRD.</p>
  </section>

  <section class="card space-y-4" aria-labelledby="asset-ownership-title">
    <h2 id="asset-ownership-title" class="section-title">Kepemilikan & hak</h2>
    <div class="grid gap-4 md:grid-cols-2">
      <label>Jenis<select class="input" bind:value={form.jenis} data-testid="form-jenis" aria-describedby="asset-jenis-help">{#each jenisOptions as j}<option value={j}>{j}</option>{/each}</select></label>
      <p id="asset-jenis-help" class="text-xs text-slate-500 md:col-span-2">Jenis menentukan tipe geometry yang diharapkan: <b>{expectedGeometryTypes(form.jenis).join(' / ') || '-'}</b> (PRD §6.7).</p>
      <label>Owner OPD aktif/default<input class="input" value={`${form.ownerOpdName} - ${activeOpd?.name ?? 'OPD aktif'}`} readonly /></label>
      <label>Hak<select class="input" bind:value={form.hak}>{#each hakOptions as h}<option value={h}>{h}</option>{/each}</select></label>
      <label>Nomor sertifikat<input class="input" bind:value={form.certificateNumber} /></label>
      <label>Tanggal sertifikat<input class="input" type="date" bind:value={form.certificateDate} /></label>
    </div>
    <p class="text-xs text-slate-500">PRD v1.3.7 MVP memakai satu OPD aktif/default; tidak ada pemindahan atau pilihan lintas OPD.</p>
  </section>

  <section class="card space-y-4" aria-labelledby="asset-location-title">
    <h2 id="asset-location-title" class="section-title">Lokasi & geometry</h2>
    <label>Alamat<textarea class="input" bind:value={form.alamat}></textarea></label>
    {#if form.jenis === 'jalan' || form.jenis === 'saluran'}
      <label>Panjang spasial read-only/mock<input class="input" type="number" readonly bind:value={form.panjangSpasial} /></label>
    {:else if form.jenis === 'lainnya'}
      <p class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Jenis point/lainnya memakai centroid dari geometry. Luas/panjang spasial tidak relevan.</p>
    {:else}
      <div class="grid gap-3 md:grid-cols-2">
        <label>Luas sertifikat<input class="input" type="number" bind:value={form.luasSertifikat} aria-invalid={errors.luasSertifikat ? 'true' : 'false'} aria-describedby="asset-luas-error" /></label>
        <label>Luas spasial read-only/mock<input class="input" type="number" readonly bind:value={form.luasSpasial} /></label>
      </div>
      {#if errors.luasSertifikat}<p id="asset-luas-error" class="text-sm text-red-700">{errors.luasSertifikat}</p>{/if}
    {/if}

    <div role="tablist" aria-label="Geometry editor" class="flex gap-2 border-b border-slate-200">
      <button type="button" role="tab" aria-selected={geometryTab === 'peta'} class="rounded-t-xl px-3 py-2 text-sm font-semibold {geometryTab === 'peta' ? 'border-b-2 border-emerald-500 text-emerald-700' : 'text-slate-500 hover:text-slate-800'}" on:click={() => (geometryTab = 'peta')} data-testid="tab-peta">
        Peta (digitasi)
      </button>
      <button type="button" role="tab" aria-selected={geometryTab === 'geojson'} class="rounded-t-xl px-3 py-2 text-sm font-semibold {geometryTab === 'geojson' ? 'border-b-2 border-emerald-500 text-emerald-700' : 'text-slate-500 hover:text-slate-800'}" on:click={() => (geometryTab = 'geojson')} data-testid="tab-geojson">
        GeoJSON (raw)
      </button>
    </div>

    {#if geometryTab === 'peta'}
      <div data-testid="geometry-peta-panel">
        <DigitizeMapPanel mode={digitizeMode} value={digitizeValue} on:change={onDigitizeChange} />
      </div>
    {:else}
      <label>Geometry JSON editor (power user / paste import)
        <textarea class="input font-mono text-xs" rows="6" bind:value={form.geometryJson} placeholder={geometryPlaceholder} aria-invalid={errors.geometryJson ? 'true' : 'false'} aria-describedby="asset-geometry-help asset-geometry-error" data-testid="form-geometry-json"></textarea>
      </label>
    {/if}
    {#if errors.geometryJson}<p id="asset-geometry-error" class="text-sm text-red-700" data-testid="form-geometry-error">{errors.geometryJson}</p>{/if}
    <p id="asset-geometry-help" class="text-sm text-slate-500">Geometry tetap sumber utama. Mode peta memakai MapLibre GL JS (WebGL); GeoJSON (raw) tersedia untuk import dan power user.</p>
  </section>

  <section class="card space-y-4" aria-labelledby="asset-sp2d-title">
    <h2 id="asset-sp2d-title" class="section-title">SP2D & deskripsi</h2>
    <div class="grid gap-4 md:grid-cols-2">
      <label>Nomor SP2D<input class="input" bind:value={form.sp2dNumber} /></label>
      <label>Tanggal SP2D<input class="input" type="date" bind:value={form.sp2dDate} /></label>
      <label>Nilai SP2D<input class="input" type="number" bind:value={form.sp2dValue} aria-invalid={errors.sp2dValue ? 'true' : 'false'} aria-describedby="asset-sp2d-value-error" /></label>
      <label>Dinas penerbit SP2D<input class="input" bind:value={form.sp2dIssuer} placeholder="Contoh: Dinas PU" /></label>
    </div>
    {#if errors.sp2dValue}<p id="asset-sp2d-value-error" class="text-sm text-red-700">{errors.sp2dValue}</p>{/if}
    <label>Deskripsi<textarea class="input" rows="4" bind:value={form.description}></textarea></label>
  </section>

  <section class="card space-y-2" aria-labelledby="asset-attachments-title">
    <h2 id="asset-attachments-title" class="section-title">Lampiran asset_attachments</h2>
    <p class="text-sm text-slate-500">Upload real via presigned URL ditunda. Metadata yang harus didukung: sertifikat, foto, SP2D, berita_acara, sk_transfer (lampiran legal historis; bukan workflow transfer aktif), dokumen_legal, dokumen_pendukung, lainnya.</p>
  </section>

  <label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={form.simulateConflict} /> Simulasikan konflik versi saat save</label>
  <button class="btn btn-primary">Simpan mock</button>
</form>
