import {
  INDICATOR_DOMAINS,
  isIndicatorKey,
  type GameState,
  type IndicatorKey,
  type PromiseDefinition,
  type TurnReport,
} from '@republika/shared';

import { compareIds } from '../core/order.js';
import { archetypeStatValue, conditionHolds } from './archetype.js';

export interface ImpactfulDecision {
  readonly sourceType: 'POLICY' | 'EVENT';
  readonly sourceId: string;
  /** Kuartal pertama keputusan ini memengaruhi indikator. */
  readonly firstTurn: number;
  /** Total |delta| dibagi rentang domain tiap indikator (tanpa satuan, hanya untuk urutan). */
  readonly normalizedImpact: number;
  /** Perubahan bersih per indikator (persepuluhan), terbesar dulu. */
  readonly indicatorDeltas: ReadonlyArray<{
    readonly indicator: IndicatorKey;
    readonly deltaTenths: number;
  }>;
}

/**
 * Keputusan paling berdampak sepanjang kampanye (AGENT §5.11): entri ledger
 * indikator dari kebijakan dan event dijumlah per sumber, |delta| dinormalisasi
 * dengan rentang domain indikator agar persen dan indeks setara. Murni.
 */
export function topDecisions(reports: readonly TurnReport[], limit = 5): ImpactfulDecision[] {
  const groups = new Map<
    string,
    {
      sourceType: 'POLICY' | 'EVENT';
      sourceId: string;
      firstTurn: number;
      impact: number;
      deltas: Map<IndicatorKey, number>;
    }
  >();
  for (const report of reports) {
    for (const entry of report.ledger) {
      if (
        entry.kind !== 'INDICATOR' ||
        (entry.sourceType !== 'POLICY' && entry.sourceType !== 'EVENT') ||
        entry.sourceId === undefined ||
        entry.target === undefined ||
        entry.delta === undefined ||
        !isIndicatorKey(entry.target)
      ) {
        continue;
      }
      const key = `${entry.sourceType}|${entry.sourceId}`;
      const group = groups.get(key) ?? {
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        firstTurn: entry.turn,
        impact: 0,
        deltas: new Map<IndicatorKey, number>(),
      };
      const domain = INDICATOR_DOMAINS[entry.target];
      group.impact += Math.abs(entry.delta) / ((domain.max - domain.min) * 10);
      group.firstTurn = Math.min(group.firstTurn, entry.turn);
      group.deltas.set(entry.target, (group.deltas.get(entry.target) ?? 0) + entry.delta);
      groups.set(key, group);
    }
  }
  return [...groups.values()]
    .filter((group) => group.impact > 0)
    .sort(
      (a, b) =>
        b.impact - a.impact || a.firstTurn - b.firstTurn || compareIds(a.sourceId, b.sourceId),
    )
    .slice(0, limit)
    .map((group) => ({
      sourceType: group.sourceType,
      sourceId: group.sourceId,
      firstTurn: group.firstTurn,
      normalizedImpact: group.impact,
      indicatorDeltas: [...group.deltas.entries()]
        .filter(([, delta]) => delta !== 0)
        .sort(([ka, a], [kb, b]) => Math.abs(b) - Math.abs(a) || compareIds(ka, kb))
        .map(([indicator, deltaTenths]) => ({ indicator, deltaTenths })),
    }));
}

export interface ChronologyEntry {
  readonly turn: number;
  readonly year: number;
  readonly quarter: number;
  readonly policiesPassed: readonly string[];
  readonly policiesFailed: readonly string[];
  readonly events: ReadonlyArray<{ readonly eventId: string; readonly choiceId: string }>;
}

/** Kronologi keputusan per kuartal (kebijakan lolos/gagal dan jawaban event). */
export function chronology(reports: readonly TurnReport[]): ChronologyEntry[] {
  return reports.map((report) => ({
    turn: report.turn,
    year: report.year,
    quarter: report.quarter,
    policiesPassed: report.policiesPassed,
    policiesFailed: report.policiesFailed,
    events: report.resolvedEvents,
  }));
}

export interface PromiseOutcome {
  readonly promiseId: string;
  readonly kept: boolean;
  /** Nilai statistik pada state akhir (satuan tampilan); `null` bila tidak dikenal. */
  readonly value: number | null;
}

/**
 * Menilai janji kampanye pada state akhir (Tahap 6B.2) dengan statistik yang
 * sama seperti arketipe. Save lama tanpa janji menghasilkan daftar kosong.
 * Arketipe tidak dipengaruhi janji.
 */
export function evaluatePromises(
  state: GameState,
  promises: readonly PromiseDefinition[],
): PromiseOutcome[] {
  return state.promiseIds.flatMap((promiseId) => {
    const promise = promises.find((item) => item.id === promiseId);
    if (promise === undefined) return [];
    return [
      {
        promiseId,
        kept: conditionHolds(state, promise.check),
        value: archetypeStatValue(state, promise.check.stat),
      },
    ];
  });
}
