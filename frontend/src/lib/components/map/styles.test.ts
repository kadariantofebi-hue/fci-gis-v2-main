import { describe, expect, it } from 'vitest';
import { assetColors, assetStrokeColors, colorForJenis, strokeForJenis } from './styles';

describe('map style mapping', () => {
  it('maps asset jenis to PRD v1.3.7 legend fill/stroke colors', () => {
    expect(assetColors).toEqual({
      tanah: '#ef4444',
      bangunan: '#3b82f6',
      jalan: '#475569',
      saluran: '#06b6d4',
      lapangan: '#f97316',
      makam: '#8b5cf6',
      taman: '#22c55e',
      lainnya: '#eab308'
    });
    expect(assetStrokeColors.tanah).toBe('#991b1b');
    expect(assetStrokeColors.bangunan).toBe('#1e3a8a');
    expect(assetStrokeColors.makam).toBe('#5b21b6');
    expect(colorForJenis('jalan')).toBe('#475569');
    expect(strokeForJenis('taman')).toBe('#15803d');
  });
});
