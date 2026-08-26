<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser } from '$lib/stores/auth';
  import { canViewActiveSessions, canForceLogoutOtherSession, canRevokeOwnSession } from '$lib/auth/permissions';
  import { listActiveSessions, forceLogoutSession, forceLogoutAllExceptCurrent } from '$lib/services/api/auth';
  import type { ActiveSession } from '$shared/schemas/auth';
  import { LogOut, MonitorSmartphone, Globe2 } from 'lucide-svelte';

  let sessions: ActiveSession[] = [];
  let loading = false;
  let mutatingId = '';
  let error = '';
  let successMessage = '';

  $: canView = canViewActiveSessions($currentUser);
  // A user can revoke their own non-current sessions; force-logout of OTHER
  // users' sessions requires admin `user:force_logout`.
  $: canRevokeOwn = canRevokeOwnSession($currentUser);
  $: canForceOther = canForceLogoutOtherSession($currentUser);
  // We render the per-session button when the user can revoke own OR force other
  // (per-session self-revoke covers most cases; admin cross-user revoke is rare
  // and would typically happen via a dedicated admin screen, not here).
  $: canShowRevoke = canRevokeOwn;

  async function load() {
    if (!$currentUser) return;
    loading = true;
    error = '';
    const res = await listActiveSessions($currentUser.id);
    loading = false;
    if (res.success) sessions = res.data;
    else error = `${res.code ?? 'ERROR'} — ${res.message}`;
  }

  async function revoke(sessionId: string) {
    mutatingId = sessionId;
    error = '';
    successMessage = '';
    const res = await forceLogoutSession(sessionId);
    if (res.success) {
      sessions = sessions.filter((s) => s.id !== sessionId);
      successMessage = `Sesi ${res.data.id} dicabut pada ${new Date(res.data.revokedAt).toLocaleString('id-ID')}.`;
    } else {
      error = `${res.code ?? 'ERROR'} — ${res.message}`;
    }
    mutatingId = '';
  }

  async function revokeAll() {
    if (!$currentUser) return;
    mutatingId = 'all';
    error = '';
    successMessage = '';
    const res = await forceLogoutAllExceptCurrent($currentUser.id);
    if (res.success) {
      sessions = sessions.filter((s) => s.isCurrent);
      successMessage = `${res.data.revokedCount} sesi lain dicabut. Sesi saat ini tetap aktif.`;
    } else {
      error = `${res.code ?? 'ERROR'} — ${res.message}`;
    }
    mutatingId = '';
  }

  onMount(() => {
    if (!canView) {
      goto('/dashboard');
      return;
    }
    load();
  });
</script>

<svelte:head><title>SIMANTA - Sesi Aktif</title></svelte:head>

<div class="space-y-4">
  <div>
    <div class="kicker">Auth · Active sessions</div>
    <h1 class="text-2xl font-bold">Sesi Aktif</h1>
    <p class="text-sm text-slate-500">
      Daftar sesi yang sedang login dengan akun Anda. Refresh token berlaku 30 hari dengan grace window 30 detik (PRD §7.2.6). Force-logout satu sesi akan mencabut refresh token + invalidate access via tokenVersion bump.
    </p>
  </div>

  {#if !canView}
    <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900" data-testid="sessions-noaccess">
      Anda tidak memiliki izin untuk melihat daftar sesi. <a href="/dashboard" class="underline">Kembali ke dashboard</a>.
    </div>
  {:else}
    {#if error}
      <div class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert" data-testid="sessions-error">{error}</div>
    {/if}
    {#if successMessage}
      <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status" data-testid="sessions-success">{successMessage}</div>
    {/if}

    {#if loading && sessions.length === 0}
      <p class="text-sm text-slate-500">Memuat sesi...</p>
    {/if}

    <ul class="space-y-3" data-testid="sessions-list">
      {#each sessions as s (s.id)}
        <li class="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between" data-testid="session-row" data-session-id={s.id}>
          <div class="flex items-start gap-3">
            <div class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600">
              <MonitorSmartphone size={18} />
            </div>
            <div class="text-sm">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-bold text-slate-950">{s.device}</span>
                {#if s.isCurrent}
                  <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800" data-testid="session-current-badge">Sesi saat ini</span>
                {/if}
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span class="inline-flex items-center gap-1"><Globe2 size={12} /> {s.ip}</span>
                <span>· Login: {new Date(s.createdAt).toLocaleString('id-ID')}</span>
                <span>· Aktif: {new Date(s.lastSeenAt).toLocaleString('id-ID')}</span>
              </div>
              <div class="mt-1 truncate text-[10px] text-slate-400">{s.userAgent}</div>
            </div>
          </div>
          <div class="flex shrink-0 gap-2">
            {#if canShowRevoke && !s.isCurrent}
              <button class="btn btn-secondary !text-xs" on:click={() => revoke(s.id)} disabled={mutatingId === s.id} data-testid="session-revoke">
                <LogOut size={14} /> {mutatingId === s.id ? 'Mencabut...' : 'Cabut sesi ini'}
              </button>
            {:else if s.isCurrent}
              <span class="rounded-xl bg-slate-50 px-3 py-1 text-xs text-slate-500">Sesi ini tidak bisa dicabut dari sini</span>
            {/if}
          </div>
        </li>
      {/each}
    </ul>

    {#if canRevokeOwn && sessions.filter((s) => !s.isCurrent).length > 0}
      <div class="card border-l-4 border-l-rose-400 bg-rose-50/40">
        <h2 class="text-base font-bold text-rose-900">Logout semua sesi lain</h2>
        <p class="mt-1 text-sm text-rose-800">
          Cabut semua sesi milik Anda kecuali sesi browser saat ini. Sesi di perangkat lain akan diminta login ulang saat berikutnya.
        </p>
        <button class="btn btn-secondary !text-xs" on:click={revokeAll} disabled={mutatingId === 'all'} data-testid="sessions-revoke-all">
          <LogOut size={14} /> {mutatingId === 'all' ? 'Mencabut...' : 'Cabut semua sesi lain'}
        </button>
        {#if canForceOther}
          <p class="mt-2 text-xs text-rose-700">Mode admin: Anda juga dapat mencabut sesi milik pengguna lain (mock — belum ada halaman admin di MVP).</p>
        {/if}
      </div>
    {/if}
  {/if}
</div>
