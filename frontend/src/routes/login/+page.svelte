<script lang="ts">
  import { goto } from '$app/navigation';
  import { passwordLogin, verifyOtp, requestEmailOtp, verifyEmailOtp } from '$lib/services/api/auth';
  import { setSession } from '$lib/stores/auth';

  let email = 'admin@simanta.test';
  let password = 'password';
  let otp = '123456';
  let otpToken = '';
  let otpChannel: 'whatsapp' | 'email' = 'whatsapp';
  let maskedDestination = '+62******2026';
  let error = '';
  let locked = false;
  let loading = false;
  let fallbackHint = true; // PRD §7.2.6 email fallback is always an option

  async function submitPassword() {
    loading = true;
    error = '';
    locked = false;
    const res = await passwordLogin(email, password);
    loading = false;
    if (res.success) {
      otpToken = res.data.otp_token;
      otpChannel = res.data.channel;
      maskedDestination = res.data.masked_destination;
    } else {
      error = `${res.code ?? 'ERROR'} — ${res.message}`;
    }
  }

  async function submitOtp() {
    if (locked) return;
    loading = true;
    error = '';
    const verify = otpChannel === 'email' ? verifyEmailOtp : verifyOtp;
    const res = await verify(otpToken, otp);
    loading = false;
    if (res.success) {
      setSession(res.data);
      goto('/dashboard');
    } else {
      locked = res.code === 'RATE_LIMITED';
      error = `${res.code ?? 'ERROR'} — ${res.message}`;
    }
  }

  async function switchToEmail() {
    loading = true;
    error = '';
    const res = await requestEmailOtp(email);
    loading = false;
    if (res.success) {
      otpToken = res.data.otp_token;
      otpChannel = res.data.channel;
      maskedDestination = res.data.masked_destination;
    } else {
      error = `${res.code ?? 'ERROR'} — ${res.message}`;
    }
  }
</script>

<svelte:head><title>SIMANTA - Login</title></svelte:head>
<div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950 p-6">
  <div class="w-full max-w-md rounded-3xl border border-white/10 bg-white/95 p-8 shadow-2xl">
    <div class="mb-6">
      <div class="text-3xl font-bold text-emerald-700">SIMANTA</div>
      <div class="text-sm text-slate-500">Login mock dua langkah: password lalu OTP {otpChannel === 'email' ? 'email' : 'WhatsApp'}</div>
    </div>
    {#if !otpToken}
      <form on:submit|preventDefault={submitPassword} class="space-y-4">
        <label class="block">
          <span class="text-xs font-semibold text-slate-600">Email</span>
          <input class="input" type="email" bind:value={email} placeholder="email" />
        </label>
        <label class="block">
          <span class="text-xs font-semibold text-slate-600">Password</span>
          <input class="input" type="password" bind:value={password} placeholder="password" />
        </label>
        <button class="btn btn-primary w-full" disabled={loading} data-testid="login-submit">Lanjut OTP</button>
      </form>
    {:else}
      <form on:submit|preventDefault={submitOtp} class="space-y-4">
        <div class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800" data-testid="login-otp-hint">
          Kode OTP mock dikirim ke <b>{otpChannel === 'email' ? 'email' : 'WhatsApp'}</b> ({maskedDestination}). Gunakan kode <b>123456</b>.
        </div>
        <input class="input" bind:value={otp} placeholder="Kode OTP" aria-invalid={error ? 'true' : 'false'} />
        <button class="btn btn-primary w-full" disabled={loading || locked} data-testid="login-verify-otp">Masuk Dashboard</button>
        {#if fallbackHint && otpChannel === 'whatsapp'}
          <button type="button" class="btn btn-secondary w-full !text-xs" on:click={switchToEmail} disabled={loading} data-testid="login-switch-email">
            Kirim kode via email (fallback)
          </button>
        {/if}
        <p class="text-xs text-slate-500">
          Email fallback aktif setelah password valid (PRD §7.2.6). Pada produksi, kode email dikirim ke email terdaftar; mock selalu menampilkan tujuan tersamarkan.
        </p>
      </form>
    {/if}
    {#if error}<div class="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}
    <a class="mt-4 block text-sm text-cyan-700" href="/recovery">Lupa password / backup code</a>
  </div>
</div>

