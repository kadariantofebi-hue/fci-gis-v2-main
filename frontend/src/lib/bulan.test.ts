import { describe, expect, it } from 'vitest';
import { BULAN, bulanLabel } from './bulan';

describe('BULAN', () => {
  it('has 12 Indonesian month names in order', () => {
    expect(BULAN).toHaveLength(12);
    expect(BULAN[0]).toBe('Januari');
    expect(BULAN[11]).toBe('Desember');
  });
});

describe('bulanLabel', () => {
  it('maps ISO startDate to month name', () => {
    expect(bulanLabel('2026-02-01')).toBe('Februari');
    expect(bulanLabel('2025-12-15')).toBe('Desember');
    expect(bulanLabel('2026-01-10')).toBe('Januari');
  });

  it('returns "—" for missing or invalid dates', () => {
    expect(bulanLabel(undefined)).toBe('—');
    expect(bulanLabel('')).toBe('—');
    expect(bulanLabel('bukan-tanggal')).toBe('—');
    expect(bulanLabel('2026-13-01')).toBe('—');
  });
});
