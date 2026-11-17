import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { INDICATOR_KEYS } from '@republika/shared';

import { canonicalJson, cyrb128, hashState } from '../src/core/hash.js';
import {
  applyMultiplier,
  clamp,
  clampToDomain,
  indicatorBounds,
  roundTenths,
} from '../src/core/math.js';
import { compareIds, sortById, sortedKeys } from '../src/core/order.js';
import { createRng, createTurnRng } from '../src/core/rng.js';

function first(seed: string, count: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng.nextUint32());
}

describe('rng', () => {
  it('seed sama menghasilkan 1000 angka pertama yang sama (snapshot)', async () => {
    const numbers = first('abc', 1000);
    expect(first('abc', 1000)).toEqual(numbers);
    await expect(`${JSON.stringify(numbers)}\n`).toMatchFileSnapshot(
      './__fixtures__/rng-abc-1000.json',
    );
  });

  it('seed berbeda menghasilkan urutan berbeda', () => {
    expect(first('abc', 50)).not.toEqual(first('abd', 50));
    expect(first('', 50)).not.toEqual(first(' ', 50));
  });

  it('stream per turn memakai seed + ":" + turn', () => {
    const a = createTurnRng('seed', 3);
    const b = createRng('seed:3');
    expect(a.nextUint32()).toBe(b.nextUint32());
    expect(createTurnRng('seed', 4).nextUint32()).not.toBe(createTurnRng('seed', 3).nextUint32());
  });

  it('nextInt selalu dalam rentang inklusif', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.integer({ min: -1000, max: 1000 }),
        fc.nat(500),
        (seed, min, span) => {
          const rng = createRng(seed);
          for (let index = 0; index < 20; index += 1) {
            const value = rng.nextInt(min, min + span);
            expect(value).toBeGreaterThanOrEqual(min);
            expect(value).toBeLessThanOrEqual(min + span);
            expect(Number.isInteger(value)).toBe(true);
          }
        },
      ),
    );
  });

  it('nextInt menolak rentang tidak valid', () => {
    const rng = createRng('x');
    expect(() => rng.nextInt(5, 4)).toThrow();
    expect(() => rng.nextInt(0.5, 4)).toThrow();
    expect(() => rng.nextInt(0, 2 ** 33)).toThrow();
    expect(rng.nextInt(7, 7)).toBe(7);
  });

  it('weightedPick mengikuti bobot dan deterministik', () => {
    const items = [
      { value: 'A', weight: 1 },
      { value: 'B', weight: 3 },
    ];
    const rng = createRng('bobot');
    const counts = { A: 0, B: 0 };
    for (let index = 0; index < 4000; index += 1) {
      const pick = rng.weightedPick(items);
      if (pick === 'A' || pick === 'B') counts[pick] += 1;
    }
    expect(counts.A + counts.B).toBe(4000);
    expect(counts.B / 4000).toBeGreaterThan(0.7);
    expect(counts.B / 4000).toBeLessThan(0.8);
    expect(createRng('s').weightedPick(items)).toBe(createRng('s').weightedPick(items));
  });

  it('weightedPick kosong menghasilkan null dan bobot tidak valid ditolak', () => {
    const rng = createRng('kosong');
    expect(rng.weightedPick([])).toBeNull();
    expect(() => rng.weightedPick([{ value: 1, weight: 0 }])).toThrow();
    expect(() => rng.weightedPick([{ value: 1, weight: 1.5 }])).toThrow();
  });
});

describe('math', () => {
  it('roundTenths membulatkan half away from zero', () => {
    expect(roundTenths(0.25)).toBe(3);
    expect(roundTenths(-0.25)).toBe(-3);
    expect(roundTenths(1.15)).toBe(12);
    expect(roundTenths(-1.15)).toBe(-12);
    expect(roundTenths(4.52)).toBe(45);
    expect(roundTenths(-0.04)).toBe(0);
    expect(Object.is(roundTenths(-0.04), -0)).toBe(false);
  });

  it('property: roundTenths simetris untuk nilai negatif', () => {
    fc.assert(
      fc.property(fc.double({ min: -1e6, max: 1e6, noNaN: true }), (value) => {
        expect(roundTenths(-value)).toBe(-roundTenths(value) || 0);
      }),
    );
  });

  it('property: roundTenths paling jauh setengah persepuluhan dari nilai asli', () => {
    fc.assert(
      fc.property(fc.double({ min: -1e5, max: 1e5, noNaN: true }), (value) => {
        expect(Math.abs(roundTenths(value) - value * 10)).toBeLessThanOrEqual(0.5 + 1e-6);
      }),
    );
  });

  it('applyMultiplier membulatkan setelah pengali', () => {
    expect(applyMultiplier(40, 1.13)).toBe(45);
    expect(applyMultiplier(-40, 0.8)).toBe(-32);
    expect(applyMultiplier(5, 1.5)).toBe(8);
    expect(applyMultiplier(-5, 1.5)).toBe(-8);
  });

  it('property: clampToDomain selalu menghasilkan nilai dalam domain', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...INDICATOR_KEYS),
        fc.integer({ min: -100_000, max: 100_000 }),
        (key, value) => {
          const { min, max } = indicatorBounds(key);
          const clamped = clampToDomain(key, value);
          expect(clamped).toBeGreaterThanOrEqual(min);
          expect(clamped).toBeLessThanOrEqual(max);
          if (value >= min && value <= max) expect(clamped).toBe(value);
        },
      ),
    );
  });

  it('clamp generik', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});

describe('order', () => {
  it('sortById stabil dan tidak bergantung locale', () => {
    const items = [
      { id: 'b', n: 1 },
      { id: 'B', n: 2 },
      { id: 'a', n: 3 },
      { id: 'b', n: 4 },
    ];
    expect(sortById(items, (item) => item.id).map((item) => item.n)).toEqual([2, 3, 1, 4]);
    expect(items[0]?.n).toBe(1);
    expect(compareIds('x', 'x')).toBe(0);
    expect(sortedKeys({ z: 1, a: 2, M: 3 })).toEqual(['M', 'a', 'z']);
  });
});

describe('hash', () => {
  it('JSON kanonis mengurutkan key dan mengabaikan undefined', () => {
    expect(canonicalJson({ b: 1, a: [1, { d: undefined, c: 'x' }], e: null, f: true })).toBe(
      '{"a":[1,{"c":"x"}],"b":1,"e":null,"f":true}',
    );
    expect(canonicalJson([undefined])).toBe('[null]');
  });

  it('hashState stabil terhadap urutan key dan peka terhadap nilai', () => {
    expect(hashState({ a: 1, b: 2 })).toBe(hashState({ b: 2, a: 1 }));
    expect(hashState({ a: 1, b: 2 })).not.toBe(hashState({ a: 1, b: 3 }));
    expect(hashState({ a: 1 })).toMatch(/^[0-9a-f]{32}$/);
    expect(cyrb128('abc')).toEqual(cyrb128('abc'));
  });

  it('menolak nilai yang tidak bisa diserialisasi', () => {
    expect(() => canonicalJson(Number.NaN)).toThrow();
    expect(() => canonicalJson(() => 1)).toThrow();
  });
});
