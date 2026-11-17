import type {
  EventDefinition,
  FactionDefinition,
  GameDefinitions,
  MinistryDefinition,
  PolicyCategory,
  PolicyDefinition,
} from '@republika/shared';

import { sortById } from './order.js';

/** Indeks lookup O(1) atas definisi konten. Dibuat sekali per objek definisi. */
export interface DefinitionIndex {
  readonly defs: GameDefinitions;
  readonly policies: ReadonlyMap<string, PolicyDefinition>;
  readonly factions: ReadonlyMap<string, FactionDefinition>;
  readonly ministries: ReadonlyMap<string, MinistryDefinition>;
  readonly events: ReadonlyMap<string, EventDefinition>;
  /** Fraksi terurut ID (urutan iterasi deterministik). */
  readonly factionsSorted: readonly FactionDefinition[];
  /** Kementerian pertama (urut ID) yang menangani kategori. */
  readonly ministryByCategory: ReadonlyMap<PolicyCategory, MinistryDefinition>;
}

const cache = new WeakMap<GameDefinitions, DefinitionIndex>();

export function indexDefinitions(defs: GameDefinitions): DefinitionIndex {
  const cached = cache.get(defs);
  if (cached !== undefined) return cached;
  const ministriesSorted = sortById(defs.ministries, (ministry) => ministry.id);
  const ministryByCategory = new Map<PolicyCategory, MinistryDefinition>();
  for (const ministry of ministriesSorted) {
    for (const category of ministry.categories) {
      if (!ministryByCategory.has(category)) ministryByCategory.set(category, ministry);
    }
  }
  const index: DefinitionIndex = {
    defs,
    policies: new Map(defs.policies.map((policy) => [policy.id, policy])),
    factions: new Map(defs.factions.map((faction) => [faction.id, faction])),
    ministries: new Map(defs.ministries.map((ministry) => [ministry.id, ministry])),
    events: new Map(defs.events.map((event) => [event.id, event])),
    factionsSorted: sortById(defs.factions, (faction) => faction.id),
    ministryByCategory,
  };
  cache.set(defs, index);
  return index;
}
