<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser } from '$lib/stores/auth';
  import { canViewBackupCodesStatus, canRegenerateBackupCodes } from '$lib/auth/permissions';
  import { getBackupCodesStatus, regenerateBackupCodes } from '$lib/services/api/auth';
  import type { BackupCodesRegenerateResult, BackupCodesStatus } from '$shared/schemas/auth';
  import { RefreshCw, Copy, ShieldAlert } from 'lucide-svelte';

  let status: BackupCodesStatus | null = null;
  let regenerateResult: BackupCodesRegenerateResult | null = null;
  let loading = false;
  let regenLoading = false;
  let confirmingRegen = false;
  let error = '';
  let copied = false;
  let oneTimeWarningAck = false;

  $: canView = canViewBackupCodesStatus($currentUser);
  $: canRegen = canRegenerateBackupCodes($currentUser);

  async function loadStatus() {
    if (!$currentUser) return;
    loading = true;
    error = '';
    const res = await getBackupCodesStatus($currentUser.id);
    loading = false;
    if (res.success) status = res.data;
    else error = `${res.code ?? 'ERROR'} — ${res.message}`;
  }

  async function confirmRegenerate() {
    if (!$currentUser) return;
    regenLoading = true;
    error = '';
    const res = await regenerateBackupCodes($currentUser.id);
    regenLoading = false;
    if (res.success) {
      regenerateResult = res.data;
      status = res.data.status;
      confirmingRegen = false;
    } else {
      error = `${res.code ?? 'ERROR'} — ${res.message}`;
    }
  }

  function dismissOneTime() {
    regenerateResult = null;
    copied = false;
    oneTimeWarningAck = true;
    goto('/profile/backup-codes');
  }

  async function copyAll() {
    if (!regenerateResult) return;
    const text = regenerateResult.codes.map((c) => c.code).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // ignore — UI stays usable, user can copy manually
    }
  }

  onMount(() => {
    if (!canView) {
      goto('/dashboard');
      return;
    }
    loadStatus();
  });
</script>

<svelte:head><title>SIMANTA - Backup Codes</title></svelte:head>

<div class="space-y-4">
  <div>
    <div class="kicker">Auth · Backup codes</div>
    <h1 class="text-2xl font-bold">Backup Codes</h1>
    <p class="text-sm text-slate-500">
      Kode sekali-pakai untuk recovery akun saat OTP tidak tersedia. 8 kode per user (PRD §7.2.5). Disimpan bcryptjs-hashed at-rest di produksi; mock menyimpan plaintext.
    </p>
  </div>

  {#if !canView}
    <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900" data-testid="backup-codes-noaccess">
      Anda tidak memiliki izin untuk melihat backup codes. <a href="/dashboard" class="underline">Kembali ke dashboard</a>.
    </div>
  {:else}
    {#if error}
      <div class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert" data-testid="backup-codes-error">{error}</div>
    {/if}

    <section class="card space-y-3" data-testid="backup-codes-status">
      <h2 class="text-base font-bold text-slate-950">Status</h2>
      {#if loading && !status}
        <p class="text-sm text-slate-500">Memuat status...</p>
      {:else if status}
        <div class="grid gap-3 md:grid-cols-3 text-sm">
          <div>
            <div class="text-xs text-slate-500">Total</div>
            <div class="text-2xl font-black text-slate-950" data-testid="backup-codes-total">{status.total}</div>
          </div>
          <div>
            <div class="text-xs text-slate-500">Sisa</div>
            <div class="text-2xl font-black {status.remaining === 0 ? 'text-rose-700' : 'text-emerald-700'}" data-testid="backup-codes-remaining">{status.remaining}</div>
          </div>
          <div>
            <div class="text-xs text-slate-500">Regenerate terakhir</div>
            <div class="text-sm font-bold text-slate-700">{status.regeneratedAt ? new Date(status.regeneratedAt).toLocaleString('id-ID') : '—'}</div>
          </div>
        </div>
        {#if status.remaining === 0}
          <div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900" data-testid="backup-codes-exhausted">
            Semua kode sudah terpakai. Segera regenerate untuk mencegah lockout.
          </div>
        {/if}
      {/if}

      {#if canRegen}
        {#if !confirmingRegen}
          <button class="btn btn-secondary !text-xs" on:click={() => (confirmingRegen = true)} disabled={regenLoading} data-testid="backup-codes-regen">
            <RefreshCw size={14} /> Regenerasi (mock)
          </button>
        {:else}
          <div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900" role="alertdialog" aria-labelledby="regen-confirm-title">
            <div class="flex items-start gap-2">
              <ShieldAlert size={18} />
              <div>
                <div id="regen-confirm-title" class="font-bold">Konfirmasi regenerasi</div>
                <p class="mt-1 text-xs">
                  Tindakan ini akan <b>membatalkan semua kode lama</b> dan menghasilkan 8 kode baru. Kode baru hanya ditampilkan sekali. Lanjutkan?
                </p>
                <div class="mt-3 flex gap-2">
                  <button class="btn btn-primary !text-xs" on:click={confirmRegenerate} disabled={regenLoading} data-testid="backup-codes-regen-confirm">
                    Ya, generate kode baru
                  </button>
                  <button class="btn btn-secondary !text-xs" on:click={() => (confirmingRegen = false)} disabled={regenLoading}>
                    Batal
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/if}
      {:else}
        <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" data-testid="backup-codes-regen-blocked">
          Anda tidak memiliki izin <code>user:update</code> untuk regenerasi. Hubungi admin.
        </div>
      {/if}
    </section>

    {#if regenerateResult}
      <section class="card space-y-3 border-l-4 border-l-amber-400 bg-amber-50/40" data-testid="backup-codes-onetime">
        <div class="flex items-center gap-2">
          <ShieldAlert size={20} class="text-amber-700" />
          <h2 class="text-base font-bold text-amber-900">Tampilan satu kali</h2>
        </div>
        <p class="text-sm text-amber-900">
          {regenerateResult.warning}
        </p>
        <ol class="grid grid-cols-1 gap-1 text-sm font-mono md:grid-cols-2" data-testid="backup-codes-list">
          {#each regenerateResult.codes as bc, i}
            <li class="rounded-lg bg-white px-3 py-2 ring-1 ring-amber-200">
              <span class="text-xs text-slate-500">#{i + 1}</span>
              <span class="ml-2 font-bold text-slate-900">{bc.code}</span>
            </li>
          {/each}
        </ol>
        <div class="flex gap-2">
          <button class="btn btn-secondary !text-xs" on:click={copyAll} data-testid="backup-codes-copy">
            <Copy size={14} /> {copied ? 'Tersalin' : 'Salin semua'}
          </button>
          <button class="btn btn-primary !text-xs" on:click={dismissOneTime} data-testid="backup-codes-ack">
            Saya sudah menyalin
          </button>
        </div>
      </section>
    {/if}
  {/if}
</div>
