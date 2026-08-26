import { err, ok, type ApiResponse } from '$shared/envelope';
import type {
  ActiveSession,
  BackupCode,
  BackupCodesRegenerateResult,
  BackupCodesStatus,
  EmailOtpRequest,
  LoginPasswordResult,
  Session,
  User
} from '$shared/schemas/auth';
import type { RoleName } from '$shared/enums';
import {
  activeSessions,
  backupCodesByUser,
  sessionsByUser,
  userByRole,
  users
} from '$lib/mocks/users';
import { apiMode, realFetch } from './client';

let pendingUser: User = users[1];
let otpAttempts = 0;
let otpLocked = false;
let pendingEmailOtpToken = '';
let pendingEmailOtpExpiresAt = 0;
let emailOtpAttempts = 0;
let emailOtpLocked = false;

export async function passwordLogin(email: string, _password: string): Promise<ApiResponse<LoginPasswordResult>> {
  if (apiMode === 'real') return realFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: _password }) });
  await new Promise((r) => setTimeout(r, 120));
  pendingUser = users.find((u) => u.email === email) ?? users[1];
  otpAttempts = 0;
  otpLocked = false;
  return ok({ otp_token: 'mock-otp-token', channel: 'whatsapp', masked_destination: '+62******2026' }, 'Password valid, OTP WhatsApp dikirim');
}

export async function verifyOtp(_otpToken: string, code: string): Promise<ApiResponse<Session>> {
  if (apiMode === 'real') return realFetch('/auth/login/verify', { method: 'POST', body: JSON.stringify({ otp_token: _otpToken, code }) });
  await new Promise((r) => setTimeout(r, 120));
  if (otpLocked) return err('RATE_LIMITED', 'RATE_LIMITED — Terlalu banyak percobaan OTP. Tunggu cooldown mock sebelum mencoba lagi.', undefined, { retry_after_seconds: 60 });
  if (code !== '123456') {
    otpAttempts += 1;
    if (otpAttempts >= 3) {
      otpLocked = true;
      return err('RATE_LIMITED', 'RATE_LIMITED — OTP salah 3 kali. Login mock dikunci untuk mensimulasikan rate-limit/max attempt.', undefined, { retry_after_seconds: 60 });
    }
    return err('VALIDATION_FAILED', `Kode OTP tidak sesuai. Sisa percobaan: ${3 - otpAttempts}.`, { otp: ['Kode OTP mock adalah 123456'] });
  }
  otpAttempts = 0;
  otpLocked = false;
  return ok({ accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token', user: pendingUser }, 'Login berhasil');
}

export function sessionForRole(role: RoleName): Session {
  return { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token', user: userByRole(role) };
}

// ---------- Email OTP fallback (PRD §7.2.6) ----------

/**
 * Email OTP fallback. Per PRD §7.2.6, the email channel is only enabled
 * after a valid password. The mock mirrors this by requiring an email
 * that maps to a known user fixture; lookup sets `pendingUser` for the
 * subsequent verifyEmailOtp call (so the recovery mock signs in the
 * typed email, not a stale default).
 */
export async function requestEmailOtp(email: string): Promise<ApiResponse<EmailOtpRequest>> {
  if (apiMode === 'real') return realFetch('/auth/recovery/email', { method: 'POST', body: JSON.stringify({ email }) });
  await new Promise((r) => setTimeout(r, 80));
  const user = users.find((u) => u.email === email);
  if (!user) {
    return err('NOT_FOUND', `Email ${email} tidak terdaftar. Pada produksi, endpoint ini mengembalikan 404 tanpa membocorkan apakah email ada.`);
  }
  pendingUser = user;
  pendingEmailOtpToken = `mock-email-otp-${Date.now()}`;
  pendingEmailOtpExpiresAt = Date.now() + 5 * 60 * 1000;
  emailOtpAttempts = 0;
  emailOtpLocked = false;
  const masked = email.replace(/^(.).+(@.+)$/, '$1***$2');
  return ok({ otp_token: pendingEmailOtpToken, channel: 'email', masked_destination: masked }, `Email OTP dikirim ke ${masked}`);
}

export async function verifyEmailOtp(otpToken: string, code: string): Promise<ApiResponse<Session>> {
  if (apiMode === 'real') return realFetch('/auth/recovery/email/verify', { method: 'POST', body: JSON.stringify({ otp_token: otpToken, code }) });
  await new Promise((r) => setTimeout(r, 80));
  if (emailOtpLocked) {
    return err('RATE_LIMITED', 'RATE_LIMITED — Email OTP dikunci setelah 3 percobaan gagal. Tunggu cooldown mock sebelum mencoba lagi.', undefined, { retry_after_seconds: 60 });
  }
  if (Date.now() > pendingEmailOtpExpiresAt && pendingEmailOtpExpiresAt > 0) {
    return err('UNAUTHENTICATED', 'Email OTP token sudah kadaluarsa (TTL 5 menit). Minta kode baru.');
  }
  if (otpToken !== pendingEmailOtpToken) {
    return err('UNAUTHENTICATED', 'Email OTP token tidak valid.');
  }
  if (code !== '123456') {
    emailOtpAttempts += 1;
    if (emailOtpAttempts >= 3) {
      emailOtpLocked = true;
      return err('RATE_LIMITED', 'RATE_LIMITED — Email OTP salah 3 kali. Login dikunci untuk mensimulasikan rate-limit/max attempt.', undefined, { retry_after_seconds: 60 });
    }
    return err('VALIDATION_FAILED', 'Kode email OTP tidak sesuai. Mock: 123456.', { email_otp: ['Kode email OTP mock adalah 123456'] });
  }
  emailOtpAttempts = 0;
  emailOtpLocked = false;
  pendingEmailOtpExpiresAt = 0;
  return ok({ accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token', user: pendingUser }, 'Login email OTP berhasil');
}

// ---------- Backup codes (PRD §7.2.5 + §7.8) ----------

export async function getBackupCodesStatus(userId: string): Promise<ApiResponse<BackupCodesStatus>> {
  if (apiMode === 'real') return realFetch(`/users/${userId}/backup-codes/status`);
  await new Promise((r) => setTimeout(r, 60));
  const codes = backupCodesByUser[userId] ?? [];
  const remaining = codes.filter((c) => !c.used).length;
  const regeneratedAt = codes[0]?.createdAt ?? null;
  return ok({ total: 8, remaining, regeneratedAt }, 'Status backup codes');
}

export async function regenerateBackupCodes(userId: string): Promise<ApiResponse<BackupCodesRegenerateResult>> {
  if (apiMode === 'real') return realFetch(`/users/${userId}/backup-codes/regenerate`, { method: 'POST' });
  await new Promise((r) => setTimeout(r, 100));
  const now = new Date().toISOString();
  const fresh: BackupCode[] = Array.from({ length: 8 }, (_, i) => ({
    id: `bc-${userId}-${Date.now()}-${i + 1}`,
    userId,
    code: `${(100000 + i * 17).toString().slice(0, 6)}-${(200000 + i * 23).toString().slice(0, 6)}`,
    used: false,
    createdAt: now
  }));
  backupCodesByUser[userId] = fresh;
  return ok(
    {
      codes: fresh,
      status: { total: 8, remaining: 8, regeneratedAt: now },
      warning: 'Kode hanya ditampilkan SEKALI. Salin sekarang — tidak bisa diakses lagi setelah Anda meninggalkan halaman ini.'
    },
    'Backup codes di-regenerate. Tampilkan sekali.'
  );
}

// ---------- Active sessions (PRD §7.2.6) ----------
//
// TODO(post-mvp): admin cross-user force-logout (revoke another user's session).
// The current mock supports self-revoke of the actor's own sessions via
// `forceLogoutSession(sessionId)` and `forceLogoutAllExceptCurrent(userId)`.
// A future admin-only route (`/admin/sessions`) should render a per-user
// session list and a cross-user revoke button gated by `user:force_logout`
// scope `all` (per PRD §7.8). Until then, no UI flow exists to revoke
// sessions belonging to other users. See
// `docs/mvp/2026-06-12_post-mvp-hardening-checklist.md` for the full
// Post-MVP hardening item list.

export async function listActiveSessions(userId: string): Promise<ApiResponse<ActiveSession[]>> {
  if (apiMode === 'real') return realFetch(`/users/${userId}/sessions`);
  await new Promise((r) => setTimeout(r, 60));
  return ok(sessionsByUser[userId] ?? [], 'Daftar sesi aktif');
}

export async function forceLogoutSession(sessionId: string): Promise<ApiResponse<{ id: string; revokedAt: string }>> {
  if (apiMode === 'real') return realFetch(`/users/_/sessions/${sessionId}/revoke`, { method: 'POST' });
  await new Promise((r) => setTimeout(r, 80));
  const idx = activeSessions.findIndex((s) => s.id === sessionId);
  if (idx < 0) return err('NOT_FOUND', 'Sesi tidak ditemukan atau sudah dicabut.');
  activeSessions.splice(idx, 1);
  return ok({ id: sessionId, revokedAt: new Date().toISOString() }, 'Sesi dicabut');
}

export async function forceLogoutAllExceptCurrent(userId: string): Promise<ApiResponse<{ revokedCount: number }>> {
  if (apiMode === 'real') return realFetch(`/users/${userId}/sessions/revoke-all`, { method: 'POST' });
  await new Promise((r) => setTimeout(r, 100));
  const before = activeSessions.length;
  for (let i = activeSessions.length - 1; i >= 0; i -= 1) {
    const s = activeSessions[i];
    if (s.userId === userId && !s.isCurrent) activeSessions.splice(i, 1);
  }
  return ok({ revokedCount: before - activeSessions.length }, 'Semua sesi lain dicabut. Sesi saat ini tetap aktif.');
}
