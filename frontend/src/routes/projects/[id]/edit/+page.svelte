<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getProject, saveProject } from '$lib/services/api/projects';

  let statusMessage = '';
  let form: any = null;

  async function submit() {
    const response = await saveProject({
      ...form,
      fiscalYear: Number(form.fiscalYear),
      contractValue: Number(form.contractValue)
    });
    if (response.success) {
      form = response.data;
      statusMessage = response.message;
    }
  }

  onMount(async () => {
    const projectRes = await getProject($page.params.id as string);
    if (projectRes.success) form = { ...projectRes.data };
  });
</script>

<svelte:head><title>SIMANTA - Edit Administrasi Proyek GIS</title></svelte:head>

<div class="space-y-4">
  <div>
    <div class="kicker">Administrasi Proyek GIS</div>
    <h1 class="text-2xl font-bold">Edit Administrasi Proyek GIS</h1>
  </div>

  {#if statusMessage}
    <div role="status" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{statusMessage}</div>
  {/if}

  {#if form}
    <div class="card grid gap-4 md:grid-cols-2">
      <input type="hidden" bind:value={form.version} aria-label="Version optimistic locking" />
      <label class="text-sm font-semibold text-slate-700">Kode proyek<input class="input mt-1" bind:value={form.projectCode} aria-label="Kode proyek" /></label>
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
      <label class="text-sm font-semibold text-slate-700 md:col-span-2">Deskripsi administrasi proyek<textarea class="input mt-1" bind:value={form.description} rows="3" aria-label="Deskripsi administrasi proyek"></textarea></label>
      <div class="text-xs text-slate-500 md:col-span-2">Version hidden untuk optimistic locking: {form.version}</div>
      <div class="flex justify-end gap-2 md:col-span-2">
        <a class="btn btn-secondary" href="/projects">Kembali</a>
        <button class="btn btn-primary" type="button" on:click={submit}>Simpan perubahan proyek mock</button>
      </div>
    </div>
  {:else}
    <div class="card">Memuat proyek...</div>
  {/if}
</div>
