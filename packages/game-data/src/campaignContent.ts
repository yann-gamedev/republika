import {
  BACKGROUND_NONE,
  PROMISE_COUNT,
  backgroundJsonSchema,
  candidateJsonSchema,
  leaderJsonSchema,
  parseArchetypeStat,
  promiseJsonSchema,
  provinceJsonSchema,
  toTenths,
  trillionToBillion,
  type BackgroundDefinition,
  type CandidateDefinition,
  type GameDefinitions,
  type LeaderDefinition,
  type PromiseDefinition,
  type ProvinceDefinition,
  type ValidationIssue,
} from '@republika/shared';
import { z } from 'zod';

/** Koleksi konten Tahap 6B yang sudah dikonversi ke satuan engine. */
export interface CampaignContent {
  readonly backgrounds: BackgroundDefinition[];
  readonly promises: PromiseDefinition[];
  readonly provinces: ProvinceDefinition[];
  readonly leaders: LeaderDefinition[];
  readonly candidates: CandidateDefinition[];
}

function byId<T extends { readonly id: string }>(left: T, right: T): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function parseArray<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): Array<z.infer<TSchema>> | undefined {
  if (input === undefined) return [];
  const result = z.array(schema).safeParse(input);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    const suffix = issue.path.length > 0 ? `.${issue.path.join('.')}` : '';
    issues.push({
      severity: 'error',
      code: 'SCHEMA_INVALID',
      path: `${path}${suffix}`,
      message: issue.message,
    });
  }
  return undefined;
}

/**
 * Parse + konversi lima koleksi 6B. Koleksi yang tidak ada di bundle dianggap
 * kosong. `undefined` bila ada error skema (detail di `issues`).
 */
export function parseCampaignContent(
  raw: {
    readonly backgrounds?: unknown;
    readonly promises?: unknown;
    readonly provinces?: unknown;
    readonly leaders?: unknown;
    readonly candidates?: unknown;
  },
  issues: ValidationIssue[],
): CampaignContent | undefined {
  const backgrounds = parseArray(backgroundJsonSchema, raw.backgrounds, 'backgrounds.json', issues);
  const promises = parseArray(promiseJsonSchema, raw.promises, 'promises.json', issues);
  const provinces = parseArray(provinceJsonSchema, raw.provinces, 'provinces.json', issues);
  const leaders = parseArray(leaderJsonSchema, raw.leaders, 'leaders.json', issues);
  const candidates = parseArray(
    candidateJsonSchema,
    raw.candidates,
    'cabinet-candidates.json',
    issues,
  );
  if (
    backgrounds === undefined ||
    promises === undefined ||
    provinces === undefined ||
    leaders === undefined ||
    candidates === undefined
  ) {
    return undefined;
  }
  return {
    backgrounds: backgrounds
      .map((item) => ({
        id: item.id,
        version: item.version,
        name: item.name,
        description: item.description,
        scene: item.scene,
        startModifiers: item.startModifiers.map((modifier) => ({
          target: modifier.target,
          deltaTenths: toTenths(modifier.delta),
        })),
        treasuryBillion: trillionToBillion(item.treasuryTrillion),
      }))
      .sort(byId),
    promises: promises.map((item) => ({ ...item, check: { ...item.check } })).sort(byId),
    provinces: provinces
      .map((item) => ({
        id: item.id,
        version: item.version,
        name: item.name,
        region: item.region,
        issue: item.issue,
        col: item.col,
        row: item.row,
        baseSatisfactionTenths: toTenths(item.baseSatisfaction),
        offsetTenths: toTenths(item.offset),
      }))
      .sort(byId),
    leaders: leaders.map((item) => ({ ...item })).sort(byId),
    candidates: candidates
      .map((item) => ({
        id: item.id,
        version: item.version,
        roleId: item.roleId,
        name: item.name,
        factionId: item.factionId,
        initial: item.initial,
        baseEffectiveness: item.baseEffectiveness ?? null,
        integrity: item.integrity,
        supportGainTenths: toTenths(item.supportGain),
        appearance: { ...item.appearance },
        bio: item.bio,
      }))
      .sort(byId),
  };
}

function error(code: string, path: string, message: string): ValidationIssue {
  return { severity: 'error', code, path, message };
}

/** Validasi silang konten 6B terhadap fraksi, kementerian, dan sesamanya. */
export function validateCampaignContent(definitions: GameDefinitions): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ministryIds = new Set(definitions.ministries.map((ministry) => ministry.id));
  const leaderIds = new Set(definitions.leaders.map((leader) => leader.id));
  const factionIds = new Set(definitions.factions.map((faction) => faction.id));

  if (definitions.backgrounds.some((item) => item.id === BACKGROUND_NONE)) {
    issues.push(
      error('RESERVED_ID', 'backgrounds.json', `${BACKGROUND_NONE} dicadangkan untuk save lama.`),
    );
  }
  if (definitions.promises.length > 0 && definitions.promises.length < PROMISE_COUNT) {
    issues.push(
      error(
        'PROMISES_TOO_FEW',
        'promises.json',
        `Minimal ${PROMISE_COUNT} janji agar pemain bisa memilih.`,
      ),
    );
  }
  for (const promise of definitions.promises) {
    if (parseArchetypeStat(promise.check.stat) === null) {
      issues.push(
        error(
          'UNKNOWN_STAT',
          `promises.${promise.id}`,
          `Statistik ${promise.check.stat} tidak dikenal.`,
        ),
      );
    }
  }

  const cells = new Map<string, string>();
  for (const province of definitions.provinces) {
    const key = `${province.col}:${province.row}`;
    const other = cells.get(key);
    if (other !== undefined) {
      issues.push(
        error(
          'PROVINCE_CELL_TAKEN',
          `provinces.${province.id}`,
          `Petak ${key} sudah dipakai ${other}.`,
        ),
      );
    }
    cells.set(key, province.id);
  }

  for (const id of leaderIds) {
    if (ministryIds.has(id))
      issues.push(
        error('ROLE_ID_CLASH', `leaders.${id}`, 'ID jabatan bentrok dengan kementerian.'),
      );
  }

  const roles = [...ministryIds, ...leaderIds];
  for (const candidate of definitions.candidates) {
    const path = `cabinet-candidates.${candidate.id}`;
    if (!ministryIds.has(candidate.roleId) && !leaderIds.has(candidate.roleId)) {
      issues.push(error('UNKNOWN_ROLE', path, `Jabatan ${candidate.roleId} tidak ada.`));
    }
    if (candidate.factionId !== null && !factionIds.has(candidate.factionId)) {
      issues.push(error('UNKNOWN_FACTION', path, `Fraksi ${candidate.factionId} tidak ada.`));
    }
    if (ministryIds.has(candidate.roleId) && candidate.baseEffectiveness === null) {
      issues.push(
        error('MISSING_EFFECTIVENESS', path, 'Calon menteri wajib punya baseEffectiveness.'),
      );
    }
  }
  if (definitions.candidates.length > 0) {
    for (const roleId of roles) {
      const initial = definitions.candidates.filter(
        (item) => item.roleId === roleId && item.initial,
      );
      if (initial.length !== 1) {
        issues.push(
          error(
            'INITIAL_HOLDER',
            `cabinet-candidates.${roleId}`,
            `Jabatan ${roleId} wajib punya tepat satu pejabat awal (initial: true).`,
          ),
        );
      }
    }
  }
  return issues;
}
