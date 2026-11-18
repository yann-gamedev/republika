import { describe, expect, it } from 'vitest';

import { SAVE_FORMAT_VERSION, type GameDefinitions, type SaveFile } from '@republika/shared';

import { applyCommand } from '../src/core/commands.js';
import { hashState } from '../src/core/hash.js';
import { resolveTurn } from '../src/core/resolveTurn.js';
import { expandFromDisk, ledgerId, saveToDisk } from '../src/save/compact.js';
import { migrateRuleset } from '../src/save/migrateRuleset.js';
import { migrateSave } from '../src/save/migrateSave.js';
import saveV1 from './fixtures/saves/save-v1-slice.json';
import { POLICY_ENERGY, defs, respondAll } from './helpers.js';

function migratedV1(): SaveFile {
  const result = migrateSave(structuredClone(saveV1));
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.save;
}

function continueOneQuarter(save: SaveFile, d: GameDefinitions = defs) {
  let state = save.state;
  for (const response of respondAll(state, () => 'B', 'lanjut')) {
    state = applyCommand(state, response, d).state;
  }
  return resolveTurn(state, { type: 'END_QUARTER', commandId: 'lanjut-end' }, d);
}

describe('migrasi format save', () => {
  it('fixture v1 → v2 valid dan bisa dilanjutkan ke kuartal berikutnya', () => {
    const result = migrateSave(structuredClone(saveV1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fromFormat).toBe(1);
    expect(result.save.saveFormatVersion).toBe(SAVE_FORMAT_VERSION);
    expect(result.save.playTimeSeconds).toBe(0);
    // Ledger v1 utuh setelah migrasi (id dan after dihitung ulang dengan benar).
    expect(result.save.history.reports).toEqual(saveV1.history.reports);
    expect(hashState(result.save.state)).toBe(hashState(saveV1.state));

    const next = continueOneQuarter(result.save);
    expect(next.ok).toBe(true);
    if (next.ok) expect(next.state.turn).toBe(saveV1.state.turn + 1);
  });

  it('ledger di disk ringkas dan bolak-balik identik', () => {
    const save = migratedV1();
    const disk = saveToDisk(save);
    const firstEntry = (
      disk.history as { reports: Array<{ ledger: Array<Record<string, unknown>> }> }
    ).reports[0]?.ledger[0];
    expect(firstEntry).not.toHaveProperty('id');
    expect(firstEntry).not.toHaveProperty('after');
    expect(JSON.stringify(disk).length).toBeLessThan(JSON.stringify(save).length);
    const again = migrateSave(JSON.parse(JSON.stringify(disk)));
    expect(again.ok && again.fromFormat).toBe(SAVE_FORMAT_VERSION);
    if (again.ok) expect(again.save).toEqual(save);
  });

  it('nilai yang tidak konsisten (save diedit pemain) tidak hilang', () => {
    const save = migratedV1();
    const report = save.history.reports[0];
    const entry = report?.ledger.find(
      (item) => item.before !== undefined && item.delta !== undefined,
    );
    if (entry === undefined) throw new Error('fixture tanpa entri numerik');
    const edited = { ...entry, id: 'EDIT-1', after: (entry.after ?? 0) + 7 };
    const expanded = expandFromDisk(
      saveToDisk({
        ...save,
        history: { ...save.history, reports: [{ ...report!, ledger: [edited] }] },
      }),
    ) as unknown as SaveFile;
    expect(expanded.history.reports[0]?.ledger[0]).toEqual(edited);
    expect(ledgerId(3, 12)).toBe('T03-0012');
  });

  it('error jelas untuk file yang bukan save, format lebih baru, dan isi tidak valid', () => {
    expect(migrateSave('bukan objek')).toMatchObject({ ok: false, error: { code: 'NOT_A_SAVE' } });
    expect(migrateSave({ saveFormatVersion: 0 })).toMatchObject({
      ok: false,
      error: { code: 'NOT_A_SAVE' },
    });
    expect(migrateSave({ ...saveV1, saveFormatVersion: 99 })).toMatchObject({
      ok: false,
      error: { code: 'NEWER_FORMAT', version: 99 },
    });
    expect(migrateSave({ ...saveV1, label: '' })).toMatchObject({
      ok: false,
      error: { code: 'INVALID' },
    });
  });
});

describe('migrasi ruleset', () => {
  /** Save dari ruleset 2 (sebelum drift fraksi) dengan kebijakan energi aktif. */
  function oldRulesetSave(): SaveFile {
    const save = migratedV1();
    return { ...save, rulesetVersion: 2, state: { ...save.state, rulesetVersion: 2 } };
  }

  it('kebijakan yang dihapus dari konten dihentikan dengan ledger RULESET_MIGRATED', () => {
    const withoutEnergy: GameDefinitions = {
      ...defs,
      policies: defs.policies.filter((policy) => policy.id !== POLICY_ENERGY),
    };
    const result = migrateRuleset(oldRulesetSave(), withoutEnergy, [
      { fromRuleset: 2, toRuleset: 3, renamed: {}, removed: [POLICY_ENERGY] },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(true);
    expect(result.stoppedPolicies).toEqual([POLICY_ENERGY]);
    expect(result.save.state.activePolicies).toEqual([]);
    expect(result.save.state.rulesetVersion).toBe(3);
    expect(result.save.state.rulesetMigratedFrom).toBe(2);
    expect(result.save.rulesetVersion).toBe(3);
    expect(result.save.history.ledger.at(-1)).toMatchObject({
      reasonCode: 'RULESET_MIGRATED',
      sourceId: POLICY_ENERGY,
      kind: 'POLICY',
    });
    expect(continueOneQuarter(result.save, withoutEnergy).ok).toBe(true);
  });

  it('ID yang diganti nama dipetakan, bukan dihentikan', () => {
    const renamedId = 'POL-ENERGY-FX-002';
    const renamedDefs: GameDefinitions = {
      ...defs,
      policies: defs.policies.map((policy) =>
        policy.id === POLICY_ENERGY ? { ...policy, id: renamedId } : policy,
      ),
    };
    const result = migrateRuleset(oldRulesetSave(), renamedDefs, [
      { fromRuleset: 2, toRuleset: 3, renamed: { [POLICY_ENERGY]: renamedId }, removed: [] },
    ]);
    if (!result.ok) throw new Error('gagal');
    expect(result.stoppedPolicies).toEqual([]);
    expect(result.save.state.activePolicies.map((policy) => policy.policyId)).toEqual([renamedId]);
    expect(
      result.save.state.delayedEffects.every((effect) => effect.sourceId !== POLICY_ENERGY),
    ).toBe(true);
  });

  it('ruleset sama tidak diubah; ruleset lebih baru ditolak', () => {
    const save = migratedV1();
    const same = migrateRuleset(save, defs, []);
    expect(same).toMatchObject({ ok: true, migrated: false });
    if (same.ok) expect(same.save).toBe(save);
    const future = { ...save, rulesetVersion: 9, state: { ...save.state, rulesetVersion: 9 } };
    expect(migrateRuleset(future, defs, [])).toEqual({
      ok: false,
      code: 'NEWER_RULESET',
      version: 9,
    });
  });
});
