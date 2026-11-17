import { definitions, eventTitle, factionName, policyName } from '@/content/gameContent';
import { copy } from '@/copy/id';

/** Nama manusiawi untuk ID sumber ledger (kebijakan, event, fraksi, kementerian). */
export function sourceName(sourceId: string | undefined): string | null {
  if (sourceId === undefined) return null;
  if (definitions.policies.some((policy) => policy.id === sourceId)) return policyName(sourceId);
  if (definitions.events.some((event) => event.id === sourceId)) return eventTitle(sourceId);
  if (definitions.factions.some((faction) => faction.id === sourceId)) return factionName(sourceId);
  const ministry = definitions.ministries.find((item) => item.id === sourceId);
  return ministry?.name ?? sourceId;
}

/**
 * Kalimat Indonesia untuk satu penyebab di ledger. Urutan: kalimat engine,
 * kalimat konten dari penulis, lalu "Dampak {nama sumber}".
 */
export function reasonText(reasonCode: string, sourceId?: string): string {
  const known = copy.engineReasons[reasonCode] ?? copy.contentReasons[reasonCode];
  if (known !== undefined) return known;
  const name = sourceName(sourceId);
  return name === null ? copy.reasonUnknown(reasonCode) : copy.reasonFallback(name);
}
