import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import type { GameDefinitions } from '@republika/shared';

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return Object.fromEntries(entries.map(([key, entry]) => [key, canonicalValue(entry)]));
  }
  return value;
}

/** JSON kanonis: key objek tersortir, array mempertahankan urutan. */
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function byId<T extends { readonly id: string }>(left: T, right: T): number {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export function computeContentHash(definitions: GameDefinitions): string {
  const canonical = {
    scenario: definitions.scenario,
    baseline: definitions.baseline,
    factions: [...definitions.factions].sort(byId),
    ministries: [...definitions.ministries].sort(byId),
    policies: [...definitions.policies].sort(byId),
    events: [...definitions.events].sort(byId),
    archetypes: [...definitions.archetypes].sort(byId),
    // Koleksi 6B hanya ikut bila berisi, agar hash konten lama tidak berubah.
    ...(definitions.backgrounds.length > 0
      ? { backgrounds: [...definitions.backgrounds].sort(byId) }
      : {}),
    ...(definitions.promises.length > 0 ? { promises: [...definitions.promises].sort(byId) } : {}),
    ...(definitions.provinces.length > 0
      ? { provinces: [...definitions.provinces].sort(byId) }
      : {}),
    ...(definitions.leaders.length > 0 ? { leaders: [...definitions.leaders].sort(byId) } : {}),
    ...(definitions.candidates.length > 0
      ? { candidates: [...definitions.candidates].sort(byId) }
      : {}),
  };
  return bytesToHex(sha256(utf8ToBytes(canonicalStringify(canonical))));
}
