import type { GameDefinitions, RawContentBundle } from '@republika/shared';
import { describe, expect, it } from 'vitest';

import { rawContentBundle } from '../src/contentBundle.js';
import { validateContent } from '../src/crossValidate.js';
import { parseRawContent } from '../src/parseContent.js';

function cloneRaw(): RawContentBundle {
  return structuredClone(rawContentBundle);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Nilai fixture bukan objek.');
  }
  return value as Record<string, unknown>;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error('Nilai fixture bukan array.');
  return value.map(asRecord);
}

function successfulDefinitions(raw: RawContentBundle): GameDefinitions {
  const result = parseRawContent(raw);
  expect(result.issues).toEqual([]);
  expect(result.definitions).not.toBeNull();
  if (result.definitions === null) throw new Error('Konten fixture tidak valid.');
  return result.definitions;
}

function codes(raw: RawContentBundle): string[] {
  return parseRawContent(raw).issues.map((issue) => issue.code);
}

function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .reverse()
        .map(([key, entry]) => [key, reverseKeys(entry)]),
    );
  }
  return value;
}

describe('loadGameDefinitions', () => {
  it('memuat konten placeholder valid dan memberi peringatan', () => {
    const result = parseRawContent(cloneRaw());
    expect(result.issues).toEqual([]);
    expect(result.definitions).not.toBeNull();
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.warnings.some((warning) => warning.code === 'PLACEHOLDER_CONTENT')).toBe(true);
  });

  it('mengonversi satuan tampilan ke fixed-point dan miliar', () => {
    const definitions = successfulDefinitions(cloneRaw());
    expect(definitions.scenario.initialIndicators.approval).toBe(580);
    expect(definitions.scenario.initialTreasuryBillion).toBe(150_000);
    expect(definitions.scenario.lobbyCostBillion).toBe(2_000);
    expect(definitions.scenario.lobbySupportBonusTenths).toBe(150);
    expect(definitions.baseline.inflationTargetTenths).toBe(30);

    const energy = definitions.policies.find(
      (policy) => policy.id === 'POL-ENERGY-PLACEHOLDER-001',
    );
    expect(energy?.fiscalCostBillion).toBe(8_000);
    const delayed = energy?.effects.find(
      (effect) => effect.type === 'MODIFY_INDICATOR' && effect.timing === 'DELAYED',
    );
    expect(delayed).toMatchObject({ delayTurns: 2, deltaTenths: 30 });
  });

  it('mengurutkan definisi berdasarkan ID', () => {
    const definitions = successfulDefinitions(cloneRaw());
    for (const collection of [
      definitions.factions,
      definitions.ministries,
      definitions.policies,
      definitions.events,
      definitions.archetypes,
    ]) {
      const ids = collection.map((item) => item.id);
      expect(ids).toEqual([...ids].sort());
    }
  });
});

describe('contentHash', () => {
  it('identik walaupun urutan key dan array berbeda', () => {
    const first = parseRawContent(cloneRaw());
    const shuffled = cloneRaw();
    (shuffled.factions as unknown[]).reverse();
    (shuffled.policies as unknown[]).reverse();
    (shuffled.events as unknown[]).reverse();
    const reordered = reverseKeys(shuffled) as RawContentBundle;
    const second = parseRawContent(reordered);
    expect(second.issues).toEqual([]);
    expect(second.contentHash).toBe(first.contentHash);
  });

  it('berubah saat angka konten berubah', () => {
    const first = parseRawContent(cloneRaw());
    const changed = cloneRaw();
    asRecord(asRecord(changed.scenario).initialIndicators).approval = 59;
    const second = parseRawContent(changed);
    expect(second.contentHash).not.toBe(first.contentHash);
  });
});

describe('validasi lintas-file', () => {
  it('menolak ID duplikat', () => {
    const raw = cloneRaw();
    const policies = asRecordArray(raw.policies);
    policies[1]!.id = policies[0]!.id;
    expect(codes(raw)).toContain('DUPLICATE_ID');
  });

  it('menolak referensi kebijakan yang tidak ada', () => {
    const raw = cloneRaw();
    asRecord(raw.policies[0]).requirements = [
      { type: 'POLICY_NOT_ACTIVE', policyId: 'POL-MISSING-001' },
    ];
    expect(codes(raw)).toContain('UNKNOWN_POLICY_REFERENCE');
  });

  it('menolak referensi kementerian yang tidak ada', () => {
    const raw = cloneRaw();
    const effectArray = asRecord(raw.policies[2]).effects as unknown[];
    expect(effectArray.length).toBeGreaterThan(0);
    const ministryEffect = effectArray
      .map(asRecord)
      .find((effect) => effect.type === 'MODIFY_MINISTRY_EFFECTIVENESS');
    if (ministryEffect === undefined) throw new Error('Fixture efek kementerian tidak ditemukan.');
    ministryEffect.ministryId = 'MIN-MISSING-001';
    expect(codes(raw)).toContain('UNKNOWN_MINISTRY_REFERENCE');
  });

  it('menolak total kursi bukan 100', () => {
    const raw = cloneRaw();
    asRecord(raw.factions[0]).seats = 21;
    expect(codes(raw)).toContain('SEATS_TOTAL');
  });

  it('menolak event tanpa opsi neutral pada validasi lintas-file', () => {
    const definitions = successfulDefinitions(cloneRaw());
    const event = definitions.events[0]!;
    const mutated = {
      ...definitions,
      events: [
        { ...event, choices: event.choices.map((choice) => ({ ...choice, neutral: false })) },
        ...definitions.events.slice(1),
      ],
    };
    const result = validateContent(mutated);
    expect(result.issues.map((issue) => issue.code)).toContain('EVENT_NEUTRAL_MISSING');
  });

  it('menolak kategori tanpa kementerian dan kategori ganda', () => {
    const raw = cloneRaw();
    const ministries = asRecordArray(raw.ministries);
    ministries[0]!.categories = ['SOCIAL'];
    expect(codes(raw)).toContain('CATEGORY_MINISTRY_MISSING');
    expect(codes(raw)).toContain('CATEGORY_MINISTRY_DUPLICATE');
  });

  it('menolak konflik melingkar', () => {
    const raw = cloneRaw();
    const policies = asRecordArray(raw.policies);
    policies[0]!.conflicts = [policies[1]!.id];
    policies[1]!.conflicts = [policies[0]!.id];
    expect(codes(raw)).toContain('CONFLICT_CYCLE');
  });

  it('menolak konflik terhadap diri sendiri', () => {
    const raw = cloneRaw();
    const policies = asRecordArray(raw.policies);
    policies[0]!.conflicts = [policies[0]!.id];
    expect(codes(raw)).toContain('SELF_CONFLICT');
  });

  it('menolak presisi indikator dua desimal', () => {
    const raw = cloneRaw();
    asRecord(asRecord(raw.scenario).initialIndicators).approval = 52.35;
    const result = parseRawContent(raw);
    expect(result.issues.some((issue) => issue.message.includes('1 angka desimal'))).toBe(true);
  });

  it('menolak presisi kas empat desimal', () => {
    const raw = cloneRaw();
    asRecord(raw.policies[0]).fiscalCostTrillion = 8.0001;
    const result = parseRawContent(raw);
    expect(result.issues.some((issue) => issue.message.includes('3 angka desimal'))).toBe(true);
  });
});
