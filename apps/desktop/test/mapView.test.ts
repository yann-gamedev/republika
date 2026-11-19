import { describe, expect, it } from 'vitest';

import { satisfactionLevel, tileCode } from '@/features/map/mapView';

describe('peta daerah', () => {
  it('tingkat kepuasan mengikuti Lampiran A', () => {
    expect(satisfactionLevel(700)).toBe(1);
    expect(satisfactionLevel(699)).toBe(2);
    expect(satisfactionLevel(550)).toBe(2);
    expect(satisfactionLevel(549)).toBe(3);
    expect(satisfactionLevel(400)).toBe(3);
    expect(satisfactionLevel(399)).toBe(4);
    expect(satisfactionLevel(250)).toBe(4);
    expect(satisfactionLevel(249)).toBe(5);
  });

  it('kode tile maksimal 6 huruf', () => {
    expect(tileCode('PRV-BENGKULU')).toBe('BENGKU');
    expect(tileCode('PRV-NTT')).toBe('NTT');
  });
});
