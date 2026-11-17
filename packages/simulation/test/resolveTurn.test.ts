import { describe, expect, it } from 'vitest';

import {
  INDICATOR_KEYS,
  gameStateSchema,
  turnReportSchema,
  type GameState,
} from '@republika/shared';

import { applyCommand } from '../src/core/commands.js';
import { hashState } from '../src/core/hash.js';
import { Ledger } from '../src/core/ledger.js';
import { normalizeState } from '../src/core/normalize.js';
import { resolveTurn } from '../src/core/resolveTurn.js';
import { turnCalendar } from '../src/report/buildReport.js';
import {
  EVENT_FLOOD,
  FACTION_REGION,
  POLICY_ENERGY,
  POLICY_FISCAL,
  POLICY_SOCIAL,
  defs,
  newState,
  quietDefs,
} from './helpers.js';
import { runScript } from './scenario.js';

function endQuarter(state: GameState, commandId = 'end') {
  return resolveTurn(state, { type: 'END_QUARTER', commandId }, quietDefs);
}

function enact(state: GameState, policyId: string, commandId = policyId): GameState {
  const result = applyCommand(state, { type: 'ENACT_POLICY', commandId, policyId }, defs);
  if (result.error !== undefined) throw new Error(result.error.code);
  return result.state;
}

function resolveOk(state: GameState) {
  const result = endQuarter(state);
  if (!result.ok) throw new Error(result.error.code);
  return result;
}

describe('resolveTurn — validasi', () => {
  it('menolak END_QUARTER selama ada event pending', () => {
    const state: GameState = {
      ...newState(),
      pendingEvents: [{ eventId: EVENT_FLOOD, arrivedTurn: 1, resolvedChoiceId: null }],
    };
    const result = endQuarter(state);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('EVENT_RESPONSE_REQUIRED');
  });

  it('tidak memutasi state masukan', () => {
    const state = enact(newState(), POLICY_ENERGY);
    const before = JSON.stringify(state);
    resolveOk(state);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('resolveTurn — urutan AGENT §5.10', () => {
  it('ledger mengikuti urutan langkah', () => {
    let state: GameState = {
      ...newState(),
      pendingEvents: [{ eventId: EVENT_FLOOD, arrivedTurn: 1, resolvedChoiceId: 'B' }],
    };
    state = enact(state, POLICY_ENERGY);
    state = applyCommand(
      state,
      { type: 'LOBBY_FACTION', commandId: 'lobi', factionId: FACTION_REGION },
      defs,
    ).state;
    const { ledger } = resolveOk(state);
    const firstIndex = (code: string) => ledger.findIndex((entry) => entry.reasonCode === code);
    const sequence = [
      'EVENT_RESOLVED', // 2
      'LOBBY_COST', // 3
      'POLICY_ENACTED', // 4
      'POLICY_UPFRONT_COST', // 5
      'FX_ENERGY_PASS_THROUGH', // 6
      'FX_ENERGY_EFFICIENCY', // 7 (PER_TURN)
      'BASELINE_INFLATION_REVERSION', // 8
      'MINISTRY_EXPERIENCE', // 9
    ].map(firstIndex);
    expect(sequence.every((value) => value >= 0)).toBe(true);
    expect([...sequence].sort((a, b) => a - b)).toEqual(sequence);
    expect(ledger.map((entry) => entry.order)).toEqual(ledger.map((_, i) => i));
  });

  it('reset akhir kuartal: AP, pending, lobi, dan commandId dikosongkan; turn naik', () => {
    let state = enact(newState(), POLICY_ENERGY);
    state = applyCommand(
      state,
      { type: 'LOBBY_FACTION', commandId: 'lobi', factionId: FACTION_REGION },
      defs,
    ).state;
    const result = resolveOk(state);
    expect(result.state.turn).toBe(2);
    expect(result.state.actionPointsRemaining).toBe(2);
    expect(result.state.pendingCommands).toEqual([]);
    expect(result.state.lobbyThisTurn).toEqual([]);
    expect(result.state.commandIdsThisTurn).toEqual([]);
    expect(gameStateSchema.safeParse(result.state).success).toBe(true);
    expect(turnReportSchema.safeParse(result.report).success).toBe(true);
  });

  it('kuartal terakhir menandai kampanye selesai tanpa melewati maxTurns', () => {
    const state = { ...newState(), turn: 4 };
    const result = resolveOk(state);
    expect(result.state.status).toBe('completed');
    expect(result.state.turn).toBe(4);
    expect(endQuarter(result.state, 'lagi').ok).toBe(false);
  });
});

describe('siklus kebijakan', () => {
  it('PER_TURN berjalan sekali per turn, durasi berkurang, lalu cooldown', () => {
    let state = enact(newState(), POLICY_ENERGY); // durasi 3, cooldown 2
    const growthTicks: number[] = [];
    for (let quarter = 1; quarter <= 3; quarter += 1) {
      const result = resolveOk(state);
      growthTicks.push(
        result.ledger.filter((entry) => entry.reasonCode === 'FX_ENERGY_EFFICIENCY').length,
      );
      state = result.state;
    }
    expect(growthTicks).toEqual([1, 1, 1]);
    expect(state.activePolicies).toEqual([]);
    expect(state.policyCooldowns).toEqual({ [POLICY_ENERGY]: 2 });
    state = resolveOk({ ...state, maxTurns: 10 }).state;
    expect(state.policyCooldowns).toEqual({ [POLICY_ENERGY]: 1 });
    state = resolveOk(state).state;
    expect(state.policyCooldowns).toEqual({});
  });

  it('flag lastTickedTurn mencegah efek ganda', () => {
    const state = enact(newState(), POLICY_ENERGY);
    const first = resolveOk(state).state;
    const replay: GameState = {
      ...first,
      turn: 1,
      activePolicies: first.activePolicies.map((policy) => ({ ...policy, lastTickedTurn: 1 })),
    };
    const result = resolveOk(replay);
    expect(result.ledger.some((entry) => entry.reasonCode === 'FX_ENERGY_EFFICIENCY')).toBe(false);
    expect(result.state.activePolicies[0]?.remainingTurns).toBe(2);
  });

  it('efek DELAYED jatuh tepat delayTurns kuartal setelah diberlakukan', () => {
    let state = enact(newState(), POLICY_ENERGY); // welfare +3 DELAYED 2
    const hits: number[] = [];
    for (let quarter = 1; quarter <= 3; quarter += 1) {
      const result = resolveOk(state);
      if (result.ledger.some((entry) => entry.reasonCode === 'FX_TARGETED_AID')) hits.push(quarter);
      state = result.state;
    }
    expect(hits).toEqual([3]);
    expect(state.delayedEffects).toEqual([]);
  });

  it('voting gagal: cooldown 1 memblokir kuartal berikutnya saja', () => {
    let state = resolveOk(enact(newState(), POLICY_FISCAL)).state;
    expect(state.policyCooldowns).toEqual({ [POLICY_FISCAL]: 1 });
    const blocked = applyCommand(
      state,
      { type: 'ENACT_POLICY', commandId: 'x', policyId: POLICY_FISCAL },
      defs,
    );
    expect(blocked.error?.code).toBe('ON_COOLDOWN');
    state = resolveOk(state).state;
    expect(state.policyCooldowns).toEqual({});
  });

  it('kebijakan yang tak ada lagi di definisi tetap dihitung mundur tanpa efek', () => {
    const state: GameState = {
      ...newState(),
      activePolicies: [
        {
          policyId: 'POL-GONE-001',
          enactedTurn: 1,
          remainingTurns: 1,
          perTurnCostBillion: 0,
          lastTickedTurn: 0,
        },
      ],
    };
    const result = resolveOk(state);
    expect(result.state.activePolicies).toEqual([]);
    expect(result.state.policyCooldowns).toEqual({});
  });
});

describe('baseline dan kementerian', () => {
  it('rumus baseline AGENT §5.9 pada state awal', () => {
    const { ledger, state } = resolveOk(newState());
    const delta = (code: string) => ledger.find((entry) => entry.reasonCode === code)?.delta;
    // Inflasi 3,4 → (3,0 − 3,4) × 0,25 = −0,1
    expect(delta('BASELINE_INFLATION_REVERSION')).toBe(-1);
    // Pengangguran −0,15 × (4,8 − 2,5) = −0,345 → −0,3
    expect(delta('BASELINE_OKUN')).toBe(-3);
    // Persetujuan (50 − 58) × 0,1 = −0,8
    expect(delta('BASELINE_APPROVAL_REVERSION')).toBe(-8);
    // Pertumbuhan (4,0 − 4,8) × 0,2 = −0,16 → −0,2
    expect(delta('BASELINE_GROWTH_REVERSION')).toBe(-2);
    expect(delta('BASELINE_REVENUE')).toBe(40_000);
    expect(delta('BASELINE_SPENDING')).toBe(-41_000);
    expect(state.treasuryBillion).toBe(19_000);
    expect(delta('NEGATIVE_TREASURY')).toBeUndefined();
  });

  it('kas negatif memotong kesehatan fiskal 3,0', () => {
    const { ledger } = resolveOk({ ...newState(), treasuryBillion: 500 });
    expect(ledger.find((entry) => entry.reasonCode === 'NEGATIVE_TREASURY')?.delta).toBe(-30);
  });

  it('biaya per kuartal kebijakan aktif masuk ke kas', () => {
    const { ledger } = resolveOk(enact(newState(), POLICY_SOCIAL)); // lolos 70 kursi
    expect(ledger.find((entry) => entry.reasonCode === 'POLICY_UPKEEP')).toMatchObject({
      sourceId: POLICY_SOCIAL,
      delta: -2_000,
    });
    expect(ledger.find((entry) => entry.reasonCode === 'POLICY_UPFRONT_COST')?.delta).toBe(-6_000);
  });

  it('dukungan fraksi kembali 10% ke dukungan dasar', () => {
    const state: GameState = {
      ...newState(),
      factions: newState().factions.map((faction) => ({ ...faction, supportTenths: 650 })),
    };
    const { ledger } = resolveOk(state);
    const reversion = ledger.filter((entry) => entry.reasonCode === 'BASELINE_SUPPORT_REVERSION');
    // Teknokrat dasar 55: (55 − 65) × 0,1 = −1,0
    expect(reversion[0]).toMatchObject({ target: 'FAC-FX-01', delta: -10 });
  });

  it('effectiveness kementerian naik +1 per kebijakan sedomain yang berjalan', () => {
    const { state, ledger } = resolveOk(enact(newState(), POLICY_ENERGY));
    // 55 + 2 (efek kebijakan) + 1 (pengalaman) = 58
    expect(state.ministries.find((m) => m.ministryId === 'MIN-FX-ENERGY')?.effectiveness).toBe(58);
    expect(ledger.find((entry) => entry.reasonCode === 'MINISTRY_EXPERIENCE')?.delta).toBe(1);
  });
});

describe('normalize', () => {
  it('clamp indikator, fraksi, dan kementerian dicatat sebagai CLAMPED', () => {
    const state: GameState = {
      ...newState(),
      indicators: { ...newState().indicators, trust: 5 },
      factions: newState().factions.map((faction) => ({ ...faction, supportTenths: 1000 })),
      ministries: newState().ministries.map((ministry) => ({ ...ministry, effectiveness: 90 })),
      pendingEvents: [{ eventId: EVENT_FLOOD, arrivedTurn: 1, resolvedChoiceId: 'B' }],
    };
    // Opsi B: trust −2,0 (0,5 → −1,5) dan Daerah −3,0.
    const withEnergy = enact(state, POLICY_ENERGY);
    const { ledger, state: after } = resolveOk(withEnergy);
    const clamped = ledger.filter((entry) => entry.reasonCode === 'CLAMPED');
    expect(clamped.find((entry) => entry.target === 'trust')).toMatchObject({ after: 0 });
    expect(clamped.some((entry) => entry.kind === 'MINISTRY')).toBe(true);
    expect(after.indicators.trust).toBe(0);
    expect(after.ministries.every((m) => m.effectiveness <= 90)).toBe(true);
    // Reversi baseline biasanya menarik dukungan kembali; uji clamp fraksi langsung.
    const work: GameState = {
      ...newState(),
      factions: [
        { factionId: 'FAC-FX-01', supportTenths: 1_050 },
        { factionId: 'FAC-FX-02', supportTenths: -20 },
      ],
    };
    const ledger2 = new Ledger(1);
    normalizeState(work, ledger2);
    expect(work.factions.map((f) => f.supportTenths)).toEqual([1_000, 0]);
    expect(ledger2.entries.map((e) => [e.kind, e.delta])).toEqual([
      ['FACTION', -50],
      ['FACTION', 20],
    ]);
  });
});

describe('laporan', () => {
  it('kalender fiktif 4 kuartal per tahun', () => {
    expect(turnCalendar(2031, 1)).toEqual({ year: 2031, quarter: 1 });
    expect(turnCalendar(2031, 4)).toEqual({ year: 2031, quarter: 4 });
    expect(turnCalendar(2031, 5)).toEqual({ year: 2032, quarter: 1 });
  });

  it('delta indikator, top 3 penyebab, kebijakan lolos/gagal, dan kas', () => {
    let state = enact(newState(), POLICY_ENERGY);
    state = enact(state, POLICY_FISCAL);
    const { report } = resolveOk(state);
    expect(report.policiesPassed).toEqual([POLICY_ENERGY]);
    expect(report.policiesFailed).toEqual([POLICY_FISCAL]);
    expect(report.treasuryDeltaBillion).toBe(
      report.treasuryAfterBillion - report.treasuryBeforeBillion,
    );
    for (const key of INDICATOR_KEYS) {
      expect(report.indicatorDeltas[key]).toBe(
        report.indicatorsAfter[key] - report.indicatorsBefore[key],
      );
      expect(report.topCauses[key].length).toBeLessThanOrEqual(3);
    }
    // Persetujuan: kebijakan energi −4,0 × 0,92 = −3,7 (eff 55), baseline (50−58)×0,1 = −0,8.
    expect(report.topCauses.approval.map((cause) => cause.reasonCode)).toEqual([
      'FX_FUEL_DISCONTENT',
      'BASELINE_APPROVAL_REVERSION',
    ]);
    expect(report.topCauses.approval[0]?.deltaTenths).toBe(-37);
    expect(report.topCauses.trust[0]).toMatchObject({ sourceType: 'VOTE', deltaTenths: -20 });
  });
});

describe('integrasi 4 kuartal', () => {
  const run = runScript();

  it('skrip berjalan sesuai rencana', () => {
    expect(run.rejections).toEqual([{ turn: 2, commandId: 'k2-fiscal', code: 'ON_COOLDOWN' }]);
    expect(run.reports.map((report) => report.policiesPassed)).toEqual([
      [POLICY_ENERGY],
      [],
      [POLICY_FISCAL],
      expect.any(Array),
    ]);
    expect(run.reports[0]?.policiesFailed).toEqual([POLICY_FISCAL]);
    expect(run.states.at(-1)?.status).toBe('completed');
    for (const state of run.states) expect(gameStateSchema.safeParse(state).success).toBe(true);
    for (const report of run.reports) expect(turnReportSchema.safeParse(report).success).toBe(true);
  });

  it('hash state tiap kuartal sama dengan fixture', async () => {
    const final = run.states.at(-1);
    const fixture = {
      seed: 'fixture-4q',
      stateHashes: run.states.map((state) => hashState(state)),
      reportHashes: run.reports.map((report) => hashState(report)),
      finalIndicators: final?.indicators,
      finalTreasuryBillion: final?.treasuryBillion,
    };
    await expect(`${JSON.stringify(fixture, null, 2)}\n`).toMatchFileSnapshot(
      './__fixtures__/slice-4q.json',
    );
  });

  it('rekonsiliasi: state akhir = state awal + jumlah delta ledger', () => {
    const final = run.states.at(-1);
    if (final === undefined) throw new Error('tanpa state akhir');
    for (const key of INDICATOR_KEYS) {
      const sum = run.ledger
        .filter((entry) => entry.kind === 'INDICATOR' && entry.target === key)
        .reduce((total, entry) => total + (entry.delta ?? 0), 0);
      expect(run.initial.indicators[key] + sum).toBe(final.indicators[key]);
    }
    const treasurySum = run.ledger
      .filter((entry) => entry.kind === 'TREASURY')
      .reduce((total, entry) => total + (entry.delta ?? 0), 0);
    expect(run.initial.treasuryBillion + treasurySum).toBe(final.treasuryBillion);
    for (const faction of final.factions) {
      const start = run.initial.factions.find((item) => item.factionId === faction.factionId);
      const sum = run.ledger
        .filter((entry) => entry.kind === 'FACTION' && entry.target === faction.factionId)
        .reduce((total, entry) => total + (entry.delta ?? 0), 0);
      expect((start?.supportTenths ?? 0) + sum).toBe(faction.supportTenths);
    }
  });

  it('setiap entri ledger konsisten: before + delta = after', () => {
    for (const entry of run.ledger) {
      if (entry.before !== undefined && entry.after !== undefined) {
        expect(entry.before + (entry.delta ?? 0)).toBe(entry.after);
      }
    }
  });
});
