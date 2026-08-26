export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT_VERSION'
  | 'GONE_DEPRECATED_API'
  | 'VALIDATION_FAILED'
  | 'LOCKED_REUSE_DETECTED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';
export type SuccessResponse<T> = { success: true; message: string; data: T; meta?: Record<string, unknown>; request_id: string; timestamp: string };
export type ErrorResponse = { success: false; code: ErrorCode; message: string; errors?: Record<string, string[]>; meta?: Record<string, unknown>; request_id: string; timestamp: string };
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
export function ok<T>(data: T, message = 'Berhasil', meta: Record<string, unknown> = {}): SuccessResponse<T> {
  return { success: true, message, data, meta, request_id: crypto.randomUUID?.() ?? `req_${Date.now()}`, timestamp: new Date().toISOString() };
}
function defaultErrorMeta(code: ErrorCode): Record<string, unknown> | undefined {
  if (code === 'RATE_LIMITED') return { retry_after_seconds: 60 };
  if (code === 'CONFLICT_VERSION') return { current_version: null, your_version: null };
  if (code === 'GONE_DEPRECATED_API') return { migrate_to: '/api/v2/...' };
  return undefined;
}
export function err(code: ErrorCode, message: string, errors?: Record<string, string[]>, meta: Record<string, unknown> | undefined = defaultErrorMeta(code)): ErrorResponse {
  return { success: false, code, message, errors, meta, request_id: crypto.randomUUID?.() ?? `req_${Date.now()}`, timestamp: new Date().toISOString() };
}
export function unwrap<T>(response: ApiResponse<T>): T { if (response.success) return response.data; const error = response as ErrorResponse; throw new Error(`${error.code}: ${error.message}`); }
