import {
  INDICATOR_DOMAINS,
  INDICATOR_KEYS,
  type IndicatorKey,
  type TurnReport,
} from '@republika/shared';

import type { SceneKey } from '@/content/art';
import { policyName } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { formatIndicator } from '@/format/formatters';

import { reasonText } from './reasonText';

/**
 * Bobot tampilan: indikator persen bergerak dalam pecahan kecil, jadi 0,1 poin
 * persen disetarakan dengan 1 poin indikator 0–100 saat memilih berita utama.
 */
function salience(key: IndicatorKey, deltaTenths: number): number {
  return Math.abs(deltaTenths) * (INDICATOR_DOMAINS[key].unit === 'percent' ? 10 : 1);
}

/** Indikator dengan perubahan terbesar; seri diputus menurut urutan `INDICATOR_KEYS`. */
export function biggestMove(report: TurnReport): IndicatorKey | null {
  let best: IndicatorKey | null = null;
  let bestScore = 0;
  for (const key of INDICATOR_KEYS) {
    const score = salience(key, report.indicatorDeltas[key]);
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}

function moveText(report: TurnReport, key: IndicatorKey): string {
  const delta = report.indicatorDeltas[key];
  const unit =
    INDICATOR_DOMAINS[key].unit === 'percent' ? copy.report.percentUnit : copy.report.pointUnit;
  return copy.report.headlineMove(
    INDICATOR_DOMAINS[key].shortLabel,
    delta > 0,
    `${formatIndicator(Math.abs(delta))} ${unit}`,
  );
}

export interface Headline {
  readonly title: string;
  readonly lead: string[];
  readonly scene: SceneKey;
}

const INDICATOR_SCENE: Readonly<Record<IndicatorKey, SceneKey>> = {
  approval: 'protest',
  stability: 'protest',
  trust: 'cabinet-briefing',
  fiscalHealth: 'policy-fiscal',
  growthPct: 'port',
  inflationPct: 'market',
  unemploymentPct: 'port',
  welfare: 'policy-social',
};

/**
 * Berita utama dari template di `copy.report`: voting kuartal ini lebih dulu,
 * lalu perubahan indikator terbesar beserta penyebab terbesarnya di ledger.
 */
export function headline(report: TurnReport, treasury: { delta: string; after: string }): Headline {
  const vote = report.votes[0];
  const key = biggestMove(report);
  const lead: string[] = [];
  const parts: string[] = [];

  if (vote !== undefined) {
    parts.push(
      vote.passed
        ? copy.report.headlineVotePassed(policyName(vote.policyId))
        : copy.report.headlineVoteFailed(policyName(vote.policyId)),
    );
    lead.push(copy.report.leadVote(vote.seatsFor, vote.seatsAgainst));
  }
  if (key !== null) {
    parts.push(moveText(report, key));
    const cause = report.topCauses[key][0];
    if (cause !== undefined)
      lead.push(
        `${copy.report.leadCause(reasonText(cause.reasonCode, cause.sourceId).replace(/\.$/u, ''))}.`,
      );
  }
  lead.push(copy.report.leadTreasury(treasury.delta, treasury.after));

  const [first, second] = parts;
  const title =
    first === undefined
      ? copy.report.headlineQuiet
      : second === undefined
        ? first
        : copy.report.headlineJoin(first, second);
  const scene: SceneKey =
    vote !== undefined ? 'parliament-vote' : key !== null ? INDICATOR_SCENE[key] : 'dashboard-desk';
  return { title, lead, scene };
}
