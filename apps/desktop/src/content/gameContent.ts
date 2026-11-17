import { loadGameDefinitions } from '@republika/game-data';
import type { GameDefinitions, LoadedGameContent } from '@republika/shared';

/**
 * Konten yang dibundel saat build, divalidasi sekali saat modul dimuat.
 * Nama, judul, dan teks berasal langsung dari `packages/game-data/content/`.
 */
export const gameContent: LoadedGameContent = loadGameDefinitions();
export const definitions: GameDefinitions = gameContent.definitions;
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

export function eventTitle(eventId: string): string {
  return definitions.events.find((event) => event.id === eventId)?.title ?? eventId;
}
