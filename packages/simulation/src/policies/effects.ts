import type {
  ConditionalModifier,
  EffectRule,
  GameState,
  IndicatorKey,
  PolicyCategory,
} from '@republika/shared';

import type { DefinitionIndex } from '../core/definitions.js';
import type { Ledger } from '../core/ledger.js';
import { applyMultiplier } from '../core/math.js';
import { evaluateAll } from '../core/requirements.js';

/** Asal sebuah efek; menentukan pengali yang berlaku. */
export interface EffectSource {
  readonly sourceType: 'POLICY' | 'EVENT';
  readonly sourceId: string;
  /** Kategori kebijakan (hanya untuk sumber POLICY) → pengali kementerian. */
  readonly category?: PolicyCategory;
  /** Modifier bersyarat milik kebijakan sumber. */
  readonly modifiers?: readonly ConditionalModifier[];
}

export interface EffectContext {
  /** State awal giliran (read-only) untuk modifier dan effectiveness kementerian. */
  readonly snapshot: GameState;
  readonly index: DefinitionIndex;
  readonly ledger: Ledger;
}

/**
 * Pengali kementerian AGENT §5.6: 0,8 + 0,4 × (eff − 40) / 50.
 * Disederhanakan menjadi (60 + eff) / 125 agar eksak untuk eff bulat.
 */
export function ministryMultiplier(effectiveness: number): number {
  return (60 + effectiveness) / 125;
}

/** Effectiveness kementerian sedomain pada snapshot awal giliran, atau `null`. */
export function domainEffectiveness(
  snapshot: GameState,
  index: DefinitionIndex,
  category: PolicyCategory,
): number | null {
  const ministry = index.ministryByCategory.get(category);
  if (ministry === undefined) return null;
  const state = snapshot.ministries.find((item) => item.ministryId === ministry.id);
  return state?.effectiveness ?? null;
}

/**
 * Total pengali untuk efek MODIFY_INDICATOR: pengali kementerian (hanya sumber
 * POLICY sedomain) × setiap modifier yang syaratnya terpenuhi pada snapshot.
 */
export function indicatorMultiplier(
  target: IndicatorKey,
  source: EffectSource,
  snapshot: GameState,
  index: DefinitionIndex,
): number {
  let multiplier = 1;
  if (source.sourceType === 'POLICY' && source.category !== undefined) {
    const effectiveness = domainEffectiveness(snapshot, index, source.category);
    if (effectiveness !== null) multiplier *= ministryMultiplier(effectiveness);
  }
  for (const modifier of source.modifiers ?? []) {
    if (modifier.appliesTo === target && evaluateAll(snapshot, modifier.when)) {
      multiplier *= modifier.multiplier;
    }
  }
  return multiplier;
}

/**
 * Menerapkan satu efek sekarang ke state kerja (dimutasi) dan mencatat setiap
 * perubahan ke ledger. Timing (IMMEDIATE/PER_TURN/DELAYED) diatur pemanggil.
 * Clamp tidak dilakukan di sini, melainkan di langkah normalize.
 */
export function applyEffectNow(
  work: GameState,
  effect: EffectRule,
  source: EffectSource,
  context: EffectContext,
): void {
  const base = { sourceType: source.sourceType, sourceId: source.sourceId } as const;
  switch (effect.type) {
    case 'MODIFY_INDICATOR': {
      const multiplier = indicatorMultiplier(
        effect.target,
        source,
        context.snapshot,
        context.index,
      );
      const delta =
        multiplier === 1 ? effect.deltaTenths : applyMultiplier(effect.deltaTenths, multiplier);
      const before = work.indicators[effect.target];
      const after = before + delta;
      work.indicators[effect.target] = after;
      context.ledger.push({
        ...base,
        kind: 'INDICATOR',
        reasonCode: effect.reasonCode,
        target: effect.target,
        unit: 'tenths',
        before,
        delta,
        after,
      });
      return;
    }
    case 'MODIFY_TREASURY': {
      const before = work.treasuryBillion;
      const after = before + effect.deltaBillion;
      work.treasuryBillion = after;
      context.ledger.push({
        ...base,
        kind: 'TREASURY',
        reasonCode: effect.reasonCode,
        target: 'treasury',
        unit: 'billion',
        before,
        delta: effect.deltaBillion,
        after,
      });
      return;
    }
    case 'CHANGE_FACTION_SUPPORT': {
      const target = effect.target;
      const factionIds = context.index.factionsSorted
        .filter((faction) =>
          target.kind === 'faction'
            ? faction.id === target.factionId
            : faction.ideologyTags.includes(target.ideologyTag),
        )
        .map((faction) => faction.id);
      for (const factionId of factionIds) {
        const faction = work.factions.find((item) => item.factionId === factionId);
        if (faction === undefined) continue;
        const before = faction.supportTenths;
        const after = before + effect.deltaTenths;
        faction.supportTenths = after;
        context.ledger.push({
          ...base,
          kind: 'FACTION',
          reasonCode: effect.reasonCode,
          target: factionId,
          unit: 'tenths',
          before,
          delta: effect.deltaTenths,
          after,
        });
      }
      return;
    }
    case 'MODIFY_MINISTRY_EFFECTIVENESS': {
      const ministry = work.ministries.find((item) => item.ministryId === effect.ministryId);
      if (ministry === undefined) return;
      const before = ministry.effectiveness;
      const after = before + effect.delta;
      ministry.effectiveness = after;
      context.ledger.push({
        ...base,
        kind: 'MINISTRY',
        reasonCode: effect.reasonCode,
        target: effect.ministryId,
        unit: 'points',
        before,
        delta: effect.delta,
        after,
      });
      return;
    }
    case 'SET_FLAG': {
      if (work.flags.includes(effect.flag)) return;
      work.flags = [...work.flags, effect.flag].sort();
      context.ledger.push({
        ...base,
        kind: 'FLAG',
        reasonCode: effect.reasonCode,
        target: effect.flag,
        unit: 'flag',
        before: 0,
        delta: 1,
        after: 1,
      });
      return;
    }
    case 'CLEAR_FLAG': {
      if (!work.flags.includes(effect.flag)) return;
      work.flags = work.flags.filter((flag) => flag !== effect.flag);
      context.ledger.push({
        ...base,
        kind: 'FLAG',
        reasonCode: effect.reasonCode,
        target: effect.flag,
        unit: 'flag',
        before: 1,
        delta: -1,
        after: 0,
      });
      return;
    }
    default: {
      const unreachable: never = effect;
      throw new Error(`Efek tidak dikenal: ${JSON.stringify(unreachable)}`);
    }
  }
}

/** Timing efektif: hanya MODIFY_INDICATOR yang bisa PER_TURN/DELAYED. */
export function effectTiming(effect: EffectRule): 'IMMEDIATE' | 'PER_TURN' | 'DELAYED' {
  return effect.type === 'MODIFY_INDICATOR' ? effect.timing : 'IMMEDIATE';
}
