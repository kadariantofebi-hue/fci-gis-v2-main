import { describe, expect, it } from 'vitest';
import { createRaceGuard } from './async-race-guard';

describe('createRaceGuard — token sequencing (Phase 5 P1 unit test for OMP I-3 race fix)', () => {
  it('next() returns sequential tokens starting from 1', () => {
    const g = createRaceGuard();
    expect(g.next()).toBe(1);
    expect(g.next()).toBe(2);
    expect(g.next()).toBe(3);
  });

  it('current property reflects the most recent generation', () => {
    const g = createRaceGuard();
    expect(g.current).toBe(0);
    g.next();
    expect(g.current).toBe(1);
    g.next();
    expect(g.current).toBe(2);
  });
});

describe('createRaceGuard — isCurrent() (the OMP I-3 bail-out mechanism)', () => {
  it('isCurrent() returns true only for the latest token', () => {
    const g = createRaceGuard();
    const t1 = g.next();
    const t2 = g.next();
    const t3 = g.next();
    expect(g.isCurrent(t1)).toBe(false);
    expect(g.isCurrent(t2)).toBe(false);
    expect(g.isCurrent(t3)).toBe(true);
  });

  it('isCurrent() returns true for the token issued by the most recent next()', () => {
    const g = createRaceGuard();
    const t1 = g.next();
    expect(g.isCurrent(t1)).toBe(true);
    g.next(); // newer token
    expect(g.isCurrent(t1)).toBe(false);
  });
});

describe('createRaceGuard — race scenario from OMP I-3 (the actual property under test)', () => {
  it('simulates rapid double-click on two different tiles: first click is stale after second starts', () => {
    const g = createRaceGuard();

    // Simulate the race: user clicks tile A, then tile B before A's pollJob resolves.
    // In tools/+page.svelte, the pattern is:
    //   const myGeneration = ++pollGeneration;
    //   ... await enqueueJob, await pollJob ...
    //   if (myGeneration !== pollGeneration) return; // bail if a newer click started
    const clickAToken = g.next();
    const clickBToken = g.next();

    // The first click's await eventually resolves.
    // It checks isCurrent(clickAToken) BEFORE mutating any state.
    // If isCurrent returns false, the click must bail out (no mutation).
    expect(g.isCurrent(clickAToken)).toBe(false);
    // The second click is current; it can proceed with its state update.
    expect(g.isCurrent(clickBToken)).toBe(true);
  });

  it('simulates late resolution of stale token: even if first-issued token resolves last, it bails out', async () => {
    const g = createRaceGuard();

    // Two click tokens, both in flight.
    const clickAToken = g.next();
    const clickBToken = g.next();

    // Simulate: click B's enqueue+pollJob resolves FIRST (fast).
    // Then click A's enqueue+pollJob resolves LATER (slow).
    // Without the guard, click A's late resolution would clobber click B's state.
    // With the guard, click A's post-await check fails, and the mutation is skipped.

    // Build a simulated state-mutation tracker.
    const stateUpdates: Array<{ source: 'A' | 'B'; at: number }> = [];

    // Simulate click B resolving first (synchronous here; in real code it would be after await).
    const clickBResult = await Promise.resolve('B-state');
    if (g.isCurrent(clickBToken)) {
      stateUpdates.push({ source: 'B', at: 1 });
    } else {
      // click B is stale, skip
    }
    expect(clickBResult).toBe('B-state');

    // Then simulate click A's late resolution.
    const clickAResult = await Promise.resolve('A-state');
    if (g.isCurrent(clickAToken)) {
      // This branch MUST NOT execute for the guard to be correct.
      stateUpdates.push({ source: 'A', at: 2 });
    } else {
      // click A is stale, skipped
    }
    expect(clickAResult).toBe('A-state');

    // Critical invariant: only click B's state was applied.
    // click A's late resolution was correctly bailed out by the guard.
    expect(stateUpdates).toEqual([{ source: 'B', at: 1 }]);
    expect(stateUpdates).toHaveLength(1);
  });

  it('simulates same-tile re-click: token increments, previous click is stale', () => {
    const g = createRaceGuard();
    const firstClick = g.next();
    g.next(); // user re-clicks the SAME tile before first pollJob resolves
    expect(g.isCurrent(firstClick)).toBe(false);
  });

  it('simulates no overlap: single click, all checks pass', async () => {
    const g = createRaceGuard();
    const token = g.next();
    // No other clicks happened
    expect(g.isCurrent(token)).toBe(true);
    // Simulate post-await check after a single click
    const result = await Promise.resolve('only-click-state');
    let applied = false;
    if (g.isCurrent(token)) {
      applied = true;
    }
    expect(applied).toBe(true);
  });
});
