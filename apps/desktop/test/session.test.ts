import { rawContentBundle, loadGameDefinitions } from '@republika/game-data';
import type { TurnReport } from '@republika/shared';
import { describe, expect, it } from 'vitest';

import { headline, biggestMove } from '@/features/report/news';
import { choiceImpact, stakeholders } from '@/features/events/memo';
import {
  revealOrder,
  seatPositions,
  seatStates,
  tally,
  type VoteOutcome,
} from '@/features/session/session';

const defs = loadGameDefinitions(rawContentBundle).definitions;

function voteFor(forIds: readonly string[]): VoteOutcome {
  // Urutan sengaja diacak: reveal harus tetap urut factionId.
  const ids = defs.factions.map((faction) => faction.id).reverse();
  const seatsFor = defs.factions
    .filter((faction) => forIds.includes(faction.id))
    .reduce((sum, faction) => sum + faction.seats, 0);
  return {
    policyId: defs.policies[0]?.id ?? 'POL-X',
    seatsFor,
    seatsAgainst: 100 - seatsFor,
    passed: seatsFor >= 51,
    factionVotes: ids.map((factionId) => ({
      factionId,
      supportTenths: 500,
      score: 500,
      vote: forIds.includes(factionId) ? 'FOR' : 'AGAINST',
    })),
  };
}

describe('sidang paripurna', () => {
  it('urutan reveal mengikuti factionId dan total kursi = 100', () => {
    const vote = voteFor(defs.factions.slice(0, 3).map((faction) => faction.id));
    const order = revealOrder(vote, defs.factions);
    expect(order.map((item) => item.factionId)).toEqual(
      defs.factions.map((faction) => faction.id).sort(),
    );
    expect(order.reduce((sum, item) => sum + item.seats, 0)).toBe(100);
    expect(seatPositions()).toHaveLength(100);
    expect(seatStates(order, 0)).toHaveLength(100);
  });

  it('kursi terungkap blok demi blok sesuai urutan fraksi', () => {
    const vote = voteFor([defs.factions[0]?.id ?? '']);
    const order = revealOrder(vote, defs.factions);
    for (let step = 0; step <= order.length; step += 1) {
      const states = seatStates(order, step);
      const revealed = order.slice(0, step).reduce((sum, item) => sum + item.seats, 0);
      expect(states.slice(0, revealed).every((seat) => seat.status !== 'pending')).toBe(true);
      expect(states.slice(revealed).every((seat) => seat.status === 'pending')).toBe(true);
      const counts = tally(order, step);
      expect(counts.yes + counts.no + counts.pending).toBe(100);
    }
    const final = tally(order, order.length);
    expect(final.yes).toBe(vote.seatsFor);
    expect(final.no).toBe(vote.seatsAgainst);
  });
});

describe('warta dan nota', () => {
  const base = {
    turn: 2,
    year: 2031,
    quarter: 2,
    indicatorDeltas: {
      approval: -12,
      stability: 0,
      fiscalHealth: 0,
      growthPct: 0,
      inflationPct: 3,
      unemploymentPct: 0,
      welfare: 0,
      trust: 0,
    },
    topCauses: {
      approval: [{ sourceType: 'BASELINE', reasonCode: 'X_CODE', deltaTenths: -12 }],
      inflationPct: [],
    },
    votes: [],
  } as unknown as TurnReport;

  it('berita utama memakai perubahan terbesar (persen ditimbang ×10)', () => {
    expect(biggestMove(base)).toBe('inflationPct');
    const news = headline(base, { delta: '−Rp2 T', after: 'Rp148 T' });
    expect(news.title).toContain('Inflasi naik 0,3');
    expect(news.scene).toBe('market');
    expect(news.lead.at(-1)).toContain('Rp148 T');
  });

  it('voting kuartal ini menjadi berita utama', () => {
    const vote = voteFor(defs.factions.map((faction) => faction.id));
    const news = headline({ ...base, votes: [vote] }, { delta: '0', after: 'Rp1 T' });
    expect(news.title.startsWith('Parlemen sahkan')).toBe(true);
    expect(news.scene).toBe('parliament-vote');
  });

  it('dampak nota berupa rentang ×0,75–×1,25; kas pasti', () => {
    const event = defs.events.find((item) => item.id === 'EVT-HIST-010');
    const choice = event?.choices.find((item) => item.id === 'A');
    if (choice === undefined) throw new Error('EVT-HIST-010 A tidak ada');
    const rows = choiceImpact(choice);
    expect(rows.find((row) => row.label === 'Kas')?.value).toContain('5');
    expect(rows.find((row) => row.label === 'Persetujuan')?.value).toBe('+2,3 … +3,8');
  });

  it('pihak berkepentingan diambil dari efek dukungan fraksi', () => {
    const event = defs.events.find((item) => item.id === 'EVT-HIST-008');
    if (event === undefined) throw new Error('EVT-HIST-008 tidak ada');
    expect(stakeholders(event, null, defs.factions).map((item) => item.stake)).toEqual([
      'waiting',
      'waiting',
    ]);
    const chosen = stakeholders(event, 'A', defs.factions);
    expect(chosen.find((item) => item.factionId === 'FAC-SIMPUL-DAERAH')?.stake).toBe('gain');
    expect(chosen.find((item) => item.factionId === 'FAC-PANJI-MERDEKA')?.stake).toBe('loss');
  });
});
