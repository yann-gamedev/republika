import { z } from 'zod';

import {
  BACKGROUND_NONE,
  GAME_STATE_VERSION,
  HONORIFICS,
  PORTRAIT_HEADS,
  PROMISE_COUNT,
  PROVINCE_ACTIONS,
} from '../types/constants.js';
import {
  commandIdSchema,
  flagSchema,
  idSchema,
  presidentNameSchema,
  uniqueStrings,
  versionSchema,
} from './common.js';
import { indicatorsSchema } from './indicators.js';
import { effectRuleSchema } from './rules.js';

const nonNegativeInt = z.number().int().min(0);
const supportTenths = z.number().int().min(0).max(1000);
const effectiveness = z.number().int().min(40).max(90);

export const factionStateSchema = z.object({
  factionId: idSchema,
  supportTenths,
});

export type FactionState = z.infer<typeof factionStateSchema>;

export const ministryStateSchema = z.object({
  ministryId: idSchema,
  effectiveness,
});

export type MinistryState = z.infer<typeof ministryStateSchema>;

export const activePolicySchema = z.object({
  policyId: idSchema,
  enactedTurn: z.number().int().min(1).max(100),
  remainingTurns: nonNegativeInt.max(100),
  perTurnCostBillion: nonNegativeInt,
  /** Turn terakhir efek PER_TURN dijalankan; mencegah efek ganda dalam satu turn. */
  lastTickedTurn: nonNegativeInt.max(100),
});

export type ActivePolicy = z.infer<typeof activePolicySchema>;

export const pendingCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ENACT_POLICY'),
    commandId: commandIdSchema,
    policyId: idSchema,
    apCost: nonNegativeInt.max(5),
  }),
  z.object({
    type: z.literal('LOBBY_FACTION'),
    commandId: commandIdSchema,
    factionId: idSchema,
    apCost: nonNegativeInt.max(5),
  }),
  z.object({
    type: z.literal('RESHUFFLE'),
    commandId: commandIdSchema,
    roleId: idSchema,
    candidateId: idSchema,
    apCost: nonNegativeInt.max(5),
  }),
]);

/** Profil presiden (Tahap 6B.1). Sapaan dan potret kosmetik; latar belakang memengaruhi awal kampanye. */
export const presidentProfileSchema = z.object({
  honorific: z.enum(HONORIFICS),
  head: z.enum(PORTRAIT_HEADS),
  backgroundId: idSchema,
});

export type PresidentProfile = z.infer<typeof presidentProfileSchema>;

export const officeHolderSchema = z.object({ holderId: idSchema });

export const provinceStateSchema = z.object({
  satisfactionTenths: z.number().int().min(0).max(1000),
  /** Aksi yang diantrekan kuartal ini (satu per jenis). */
  actionsThisTurn: z.array(z.enum(PROVINCE_ACTIONS)),
});

export type ProvinceState = z.infer<typeof provinceStateSchema>;

export const DEFAULT_PRESIDENT_PROFILE: PresidentProfile = {
  honorific: 'Bapak',
  head: 'peci',
  backgroundId: BACKGROUND_NONE,
};

export type PendingCommand = z.infer<typeof pendingCommandSchema>;

export const pendingEventSchema = z.object({
  eventId: idSchema,
  arrivedTurn: z.number().int().min(1).max(100),
  resolvedChoiceId: z.string().min(1).max(20).nullable().default(null),
});

export type PendingEvent = z.infer<typeof pendingEventSchema>;

export const delayedEffectSchema = z.object({
  sourceType: z.enum(['POLICY', 'EVENT']),
  sourceId: idSchema,
  /** Turn saat efek dijadwalkan; hitung mundur dimulai turn berikutnya. */
  createdTurn: z.number().int().min(1).max(100),
  remainingTurns: z.number().int().min(1).max(40),
  effect: effectRuleSchema,
});

export type DelayedEffect = z.infer<typeof delayedEffectSchema>;

const indicatorRecordSchema = z.object({
  approval: z.number().int(),
  stability: z.number().int(),
  fiscalHealth: z.number().int(),
  growthPct: z.number().int(),
  inflationPct: z.number().int(),
  unemploymentPct: z.number().int(),
  welfare: z.number().int(),
  trust: z.number().int(),
});

export const campaignStatsSchema = z.object({
  policiesEnacted: nonNegativeInt,
  policiesByCategory: z.object({
    FISCAL: nonNegativeInt,
    SOCIAL: nonNegativeInt,
    ENERGY: nonNegativeInt,
    GOVERNANCE: nonNegativeInt,
  }),
  votesHeld: nonNegativeInt,
  votesFailed: nonNegativeInt,
  lobbies: nonNegativeInt,
  eventsResolved: nonNegativeInt,
  totalDeficitBillion: z.number().int(),
  totalPolicySpendingBillion: nonNegativeInt,
  /** Jumlah kuartal yang sudah diresolusi (pembagi rata-rata). */
  quartersPlayed: nonNegativeInt,
  /** Jumlah nilai akhir kuartal per indikator (persepuluhan), untuk rata-rata. */
  indicatorSums: indicatorRecordSchema,
  /** Nilai terendah/tertinggi per indikator, termasuk nilai awal kampanye. */
  indicatorMin: indicatorRecordSchema,
  indicatorMax: indicatorRecordSchema,
});

export type CampaignStats = z.infer<typeof campaignStatsSchema>;

export const flagsSchema = z.array(flagSchema).refine(uniqueStrings, 'Flag tidak boleh duplikat.');

export const gameStateSchema = z
  .object({
    stateVersion: z.literal(GAME_STATE_VERSION),
    presidentName: presidentNameSchema,
    cabinetName: z.string().trim().max(40).optional(),
    rulesetVersion: versionSchema,
    rulesetMigratedFrom: versionSchema.optional(),
    /** Seed PRNG kampanye; stream per turn = `seed:turn`. */
    seed: z.string().min(1).max(100),
    turn: z.number().int().min(1).max(100),
    maxTurns: z.number().int().min(1).max(100),
    status: z.enum(['active', 'completed']),
    actionPointsPerTurn: z.number().int().min(1).max(5),
    actionPointsRemaining: z.number().int().min(0).max(5),
    treasuryBillion: z.number().int().min(-1_000_000).max(1_000_000),
    indicators: indicatorsSchema,
    factions: z.array(factionStateSchema).min(1),
    ministries: z.array(ministryStateSchema).min(1),
    activePolicies: z.array(activePolicySchema),
    pendingCommands: z.array(pendingCommandSchema),
    pendingEvents: z.array(pendingEventSchema),
    lobbyThisTurn: z.array(idSchema),
    /** commandId yang sudah diterima pada turn berjalan; dikosongkan tiap akhir kuartal. */
    commandIdsThisTurn: z.array(commandIdSchema),
    policyCooldowns: z.record(z.string(), nonNegativeInt),
    eventCooldowns: z.record(z.string(), nonNegativeInt),
    /** Event yang pernah muncul di kampanye ini (untuk `uniquePerCampaign`). */
    eventsFired: z.array(idSchema),
    flags: flagsSchema,
    delayedEffects: z.array(delayedEffectSchema),
    campaignStats: campaignStatsSchema,
    archetypeId: idSchema.optional(),
    // Tahap 6B (format save v3).
    president: presidentProfileSchema,
    /** Janji kampanye: tepat 3, atau kosong untuk save lama (janji tidak dinilai). */
    promiseIds: z.array(idSchema).max(PROMISE_COUNT),
    /** Pemegang jabatan menteri per `ministryId`. */
    cabinet: z.record(z.string(), officeHolderSchema),
    /** Pemegang jabatan pimpinan non-kementerian per `roleId`. */
    leaders: z.record(z.string(), officeHolderSchema),
    /** Kuartal terakhir reshuffle diproses (0 = belum pernah). Maks. 1 per kuartal (K6). */
    reshuffleUsedTurn: z.number().int().min(0).max(100),
    provinces: z.record(z.string(), provinceStateSchema),
  })
  .superRefine((state, context) => {
    if (state.actionPointsRemaining > state.actionPointsPerTurn) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actionPointsRemaining'],
        message: 'Sisa AP tidak boleh melebihi AP per kuartal.',
      });
    }
    if (state.turn > state.maxTurns) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['turn'],
        message: 'Turn tidak boleh melebihi maxTurns.',
      });
    }
    if (!uniqueStrings(state.factions.map((faction) => faction.factionId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['factions'],
        message: 'FactionState tidak boleh duplikat.',
      });
    }
    if (!uniqueStrings(state.ministries.map((ministry) => ministry.ministryId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ministries'],
        message: 'MinistryState tidak boleh duplikat.',
      });
    }
    if (!uniqueStrings(state.activePolicies.map((policy) => policy.policyId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['activePolicies'],
        message: 'Kebijakan aktif tidak boleh duplikat.',
      });
    }
    if (!uniqueStrings(state.pendingCommands.map((command) => command.commandId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pendingCommands'],
        message: 'ID command pending tidak boleh duplikat.',
      });
    }
    if (!uniqueStrings(state.pendingEvents.map((event) => event.eventId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pendingEvents'],
        message: 'Event pending tidak boleh duplikat.',
      });
    }
    if (!uniqueStrings(state.lobbyThisTurn)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lobbyThisTurn'],
        message: 'Satu fraksi hanya boleh dilobi sekali per kuartal.',
      });
    }
    if (
      state.rulesetMigratedFrom !== undefined &&
      state.rulesetMigratedFrom >= state.rulesetVersion
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rulesetMigratedFrom'],
        message: 'rulesetMigratedFrom harus lebih kecil dari rulesetVersion.',
      });
    }
  });

export type GameState = z.infer<typeof gameStateSchema>;

export const ledgerKindSchema = z.enum([
  'PROVINCE',
  'CABINET',
  'INDICATOR',
  'TREASURY',
  'FACTION',
  'MINISTRY',
  'POLICY',
  'VOTE',
  'EVENT',
  'FLAG',
  'SYSTEM',
]);

export type LedgerKind = z.infer<typeof ledgerKindSchema>;

export const ledgerSourceTypeSchema = z.enum([
  'POLICY',
  'EVENT',
  'LOBBY',
  'VOTE',
  'BASELINE',
  'MINISTRY',
  'SYSTEM',
  'RESHUFFLE',
  'PROVINCE',
  'BACKGROUND',
]);

export type LedgerSourceType = z.infer<typeof ledgerSourceTypeSchema>;

/** Satuan nilai before/delta/after: persepuluhan, miliar, poin effectiveness, atau flag (0/1). */
export const ledgerUnitSchema = z.enum(['tenths', 'billion', 'points', 'flag']);

export type LedgerUnit = z.infer<typeof ledgerUnitSchema>;

export const ledgerEntrySchema = z.object({
  id: z.string().min(1).max(100),
  turn: z.number().int().min(1).max(100),
  /** Urutan penerapan dalam satu turn, mulai 0. */
  order: z.number().int().min(0),
  kind: ledgerKindSchema,
  sourceType: ledgerSourceTypeSchema,
  sourceId: z.string().min(1).max(64).optional(),
  reasonCode: z.string().min(1).max(64),
  /** Indikator, factionId, ministryId, flag, atau `treasury`. */
  target: z.string().min(1).max(64).optional(),
  unit: ledgerUnitSchema.optional(),
  before: z.number().int().optional(),
  delta: z.number().int().optional(),
  after: z.number().int().optional(),
  message: z.string().max(300).optional(),
});

export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

export const voteOutcomeSchema = z.object({
  policyId: idSchema,
  seatsFor: z.number().int().min(0).max(100),
  seatsAgainst: z.number().int().min(0).max(100),
  passed: z.boolean(),
  factionVotes: z.array(
    z.object({
      factionId: idSchema,
      supportTenths,
      score: z.number().int(),
      vote: z.enum(['FOR', 'AGAINST']),
    }),
  ),
});

export type VoteOutcome = z.infer<typeof voteOutcomeSchema>;

export const resolvedEventSchema = z.object({
  eventId: idSchema,
  choiceId: z.string().min(1).max(20),
});

export const indicatorCauseSchema = z.object({
  sourceType: ledgerSourceTypeSchema,
  sourceId: z.string().min(1).max(64).optional(),
  reasonCode: z.string().min(1).max(64),
  deltaTenths: z.number().int(),
});

export type IndicatorCause = z.infer<typeof indicatorCauseSchema>;

const indicatorDeltasSchema = z.object({
  approval: z.number().int(),
  stability: z.number().int(),
  fiscalHealth: z.number().int(),
  growthPct: z.number().int(),
  inflationPct: z.number().int(),
  unemploymentPct: z.number().int(),
  welfare: z.number().int(),
  trust: z.number().int(),
});

const indicatorCausesSchema = z.object({
  approval: z.array(indicatorCauseSchema).max(3),
  stability: z.array(indicatorCauseSchema).max(3),
  fiscalHealth: z.array(indicatorCauseSchema).max(3),
  growthPct: z.array(indicatorCauseSchema).max(3),
  inflationPct: z.array(indicatorCauseSchema).max(3),
  unemploymentPct: z.array(indicatorCauseSchema).max(3),
  welfare: z.array(indicatorCauseSchema).max(3),
  trust: z.array(indicatorCauseSchema).max(3),
});

export const turnReportSchema = z.object({
  turn: z.number().int().min(1).max(100),
  year: z.number().int().min(2000).max(2200),
  quarter: z.number().int().min(1).max(4),
  presidentName: z.string().min(2).max(40),
  indicatorsBefore: indicatorsSchema,
  indicatorsAfter: indicatorsSchema,
  treasuryBeforeBillion: z.number().int(),
  treasuryAfterBillion: z.number().int(),
  treasuryDeltaBillion: z.number().int(),
  indicatorDeltas: indicatorDeltasSchema,
  /** Maksimal 3 penyebab terbesar (|delta|) per indikator dari ledger. */
  topCauses: indicatorCausesSchema,
  /** Dukungan tiap fraksi sebelum/sesudah kuartal (untuk tren di UI). */
  factionSupport: z.array(
    z.object({ factionId: idSchema, beforeTenths: supportTenths, afterTenths: supportTenths }),
  ),
  policiesPassed: z.array(idSchema),
  policiesFailed: z.array(idSchema),
  ledger: z.array(ledgerEntrySchema),
  votes: z.array(voteOutcomeSchema),
  resolvedEvents: z.array(resolvedEventSchema),
  nextEventIds: z.array(idSchema),
  summary: z.array(z.string().max(300)).max(20),
});

export type TurnReport = z.infer<typeof turnReportSchema>;

export const policyCategoryCountsSchema = z.object({
  FISCAL: nonNegativeInt,
  SOCIAL: nonNegativeInt,
  ENERGY: nonNegativeInt,
  GOVERNANCE: nonNegativeInt,
});
