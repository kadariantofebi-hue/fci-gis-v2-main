import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// Visibilitas Sidebar kiri. Di-toggle dari switch di Sidebar untuk mode
// tampilan layar penuh (full-screen view) saat mengakses modul.
// Persisted ke localStorage supaya preferensi bertahan antar reload.
const KEY = 'simanta.layout.sidebarVisible';

function initial(): boolean {
  if (!browser) return true;
  const raw = localStorage.getItem(KEY);
  if (raw === null) return true;
  return raw !== 'false';
}

export const sidebarVisible = writable<boolean>(initial());
sidebarVisible.subscribe((value) => {
  if (browser) localStorage.setItem(KEY, String(value));
});

export function toggleSidebar() {
  sidebarVisible.update((v) => !v);
}
