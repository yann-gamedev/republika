import { z } from 'zod';

import { INDICATOR_DOMAINS, type IndicatorKey } from '../types/indicators.js';
import { FACTION_ROLES, POLICY_CATEGORIES, type FactionRole } from '../types/constants.js';
import type { Indicators } from './indicators.js';
import type {
  BackgroundDefinition,
  CandidateDefinition,
  LeaderDefinition,
  PromiseDefinition,
  ProvinceDefinition,
} from './campaign.js';
import type { ConditionalModifier, EffectRule, Requirement } from './rules.js';
import {
  CONTROL_CHAR_PATTERN,
  colorSchema,
  decimalNumberSchema,
  flagSchema,
  idSchema,
  ideologyTagSchema,
  reasonCodeSchema,
  uniqueStrings,
  versionSchema,
} from './common.js';
import { effectTimingSchema } from './rules.js';
import { indicatorKeySchema } from './indicators.js';

const policyCategorySchema = z.enum(POLICY_CATEGORIES);
const indicatorValueSchema = decimalNumberSchema(-100, 100, 1, 'Nilai indikator');
const trillionSchema = decimalNumberSchema(-10_000, 10_000, 3, 'Nilai kas');
const nonNegativeTrillionSchema = decimalNumberSchema(0, 10_000, 3, 'Biaya kas');
const displayNumberSchema = (min: number, max: number, label: string) =>
  decimalNumberSchema(min, max, 3, label);

function indicatorDisplaySchema(key: IndicatorKey) {
  const domain = INDICATOR_DOMAINS[key];
  return decimalNumberSchema(domain.min, domain.max, 1, domain.label);
}

function indicatorRequirementObjectJsonSchema(type: 'INDICATOR_AT_LEAST' | 'INDICATOR_AT_MOST') {
  return z.object({
    type: z.literal(type),
    target: indicatorKeySchema,
    value: indicatorValueSchema,
  });
}

export const requirementJsonSchema = z
  .discriminatedUnion('type', [
    indicatorRequirementObjectJsonSchema('INDICATOR_AT_LEAST'),
    indicatorRequirementObjectJsonSchema('INDICATOR_AT_MOST'),
    z.object({
      type: z.literal('TREASURY_AT_LEAST'),
      valueTrillion: trillionSchema,
    }),
    z.object({
      type: z.literal('POLICY_ACTIVE'),
      policyId: idSchema,
    }),
    z.object({
      type: z.literal('POLICY_NOT_ACTIVE'),
      policyId: idSchema,
    }),
    z.object({
      type: z.literal('FLAG_SET'),
      flag: flagSchema,
    }),
    z.object({
      type: z.literal('FLAG_NOT_SET'),
      flag: flagSchema,
    }),
    z.object({
      type: z.literal('TURN_AT_LEAST'),
      value: z.number().int().min(1).max(100),
    }),
  ])
  .superRefine((requirement, context) => {
    if (requirement.type !== 'INDICATOR_AT_LEAST' && requirement.type !== 'INDICATOR_AT_MOST') {
      return;
    }
    const domain = INDICATOR_DOMAINS[requirement.target];
    if (requirement.value < domain.min || requirement.value > domain.max) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: `${domain.label} harus di antara ${domain.min} dan ${domain.max}.`,
      });
    }
  });

export type RequirementJson = z.infer<typeof requirementJsonSchema>;

export const effectJsonSchema = z
  .object({
    type: z.enum([
      'MODIFY_INDICATOR',
      'MODIFY_TREASURY',
      'CHANGE_FACTION_SUPPORT',
      'MODIFY_MINISTRY_EFFECTIVENESS',
      'SET_FLAG',
      'CLEAR_FLAG',
    ]),
    target: indicatorKeySchema.optional(),
    delta: indicatorValueSchema.optional(),
    deltaTrillion: trillionSchema.optional(),
    timing: effectTimingSchema.optional(),
    delayTurns: z.number().int().min(1).max(40).optional(),
    factionId: idSchema.optional(),
    ideologyTag: ideologyTagSchema.optional(),
    ministryId: idSchema.optional(),
    flag: flagSchema.optional(),
    reasonCode: reasonCodeSchema,
  })
  .superRefine((effect, context) => {
    if (effect.type === 'MODIFY_INDICATOR') {
      if (effect.target === undefined || effect.delta === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MODIFY_INDICATOR wajib memiliki target dan delta.',
        });
      }
      if (effect.timing === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['timing'],
          message: 'MODIFY_INDICATOR wajib memiliki timing.',
        });
      }
      if (effect.timing === 'DELAYED' && effect.delayTurns === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['delayTurns'],
          message: 'Efek DELAYED wajib memiliki delayTurns.',
        });
      }
      if (effect.timing !== 'DELAYED' && effect.delayTurns !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['delayTurns'],
          message: 'delayTurns hanya boleh diisi untuk efek DELAYED.',
        });
      }
    }
    if (effect.type === 'MODIFY_TREASURY' && effect.deltaTrillion === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deltaTrillion'],
        message: 'MODIFY_TREASURY wajib memiliki deltaTrillion.',
      });
    }
    if (effect.type === 'CHANGE_FACTION_SUPPORT') {
      const hasFaction = effect.factionId !== undefined;
      const hasTag = effect.ideologyTag !== undefined;
      if (hasFaction === hasTag) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CHANGE_FACTION_SUPPORT wajib memilih salah satu: factionId atau ideologyTag.',
        });
      }
      if (effect.delta === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['delta'],
          message: 'CHANGE_FACTION_SUPPORT wajib memiliki delta.',
        });
      }
    }
    if (effect.type === 'MODIFY_MINISTRY_EFFECTIVENESS') {
      if (effect.ministryId === undefined || effect.delta === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MODIFY_MINISTRY_EFFECTIVENESS wajib memiliki ministryId dan delta.',
        });
      }
      if (effect.delta !== undefined && !Number.isInteger(effect.delta)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['delta'],
          message: 'Perubahan effectiveness harus bilangan bulat.',
        });
      }
    }
    if ((effect.type === 'SET_FLAG' || effect.type === 'CLEAR_FLAG') && effect.flag === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['flag'],
        message: `${effect.type} wajib memiliki flag.`,
      });
    }
  });

export type EffectJson = z.infer<typeof effectJsonSchema>;

export const conditionalModifierJsonSchema = z.object({
  when: z.array(requirementJsonSchema).min(1, 'Modifier membutuhkan minimal satu syarat.'),
  appliesTo: indicatorKeySchema,
  multiplier: decimalNumberSchema(0.1, 3, 2, 'Pengali'),
});

export type ConditionalModifierJson = z.infer<typeof conditionalModifierJsonSchema>;

export const policyJsonSchema = z.object({
  id: idSchema,
  version: versionSchema,
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(400),
  category: policyCategorySchema,
  apCost: z.number().int().min(1).max(5),
  fiscalCostTrillion: nonNegativeTrillionSchema,
  perTurnCostTrillion: nonNegativeTrillionSchema,
  needsVote: z.boolean(),
  durationTurns: z.number().int().min(1).max(40),
  cooldownTurns: z.number().int().min(0).max(40),
  requirements: z.array(requirementJsonSchema).default([]),
  conflicts: z.array(idSchema).default([]),
  effects: z.array(effectJsonSchema).min(1, 'Kebijakan membutuhkan minimal satu efek.'),
  modifiers: z.array(conditionalModifierJsonSchema).default([]),
});

export type PolicyJson = z.infer<typeof policyJsonSchema>;

/** Nama tokoh fiktif: 3–60 karakter, tanpa karakter kontrol. */
const personNameSchema = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .refine(
    (value) => !CONTROL_CHAR_PATTERN.test(value),
    'Nama tokoh tidak boleh berisi karakter kontrol.',
  );

const factionLeadershipSchema = z
  .array(z.object({ role: z.enum(FACTION_ROLES), name: personNameSchema }))
  .max(FACTION_ROLES.length)
  .default([])
  .refine(
    (items) => new Set(items.map((item) => item.role)).size === items.length,
    'Setiap jabatan pengurus hanya boleh diisi satu orang.',
  );

export const factionJsonSchema = z.object({
  id: idSchema,
  version: versionSchema,
  name: z.string().trim().min(3).max(80),
  shortName: z.string().trim().min(1).max(8),
  seats: z.number().int().min(0).max(100),
  color: colorSchema,
  ideologyTags: z.array(ideologyTagSchema).min(1),
  baseSupport: decimalNumberSchema(0, 100, 1, 'Dukungan dasar'),
  initialSupport: decimalNumberSchema(0, 100, 1, 'Dukungan awal'),
  policyPreferences: z.object({
    FISCAL: z.number().int().min(-2).max(2),
    SOCIAL: z.number().int().min(-2).max(2),
    ENERGY: z.number().int().min(-2).max(2),
    GOVERNANCE: z.number().int().min(-2).max(2),
  }),
  description: z.string().trim().max(400),
  /** Pengurus partai fiktif. Hanya tampilan; tidak memengaruhi simulasi. */
  leadership: factionLeadershipSchema,
  /** Anggota parlemen fiktif yang ditonjolkan. Hanya tampilan. */
  members: z.array(personNameSchema).max(12).default([]),
});

export type FactionJson = z.infer<typeof factionJsonSchema>;

export const ministryJsonSchema = z.object({
  id: idSchema,
  version: versionSchema,
  name: z.string().trim().min(3).max(80),
  categories: z
    .array(policyCategorySchema)
    .min(1)
    .refine(uniqueStrings, 'Kategori kementerian tidak boleh duplikat.'),
  initialEffectiveness: z.number().int().min(40).max(90),
});

export type MinistryJson = z.infer<typeof ministryJsonSchema>;

export const eventChoiceJsonSchema = z.object({
  id: z.string().min(1).max(20),
  label: z.string().trim().min(3).max(120),
  hint: z.string().trim().max(200).optional(),
  neutral: z.boolean().default(false),
  effects: z.array(effectJsonSchema).default([]),
});

export type EventChoiceJson = z.infer<typeof eventChoiceJsonSchema>;

export const eventJsonSchema = z
  .object({
    id: idSchema,
    version: versionSchema,
    title: z.string().trim().min(3).max(120),
    body: z.string().trim().min(10).max(2000),
    eligibility: z.array(requirementJsonSchema).default([]),
    triggerWeight: z.number().int().min(1).max(1000),
    cooldownTurns: z.number().int().min(0).max(40),
    uniquePerCampaign: z.boolean().default(false),
    choices: z.array(eventChoiceJsonSchema).min(1, 'Event membutuhkan minimal satu opsi.'),
  })
  .superRefine((event, context) => {
    if (!event.choices.some((choice) => choice.neutral)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['choices'],
        message: 'Setiap event wajib punya minimal satu opsi dengan "neutral": true.',
      });
    }
    if (!uniqueStrings(event.choices.map((choice) => choice.id))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['choices'],
        message: 'ID opsi event tidak boleh duplikat.',
      });
    }
  });

export type EventJson = z.infer<typeof eventJsonSchema>;

export const archetypeConditionJsonSchema = z.object({
  stat: z
    .string()
    .regex(
      /^(final|avg|min|max|count|total)\.[A-Za-z][A-Za-z0-9.]*$/,
      'Statistik arketipe harus berformat final.*, avg.*, min.*, max.*, count.*, atau total.*.',
    ),
  op: z.enum(['>=', '>', '<=', '<', '==']),
  value: z.number().finite(),
});

export type ArchetypeCondition = z.infer<typeof archetypeConditionJsonSchema>;

export const archetypeJsonSchema = z.object({
  id: idSchema,
  version: versionSchema,
  priority: z.number().int().min(-1000).max(1000),
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(400),
  conditions: z.array(archetypeConditionJsonSchema).default([]),
});

export type ArchetypeDefinition = z.infer<typeof archetypeJsonSchema>;

export const initialIndicatorsJsonSchema = z.object({
  approval: indicatorDisplaySchema('approval'),
  stability: indicatorDisplaySchema('stability'),
  fiscalHealth: indicatorDisplaySchema('fiscalHealth'),
  growthPct: indicatorDisplaySchema('growthPct'),
  inflationPct: indicatorDisplaySchema('inflationPct'),
  unemploymentPct: indicatorDisplaySchema('unemploymentPct'),
  welfare: indicatorDisplaySchema('welfare'),
  trust: indicatorDisplaySchema('trust'),
});

export const scenarioJsonSchema = z.object({
  rulesetVersion: versionSchema,
  maxTurns: z.number().int().min(1).max(100),
  actionPointsPerTurn: z.number().int().min(1).max(5),
  maxEventsPerQuarter: z.number().int().min(0).max(5),
  lobbyCostTrillion: nonNegativeTrillionSchema,
  lobbySupportBonus: z.number().int().min(0).max(100),
  startYear: z.number().int().min(2000).max(2200),
  initialIndicators: initialIndicatorsJsonSchema,
  initialTreasuryTrillion: nonNegativeTrillionSchema,
});

export type ScenarioJson = z.infer<typeof scenarioJsonSchema>;

export const baselineJsonSchema = z.object({
  inflationTargetPct: displayNumberSchema(-5, 50, 'Target inflasi'),
  inflationReversion: decimalNumberSchema(0, 1, 3, 'Reversi inflasi'),
  growthTargetPct: displayNumberSchema(-10, 15, 'Target pertumbuhan'),
  growthReversion: decimalNumberSchema(0, 1, 3, 'Reversi pertumbuhan'),
  okunCoefficient: decimalNumberSchema(0, 5, 3, 'Koefisien Okun'),
  okunNeutralGrowthPct: displayNumberSchema(-10, 15, 'Pertumbuhan netral Okun'),
  approvalAnchor: decimalNumberSchema(0, 100, 3, 'Jangkar persetujuan'),
  approvalReversion: decimalNumberSchema(0, 1, 3, 'Reversi persetujuan'),
  baseRevenueTrillionPerTurn: nonNegativeTrillionSchema,
  baseSpendingTrillionPerTurn: nonNegativeTrillionSchema,
  negativeTreasuryFiscalHealthPenalty: decimalNumberSchema(0, 20, 3, 'Penalti kas negatif'),
  factionSupportReversion: decimalNumberSchema(0, 1, 3, 'Reversi dukungan fraksi'),
  /**
   * Pengaruh persetujuan publik terhadap dukungan semua fraksi per kuartal:
   * Δ dukungan += pengaruh × (persetujuan − jangkar). Opsional; default 0,05.
   */
  factionApprovalInfluence: decimalNumberSchema(0, 1, 3, 'Pengaruh persetujuan ke fraksi').default(
    0.05,
  ),
});

export type BaselineJson = z.infer<typeof baselineJsonSchema>;

export interface ScenarioDefinition {
  readonly rulesetVersion: number;
  readonly maxTurns: number;
  readonly actionPointsPerTurn: number;
  readonly maxEventsPerQuarter: number;
  readonly lobbyCostBillion: number;
  readonly lobbySupportBonusTenths: number;
  readonly startYear: number;
  readonly initialIndicators: Indicators;
  readonly initialTreasuryBillion: number;
}

export interface BaselineParams {
  readonly inflationTargetTenths: number;
  readonly inflationReversion: number;
  readonly growthTargetTenths: number;
  readonly growthReversion: number;
  readonly okunCoefficient: number;
  readonly okunNeutralGrowthTenths: number;
  readonly approvalAnchorTenths: number;
  readonly approvalReversion: number;
  readonly baseRevenueBillion: number;
  readonly baseSpendingBillion: number;
  readonly negativeTreasuryFiscalHealthPenaltyTenths: number;
  readonly factionSupportReversion: number;
  readonly factionApprovalInfluence: number;
}

export interface PolicyDefinition {
  readonly id: string;
  readonly version: number;
  readonly name: string;
  readonly description: string;
  readonly category: (typeof POLICY_CATEGORIES)[number];
  readonly apCost: number;
  readonly fiscalCostBillion: number;
  readonly perTurnCostBillion: number;
  readonly needsVote: boolean;
  readonly durationTurns: number;
  readonly cooldownTurns: number;
  readonly requirements: readonly Requirement[];
  readonly conflicts: readonly string[];
  readonly effects: readonly EffectRule[];
  readonly modifiers: readonly ConditionalModifier[];
}

export interface FactionDefinition {
  readonly id: string;
  readonly version: number;
  readonly name: string;
  readonly shortName: string;
  readonly seats: number;
  readonly color: string;
  readonly ideologyTags: readonly string[];
  readonly baseSupportTenths: number;
  readonly initialSupportTenths: number;
  readonly policyPreferences: Readonly<Record<(typeof POLICY_CATEGORIES)[number], number>>;
  readonly description: string;
  readonly leadership: ReadonlyArray<{ readonly role: FactionRole; readonly name: string }>;
  readonly members: readonly string[];
}

export interface MinistryDefinition {
  readonly id: string;
  readonly version: number;
  readonly name: string;
  readonly categories: readonly (typeof POLICY_CATEGORIES)[number][];
  readonly initialEffectiveness: number;
}

export interface EventChoice {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly neutral: boolean;
  readonly effects: readonly EffectRule[];
}

export interface EventDefinition {
  readonly id: string;
  readonly version: number;
  readonly title: string;
  readonly body: string;
  readonly eligibility: readonly Requirement[];
  readonly triggerWeight: number;
  readonly cooldownTurns: number;
  readonly uniquePerCampaign: boolean;
  readonly choices: readonly EventChoice[];
}

export interface GameDefinitions {
  readonly scenario: ScenarioDefinition;
  readonly baseline: BaselineParams;
  readonly factions: readonly FactionDefinition[];
  readonly ministries: readonly MinistryDefinition[];
  readonly policies: readonly PolicyDefinition[];
  readonly events: readonly EventDefinition[];
  readonly archetypes: readonly ArchetypeDefinition[];
  /** Tahap 6B — koleksi boleh kosong. */
  readonly backgrounds: readonly BackgroundDefinition[];
  readonly promises: readonly PromiseDefinition[];
  readonly provinces: readonly ProvinceDefinition[];
  readonly leaders: readonly LeaderDefinition[];
  readonly candidates: readonly CandidateDefinition[];
}

export interface RawContentBundle {
  readonly scenario: unknown;
  readonly baseline: unknown;
  readonly factions: readonly unknown[];
  readonly ministries: unknown;
  readonly policies: readonly unknown[];
  readonly events: readonly unknown[];
  readonly archetypes: unknown;
  /** Tahap 6B (opsional; tidak ada = koleksi kosong). */
  readonly backgrounds?: unknown;
  readonly promises?: unknown;
  readonly provinces?: unknown;
  readonly leaders?: unknown;
  readonly candidates?: unknown;
}

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  readonly severity: ValidationSeverity;
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface LoadedGameContent {
  readonly definitions: GameDefinitions;
  readonly contentHash: string;
  readonly warnings: readonly ValidationIssue[];
}
