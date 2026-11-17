import { INDICATOR_DOMAINS, INDICATOR_KEYS, type GameDefinitions } from '@republika/shared';

import type { CampaignRun } from './runCampaign.js';

const decimal = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const trillion = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 });

function tenths(value: number): string {
  return decimal.format(value / 10);
}

function rupiah(billion: number): string {
  return `${billion < 0 ? '−' : ''}Rp${trillion.format(Math.abs(billion) / 1000)} T`;
}

/** Laporan markdown satu kampanye bot untuk penulis konten. Deterministik. */
export function campaignMarkdown(run: CampaignRun, defs: GameDefinitions): string {
  const policyName = (id: string) => defs.policies.find((policy) => policy.id === id)?.name ?? id;
  const event = (id: string) => defs.events.find((item) => item.id === id);
  const lines: string[] = [];
  lines.push(`# Simulasi REPUBLIKA — strategi \`${run.strategy}\``);
  lines.push('');
  lines.push(`- Seed: \`${run.seed}\``);
  lines.push(`- Kuartal: ${run.reports.length}`);
  lines.push(`- Ruleset: v${run.final.rulesetVersion}`);
  lines.push(`- **Arketipe akhir: ${run.archetypeName ?? '—'}**`);
  lines.push('');

  lines.push('## Indikator per kuartal');
  lines.push('');
  const header = [
    'Kuartal',
    ...INDICATOR_KEYS.map((key) => INDICATOR_DOMAINS[key].shortLabel),
    'Kas',
  ];
  lines.push(`| ${header.join(' | ')} |`);
  lines.push(`| ${header.map(() => '---').join(' | ')} |`);
  lines.push(
    `| Awal | ${INDICATOR_KEYS.map((key) => tenths(run.initial.indicators[key])).join(' | ')} | ${rupiah(run.initial.treasuryBillion)} |`,
  );
  for (const report of run.reports) {
    lines.push(
      `| K${report.turn} (${report.year} Q${report.quarter}) | ${INDICATOR_KEYS.map((key) => tenths(report.indicatorsAfter[key])).join(' | ')} | ${rupiah(report.treasuryAfterBillion)} |`,
    );
  }
  lines.push('');

  lines.push('## Kebijakan dan voting');
  lines.push('');
  const decisions = run.reports.flatMap((report) => [
    ...report.policiesPassed.map((id) => {
      const vote = report.votes.find((item) => item.policyId === id);
      return `- K${report.turn}: **${policyName(id)}** berlaku${vote === undefined ? ' (tanpa voting)' : ` (${vote.seatsFor}/100 setuju)`}`;
    }),
    ...report.policiesFailed.map((id) => {
      const vote = report.votes.find((item) => item.policyId === id);
      return `- K${report.turn}: ${policyName(id)} **gagal** (${vote?.seatsFor ?? 0}/100 setuju)`;
    }),
  ]);
  lines.push(...(decisions.length === 0 ? ['- Tidak ada kebijakan diajukan.'] : decisions));
  lines.push('');

  lines.push('## Peristiwa');
  lines.push('');
  const events = run.reports.flatMap((report) =>
    report.resolvedEvents.map((item) => {
      const definition = event(item.eventId);
      const choice = definition?.choices.find((option) => option.id === item.choiceId);
      return `- K${report.turn}: ${definition?.title ?? item.eventId} → ${choice?.label ?? item.choiceId}`;
    }),
  );
  lines.push(...(events.length === 0 ? ['- Tidak ada peristiwa dijawab.'] : events));
  lines.push('');

  const stats = run.final.campaignStats;
  lines.push('## Statistik akhir');
  lines.push('');
  lines.push(`- Kebijakan berlaku: ${stats.policiesEnacted}`);
  lines.push(`- Voting: ${stats.votesHeld - stats.votesFailed} lolos, ${stats.votesFailed} gagal`);
  lines.push(`- Lobi: ${stats.lobbies}`);
  lines.push(`- Total defisit: ${rupiah(stats.totalDeficitBillion)}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}
