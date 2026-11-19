import { loadGameDefinitions } from '@republika/game-data';
import type { GameDefinitions, LoadedGameContent } from '@republika/shared';

/**
 * Konten yang dibundel saat build, divalidasi sekali saat modul dimuat.
 * Nama, judul, dan teks berasal langsung dari `packages/game-data/content/`.
 */
export const gameContent: LoadedGameContent = loadGameDefinitions();

/**
 * Khusus build test (`vite build --mode e2e`): panjang kampanye bisa diganti
 * agar E2E tidak bergantung pada `scenario.json` milik penulis konten.
 * Build rilis tidak pernah mengisi variabel ini.
 */
function maxTurnsOverride(): number | null {
  const raw = (import.meta.env as Record<string, string | undefined>).VITE_MAX_TURNS_OVERRIDE;
  const value = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : null;
}

const override = maxTurnsOverride();
export const definitions: GameDefinitions =
  override === null
    ? gameContent.definitions
    : {
        ...gameContent.definitions,
        scenario: { ...gameContent.definitions.scenario, maxTurns: override },
      };
export const contentHash: string = gameContent.contentHash;

export function policyName(policyId: string): string {
  return definitions.policies.find((policy) => policy.id === policyId)?.name ?? policyId;
}

export function factionName(factionId: string): string {
  return definitions.factions.find((faction) => faction.id === factionId)?.name ?? factionId;
}

export function ministryName(ministryId: string): string {
  return definitions.ministries.find((ministry) => ministry.id === ministryId)?.name ?? ministryId;
}

/** Nama jabatan: kementerian atau jabatan pimpinan (Tahap 6B.3). */
export function roleTitle(roleId: string): string {
  return (
    definitions.ministries.find((ministry) => ministry.id === roleId)?.name ??
    definitions.leaders.find((leader) => leader.id === roleId)?.title ??
    roleId
  );
}

export function provinceName(provinceId: string): string {
  return definitions.provinces.find((province) => province.id === provinceId)?.name ?? provinceId;
}

export function candidateName(candidateId: string): string {
  return (
    definitions.candidates.find((candidate) => candidate.id === candidateId)?.name ?? candidateId
  );
}

export function eventTitle(eventId: string): string {
  return definitions.events.find((event) => event.id === eventId)?.title ?? eventId;
}
