import { describe, expect, it, beforeEach, vi } from 'vitest';

// Mock the svelte/environment before importing toast
vi.mock('$app/environment', () => ({ browser: true }));

import { toastStore, type Toast } from './toast';

describe('toast service', () => {
  beforeEach(() => {
    toastStore.clear();
  });

  it('pushes a toast and the store contains it', () => {
    const id = toastStore.info('hello');
    expect(id).toBeTruthy();
    let captured: Toast[] = [];
    const unsub = toastStore.subscribe((v) => (captured = v));
    expect(captured).toHaveLength(1);
    expect(captured[0].kind).toBe('info');
    expect(captured[0].message).toBe('hello');
    unsub();
  });

  it('helper kinds set the right tone', () => {
    toastStore.info('i');
    toastStore.success('s');
    toastStore.warning('w');
    toastStore.error('e');
    let captured: Toast[] = [];
    toastStore.subscribe((v) => (captured = v));
    expect(captured.map((t) => t.kind)).toEqual(['info', 'success', 'warning', 'error']);
  });

  it('dismiss removes by id', () => {
    const id = toastStore.success('a')!;
    toastStore.success('b');
    toastStore.dismiss(id);
    let captured: Toast[] = [];
    toastStore.subscribe((v) => (captured = v));
    expect(captured).toHaveLength(1);
    expect(captured[0].message).toBe('b');
  });

  it('FIFO drop when queue exceeds MAX_QUEUE (5)', () => {
    for (let i = 0; i < 7; i += 1) toastStore.info(`t${i}`);
    let captured: Toast[] = [];
    toastStore.subscribe((v) => (captured = v));
    expect(captured).toHaveLength(5);
    expect(captured[0].message).toBe('t2');
    expect(captured[4].message).toBe('t6');
  });

  it('clear empties the store', () => {
    toastStore.info('a');
    toastStore.clear();
    let captured: Toast[] = [];
    toastStore.subscribe((v) => (captured = v));
    expect(captured).toEqual([]);
  });
});
