import type {
  GameDefinitions,
  GameState,
  LedgerEntry,
  RulesetMigrationMap,
  SaveFile,
} from '@republika/shared';

import { compareIds, sortById } from '../core/order.js';
import { syncCampaignContent } from '../politics/campaignState.js';
import { ledgerId } from './compact.js';

export type MigrateRulesetResult =
  | {
      readonly ok: true;
      readonly save: SaveFile;
      /** `true` bila ruleset berubah ("dilanjutkan dengan aturan v{N}"). */
      readonly migrated: boolean;
      readonly fromRuleset: number;
      readonly toRuleset: number;
      /** Kebijakan aktif yang dihentikan karena tidak ada lagi di konten. */
      readonly stoppedPolicies: readonly string[];
    }
  | { readonly ok: false; readonly code: 'NEWER_RULESET'; readonly version: number };

function renameAll(state: GameState, renamed: Readonly<Record<string, string>>): GameState {
  const rename = (id: string): string => renamed[id] ?? id;
  const renameKeys = (record: Readonly<Record<string, number>>): Record<string, number> =>
    Object.fromEntries(Object.entries(record).map(([id, value]) => [rename(id), value]));
  return {
    ...state,
    activePolicies: state.activePolicies.map((policy) => ({
      ...policy,
      policyId: rename(policy.policyId),
    })),
    pendingCommands: state.pendingCommands.map((command) =>
      command.type === 'ENACT_POLICY'
        ? { ...command, policyId: rename(command.policyId) }
        : { ...command, factionId: rename(command.factionId) },
    ),
    pendingEvents: state.pendingEvents.map((event) => ({
      ...event,
      eventId: rename(event.eventId),
    })),
    lobbyThisTurn: state.lobbyThisTurn.map(rename),
    policyCooldowns: renameKeys(state.policyCooldowns),
    eventCooldowns: renameKeys(state.eventCooldowns),
    eventsFired: state.eventsFired.map(rename),
    factions: state.factions.map((faction) => ({
      ...faction,
      factionId: rename(faction.factionId),
    })),
    ministries: state.ministries.map((ministry) => ({
      ...ministry,
      ministryId: rename(ministry.ministryId),
    })),
    delayedEffects: state.delayedEffects.map((effect) => ({
      ...effect,
      sourceId: rename(effect.sourceId),
    })),
  };
}

/**
 * Melanjutkan kampanye lama dengan aturan baru (AGENT §5.13). Peta
 * `ruleset-<N>.json` diterapkan berurutan; setelah itu state diselaraskan dengan
 * konten saat ini: kebijakan aktif yang tidak ada lagi dihentikan dengan entri
 * ledger `RULESET_MIGRATED`, event/cooldown yang tidak dikenal dibuang, fraksi
 * dan kementerian baru ditambahkan dengan nilai awal. Murni.
 */
export function migrateRuleset(
  save: SaveFile,
  defs: GameDefinitions,
  maps: readonly RulesetMigrationMap[],
): MigrateRulesetResult {
  const fromRuleset = save.state.rulesetVersion;
  const toRuleset = defs.scenario.rulesetVersion;
  if (fromRuleset > toRuleset) return { ok: false, code: 'NEWER_RULESET', version: fromRuleset };
  if (fromRuleset === toRuleset) {
    return { ok: true, save, migrated: false, fromRuleset, toRuleset, stoppedPolicies: [] };
  }

  let state: GameState = save.state;
  for (const map of [...maps].sort((a, b) => a.fromRuleset - b.fromRuleset)) {
    if (map.fromRuleset < fromRuleset || map.toRuleset > toRuleset) continue;
    state = renameAll(state, map.renamed);
  }

  const policyIds = new Set(defs.policies.map((policy) => policy.id));
  const eventIds = new Set(defs.events.map((event) => event.id));
  const stoppedPolicies = state.activePolicies
    .map((policy) => policy.policyId)
    .filter((id) => !policyIds.has(id))
    .sort(compareIds);

  const ledger: LedgerEntry[] = [...save.history.ledger];
  for (const policyId of stoppedPolicies) {
    const order = ledger.length;
    ledger.push({
      id: ledgerId(state.turn, order),
      turn: state.turn,
      order,
      kind: 'POLICY',
      sourceType: 'SYSTEM',
      sourceId: policyId,
      reasonCode: 'RULESET_MIGRATED',
      target: policyId,
      message: `Dihentikan: tidak ada di aturan v${toRuleset}.`,
    });
  }

  const keepKnown = (record: Readonly<Record<string, number>>, known: Set<string>) =>
    Object.fromEntries(Object.entries(record).filter(([id]) => known.has(id)));
  const factionIds = new Set(defs.factions.map((faction) => faction.id));

  state = {
    ...state,
    rulesetVersion: toRuleset,
    rulesetMigratedFrom: Math.min(state.rulesetMigratedFrom ?? fromRuleset, fromRuleset),
    activePolicies: state.activePolicies.filter((policy) => policyIds.has(policy.policyId)),
    pendingCommands: state.pendingCommands.filter((command) =>
      command.type === 'ENACT_POLICY'
        ? policyIds.has(command.policyId)
        : factionIds.has(command.factionId),
    ),
    pendingEvents: state.pendingEvents.filter((event) => eventIds.has(event.eventId)),
    lobbyThisTurn: state.lobbyThisTurn.filter((id) => factionIds.has(id)),
    policyCooldowns: keepKnown(state.policyCooldowns, policyIds),
    eventCooldowns: keepKnown(state.eventCooldowns, eventIds),
    eventsFired: state.eventsFired.filter((id) => eventIds.has(id)),
    delayedEffects: state.delayedEffects.filter((effect) =>
      effect.sourceType === 'POLICY'
        ? policyIds.has(effect.sourceId)
        : eventIds.has(effect.sourceId),
    ),
    factions: sortById(defs.factions, (faction) => faction.id).map((faction) => ({
      factionId: faction.id,
      supportTenths:
        state.factions.find((item) => item.factionId === faction.id)?.supportTenths ??
        faction.initialSupportTenths,
    })),
    ministries: sortById(defs.ministries, (ministry) => ministry.id).map((ministry) => ({
      ministryId: ministry.id,
      effectiveness:
        state.ministries.find((item) => item.ministryId === ministry.id)?.effectiveness ??
        ministry.initialEffectiveness,
    })),
  };
  // Tahap 6B: kabinet, pimpinan, dan provinsi diselaraskan dengan konten aktif.
  state = syncCampaignContent(state, defs);
  return {
    ok: true,
    save: { ...save, rulesetVersion: toRuleset, state, history: { ...save.history, ledger } },
    migrated: true,
    fromRuleset,
    toRuleset,
    stoppedPolicies,
  };
}
