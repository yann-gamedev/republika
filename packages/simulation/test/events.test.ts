import { describe, expect, it } from 'vitest';

import type { GameDefinitions, GameState } from '@republika/shared';

import { applyCommand } from '../src/core/commands.js';
import { cloneState } from '../src/core/clone.js';
import { indexDefinitions } from '../src/core/definitions.js';
import { Ledger } from '../src/core/ledger.js';
import { resolveTurn } from '../src/core/resolveTurn.js';
import { createRng } from '../src/core/rng.js';
import { eligibleEvents, selectNextEvents } from '../src/events/select.js';
import { EVENT_FLOOD, EVENT_PROTEST, defs, newState } from './helpers.js';

const index = indexDefinitions(defs);

function ids(state: GameState, targetTurn: number, d: GameDefinitions = defs): string[] {
  return eligibleEvents(state, indexDefinitions(d), targetTurn).map((event) => event.id);
}

describe('eligibleEvents', () => {
  it('syarat dievaluasi untuk kuartal kedatangan (TURN_AT_LEAST)', () => {
    // Demo mahasiswa butuh kuartal ≥ 2.
    expect(ids(newState(), 1)).toEqual([EVENT_FLOOD]);
    expect(ids(newState(), 2)).toEqual([EVENT_FLOOD, EVENT_PROTEST]);
  });

  it('cooldown memblokir event', () => {
    const state = { ...newState(), eventCooldowns: { [EVENT_FLOOD]: 1 } };
    expect(ids(state, 2)).toEqual([EVENT_PROTEST]);
  });

  it('uniquePerCampaign hanya sekali per kampanye', () => {
    const state = { ...newState(), eventsFired: [EVENT_PROTEST, EVENT_FLOOD] };
    // Banjir tidak unik → tetap boleh; demo unik → tidak.
    expect(ids(state, 2)).toEqual([EVENT_FLOOD]);
  });

  it('event yang sedang menunggu tidak dipilih lagi', () => {
    const state: GameState = {
      ...newState(),
      pendingEvents: [{ eventId: EVENT_FLOOD, arrivedTurn: 1, resolvedChoiceId: null }],
    };
    expect(ids(state, 2)).toEqual([EVENT_PROTEST]);
  });

  it('syarat indikator dan flag ikut dievaluasi', () => {
    const gated: GameDefinitions = {
      ...defs,
      events: defs.events.map((event) =>
        event.id === EVENT_FLOOD
          ? { ...event, eligibility: [{ type: 'FLAG_SET', flag: 'FX_NEEDS_FLAG' }] }
          : event,
      ),
    };
    expect(ids(newState(), 1, gated)).toEqual([]);
    expect(ids({ ...newState(), flags: ['FX_NEEDS_FLAG'] }, 1, gated)).toEqual([EVENT_FLOOD]);
  });
});

describe('selectNextEvents', () => {
  it('maksimal maxEventsPerQuarter, memberi cooldown, mencatat eventsFired dan ledger', () => {
    const work = cloneState(newState());
    const ledger = new Ledger(1);
    const picked = selectNextEvents(work, index, createRng('pilih'), ledger, 2);
    expect(picked).toHaveLength(1);
    const [eventId] = picked;
    expect(work.eventsFired).toEqual(picked);
    expect(ledger.entries[0]).toMatchObject({ reasonCode: 'EVENT_TRIGGERED', sourceId: eventId });
    if (eventId === EVENT_FLOOD) expect(work.eventCooldowns[EVENT_FLOOD]).toBe(4);
    else expect(work.eventCooldowns).toEqual({});
  });

  it('tanpa pengembalian bila boleh lebih dari satu event', () => {
    const many = indexDefinitions({
      ...defs,
      scenario: { ...defs.scenario, maxEventsPerQuarter: 5 },
    });
    const work = cloneState(newState());
    const picked = selectNextEvents(work, many, createRng('banyak'), new Ledger(1), 2);
    expect([...picked].sort()).toEqual([EVENT_FLOOD, EVENT_PROTEST]);
  });

  it('kosong bila tidak ada kandidat atau maksimum 0', () => {
    const none = indexDefinitions({
      ...defs,
      scenario: { ...defs.scenario, maxEventsPerQuarter: 0 },
    });
    expect(
      selectNextEvents(cloneState(newState()), none, createRng('x'), new Ledger(1), 2),
    ).toEqual([]);
    const blocked = { ...newState(), eventCooldowns: { [EVENT_FLOOD]: 2 } };
    expect(selectNextEvents(cloneState(blocked), index, createRng('x'), new Ledger(1), 1)).toEqual(
      [],
    );
  });

  it('distribusi 10.000 draw seeded mendekati bobot (±3%)', () => {
    // Banjir bobot 10, demo bobot 30 → 25% / 75%.
    const rng = createRng('distribusi');
    const base = newState();
    let flood = 0;
    const draws = 10_000;
    for (let draw = 0; draw < draws; draw += 1) {
      const [picked] = selectNextEvents(cloneState(base), index, rng, new Ledger(1), 2);
      if (picked === EVENT_FLOOD) flood += 1;
    }
    expect(Math.abs(flood / draws - 0.25)).toBeLessThan(0.03);
  });

  it('seed sama → event sama', () => {
    const pick = (seed: string) =>
      selectNextEvents(cloneState(newState()), index, createRng(seed), new Ledger(1), 2);
    expect(pick('sama')).toEqual(pick('sama'));
  });
});

describe('integrasi resolveTurn', () => {
  it('event terpilih menjadi pending kuartal berikutnya dan END_QUARTER ditolak sampai direspons', () => {
    const first = resolveTurn(newState('ev'), { type: 'END_QUARTER', commandId: 'e1' }, defs);
    if (!first.ok) throw new Error(first.error.code);
    expect(first.state.pendingEvents).toEqual([
      { eventId: first.report.nextEventIds[0], arrivedTurn: 2, resolvedChoiceId: null },
    ]);
    const blocked = resolveTurn(first.state, { type: 'END_QUARTER', commandId: 'e2' }, defs);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe('EVENT_RESPONSE_REQUIRED');

    const eventId = first.state.pendingEvents[0]?.eventId ?? '';
    const answered = applyCommand(
      first.state,
      { type: 'RESPOND_EVENT', commandId: 'r', eventId, choiceId: 'B' },
      defs,
    ).state;
    const second = resolveTurn(answered, { type: 'END_QUARTER', commandId: 'e2' }, defs);
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.report.resolvedEvents).toEqual([{ eventId, choiceId: 'B' }]);
  });

  it('tidak ada event baru setelah kuartal terakhir', () => {
    const result = resolveTurn(
      { ...newState(), turn: 4 },
      { type: 'END_QUARTER', commandId: 'e' },
      defs,
    );
    if (!result.ok) throw new Error(result.error.code);
    expect(result.report.nextEventIds).toEqual([]);
    expect(result.state.pendingEvents).toEqual([]);
  });
});
