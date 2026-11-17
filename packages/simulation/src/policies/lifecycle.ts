import type { GameState, PolicyDefinition } from '@republika/shared';

import type { DefinitionIndex } from '../core/definitions.js';
import type { Ledger } from '../core/ledger.js';
import { compareIds } from '../core/order.js';
import { applyEffectNow, effectTiming, type EffectContext, type EffectSource } from './effects.js';

/** Sumber efek untuk sebuah kebijakan (kategori + modifier ikut terbawa). */
export function policySource(policy: PolicyDefinition): EffectSource {
  return {
    sourceType: 'POLICY',
    sourceId: policy.id,
    category: policy.category,
    modifiers: policy.modifiers,
  };
}

/**
 * Mengaktifkan kebijakan (setelah lolos voting atau tanpa voting). Efek dan
 * biaya belum diterapkan di sini; itu langkah 5–7 AGENT §5.10.
 */
export function activatePolicy(work: GameState, policy: PolicyDefinition, ledger: Ledger): void {
  work.activePolicies = [
    ...work.activePolicies,
    {
      policyId: policy.id,
      enactedTurn: work.turn,
      remainingTurns: policy.durationTurns,
      perTurnCostBillion: policy.perTurnCostBillion,
      lastTickedTurn: 0,
    },
  ];
  work.campaignStats.policiesEnacted += 1;
  work.campaignStats.policiesByCategory[policy.category] += 1;
  ledger.push({
    kind: 'POLICY',
    sourceType: 'POLICY',
    sourceId: policy.id,
    reasonCode: 'POLICY_ENACTED',
    target: policy.id,
  });
}

/** Langkah 5: biaya awal kebijakan yang baru aktif (urut policyId). */
export function chargeUpfrontCosts(
  work: GameState,
  policyIds: readonly string[],
  index: DefinitionIndex,
  ledger: Ledger,
): void {
  for (const policyId of [...policyIds].sort(compareIds)) {
    const policy = index.policies.get(policyId);
    if (policy === undefined || policy.fiscalCostBillion === 0) continue;
    const before = work.treasuryBillion;
    work.treasuryBillion = before - policy.fiscalCostBillion;
    work.campaignStats.totalPolicySpendingBillion += policy.fiscalCostBillion;
    ledger.push({
      kind: 'TREASURY',
      sourceType: 'POLICY',
      sourceId: policyId,
      reasonCode: 'POLICY_UPFRONT_COST',
      target: 'treasury',
      unit: 'billion',
      before,
      delta: -policy.fiscalCostBillion,
      after: work.treasuryBillion,
    });
  }
}

/**
 * Menerapkan efek IMMEDIATE sekarang dan menjadwalkan efek DELAYED. Efek
 * PER_TURN dilewati (dijalankan saat tick). Dipakai untuk kebijakan maupun
 * respons event.
 */
export function applyOnsetEffects(
  work: GameState,
  effects: PolicyDefinition['effects'],
  source: EffectSource,
  context: EffectContext,
  options: { readonly perTurnAsImmediate: boolean },
): void {
  for (const effect of effects) {
    const timing = effectTiming(effect);
    if (timing === 'DELAYED' && effect.type === 'MODIFY_INDICATOR') {
      work.delayedEffects = [
        ...work.delayedEffects,
        {
          sourceType: source.sourceType,
          sourceId: source.sourceId,
          createdTurn: work.turn,
          // Skema menjamin delayTurns ada untuk DELAYED; 1 hanya jaring pengaman.
          remainingTurns: effect.delayTurns ?? 1,
          effect,
        },
      ];
      continue;
    }
    if (timing === 'PER_TURN' && !options.perTurnAsImmediate) continue;
    applyEffectNow(work, effect, source, context);
  }
}

/** Langkah 6: efek IMMEDIATE kebijakan yang baru aktif (urut policyId). */
export function applyImmediateEffects(
  work: GameState,
  policyIds: readonly string[],
  context: EffectContext,
): void {
  for (const policyId of [...policyIds].sort(compareIds)) {
    const policy = context.index.policies.get(policyId);
    if (policy === undefined) continue;
    applyOnsetEffects(work, policy.effects, policySource(policy), context, {
      perTurnAsImmediate: false,
    });
  }
}

/** Mengurangi cooldown yang sudah ada sejak awal giliran; yang habis dihapus. */
export function tickCooldowns(
  current: Readonly<Record<string, number>>,
  atTurnStart: Readonly<Record<string, number>>,
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const id of Object.keys(current).sort(compareIds)) {
    const value = current[id] ?? 0;
    const remaining = id in atTurnStart ? value - 1 : value;
    if (remaining > 0) next[id] = remaining;
  }
  return next;
}

export interface TickedPolicy {
  readonly policyId: string;
  readonly perTurnCostBillion: number;
}

/**
 * Langkah 7: tick kebijakan aktif (urut policyId). Efek PER_TURN berjalan sekali
 * per turn (dijaga `lastTickedTurn`), durasi berkurang, kebijakan yang habis
 * dipindah ke cooldown. Mengembalikan kebijakan yang berjalan turn ini.
 */
export function tickActivePolicies(work: GameState, context: EffectContext): TickedPolicy[] {
  const ticked: TickedPolicy[] = [];
  const remaining = [];
  const ordered = [...work.activePolicies].sort((a, b) => compareIds(a.policyId, b.policyId));
  for (const active of ordered) {
    if (active.lastTickedTurn === work.turn) {
      remaining.push(active);
      continue;
    }
    const policy = context.index.policies.get(active.policyId);
    if (policy !== undefined) {
      const source = policySource(policy);
      for (const effect of policy.effects) {
        if (effectTiming(effect) === 'PER_TURN') applyEffectNow(work, effect, source, context);
      }
    }
    ticked.push({ policyId: active.policyId, perTurnCostBillion: active.perTurnCostBillion });
    const next = {
      ...active,
      lastTickedTurn: work.turn,
      remainingTurns: Math.max(0, active.remainingTurns - 1),
    };
    if (next.remainingTurns > 0) {
      remaining.push(next);
      continue;
    }
    context.ledger.push({
      kind: 'POLICY',
      sourceType: 'POLICY',
      sourceId: active.policyId,
      reasonCode: 'POLICY_EXPIRED',
      target: active.policyId,
    });
    const cooldown = policy?.cooldownTurns ?? 0;
    if (cooldown > 0)
      work.policyCooldowns = { ...work.policyCooldowns, [active.policyId]: cooldown };
  }
  work.activePolicies = remaining;
  return ticked;
}

/**
 * Langkah 7 (lanjutan): hitung mundur efek tertunda. Hitungan dimulai turn
 * setelah efek dijadwalkan, jadi `delayTurns: 2` dari turn N jatuh di turn N+2.
 */
export function tickDelayedEffects(work: GameState, context: EffectContext): void {
  const ordered = work.delayedEffects
    .map((item, position) => ({ item, position }))
    .sort((a, b) => compareIds(a.item.sourceId, b.item.sourceId) || a.position - b.position)
    .map(({ item }) => item);
  const pending = [];
  for (const delayed of ordered) {
    if (delayed.createdTurn >= work.turn) {
      pending.push(delayed);
      continue;
    }
    const remainingTurns = delayed.remainingTurns - 1;
    if (remainingTurns > 0) {
      pending.push({ ...delayed, remainingTurns });
      continue;
    }
    const policy =
      delayed.sourceType === 'POLICY' ? context.index.policies.get(delayed.sourceId) : undefined;
    const source: EffectSource =
      policy !== undefined
        ? policySource(policy)
        : { sourceType: delayed.sourceType, sourceId: delayed.sourceId };
    applyEffectNow(work, delayed.effect, source, context);
  }
  work.delayedEffects = pending;
}
