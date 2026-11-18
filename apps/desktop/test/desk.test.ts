import type { TurnReport } from '@republika/shared';
import { describe, expect, it } from 'vitest';

import { SHORTCUT_ROUTES } from '@/app/GameLayout';
import { factionStance, latestEventId, trendFromReports } from '@/features/dashboard/desk';

function report(turn: number, approval: number, events: string[] = []): TurnReport {
  return {
    turn,
    year: 2031 + Math.floor((turn - 1) / 4),
    quarter: ((turn - 1) % 4) + 1,
    indicatorsAfter: { approval },
    resolvedEvents: events.map((eventId) => ({ eventId, choiceId: 'A' })),
  } as unknown as TurnReport;
}

describe('Meja kerja', () => {
  it('sikap partai: ≥ 55 setuju, 45–54,9 ragu, < 45 menolak', () => {
    expect(factionStance(550)).toBe('yes');
    expect(factionStance(549)).toBe('unsure');
    expect(factionStance(450)).toBe('unsure');
    expect(factionStance(449)).toBe('no');
  });

  it('tren hanya menyimpan ≤ 5 kuartal terakhir', () => {
    const reports = Array.from({ length: 8 }, (_, index) => report(index + 1, 500 + index));
    const trend = trendFromReports(reports);
    expect(trend.map((point) => point.turn)).toEqual([4, 5, 6, 7, 8]);
    expect(trend.at(-1)?.indicators.approval).toBe(507);
    expect(trendFromReports([])).toEqual([]);
  });

  it('warta memakai event terakhir yang dijawab', () => {
    expect(latestEventId(null)).toBeNull();
    expect(latestEventId(report(1, 500))).toBeNull();
    expect(latestEventId(report(1, 500, ['EVT-A', 'EVT-B']))).toBe('EVT-B');
  });

  it('pintasan 1–7 mengikuti urutan sidebar', () => {
    expect(SHORTCUT_ROUTES).toEqual([
      '/game/dashboard',
      '/game/policies',
      '/game/parliament',
      '/game/cabinet',
      '/game/events',
      '/game/report',
      '/game/history',
    ]);
  });
});
