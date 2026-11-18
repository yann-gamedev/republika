import {
  APP_VERSION,
  INDICATOR_DOMAINS,
  INDICATOR_KEYS,
  SAVE_FORMAT_VERSION,
  type GameDefinitions,
  type IndicatorKey,
  type SaveFile,
} from '@republika/shared';

import { saveToDisk } from '../src/save/compact.js';
import type { Strategy } from './bots/index.js';
import { runCampaign } from './runCampaign.js';

/** Ringkasan satu kampanye bot untuk analisis Monte Carlo (dapat diserialisasi). */
export interface CampaignMetrics {
  readonly strategy: Strategy;
  readonly seed: string;
  /** `true` bila kampanye macet (bot tidak bisa mengakhiri kuartal / tidak selesai). */
  readonly softlock: boolean;
  readonly softlockReason?: string;
  readonly quarters: number;
  readonly finalIndicators: Readonly<Record<IndicatorKey, number>>;
  readonly archetype: string | null;
  /** Per kebijakan: [voting diadakan, voting lolos]. */
  readonly votes: Readonly<Record<string, readonly [number, number]>>;
  /** Kebijakan yang pernah diajukan bot (lolos, gagal, atau tanpa voting). */
  readonly picks: readonly string[];
  readonly eventsSeen: readonly string[];
  /** Jumlah kuartal tiap indikator berada tepat di batas domain. */
  readonly atBound: Readonly<Record<IndicatorKey, number>>;
  readonly saveBytes: number;
}

/**
 * Menjalankan satu kampanye bot dan meringkasnya. Murni dan deterministik
 * untuk seed + strategi + konten yang sama; exception dicatat sebagai softlock.
 */
export function campaignMetrics(
  defs: GameDefinitions,
  strategy: Strategy,
  seed: string,
  turns?: number,
): CampaignMetrics {
  const zero = Object.fromEntries(INDICATOR_KEYS.map((key) => [key, 0])) as Record<
    IndicatorKey,
    number
  >;
  let run: ReturnType<typeof runCampaign>;
  try {
    run = runCampaign({ defs, seed, strategy, ...(turns === undefined ? {} : { turns }) });
  } catch (error) {
    return {
      strategy,
      seed,
      softlock: true,
      softlockReason: error instanceof Error ? error.message : String(error),
      quarters: 0,
      finalIndicators: zero,
      archetype: null,
      votes: {},
      picks: [],
      eventsSeen: [],
      atBound: zero,
      saveBytes: 0,
    };
  }

  const votes: Record<string, [number, number]> = {};
  const picks = new Set<string>();
  const eventsSeen = new Set<string>();
  const atBound = { ...zero };
  for (const report of run.reports) {
    for (const vote of report.votes) {
      const entry = votes[vote.policyId] ?? [0, 0];
      entry[0] += 1;
      if (vote.passed) entry[1] += 1;
      votes[vote.policyId] = entry;
    }
    report.policiesPassed.forEach((id) => picks.add(id));
    report.policiesFailed.forEach((id) => picks.add(id));
    report.nextEventIds.forEach((id) => eventsSeen.add(id));
    report.resolvedEvents.forEach((event) => eventsSeen.add(event.eventId));
    for (const key of INDICATOR_KEYS) {
      const domain = INDICATOR_DOMAINS[key];
      const value = report.indicatorsAfter[key];
      if (value <= domain.min * 10 || value >= domain.max * 10) atBound[key] += 1;
    }
  }

  const expectedTurns = turns ?? defs.scenario.maxTurns;
  const softlock = run.final.status !== 'completed' || run.reports.length !== expectedTurns;
  const save: SaveFile = {
    saveFormatVersion: SAVE_FORMAT_VERSION,
    appVersion: APP_VERSION,
    rulesetVersion: run.final.rulesetVersion,
    contentHash: '0'.repeat(64),
    savedAt: '2031-01-01T00:00:00.000Z',
    label: 'Presiden Simulasi — Kuartal 20',
    playTimeSeconds: 0,
    state: run.final,
    history: { reports: [...run.reports], ledger: [] },
  };
  return {
    strategy,
    seed,
    softlock,
    ...(softlock ? { softlockReason: 'kampanye tidak selesai pada kuartal terakhir' } : {}),
    quarters: run.reports.length,
    finalIndicators: run.final.indicators,
    archetype: run.archetypeName,
    votes,
    picks: [...picks].sort(),
    eventsSeen: [...eventsSeen].sort(),
    atBound,
    saveBytes: JSON.stringify(saveToDisk(save), null, 2).length,
  };
}
