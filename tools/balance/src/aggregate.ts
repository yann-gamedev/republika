import {
  INDICATOR_DOMAINS,
  INDICATOR_KEYS,
  type GameDefinitions,
  type IndicatorKey,
} from '@republika/shared';
import type {
  BackgroundShowdown,
  CampaignMetrics,
  Strategy,
} from '@republika/simulation/test-utils';

export const PERCENTILES = [5, 25, 50, 75, 95] as const;
/** Ambang bendera otomatis. */
export const THRESHOLDS = {
  stuckAtBoundShare: 0.3,
  dominantIndicators: 6,
  greedyPickShare: 0.8,
  archetypeShare: 0.8,
  backgroundWinShare: 0.4,
  minVotesForRate: 20,
} as const;

const LOWER_IS_BETTER: ReadonlySet<IndicatorKey> = new Set(['inflationPct', 'unemploymentPct']);

/** Persentil nearest-rank pada data terurut (deterministik). */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[rank] ?? Number.NaN;
}

export interface BalanceSummary {
  readonly runs: number;
  readonly strategies: readonly Strategy[];
  readonly percentiles: Record<string, Record<IndicatorKey, number[]>>;
  readonly archetypes: Record<string, Record<string, number>>;
  readonly voteRates: Array<{ policyId: string; held: number; passed: number }>;
  readonly greedyPicks: Array<{ policyId: string; share: number }>;
  readonly neverSeenEvents: string[];
  readonly stuck: Array<{ indicator: IndicatorKey; share: number }>;
  readonly softlocks: Array<{ strategy: string; seed: string; reason: string }>;
  readonly saveBytes: { average: number; max: number };
  readonly backgrounds: BackgroundShowdown | null;
  readonly flags: string[];
}

/** Agregasi hasil Monte Carlo. Urutan input tidak memengaruhi hasil. */
export function aggregate(
  input: readonly CampaignMetrics[],
  defs: GameDefinitions,
  strategies: readonly Strategy[],
  backgrounds: BackgroundShowdown | null = null,
): BalanceSummary {
  const metrics = [...input].sort(
    (a, b) => a.strategy.localeCompare(b.strategy) || a.seed.localeCompare(b.seed),
  );
  const ok = metrics.filter((item) => !item.softlock);

  const percentiles: BalanceSummary['percentiles'] = {};
  const archetypes: BalanceSummary['archetypes'] = {};
  for (const strategy of strategies) {
    const runs = ok.filter((item) => item.strategy === strategy);
    percentiles[strategy] = Object.fromEntries(
      INDICATOR_KEYS.map((key) => {
        const values = runs.map((item) => item.finalIndicators[key]).sort((a, b) => a - b);
        return [key, PERCENTILES.map((p) => percentile(values, p))];
      }),
    ) as Record<IndicatorKey, number[]>;
    const counts: Record<string, number> = {};
    for (const item of runs)
      counts[item.archetype ?? '—'] = (counts[item.archetype ?? '—'] ?? 0) + 1;
    archetypes[strategy] = counts;
  }

  const votes = new Map<string, [number, number]>();
  for (const item of ok) {
    for (const [policyId, [held, passed]] of Object.entries(item.votes)) {
      const entry = votes.get(policyId) ?? [0, 0];
      entry[0] += held;
      entry[1] += passed;
      votes.set(policyId, entry);
    }
  }
  const voteRates = defs.policies
    .filter((policy) => policy.needsVote)
    .map((policy) => {
      const [held, passed] = votes.get(policy.id) ?? [0, 0];
      return { policyId: policy.id, held, passed };
    });

  const greedy = ok.filter((item) => item.strategy === 'greedy-approval');
  const greedyPicks = defs.policies
    .map((policy) => ({
      policyId: policy.id,
      share:
        greedy.length === 0
          ? 0
          : greedy.filter((item) => item.picks.includes(policy.id)).length / greedy.length,
    }))
    .sort((a, b) => b.share - a.share || a.policyId.localeCompare(b.policyId));

  const seen = new Set(ok.flatMap((item) => item.eventsSeen));
  const neverSeenEvents = defs.events
    .map((event) => event.id)
    .filter((id) => !seen.has(id))
    .sort();

  const totalQuarters = ok.reduce((sum, item) => sum + item.quarters, 0);
  const stuck = INDICATOR_KEYS.map((indicator) => ({
    indicator,
    share:
      totalQuarters === 0
        ? 0
        : ok.reduce((sum, item) => sum + item.atBound[indicator], 0) / totalQuarters,
  }));

  const softlocks = metrics
    .filter((item) => item.softlock)
    .map((item) => ({
      strategy: item.strategy,
      seed: item.seed,
      reason: item.softlockReason ?? '',
    }));

  const sizes = ok.map((item) => item.saveBytes);
  const saveBytes = {
    average: sizes.length === 0 ? 0 : sizes.reduce((sum, value) => sum + value, 0) / sizes.length,
    max: sizes.length === 0 ? 0 : Math.max(...sizes),
  };

  const flags: string[] = [];
  if (softlocks.length > 0) flags.push(`SOFTLOCK: ${softlocks.length} kampanye macet.`);
  if (saveBytes.max > 1024 * 1024)
    flags.push(`SAVE_TOO_LARGE: save maksimum ${saveBytes.max} byte > 1 MB.`);
  for (const item of stuck) {
    if (item.share > THRESHOLDS.stuckAtBoundShare) {
      flags.push(
        `STUCK_AT_BOUND: ${INDICATOR_DOMAINS[item.indicator].label} menempel di batas ${(item.share * 100).toFixed(0)}% waktu.`,
      );
    }
  }
  for (const id of neverSeenEvents) flags.push(`EVENT_NEVER_SEEN: ${id} tidak pernah muncul.`);
  for (const rate of voteRates) {
    if (
      rate.held >= THRESHOLDS.minVotesForRate &&
      (rate.passed === 0 || rate.passed === rate.held)
    ) {
      flags.push(
        `VOTE_ALWAYS_${rate.passed === 0 ? 'FAILS' : 'PASSES'}: ${rate.policyId} (${rate.passed}/${rate.held}).`,
      );
    }
  }
  for (const pick of greedyPicks) {
    if (pick.share > THRESHOLDS.greedyPickShare) {
      flags.push(
        `GREEDY_FAVOURITE: bot greedy memilih ${pick.policyId} di ${(pick.share * 100).toFixed(0)}% kampanye. Terlalu kuat?`,
      );
    }
  }
  for (const strategy of strategies) {
    const counts = archetypes[strategy] ?? {};
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    for (const [name, count] of Object.entries(counts)) {
      if (total > 0 && count / total > THRESHOLDS.archetypeShare) {
        flags.push(
          `ARCHETYPE_DOMINANT: "${name}" muncul di ${((count / total) * 100).toFixed(0)}% kampanye ${strategy}.`,
        );
      }
    }
  }
  // Strategi dominan: median lebih baik atau sama di ≥ 6 dari 8 indikator dibanding semua strategi lain.
  for (const strategy of strategies) {
    const better = INDICATOR_KEYS.filter((key) =>
      strategies
        .filter((other) => other !== strategy)
        .every((other) => {
          const mine = percentiles[strategy]?.[key]?.[2] ?? 0;
          const theirs = percentiles[other]?.[key]?.[2] ?? 0;
          return LOWER_IS_BETTER.has(key) ? mine <= theirs : mine >= theirs;
        }),
    ).length;
    if (strategies.length > 1 && better >= THRESHOLDS.dominantIndicators) {
      flags.push(
        `DOMINANT_STRATEGY: ${strategy} unggul atau setara di ${better}/8 indikator (median).`,
      );
    }
  }

  if (backgrounds !== null && backgrounds.contests > 0) {
    for (const [id, wins] of Object.entries(backgrounds.wins)) {
      const share = wins / backgrounds.contests;
      if (share > THRESHOLDS.backgroundWinShare) {
        flags.push(
          `BACKGROUND_DOMINANT: ${id} menang di ${(share * 100).toFixed(0)}% pertandingan latar belakang.`,
        );
      }
    }
  }

  return {
    runs: metrics.length,
    backgrounds,
    strategies,
    percentiles,
    archetypes,
    voteRates,
    greedyPicks,
    neverSeenEvents,
    stuck,
    softlocks,
    saveBytes,
    flags,
  };
}

const fmt = (key: IndicatorKey, tenths: number) =>
  Number.isNaN(tenths)
    ? '—'
    : `${(tenths / 10).toFixed(1)}${INDICATOR_DOMAINS[key].unit === 'percent' ? '%' : ''}`;

/** Laporan markdown untuk penulis konten. Agent tidak mengubah angka konten. */
export function balanceMarkdown(
  summary: BalanceSummary,
  meta: { seed: string; turns: number },
): string {
  const lines: string[] = [];
  lines.push('# Laporan balancing Monte Carlo', '');
  lines.push(
    `- Kampanye: ${summary.runs} (${summary.strategies.join(', ')}), ${meta.turns} kuartal, seed dasar \`${meta.seed}\``,
  );
  lines.push(`- Softlock: **${summary.softlocks.length}**`);
  lines.push(
    `- Ukuran save: rata-rata ${(summary.saveBytes.average / 1024).toFixed(1)} KiB, maksimum ${(summary.saveBytes.max / 1024).toFixed(1)} KiB`,
  );
  lines.push('', '## Bendera otomatis', '');
  lines.push(
    ...(summary.flags.length === 0 ? ['- Tidak ada.'] : summary.flags.map((flag) => `- ${flag}`)),
  );

  lines.push('', '## Indikator akhir per strategi (persentil 5 / 25 / 50 / 75 / 95)', '');
  for (const strategy of summary.strategies) {
    lines.push(
      `### ${strategy}`,
      '',
      '| Indikator | P5 | P25 | P50 | P75 | P95 |',
      '| --- | ---: | ---: | ---: | ---: | ---: |',
    );
    for (const key of INDICATOR_KEYS) {
      const values = summary.percentiles[strategy]?.[key] ?? [];
      lines.push(
        `| ${INDICATOR_DOMAINS[key].shortLabel} | ${values.map((value) => fmt(key, value)).join(' | ')} |`,
      );
    }
    lines.push('');
  }

  lines.push(
    '## Frekuensi arketipe',
    '',
    '| Strategi | Arketipe | Kampanye |',
    '| --- | --- | ---: |',
  );
  for (const strategy of summary.strategies) {
    for (const [name, count] of Object.entries(summary.archetypes[strategy] ?? {}).sort(
      (a, b) => b[1] - a[1],
    )) {
      lines.push(`| ${strategy} | ${name} | ${count} |`);
    }
  }

  lines.push(
    '',
    '## Tingkat lolos voting per kebijakan',
    '',
    '| Kebijakan | Voting | Lolos | % |',
    '| --- | ---: | ---: | ---: |',
  );
  for (const rate of summary.voteRates) {
    lines.push(
      `| ${rate.policyId} | ${rate.held} | ${rate.passed} | ${rate.held === 0 ? '—' : `${((rate.passed / rate.held) * 100).toFixed(0)}%`} |`,
    );
  }

  lines.push(
    '',
    '## Pilihan bot greedy-approval',
    '',
    '| Kebijakan | % kampanye |',
    '| --- | ---: |',
  );
  for (const pick of summary.greedyPicks)
    lines.push(`| ${pick.policyId} | ${(pick.share * 100).toFixed(0)}% |`);

  lines.push('', '## Indikator di batas domain', '', '| Indikator | % kuartal |', '| --- | ---: |');
  for (const item of summary.stuck)
    lines.push(
      `| ${INDICATOR_DOMAINS[item.indicator].shortLabel} | ${(item.share * 100).toFixed(1)}% |`,
    );

  if (summary.backgrounds !== null) {
    lines.push(
      '',
      '## Latar belakang presiden',
      '',
      `${summary.backgrounds.seeds} seed × ${summary.strategies.length} strategi = ${summary.backgrounds.contests} pertandingan. Pemenang tiap pertandingan = skor akhir tertinggi (persetujuan + stabilitas + fiskal + kesejahteraan + kepercayaan); skor dalam 1,0 poin dari yang terbaik dihitung seri dan kemenangannya dibagi rata. Ambang bendera 40%.`,
      '',
      '| Latar belakang | Menang | % |',
      '| --- | ---: | ---: |',
    );
    for (const [id, wins] of Object.entries(summary.backgrounds.wins)) {
      lines.push(
        `| ${id} | ${wins.toFixed(1)} | ${((wins / Math.max(1, summary.backgrounds.contests)) * 100).toFixed(0)}% |`,
      );
    }
  }

  lines.push('', '## Event yang tidak pernah muncul', '');
  lines.push(
    ...(summary.neverSeenEvents.length === 0
      ? ['- Semua event muncul setidaknya sekali.']
      : summary.neverSeenEvents.map((id) => `- ${id}`)),
  );

  if (summary.softlocks.length > 0) {
    lines.push('', '## Softlock', '');
    for (const item of summary.softlocks.slice(0, 20))
      lines.push(`- ${item.strategy} \`${item.seed}\`: ${item.reason}`);
  }

  lines.push('', '## Rekomendasi', '');
  lines.push(
    'Agent tidak mengubah angka konten. Tinjau bendera di atas, lalu sesuaikan `packages/game-data/content/` dan naikkan `rulesetVersion` bila aturan/angka berubah.',
  );
  return `${lines.join('\n')}\n`;
}
