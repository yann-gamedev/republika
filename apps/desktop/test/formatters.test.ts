import { describe, expect, it } from 'vitest';

import {
  formatIndicator,
  formatPercentTenths,
  formatRupiahTriliun,
  formatSignedIndicator,
  formatSignedRupiahTriliun,
} from '../src/format/formatters';

describe('formatter arena', () => {
  it('menampilkan indikator fixed-point sebagai desimal Indonesia', () => {
    expect(formatIndicator(523)).toBe('52,3');
    expect(formatIndicator(1000)).toBe('100,0');
    expect(formatPercentTenths(48)).toBe('4,8%');
  });

  it('menampilkan kas miliar sebagai triliun rupiah', () => {
    expect(formatRupiahTriliun(8000)).toBe('Rp8 T');
    expect(formatRupiahTriliun(143_500)).toBe('Rp143,5 T');
    expect(formatRupiahTriliun(-1_100)).toBe('−Rp1,1 T');
  });

  it('memberi tanda hanya untuk nilai bukan nol', () => {
    expect(formatSignedIndicator(30)).toBe('+3,0');
    expect(formatSignedIndicator(-10)).toBe('−1,0');
    expect(formatSignedIndicator(0)).toBe('0,0');
    expect(formatSignedRupiahTriliun(2_000)).toBe('+Rp2 T');
    expect(formatSignedRupiahTriliun(0)).toBe('Rp0 T');
  });
});
