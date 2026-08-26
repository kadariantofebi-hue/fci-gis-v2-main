import { describe, expect, it } from 'vitest';
import { hasGeomFromQuery, hasGeomToQuery } from './assets-filters';

describe('hasGeomFromQuery — URL → dropdown (Phase 2 P0 hydration)', () => {
  it('translates ?has_geom=true to "yes"', () => {
    expect(hasGeomFromQuery('true')).toBe('yes');
  });

  it('translates ?has_geom=false to "no"', () => {
    expect(hasGeomFromQuery('false')).toBe('no');
  });

  it('returns null for absent query (null)', () => {
    expect(hasGeomFromQuery(null)).toBeNull();
  });

  it('returns null for absent query (undefined)', () => {
    expect(hasGeomFromQuery(undefined)).toBeNull();
  });

  it('returns null for invalid value "foo" (caller must strip the bad param)', () => {
    expect(hasGeomFromQuery('foo')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(hasGeomFromQuery('')).toBeNull();
  });

  it('returns null for case-mismatched "True" (URLs are case-sensitive)', () => {
    expect(hasGeomFromQuery('True')).toBeNull();
  });
});

describe('hasGeomToQuery — dropdown → URL (Phase 2 P0 hydration)', () => {
  it('translates "yes" to "true"', () => {
    expect(hasGeomToQuery('yes')).toBe('true');
  });

  it('translates "no" to "false"', () => {
    expect(hasGeomToQuery('no')).toBe('false');
  });

  it('translates "all" to null (no query param)', () => {
    expect(hasGeomToQuery('all')).toBeNull();
  });
});

describe('hasGeomFromQuery ↔ hasGeomToQuery — round-trip invariants', () => {
  it('true → yes → true', () => {
    expect(hasGeomToQuery(hasGeomFromQuery('true')!)).toBe('true');
  });

  it('false → no → false', () => {
    expect(hasGeomToQuery(hasGeomFromQuery('false')!)).toBe('false');
  });

  it('"all" dropdown produces no query param (round-trip via URL is identity)', () => {
    expect(hasGeomToQuery('all')).toBeNull();
  });
});
