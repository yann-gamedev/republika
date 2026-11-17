import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { INDICATOR_KEYS, gameStateSchema, type GameState } from '@republika/shared';

import { applyCommand, type PlayerCommand } from '../src/core/commands.js';
import { hashState } from '../src/core/hash.js';
import { indicatorBounds } from '../src/core/math.js';
import { resolveTurn } from '../src/core/resolveTurn.js';
import { defs, newState, respondAll } from './helpers.js';
import { runScript } from './scenario.js';

describe('determinisme', () => {
  it('dua instance dengan input sama menghasilkan hash sama', () => {
    const first = runScript();
    const second = runScript();
    expect(second.states.map((s) => hashState(s))).toEqual(first.states.map((s) => hashState(s)));
    expect(hashState(second.ledger)).toBe(hashState(first.ledger));
  });

  it('proses test terpisah mereproduksi fixture yang sama', async () => {
    // Vitest menjalankan tiap file test di worker terpisah; file ini mencocokkan
    // fixture yang sama dengan resolveTurn.test.ts sehingga hasil lintas proses dibandingkan.
    const run = runScript();
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
});

const policyIds = defs.policies.map((policy) => policy.id);
const factionIds = defs.factions.map((faction) => faction.id);

const stepArb = fc.oneof(
  fc.record({ kind: fc.constant('enact' as const), id: fc.constantFrom(...policyIds) }),
  fc.record({ kind: fc.constant('lobby' as const), id: fc.constantFrom(...factionIds) }),
  fc.record({ kind: fc.constant('cancel' as const), id: fc.nat(6) }),
);

const turnArb = fc.record({
  steps: fc.array(stepArb, { maxLength: 6 }),
  event: fc.constantFrom('A', 'B'),
});

describe('property: 4 kuartal acak', () => {
  it('indikator dalam domain, turn monoton, kursi konstan, ledger tidak kosong saat berubah', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 12 }),
        fc.array(turnArb, { minLength: 4, maxLength: 4 }),
        (seed, turns) => {
          let state: GameState = newState(seed);
          let previousTurn = state.turn;
          turns.forEach((turn, position) => {
            // Event dipilih engine; tanggapi semua dengan pilihan acak A/B.
            for (const response of respondAll(state, () => turn.event, `t${position}`)) {
              state = applyCommand(state, response, defs).state;
            }
            turn.steps.forEach((step, index) => {
              const commandId = `t${position}-c${index}`;
              let command: PlayerCommand;
              if (step.kind === 'enact')
                command = { type: 'ENACT_POLICY', commandId, policyId: step.id };
              else if (step.kind === 'lobby')
                command = { type: 'LOBBY_FACTION', commandId, factionId: step.id };
              else
                command = {
                  type: 'CANCEL_PENDING',
                  commandId,
                  pendingCommandId: `t${position}-c${step.id}`,
                };
              state = applyCommand(state, command, defs).state;
            });
            const result = resolveTurn(
              state,
              { type: 'END_QUARTER', commandId: `end-${position}` },
              defs,
            );
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            const next = result.state;
            for (const key of INDICATOR_KEYS) {
              const { min, max } = indicatorBounds(key);
              expect(next.indicators[key]).toBeGreaterThanOrEqual(min);
              expect(next.indicators[key]).toBeLessThanOrEqual(max);
            }
            expect(next.turn).toBeGreaterThanOrEqual(previousTurn);
            if (position < 3) expect(next.turn).toBe(previousTurn + 1);
            previousTurn = next.turn;
            for (const faction of next.factions) {
              expect(faction.supportTenths).toBeGreaterThanOrEqual(0);
              expect(faction.supportTenths).toBeLessThanOrEqual(1000);
            }
            expect(defs.factions.reduce((sum, faction) => sum + faction.seats, 0)).toBe(100);
            for (const vote of result.report.votes) {
              expect(vote.seatsFor + vote.seatsAgainst).toBe(100);
            }
            const changed =
              INDICATOR_KEYS.some((key) => result.report.indicatorDeltas[key] !== 0) ||
              result.report.treasuryDeltaBillion !== 0;
            if (changed) expect(result.ledger.length).toBeGreaterThan(0);
            expect(gameStateSchema.safeParse(next).success).toBe(true);
            state = next;
          });
          expect(state.status).toBe('completed');
        },
      ),
      { numRuns: 150 },
    );
  });
});

describe('anggaran performa §5.17', () => {
  it('resolve 1 kuartal jauh di bawah batas 50 ms (20 kuartal)', () => {
    let state: GameState = { ...newState('perf'), maxTurns: 20 };
    const started = performance.now();
    for (let quarter = 1; quarter <= 20; quarter += 1) {
      const policyId = policyIds[quarter % policyIds.length] ?? policyIds[0] ?? '';
      for (const response of respondAll(state, () => 'B', `r${quarter}`)) {
        state = applyCommand(state, response, defs).state;
      }
      state = applyCommand(
        state,
        { type: 'ENACT_POLICY', commandId: `p${quarter}`, policyId },
        defs,
      ).state;
      const result = resolveTurn(state, { type: 'END_QUARTER', commandId: `e${quarter}` }, defs);
      if (!result.ok) throw new Error(result.error.code);
      state = result.state;
    }
    const average = (performance.now() - started) / 20;
    expect(state.status).toBe('completed');
    expect(average).toBeLessThan(50);
  });
});
