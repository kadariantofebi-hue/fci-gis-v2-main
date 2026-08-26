import { describe, expect, it, beforeEach, vi } from 'vitest';

// Polyfill localStorage for node test env (same pattern as audit.test.ts).
// Must run before module import because layout.ts reads localStorage at
// module-load time via `initial()` and subscribes at load time.
vi.hoisted(() => {
  const memStore = new Map<string, string>();
  const localStoragePolyfill = {
    getItem: (k: string) => memStore.get(k) ?? null,
    setItem: (k: string, v: string) => memStore.set(k, v),
    removeItem: (k: string) => memStore.delete(k),
    clear: () => memStore.clear(),
    key: (i: number) => Array.from(memStore.keys())[i] ?? null,
    get length() {
      return memStore.size;
    }
  };
  (globalThis as any).localStorage = localStoragePolyfill;
});

// Mock the svelte/environment before importing layout
vi.mock('$app/environment', () => ({ browser: true }));

import { sidebarVisible, toggleSidebar } from './layout';

function current(): boolean {
  let captured = true;
  sidebarVisible.subscribe((v) => (captured = v))();
  return captured;
}

describe('layout store — sidebar visibility', () => {
  beforeEach(() => {
    localStorage.clear();
    sidebarVisible.set(true);
  });

  it('defaults to visible', () => {
    expect(current()).toBe(true);
  });

  it('toggleSidebar flips visibility', () => {
    toggleSidebar();
    expect(current()).toBe(false);
    toggleSidebar();
    expect(current()).toBe(true);
  });

  it('persists state to localStorage', () => {
    toggleSidebar();
    expect(localStorage.getItem('simanta.layout.sidebarVisible')).toBe('false');
    toggleSidebar();
    expect(localStorage.getItem('simanta.layout.sidebarVisible')).toBe('true');
  });
});
