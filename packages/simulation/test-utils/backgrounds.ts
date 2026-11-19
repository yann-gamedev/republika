import type { GameDefinitions, GameState } from '@republika/shared';

import type { Strategy } from './bots/index.js';
import { runCampaign } from './runCampaign.js';

/** Skor ringkas kampanye: jumlah lima indikator 0–100 di akhir (persepuluhan). */
export function campaignScore(state: GameState): number {
  const { approval, stability, fiscalHealth, welfare, trust } = state.indicators;
  return approval + stability + fiscalHealth + welfare + trust;
}

/** Toleransi seri: 1,0 poin skor gabungan (persepuluhan). */
export const TIE_TOLERANCE_TENTHS = 10;

export interface BackgroundShowdown {
  readonly seeds: number;
  /** Kemenangan per latar belakang (seri dibagi rata, jadi bisa pecahan). */
  readonly wins: Readonly<Record<string, number>>;
  readonly contests: number;
}

/**
 * Tahap 6B.2: untuk tiap seed dan strategi, mainkan kampanye yang sama dengan
 * setiap latar belakang; pemenang = skor akhir tertinggi, seri dalam 1,0 poin dibagi rata.
 * Deterministik untuk seed, strategi, dan konten yang sama.
 */
export function backgroundShowdown(
  defs: GameDefinitions,
  strategies: readonly Strategy[],
  seeds: number,
  baseSeed: string,
  turns?: number,
): BackgroundShowdown {
  const ids = defs.backgrounds.map((item) => item.id).sort();
  const wins: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  let contests = 0;
  for (let index = 0; index < seeds; index += 1) {
    for (const strategy of strategies) {
      const scores = ids.map((backgroundId) => {
        const run = runCampaign({
          defs,
          seed: `${baseSeed}-bg-${index}`,
          strategy,
          backgroundId,
          ...(turns === undefined ? {} : { turns }),
        });
        return { id: backgroundId, score: campaignScore(run.final) };
      });
      const top = Math.max(...scores.map((item) => item.score));
      // DECISION: skor dalam TIE_TOLERANCE dari yang terbaik = menang bersama (dibagi rata),
      // agar selisih kecil yang tidak terasa pemain tidak dihitung sebagai dominasi.
      const winners = scores.filter((item) => top - item.score <= TIE_TOLERANCE_TENTHS);
      for (const winner of winners) wins[winner.id] = (wins[winner.id] ?? 0) + 1 / winners.length;
      contests += 1;
    }
  }
  return { seeds, wins, contests };
}
