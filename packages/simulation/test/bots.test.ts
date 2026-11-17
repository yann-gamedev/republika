import { describe, expect, it } from 'vitest';

import { STRATEGIES, campaignMarkdown, runCampaign } from '../test-utils/index.js';
import { defs } from './helpers.js';

describe('bot strategi dan CLI simulasi', () => {
  it.each(STRATEGIES)('%s: kampanye selesai dan deterministik untuk seed yang sama', (strategy) => {
    const first = runCampaign({ defs, seed: 'bot', strategy, turns: 8 });
    const second = runCampaign({ defs, seed: 'bot', strategy, turns: 8 });
    expect(first.final.status).toBe('completed');
    expect(first.reports).toHaveLength(8);
    expect(campaignMarkdown(first, defs)).toBe(campaignMarkdown(second, defs));
    expect(first.archetypeName).not.toBeNull();
  });

  it('no-op tidak mengajukan kebijakan maupun lobi, tetapi menjawab event secara netral', () => {
    const run = runCampaign({ defs, seed: 'diam', strategy: 'no-op', turns: 8 });
    expect(run.final.campaignStats.policiesEnacted).toBe(0);
    expect(run.final.campaignStats.lobbies).toBe(0);
    for (const report of run.reports) {
      for (const resolved of report.resolvedEvents) {
        const event = defs.events.find((item) => item.id === resolved.eventId);
        const choice = event?.choices.find((item) => item.id === resolved.choiceId);
        expect(choice?.neutral).toBe(true);
      }
    }
  });

  it('strategi berbeda menghasilkan jalannya kampanye yang berbeda', () => {
    const markdowns = new Set(
      STRATEGIES.map((strategy) =>
        campaignMarkdown(runCampaign({ defs, seed: 'banding', strategy, turns: 8 }), defs).replace(
          /strategi `[^`]+`/u,
          '',
        ),
      ),
    );
    expect(markdowns.size).toBeGreaterThan(2);
  });

  it('laporan markdown memuat tabel indikator, kebijakan, peristiwa, dan arketipe', () => {
    const run = runCampaign({ defs, seed: 'md', strategy: 'greedy-approval', turns: 4 });
    const markdown = campaignMarkdown(run, defs);
    expect(markdown).toContain('## Indikator per kuartal');
    expect(markdown).toContain('| K4 (2031 Q4) |');
    expect(markdown).toContain('## Kebijakan dan voting');
    expect(markdown).toContain('## Peristiwa');
    expect(markdown).toContain(`Arketipe akhir: ${run.archetypeName ?? ''}`);
  });

  it('satu kampanye 20 kuartal jauh di bawah 2 detik', () => {
    const started = performance.now();
    runCampaign({ defs, seed: 'cepat', strategy: 'random', turns: 20 });
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
