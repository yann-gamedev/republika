import { loadGameDefinitions, rawContentBundle, rulesetMigrationMaps } from '@republika/game-data';
import { SAVE_FORMAT_VERSION, saveFileSchema } from '@republika/shared';
import { describe, expect, it } from 'vitest';

import { applyCommand } from '../src/core/commands.js';
import { createCampaign, createInitialState } from '../src/core/initialState.js';
import { resolveTurn } from '../src/core/resolveTurn.js';
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
