/**
 * Race-guard pattern for stale async callback protection.
 *
 * When two async operations overlap (e.g., user double-clicks two different
 * tiles before the first pollJob resolves), this guard ensures only the
 * most recent operation's post-await state mutations take effect. Older
 * operations see their token is no longer "current" and bail out.
 *
 * Without this guard, the operation whose `await` resolves LAST would
 * clobber the state set by the operation the user clicked last — a
 * classic async race condition. This pattern is the OMP I-3 fix for
 * `tools/+page.svelte` pollGeneration counter, generalized into a
 * reusable module so it can be unit-tested with controllable promise
 * resolution order.
 *
 * TODO(integration): wire this into `tools/+page.svelte` to replace the
 * inline `let pollGeneration = 0` pattern. The refactor is intentionally
 * deferred to a follow-up phase (not in Phase 5 scope per the plan) so
 * Phase 5 stays test-only and `tools/+page.svelte` is not modified.
 * Until wired in, the inline pattern in `tools/+page.svelte` is
 * functionally equivalent to `createRaceGuard()` for the single-call-site
 * case; the unit tests below lock in the pattern's correctness so the
 * integration refactor is safe.
 *
 *   const guard = createRaceGuard();
 *   async function startJob(template) {
 *     const token = guard.next();
 *     const enq = await enqueueJob(template);
 *     if (!guard.isCurrent(token)) return; // stale, bail out before mutation
 *     activeJob = enq.data;
 *     const polled = await pollJob(template, enq.data.id, 80, 4);
 *     if (!guard.isCurrent(token)) return; // stale, bail out before mutation
 *     activeJob = polled.data;
 *   }
 *
 * Critical invariant: any external state mutation must be guarded by
 * `if (!guard.isCurrent(token)) return;` AFTER each `await` boundary.
 */
export interface RaceGuard {
  /** Increment the counter and return the new token. */
  next(): number;
  /** Check if a given token is still the most recent operation. */
  isCurrent(token: number): boolean;
  /** Current generation number, useful for diagnostics or reactive UI binding. */
  readonly current: number;
}

export function createRaceGuard(): RaceGuard {
  let generation = 0;
  return {
    next() {
      return ++generation;
    },
    isCurrent(token) {
      return token === generation;
    },
    get current() {
      return generation;
    }
  };
}
