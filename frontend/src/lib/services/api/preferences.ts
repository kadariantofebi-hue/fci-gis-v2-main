import type { Preferences } from '$lib/stores/preferences';
import { ok, type ApiResponse } from '$shared/envelope';
import { apiMode, realFetch } from './client';

let mockPreferences: Preferences | null = null;

export async function savePreferences(payload: Preferences): Promise<ApiResponse<Preferences>> {
  if (apiMode === 'real') {
    return realFetch('/prefs', { method: 'PUT', body: JSON.stringify(payload) });
  }

  mockPreferences = structuredClone(payload);
  return ok(mockPreferences, 'Preferensi tersimpan', { path: '/api/v1/prefs', mode: 'mock' });
}

export async function getPreferences(): Promise<ApiResponse<Preferences | null>> {
  if (apiMode === 'real') return realFetch('/prefs');
  return ok(mockPreferences, 'Preferensi mock', { path: '/api/v1/prefs', mode: 'mock' });
}
