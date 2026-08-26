import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
  durationMs: number;
};

const DEFAULT_DURATION = 4000;
const MAX_QUEUE = 5;

const toasts = writable<Toast[]>([]);

function nextId() {
  return `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function dismiss(id: string) {
  toasts.update((list) => list.filter((t) => t.id !== id));
}

function push(kind: ToastKind, message: string, durationMs = DEFAULT_DURATION) {
  if (!browser) return;
  const id = nextId();
  const t: Toast = { id, kind, message, durationMs };
  toasts.update((list) => {
    // FIFO: drop the oldest if at capacity
    const next = [...list, t];
    if (next.length > MAX_QUEUE) next.shift();
    return next;
  });
  if (durationMs > 0) {
    setTimeout(() => dismiss(id), durationMs);
  }
  return id;
}

export const toastStore = {
  subscribe: toasts.subscribe,
  push,
  dismiss,
  // Convenience helpers
  info: (message: string, durationMs?: number) => push('info', message, durationMs),
  success: (message: string, durationMs?: number) => push('success', message, durationMs),
  warning: (message: string, durationMs?: number) => push('warning', message, durationMs),
  error: (message: string, durationMs?: number) => push('error', message, durationMs),
  clear: () => toasts.set([])
};
