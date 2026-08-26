<script lang="ts">
  import { goto } from '$app/navigation';
  import { requestEmailOtp, verifyEmailOtp } from '$lib/services/api/auth';
  import { setSession } from '$lib/stores/auth';

  type Stage = 'request' | 'verify' | 'done';

  let stage: Stage = 'request';
  let email = 'admin@simanta.test';
  let otp = '123456';
  let otpToken = '';
  let maskedDestination = '';
  let error = '';
  let loading = false;

  async function submitRequest() {
    loading = true;
    error = '';
    const res = await requestEmailOtp(email);
    loading = false;
    if (res.success) {
      otpToken = res.data.otp_token;
      maskedDestination = res.data.masked_destination;
      stage = 'verify';
    } else {
      error = `${res.code ?? 'ERROR'} — ${res.message}`;
    }
  }

  async function submitVerify() {
    loading = true;
    error = '';
    const res = await verifyEmailOtp(otpToken, otp);
    loading = false;
    if (res.success) {
      setSession(res.data);
      // Per PRD §7.2.6: after successful recovery, the user is prompted to
      // review active sessions and change their password. Mock honors this
      // by routing to the post-recovery confirmation stage instead of
      // jumping straight to /dashboard.
      stage = 'done';
    } else {
      error = `${res.code ?? 'ERROR'} — ${res.message}`;
    }
  }
</script>

<svelte:head><title>SIMANTA - Recovery Akun</title></svelte:head>

<div class="flex min-h-screen items-center justify-center bg-slate-100 p-6">
  <div class="card w-full max-w-lg space-y-4">
    <div>
      <div class="kicker">Auth · Mock / Contract-first</div>
      <h1 class="text-2xl font-bold">Recovery Akun</h1>
      <p class="text-sm text-slate-500">
        Alur recovery 2 langkah: kirim kode fallback ke email, verifikasi kode, lalu reset sesi. Mock — tidak mengirim email nyata.
      </p>
    </div>

    <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <b>Catatan MVP:</b> Pada produksi, recovery flow mengikuti PRD §7.2.6 (fallback email hanya setelah password valid). Mock mensimulasikan kontrak tanpa pengiriman email nyata.
    </div>

    {#if stage === 'request'}
      <form on:submit|preventDefault={submitRequest} class="space-y-3">
        <label class="block">
          <span class="text-xs font-semibold text-slate-600">Email akun</span>
          <input class="input" type="email" bind:value={email} required aria-label="Email akun" />
        </label>
        <button class="btn btn-primary w-full" disabled={loading} data-testid="recovery-request">
          Kirim kode recovery
        </button>
      </form>
    {:else if stage === 'verify'}
      <form on:submit|preventDefault={submitVerify} class="space-y-3">
        <div class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800" data-testid="recovery-otp-hint">
          Kode recovery mock dikirim ke email <b>{maskedDestination}</b>. Gunakan <b>123456</b>.
        </div>
        <label class="block">
          <span class="text-xs font-semibold text-slate-600">Kode recovery</span>
          <input class="input" bind:value={otp} placeholder="Kode 6 digit" aria-label="Kode recovery" />
        </label>
        <button class="btn btn-primary w-full" disabled={loading} data-testid="recovery-verify">
          Verifikasi dan masuk
        </button>
        <button type="button" class="btn btn-secondary w-full !text-xs" on:click={() => (stage = 'request')} disabled={loading}>
          Kirim ulang kode
        </button>
      </form>
    {:else if stage === 'done'}
      <div class="space-y-3" data-testid="recovery-done">
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <b>Recovery berhasil.</b> Sesi Anda aktif. Untuk keamanan akun, tinjau aktivitas sesi dan pertimbangkan untuk mengganti password sebelum masuk ke dashboard.
        </div>
        <a href="/profile/sessions" class="btn btn-primary w-full" data-testid="recovery-review-sessions">Tinjau sesi aktif</a>
        <a href="/profile/preferences" class="btn btn-secondary w-full !text-xs" data-testid="recovery-change-password-placeholder">Ganti password (mock placeholder)</a>
        <a href="/dashboard" class="block text-center text-xs text-slate-500 underline" data-testid="recovery-skip">Lewati ke dashboard</a>
      </div>
    {/if}

    {#if error}
      <div class="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert" data-testid="recovery-error">{error}</div>
    {/if}

    <a class="block text-sm text-cyan-700" href="/login">Kembali ke login</a>
  </div>
</div>
