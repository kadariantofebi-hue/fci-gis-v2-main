import type { PermissionKey, PermissionScope, RoleName } from '../enums';
export type PermissionGrant = { key: PermissionKey; scope: PermissionScope };
export type User = { id: string; name: string; email: string; phoneVerified: boolean; opdId?: string; role: RoleName; permissions: PermissionGrant[] };
export type LoginPasswordResult = { otp_token: string; channel: 'whatsapp' | 'email'; masked_destination: string };
export type Session = { accessToken: string; refreshToken: string; user: User };

/**
 * Backup code (PRD §7.2.5 + §7.8 regenerate). 8 codes per user, single-use
 * one-time display after regenerate, bcryptjs-hashed at rest in real backend.
 */
export type BackupCode = { id: string; userId: string; code: string; used: boolean; createdAt: string };

export type BackupCodesStatus = {
  total: number; // PRD: 8
  remaining: number;
  regeneratedAt: string | null;
};

export type BackupCodesRegenerateResult = {
  codes: BackupCode[]; // returned ONE TIME; client must capture now
  status: BackupCodesStatus;
  warning: string;
};

/**
 * Active session (PRD §7.2.6). 30-day refresh token rotation with 30s grace
 * window. Force-logout per session bumps `users.token_version`.
 */
export type ActiveSession = {
  id: string; // session id
  userId: string;
  device: string; // human-readable device fingerprint (mock)
  ip: string; // mocked IP
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
};

/**
 * Email OTP fallback request (PRD §7.2.6). Triggered only after a valid
 * password; channel switches to 'email' with masked email destination.
 */
export type EmailOtpRequest = { otp_token: string; channel: 'email'; masked_destination: string };

