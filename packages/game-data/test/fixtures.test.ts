import { describe, expect, it } from 'vitest';

import { sliceFixtureBundle } from '../fixtures/slice/index.js';
import { loadGameDefinitions } from '../src/index.js';

describe('slice fixture bundle', () => {
  it('lolos validasi konten', () => {
    const loaded = loadGameDefinitions(sliceFixtureBundle);
    expect(loaded.definitions.policies.map((policy) => policy.id)).toEqual([
      'POL-ENERGY-FX-001',
      'POL-FISCAL-FX-001',
      'POL-SOCIAL-FX-001',
    ]);
    expect(loaded.definitions.factions.reduce((sum, faction) => sum + faction.seats, 0)).toBe(100);
  });
});
