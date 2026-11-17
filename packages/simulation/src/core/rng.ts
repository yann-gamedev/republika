import { cyrb128 } from './hash.js';

export interface WeightedItem<T> {
  readonly value: T;
  readonly weight: number;
}

export interface Rng {
  /** Bilangan bulat 32-bit tak bertanda berikutnya. */
  nextUint32(): number;
  /** Bilangan bulat dalam rentang inklusif [min, max]. */
  nextInt(min: number, max: number): number;
  /** Memilih item sesuai bobot (bobot bilangan bulat > 0). `null` jika kosong. */
  weightedPick<T>(items: readonly WeightedItem<T>[]): T | null;
}

/**
 * PRNG sfc32 yang di-seed lewat cyrb128(seed). Deterministik lintas platform
 * karena hanya memakai operasi integer 32-bit.
 */
export function createRng(seed: string): Rng {
  let [a, b, c, d] = cyrb128(seed);

  const nextUint32 = (): number => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };

  // Buang 12 keluaran pertama agar state tercampur (praktik umum sfc32).
  for (let index = 0; index < 12; index += 1) nextUint32();

  const nextInt = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error(`Rentang nextInt tidak valid: [${min}, ${max}].`);
    }
    const span = max - min + 1;
    if (span > 0x1_0000_0000) throw new Error('Rentang nextInt maksimal 2^32.');
    // Rejection sampling agar distribusi seragam tanpa bias modulo.
    const limit = Math.floor(0x1_0000_0000 / span) * span;
    let value = nextUint32();
    while (value >= limit) value = nextUint32();
    return min + (value % span);
  };

  const weightedPick = <T>(items: readonly WeightedItem<T>[]): T | null => {
    let total = 0;
    for (const item of items) {
      if (!Number.isInteger(item.weight) || item.weight <= 0) {
        throw new Error('Bobot weightedPick harus bilangan bulat positif.');
      }
      total += item.weight;
    }
    if (total === 0) return null;
    let roll = nextInt(1, total);
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) return item.value;
    }
    /* c8 ignore next */
    return null;
  };

  return { nextUint32, nextInt, weightedPick };
}

/** Stream RNG terpisah per turn: `seed + ":" + turn`. */
export function createTurnRng(seed: string, turn: number): Rng {
  return createRng(`${seed}:${turn}`);
}
