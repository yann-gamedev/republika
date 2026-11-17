import { compareIds } from './order.js';

/**
 * cyrb128: hash string non-kriptografis 128-bit (4 × uint32). Dipakai untuk
 * seed PRNG dan sidik jari state. Bukan untuk keamanan.
 */
export function cyrb128(input: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    h1 = h2 ^ Math.imul(h1 ^ code, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ code, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ code, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ code, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/**
 * JSON kanonis: key objek tersortir rekursif, properti `undefined` diabaikan,
 * urutan array dipertahankan. Angka non-finite ditolak.
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'number':
      if (!Number.isFinite(value)) throw new Error('Angka non-finite tidak bisa di-hash.');
      return JSON.stringify(value);
    case 'string':
    case 'boolean':
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) {
        return `[${value.map((item) => (item === undefined ? 'null' : canonicalJson(item))).join(',')}]`;
      }
      const record = value as Record<string, unknown>;
      const parts = Object.keys(record)
        .sort(compareIds)
        .filter((key) => record[key] !== undefined)
        .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
      return `{${parts.join(',')}}`;
    }
    default:
      throw new Error(`Tipe ${typeof value} tidak bisa di-hash.`);
  }
}

/** Hash stabil (hex 32 karakter) dari nilai apa pun yang bisa diserialisasi JSON. */
export function hashState(value: unknown): string {
  return cyrb128(canonicalJson(value))
    .map((part) => part.toString(16).padStart(8, '0'))
    .join('');
}
