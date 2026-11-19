import { loadGameDefinitions, rawContentBundle, rulesetMigrationMaps } from '@republika/game-data';
import { SAVE_FORMAT_VERSION, saveFileSchema, type SaveFile } from '@republika/shared';
import { describe, expect, it } from 'vitest';

import { applyCommand } from '../src/core/commands.js';
import { createCampaign, createInitialState } from '../src/core/initialState.js';
import { resolveTurn } from '../src/core/resolveTurn.js';
import { evaluatePromises } from '../src/report/finalSummary.js';
import { backgroundShowdown, runCampaign } from '../test-utils/index.js';
import { saveToDisk } from '../src/save/compact.js';
import { migrateRuleset } from '../src/save/migrateRuleset.js';
import { migrateSave } from '../src/save/migrateSave.js';
import saveV2 from './fixtures/saves/save-v2-content.json';

const content = loadGameDefinitions(rawContentBundle).definitions;

describe('format save v3 (Tahap 6B.1)', () => {
  it('save v2 rilis → v3, lalu ruleset 2 → 3 mengisi kabinet, pimpinan, dan provinsi', () => {
    const migrated = migrateSave(structuredClone(saveV2));
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    expect(migrated.fromFormat).toBe(2);
    expect(migrated.save.saveFormatVersion).toBe(SAVE_FORMAT_VERSION);
    expect(migrated.save.state.president.backgroundId).toBe('BG-NONE');
    expect(migrated.save.state.promiseIds).toEqual([]);

    const ruleset = migrateRuleset(migrated.save, content, rulesetMigrationMaps);
    expect(ruleset.ok).toBe(true);
    if (!ruleset.ok) return;
    const state = ruleset.save.state;
    expect(state.rulesetVersion).toBe(content.scenario.rulesetVersion);
    expect(Object.keys(state.cabinet)).toEqual(content.ministries.map((item) => item.id));
    expect(Object.keys(state.leaders)).toEqual(content.leaders.map((item) => item.id));
    for (const [roleId, holder] of Object.entries({ ...state.cabinet, ...state.leaders })) {
      const candidate = content.candidates.find((item) => item.id === holder.holderId);
      expect(candidate?.roleId).toBe(roleId);
      expect(candidate?.initial).toBe(true);
    }
    const provinceIds = Object.keys(state.provinces);
    expect(provinceIds).toHaveLength(38);
    expect(provinceIds).toEqual([...provinceIds].sort());
    for (const province of content.provinces) {
      expect(state.provinces[province.id]?.satisfactionTenths).toBe(
        province.baseSatisfactionTenths,
      );
    }

    // Bisa dimainkan, lalu disimpan ulang dan dimuat kembali tanpa perubahan.
    let work = state;
    for (const pending of work.pendingEvents) {
      work = applyCommand(
        work,
        {
          type: 'RESPOND_EVENT',
          commandId: `r-${pending.eventId}`,
          eventId: pending.eventId,
          choiceId: 'B',
        },
        content,
      ).state;
    }
    const next = resolveTurn(work, { type: 'END_QUARTER', commandId: 'lanjut' }, content);
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    const resaved = {
      ...ruleset.save,
      state: next.state,
      history: {
        reports: [...ruleset.save.history.reports, next.report],
        ledger: [...ruleset.save.history.ledger, ...next.ledger],
      },
    };
    expect(saveFileSchema.safeParse(resaved).success).toBe(true);
    const reloaded = migrateSave(JSON.parse(JSON.stringify(saveToDisk(resaved))));
    expect(reloaded.ok && reloaded.fromFormat).toBe(SAVE_FORMAT_VERSION);
    if (reloaded.ok) expect(reloaded.save).toEqual(resaved);
  });
});

describe('profil presiden dan latar belakang', () => {
  const base = { presidentName: 'Laras Pertiwi', seed: 'bg-uji' };

  it('tanpa pilihan: BG-NONE, janji kosong, pejabat awal dari konten', () => {
    const state = createInitialState(content.scenario, content, base);
    expect(state.president).toEqual({ honorific: 'Bapak', head: 'peci', backgroundId: 'BG-NONE' });
    expect(state.indicators).toEqual(content.scenario.initialIndicators);
    expect(Object.keys(state.provinces)).toHaveLength(38);
  });

  it('modifier latar belakang diterapkan tepat sekali dengan ledger BACKGROUND_APPLIED', () => {
    const background = content.backgrounds.find((item) => item.treasuryBillion !== 0);
    if (background === undefined) throw new Error('butuh latar belakang dengan modifier kas');
    const campaign = createCampaign(content.scenario, content, {
      ...base,
      backgroundId: background.id,
    });
    for (const modifier of background.startModifiers) {
      expect(campaign.state.indicators[modifier.target]).toBe(
        content.scenario.initialIndicators[modifier.target] + modifier.deltaTenths,
      );
    }
    expect(campaign.state.treasuryBillion).toBe(
      content.scenario.initialTreasuryBillion + background.treasuryBillion,
    );
    expect(campaign.ledger).toHaveLength(background.startModifiers.length + 1);
    expect(campaign.ledger.every((entry) => entry.reasonCode === 'BACKGROUND_APPLIED')).toBe(true);
    expect(new Set(campaign.ledger.map((entry) => entry.id)).size).toBe(campaign.ledger.length);
    expect(campaign.ledger[0]?.id).toBe('T01-B000');

    // Kuartal berikutnya tidak menerapkan ulang modifier.
    const resolved = resolveTurn(campaign.state, { type: 'END_QUARTER', commandId: 'q1' }, content);
    expect(resolved.ok).toBe(true);
    if (resolved.ok)
      expect(resolved.ledger.some((entry) => entry.reasonCode === 'BACKGROUND_APPLIED')).toBe(
        false,
      );
  });

  it('janji: tepat 3, tanpa ganda, dan harus ada di konten', () => {
    const ids = content.promises.map((item) => item.id);
    const three = ids.slice(0, 3);
    expect(
      createInitialState(content.scenario, content, { ...base, promiseIds: three }).promiseIds,
    ).toEqual([...three].sort());
    expect(() =>
      createInitialState(content.scenario, content, { ...base, promiseIds: ids.slice(0, 2) }),
    ).toThrow();
    expect(() =>
      createInitialState(content.scenario, content, {
        ...base,
        promiseIds: [ids[0] ?? '', ids[0] ?? '', ids[1] ?? ''],
      }),
    ).toThrow();
    expect(() =>
      createInitialState(content.scenario, content, {
        ...base,
        promiseIds: ['PRM-X', ...ids.slice(0, 2)],
      }),
    ).toThrow();
    expect(() =>
      createInitialState(content.scenario, content, { ...base, backgroundId: 'BG-X' }),
    ).toThrow();
  });
});

describe('janji kampanye (Tahap 6B.2)', () => {
  it('dinilai pada state akhir; save tanpa janji menghasilkan daftar kosong', () => {
    const three = content.promises.slice(0, 3).map((item) => item.id);
    const state = createInitialState(content.scenario, content, {
      presidentName: 'Laras Pertiwi',
      seed: 'janji',
      promiseIds: three,
    });
    const inflation = content.promises.find((item) => item.check.stat === 'final.inflationPct');
    if (inflation === undefined) throw new Error('butuh janji inflasi');
    const withInflation = { ...state, promiseIds: [inflation.id] };
    const low = evaluatePromises(
      { ...withInflation, indicators: { ...state.indicators, inflationPct: 30 } },
      content.promises,
    );
    const high = evaluatePromises(
      { ...withInflation, indicators: { ...state.indicators, inflationPct: 90 } },
      content.promises,
    );
    expect(low).toEqual([{ promiseId: inflation.id, kept: true, value: 3 }]);
    expect(high[0]?.kept).toBe(false);
    expect(evaluatePromises(state, content.promises)).toHaveLength(3);
    expect(evaluatePromises({ ...state, promiseIds: [] }, content.promises)).toEqual([]);
  });
});

describe('balance latar belakang', () => {
  it('showdown deterministik; total kemenangan = jumlah pertandingan', () => {
    const first = backgroundShowdown(content, ['no-op', 'random'], 2, 'uji', 4);
    const second = backgroundShowdown(content, ['no-op', 'random'], 2, 'uji', 4);
    expect(first).toEqual(second);
    expect(first.contests).toBe(4);
    const total = Object.values(first.wins).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(4, 6);
  });
});

describe('reshuffle (Tahap 6B.3)', () => {
  const start = () =>
    createInitialState(content.scenario, content, { presidentName: 'Laras Pertiwi', seed: 'rs' });
  const alternate = (roleId: string, state = start()) => {
    const holder = state.cabinet[roleId]?.holderId ?? state.leaders[roleId]?.holderId;
    const candidate = content.candidates.find(
      (item) => item.roleId === roleId && item.id !== holder,
    );
    if (candidate === undefined) throw new Error(`tanpa calon ${roleId}`);
    return candidate;
  };
  const ministryId = content.ministries[0]?.id ?? '';

  it('1 AP, maksimal sekali per kuartal, bisa dibatalkan, dan wapres terkunci', () => {
    const state = start();
    const candidate = alternate(ministryId, state);
    const first = applyCommand(
      state,
      { type: 'RESHUFFLE', commandId: 'rs-1', roleId: ministryId, candidateId: candidate.id },
      content,
    );
    expect(first.error).toBeUndefined();
    expect(first.state.actionPointsRemaining).toBe(state.actionPointsRemaining - 1);
    const leaderId = content.leaders.find((item) => item.replaceable)?.id ?? '';
    const second = applyCommand(
      first.state,
      {
        type: 'RESHUFFLE',
        commandId: 'rs-2',
        roleId: leaderId,
        candidateId: alternate(leaderId).id,
      },
      content,
    );
    expect(second.error?.code).toBe('RESHUFFLE_LIMIT');
    const duplicate = applyCommand(
      first.state,
      { type: 'RESHUFFLE', commandId: 'rs-1', roleId: ministryId, candidateId: candidate.id },
      content,
    );
    expect(duplicate.error?.code).toBe('DUPLICATE_COMMAND');
    const cancelled = applyCommand(
      first.state,
      { type: 'CANCEL_PENDING', commandId: 'c-1', pendingCommandId: 'rs-1' },
      content,
    );
    expect(cancelled.state.actionPointsRemaining).toBe(state.actionPointsRemaining);
    expect(cancelled.state.pendingCommands).toEqual([]);

    const wapres = content.leaders.find((item) => !item.replaceable);
    if (wapres === undefined) throw new Error('butuh jabatan terkunci');
    const locked = applyCommand(
      state,
      { type: 'RESHUFFLE', commandId: 'rs-3', roleId: wapres.id, candidateId: 'CND-X' },
      content,
    );
    expect(locked.error?.code).toBe('ROLE_LOCKED');
    const holderAgain = applyCommand(
      state,
      {
        type: 'RESHUFFLE',
        commandId: 'rs-4',
        roleId: ministryId,
        candidateId: state.cabinet[ministryId]?.holderId ?? '',
      },
      content,
    );
    expect(holderAgain.error?.code).toBe('ALREADY_HOLDER');
    const wrongRole = applyCommand(
      state,
      {
        type: 'RESHUFFLE',
        commandId: 'rs-5',
        roleId: ministryId,
        candidateId: alternate(leaderId).id,
      },
      content,
    );
    expect(wrongRole.error?.code).toBe('UNKNOWN_CANDIDATE');
  });

  it('langkah 2b: efektivitas, dukungan partai sebelum voting, dan ledger RESHUFFLE', () => {
    const state = start();
    const candidate = content.candidates.find(
      (item) =>
        item.roleId === ministryId &&
        !item.initial &&
        item.factionId !== null &&
        item.supportGainTenths > 0,
    );
    if (candidate === undefined || candidate.factionId === null)
      throw new Error('butuh calon partai');
    const oldHolder = content.candidates.find(
      (item) => item.id === state.cabinet[ministryId]?.holderId,
    );
    const policy = content.policies.find((item) => item.needsVote);
    if (policy === undefined) throw new Error('butuh kebijakan ber-voting');
    let work = applyCommand(
      state,
      { type: 'RESHUFFLE', commandId: 'rs', roleId: ministryId, candidateId: candidate.id },
      content,
    ).state;
    work = applyCommand(
      work,
      { type: 'ENACT_POLICY', commandId: 'p', policyId: policy.id },
      content,
    ).state;
    const result = resolveTurn(work, { type: 'END_QUARTER', commandId: 'end' }, content);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.cabinet[ministryId]?.holderId).toBe(candidate.id);
    expect(result.state.reshuffleUsedTurn).toBe(1);
    expect(
      result.ledger.some((entry) => entry.reasonCode === 'RESHUFFLE' && entry.kind === 'CABINET'),
    ).toBe(true);
    const ministry = result.ledger.find(
      (entry) => entry.kind === 'MINISTRY' && entry.sourceType === 'RESHUFFLE',
    );
    expect(ministry?.after).toBe(candidate.baseEffectiveness);

    // Dukungan saat voting sudah memuat tambahan dari reshuffle (dan penalti partai lama).
    const factionVote = result.report.votes[0]?.factionVotes.find(
      (item) => item.factionId === candidate.factionId,
    );
    const before =
      state.factions.find((item) => item.factionId === candidate.factionId)?.supportTenths ?? 0;
    const penalty = oldHolder?.factionId === candidate.factionId ? -60 : 0;
    expect(factionVote?.supportTenths).toBe(
      Math.min(1000, before + candidate.supportGainTenths + penalty),
    );
    const reshuffleIndex = result.ledger.findIndex((entry) => entry.reasonCode === 'RESHUFFLE');
    const voteIndex = result.ledger.findIndex((entry) => entry.kind === 'VOTE');
    expect(reshuffleIndex).toBeLessThan(voteIndex);
  });

  it('pimpinan: kepercayaan berubah (integritas baru − lama) / 10', () => {
    const state = start();
    const leaderId = content.leaders.find((item) => item.replaceable)?.id ?? '';
    const candidate = alternate(leaderId, state);
    const old = content.candidates.find((item) => item.id === state.leaders[leaderId]?.holderId);
    const work = applyCommand(
      state,
      { type: 'RESHUFFLE', commandId: 'rs', roleId: leaderId, candidateId: candidate.id },
      content,
    ).state;
    const result = resolveTurn(work, { type: 'END_QUARTER', commandId: 'end' }, content);
    if (!result.ok) throw new Error(result.error.code);
    const trust = result.ledger.find((entry) => entry.reasonCode === 'RESHUFFLE_INTEGRITY');
    expect(trust?.delta).toBe(candidate.integrity - (old?.integrity ?? 0));
    expect(result.state.leaders[leaderId]?.holderId).toBe(candidate.id);
    // Kuartal berikutnya kuota pulih.
    const next = applyCommand(
      result.state,
      { type: 'RESHUFFLE', commandId: 'rs-next', roleId: leaderId, candidateId: old?.id ?? '' },
      content,
    );
    expect(next.error).toBeUndefined();
  });
});

describe('peta daerah (Tahap 6B.4)', () => {
  const start = () =>
    createInitialState(content.scenario, content, { presidentName: 'Laras Pertiwi', seed: 'prv' });
  const provinceId = content.provinces[0]?.id ?? '';
  const act = (
    state: ReturnType<typeof start>,
    action: 'VISIT' | 'AID' | 'HEAR' | 'ENVOY',
    id = provinceId,
    commandId = `${action}-${id}`,
  ) => applyCommand(state, { type: 'PROVINCE_ACTION', commandId, provinceId: id, action }, content);

  it('aksi: biaya, satu per jenis per provinsi, HEAR sekali per kuartal, bisa dibatalkan', () => {
    const state = start();
    const visit = act(state, 'VISIT');
    expect(visit.error).toBeUndefined();
    expect(visit.state.actionPointsRemaining).toBe(state.actionPointsRemaining - 1);
    expect(visit.state.provinces[provinceId]?.actionsThisTurn).toEqual(['VISIT']);
    expect(act(visit.state, 'VISIT', provinceId, 'v2').error?.code).toBe('PROVINCE_ACTION_LIMIT');
    const aid = act(visit.state, 'AID');
    expect(aid.error).toBeUndefined();
    expect(aid.state.actionPointsRemaining).toBe(visit.state.actionPointsRemaining);
    const hear = act(aid.state, 'HEAR');
    expect(hear.error).toBeUndefined();
    const otherId = content.provinces[1]?.id ?? '';
    expect(act(hear.state, 'HEAR', otherId).error?.code).toBe('PROVINCE_ACTION_LIMIT');
    expect(act(hear.state, 'VISIT', 'PRV-X').error?.code).toBe('UNKNOWN_PROVINCE');
    const pendingVisit = hear.state.pendingCommands.find(
      (command) => command.type === 'PROVINCE_ACTION' && command.action === 'VISIT',
    );
    const cancelled = applyCommand(
      hear.state,
      { type: 'CANCEL_PENDING', commandId: 'c', pendingCommandId: pendingVisit?.commandId ?? '' },
      content,
    );
    expect(cancelled.state.provinces[provinceId]?.actionsThisTurn).toEqual(['AID', 'HEAR']);
    expect(cancelled.state.actionPointsRemaining).toBe(state.actionPointsRemaining);
  });

  it('langkah 2c + drift + reset: efek lokal, nasional, kas, flag aspirasi', () => {
    let work = start();
    for (const action of ['VISIT', 'AID', 'HEAR', 'ENVOY'] as const) work = act(work, action).state;
    const result = resolveTurn(work, { type: 'END_QUARTER', commandId: 'end' }, content);
    if (!result.ok) throw new Error(result.error.code);
    const codes = result.ledger.map((entry) => entry.reasonCode);
    for (const code of [
      'PROVINCE_VISIT',
      'PROVINCE_AID',
      'PROVINCE_HEAR',
      'PROVINCE_ENVOY',
      'PROVINCE_DRIFT',
    ])
      expect(codes).toContain(code);
    expect(result.state.flags).toContain(`ASPIRATION_${provinceId.replace(/-/gu, '_')}`);
    const visitApproval = result.ledger.find(
      (entry) => entry.reasonCode === 'PROVINCE_VISIT' && entry.target === 'approval',
    );
    expect(visitApproval?.delta).toBe(3);
    const aid = result.ledger.find(
      (entry) => entry.reasonCode === 'PROVINCE_AID' && entry.kind === 'TREASURY',
    );
    expect(aid?.delta).toBe(-3000);
    const envoy = result.ledger.find(
      (entry) => entry.reasonCode === 'PROVINCE_ENVOY' && entry.kind === 'MINISTRY',
    );
    expect(envoy?.delta).toBe(-2);
    const local = result.ledger
      .filter(
        (entry) =>
          entry.kind === 'PROVINCE' && entry.target === provinceId && entry.target === provinceId,
      )
      .reduce((sum, entry) => sum + (entry.delta ?? 0), 0);
    expect(local).toBe(60 + 40 + 30);
    for (const province of Object.values(result.state.provinces))
      expect(province.actionsThisTurn).toEqual([]);
  });

  it('flag gejolak dipasang di bawah 25 dan dilepas saat pulih', () => {
    const base = start();
    const low = {
      ...base,
      provinces: {
        ...base.provinces,
        [provinceId]: { satisfactionTenths: 100, actionsThisTurn: [] },
      },
    };
    const first = resolveTurn(low, { type: 'END_QUARTER', commandId: 'e1' }, content);
    if (!first.ok) throw new Error(first.error.code);
    const flag = `UNREST_${provinceId.replace(/-/gu, '_')}`;
    expect(first.state.flags).toContain(flag);
    const recovered = {
      ...first.state,
      pendingEvents: first.state.pendingEvents.map((item) => ({ ...item, resolvedChoiceId: 'B' })),
      provinces: {
        ...first.state.provinces,
        [provinceId]: { satisfactionTenths: 600, actionsThisTurn: [] },
      },
    };
    const second = resolveTurn(recovered, { type: 'END_QUARTER', commandId: 'e2' }, content);
    if (!second.ok) throw new Error(second.error.code);
    expect(second.state.flags).not.toContain(flag);
    expect(second.ledger.some((entry) => entry.reasonCode === 'PROVINCE_CALM')).toBe(true);
  });

  it('38 provinsi deterministik, selalu 0..100; resolve ≤ 20 ms; save ≤ 300 KB', () => {
    for (const strategy of ['visit', 'random'] as const) {
      const a = runCampaign({ defs: content, seed: `det-${strategy}`, strategy });
      const b = runCampaign({ defs: content, seed: `det-${strategy}`, strategy });
      expect(a.final.provinces).toEqual(b.final.provinces);
      expect(Object.keys(a.final.provinces)).toHaveLength(38);
      for (const report of a.reports) {
        for (const entry of report.ledger.filter((item) => item.kind === 'PROVINCE')) {
          if (entry.reasonCode === 'CLAMPED') expect([0, 1000]).toContain(entry.after);
        }
      }
      for (const province of Object.values(a.final.provinces)) {
        expect(province.satisfactionTenths).toBeGreaterThanOrEqual(0);
        expect(province.satisfactionTenths).toBeLessThanOrEqual(1000);
      }
      const save = {
        saveFormatVersion: SAVE_FORMAT_VERSION,
        appVersion: '0.1.0',
        rulesetVersion: a.final.rulesetVersion,
        contentHash: 'content-hash',
        savedAt: '2026-11-19T00:00:00.000Z',
        label: 'uji',
        playTimeSeconds: 0,
        state: a.final,
        history: { reports: [...a.reports], ledger: a.reports.flatMap((report) => report.ledger) },
      };
      expect(JSON.stringify(saveToDisk(save as SaveFile)).length).toBeLessThan(300 * 1024);
    }
    let state = createInitialState(content.scenario, content, {
      presidentName: 'Laras Pertiwi',
      seed: 'perf',
    });
    const started = performance.now();
    for (let turn = 0; turn < 20; turn += 1) {
      const result = resolveTurn(state, { type: 'END_QUARTER', commandId: `p-${turn}` }, content);
      if (!result.ok) break;
      state = {
        ...result.state,
        pendingEvents: result.state.pendingEvents.map((item) => ({
          ...item,
          resolvedChoiceId:
            content.events.find((event) => event.id === item.eventId)?.choices[0]?.id ?? 'A',
        })),
      };
    }
    expect((performance.now() - started) / 20).toBeLessThan(20);
  });
});
