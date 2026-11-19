import { FACTION_ROLES, factionJsonSchema } from '@republika/shared';
import { describe, expect, it } from 'vitest';

import { rawContentBundle } from '../src/contentBundle.js';
import { parseRawContent } from '../src/parseContent.js';
import { rulesetMigrationMaps } from '../src/rulesetMigrations.js';

function definitions() {
  const result = parseRawContent(rawContentBundle);
  if (result.definitions === null) throw new Error('Konten tidak valid.');
  return { defs: result.definitions, warnings: result.warnings };
}

const baseFaction = {
  id: 'FAC-UJI',
  version: 1,
  name: 'Partai Uji',
  shortName: 'PU',
  seats: 10,
  color: '#123456',
  ideologyTags: ['uji'],
  baseSupport: 50,
  initialSupport: 50,
  policyPreferences: { FISCAL: 0, SOCIAL: 0, ENERGY: 0, GOVERNANCE: 0 },
  description: '',
};

describe('pengurus dan anggota partai', () => {
  it('opsional: fraksi tanpa daftar tokoh tetap valid dengan array kosong', () => {
    const parsed = factionJsonSchema.parse(baseFaction);
    expect(parsed.leadership).toEqual([]);
    expect(parsed.members).toEqual([]);
  });

  it('menolak jabatan ganda, jabatan tak dikenal, dan karakter kontrol', () => {
    const chair = { role: 'CHAIR', name: 'Sri Rahayu' };
    expect(
      factionJsonSchema.safeParse({ ...baseFaction, leadership: [chair, chair] }).success,
    ).toBe(false);
    expect(
      factionJsonSchema.safeParse({
        ...baseFaction,
        leadership: [{ role: 'PRESIDENT', name: 'Sri Rahayu' }],
      }).success,
    ).toBe(false);
    expect(factionJsonSchema.safeParse({ ...baseFaction, members: ['Budi\u0007'] }).success).toBe(
      false,
    );
  });

  it('konten: setiap partai punya semua jabatan, anggota, dan nama tokoh unik', () => {
    const { defs, warnings } = definitions();
    expect(defs.factions).toHaveLength(6);
    for (const faction of defs.factions) {
      expect(faction.id).not.toContain('PLACEHOLDER');
      expect(faction.leadership.map((item) => item.role).sort()).toEqual([...FACTION_ROLES].sort());
      expect(faction.members.length).toBeGreaterThanOrEqual(3);
    }
    expect(warnings.map((item) => item.code)).not.toContain('DUPLICATE_PERSON_NAME');
    const shortNames = defs.factions.map((faction) => faction.shortName);
    expect(new Set(shortNames).size).toBe(shortNames.length);
  });

  it('nama tokoh ganda di dua partai memunculkan peringatan', () => {
    const raw = structuredClone(rawContentBundle);
    const factions = raw.factions as Array<{
      members: string[];
      leadership: Array<{ name: string }>;
    }>;
    const duplicate = factions[0]?.leadership[0]?.name ?? '';
    factions[1]?.members.push(duplicate);
    const result = parseRawContent(raw);
    expect(result.warnings.map((item) => item.code)).toContain('DUPLICATE_PERSON_NAME');
  });

  it('peta ruleset-2 memetakan semua ID fraksi lama ke fraksi yang ada', () => {
    const { defs } = definitions();
    expect(defs.scenario.rulesetVersion).toBeGreaterThanOrEqual(2);
    const map = rulesetMigrationMaps.find((item) => item.toRuleset === 2);
    expect(map).toBeDefined();
    const ids = new Set(defs.factions.map((faction) => faction.id));
    const targets = Object.values(map?.renamed ?? {});
    expect(targets).toHaveLength(6);
    for (const target of targets) expect(ids.has(target)).toBe(true);
  });
});
