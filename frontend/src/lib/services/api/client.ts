import { PUBLIC_API_BASE_URL, PUBLIC_API_MODE } from '$env/static/public';
import { ok, err, type ApiResponse } from '$shared/envelope';
export const apiMode = PUBLIC_API_MODE || 'mock';
export const apiBaseUrl = PUBLIC_API_BASE_URL || '/api/v1';
export async function mockResponse<T>(data: T, message = 'Berhasil', meta: Record<string, unknown> = {}): Promise<ApiResponse<T>> { await new Promise((r)=>setTimeout(r, 80)); return ok(data, message, meta); }
export async function realFetch<T = any>(path: string, init?: RequestInit): Promise<ApiResponse<T>> { const res = await fetch(`${apiBaseUrl}${path}`, { headers:{'Content-Type':'application/json'}, ...init }); return await res.json(); }
export function notFound(message='Data tidak ditemukan') { return err('NOT_FOUND', message); }
