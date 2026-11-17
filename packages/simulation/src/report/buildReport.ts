import {
  INDICATOR_KEYS,
  type GameState,
  type IndicatorCause,
  type IndicatorKey,
  type LedgerEntry,
  type TurnReport,
  type VoteOutcome,
} from '@republika/shared';

import type { ResolvedEvent } from '../events/events.js';

export const TOP_CAUSES_PER_INDICATOR = 3;

export interface ReportInput {
  readonly before: GameState;
  readonly after: GameState;
  readonly startYear: number;
  readonly ledger: readonly LedgerEntry[];
  readonly votes: readonly VoteOutcome[];
  readonly policiesPassed: readonly string[];
  readonly policiesFailed: readonly string[];
  readonly resolvedEvents: readonly ResolvedEvent[];
  readonly nextEventIds: readonly string[];
}

/** Tahun dan kuartal kalender fiktif untuk sebuah turn (4 turn per tahun). */
export function turnCalendar(startYear: number, turn: number): { year: number; quarter: number } {
  return { year: startYear + Math.floor((turn - 1) / 4), quarter: ((turn - 1) % 4) + 1 };
}

/**
 * Penyebab terbesar per indikator: entri ledger INDICATOR dikelompokkan per
 * (sourceType, sourceId, reasonCode), dijumlah, diurut |delta| menurun lalu
 * urutan kemunculan pertama. Delta nol dibuang.
 */
export function topCauses(
  ledger: readonly LedgerEntry[],
  indicator: IndicatorKey,
  limit = TOP_CAUSES_PER_INDICATOR,
): IndicatorCause[] {
  const groups = new Map<string, { cause: IndicatorCause; firstOrder: number }>();
  for (const entry of ledger) {
    if (entry.kind !== 'INDICATOR' || entry.target !== indicator || entry.delta === undefined) {
      continue;
    }
    const key = `${entry.sourceType}|${entry.sourceId ?? ''}|${entry.reasonCode}`;
    const existing = groups.get(key);
    if (existing !== undefined) {
      existing.cause = { ...existing.cause, deltaTenths: existing.cause.deltaTenths + entry.delta };
      continue;
    }
    groups.set(key, {
      firstOrder: entry.order,
      cause: {
        sourceType: entry.sourceType,
        ...(entry.sourceId !== undefined ? { sourceId: entry.sourceId } : {}),
        reasonCode: entry.reasonCode,
        deltaTenths: entry.delta,
      },
    });
  }
  return [...groups.values()]
    .filter((group) => group.cause.deltaTenths !== 0)
    .sort(
      (a, b) =>
        Math.abs(b.cause.deltaTenths) - Math.abs(a.cause.deltaTenths) ||
        a.firstOrder - b.firstOrder,
    )
    .slice(0, limit)
    .map((group) => group.cause);
}

/**
 * Laporan kuartal terstruktur. `summary` sengaja kosong: kalimat Indonesia
 * disusun UI dari data ini (teks UI ada di `copy/id.ts`, bukan di engine).
 */
export function buildReport(input: ReportInput): TurnReport {
  const { before, after } = input;
  const { year, quarter } = turnCalendar(input.startYear, before.turn);
  const indicatorDeltas = Object.fromEntries(
    INDICATOR_KEYS.map((key) => [key, after.indicators[key] - before.indicators[key]]),
  ) as TurnReport['indicatorDeltas'];
  const causes = Object.fromEntries(
    INDICATOR_KEYS.map((key) => [key, topCauses(input.ledger, key)]),
  ) as TurnReport['topCauses'];
  return {
    turn: before.turn,
    year,
    quarter,
    presidentName: before.presidentName,
    indicatorsBefore: { ...before.indicators },
    indicatorsAfter: { ...after.indicators },
    treasuryBeforeBillion: before.treasuryBillion,
    treasuryAfterBillion: after.treasuryBillion,
    treasuryDeltaBillion: after.treasuryBillion - before.treasuryBillion,
    indicatorDeltas,
    topCauses: causes,
    factionSupport: after.factions.map((faction) => ({
      factionId: faction.factionId,
      beforeTenths: Math.max(
        0,
        Math.min(
          1000,
          before.factions.find((item) => item.factionId === faction.factionId)?.supportTenths ??
            faction.supportTenths,
        ),
      ),
      afterTenths: faction.supportTenths,
    })),
    policiesPassed: [...input.policiesPassed],
    policiesFailed: [...input.policiesFailed],
    ledger: [...input.ledger],
    votes: [...input.votes],
    resolvedEvents: input.resolvedEvents.map((event) => ({ ...event })),
    nextEventIds: [...input.nextEventIds],
    summary: [],
  };
}
