import { z } from 'zod';

import { SAVE_FORMAT_VERSION, UI_SCALES } from '../types/constants.js';
import { appVersionSchema, idSchema, isoDateTimeSchema, versionSchema } from './common.js';
import { gameStateSchema, ledgerEntrySchema, turnReportSchema } from './state.js';

export const saveHistorySchema = z.object({
  reports: z.array(turnReportSchema),
  ledger: z.array(ledgerEntrySchema),
});

export type SaveHistory = z.infer<typeof saveHistorySchema>;

export const saveFileSchema = z
  .object({
    saveFormatVersion: z.literal(SAVE_FORMAT_VERSION),
    appVersion: appVersionSchema,
    rulesetVersion: versionSchema,
    contentHash: z.string().min(8).max(128),
    savedAt: isoDateTimeSchema,
    label: z.string().trim().min(1).max(80),
    state: gameStateSchema,
    history: saveHistorySchema,
  })
  .superRefine((save, context) => {
    if (save.state.rulesetVersion !== save.rulesetVersion) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rulesetVersion'],
        message: 'rulesetVersion save harus sama dengan state.rulesetVersion.',
      });
    }
    if (save.history.reports.length > save.state.maxTurns) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['history', 'reports'],
        message: 'Jumlah laporan melebihi maxTurns.',
      });
    }
  });

export type SaveFile = z.infer<typeof saveFileSchema>;

export const uiScaleSchema = z.union([
  z.literal(UI_SCALES[0]),
  z.literal(UI_SCALES[1]),
  z.literal(UI_SCALES[2]),
  z.literal(UI_SCALES[3]),
]);

export type UiScaleValue = z.infer<typeof uiScaleSchema>;

export const settingsSchema = z.object({
  uiScale: uiScaleSchema.default(100),
  fullscreen: z.boolean().default(false),
  lastRunAppVersion: appVersionSchema.default('0.1.0'),
  askedAboutPreviousVersion: z.boolean().default(false),
});

export type Settings = z.infer<typeof settingsSchema>;

export const saveSlotIdSchema = z.union([
  z.literal('autosave'),
  z.literal('slot-1'),
  z.literal('slot-2'),
  z.literal('slot-3'),
  z.literal('slot-4'),
  z.literal('slot-5'),
]);

export type SaveSlotId = z.infer<typeof saveSlotIdSchema>;

/** Ringkasan satu slot untuk layar Simpan & Muat. Field opsional bila save rusak. */
export const saveSlotInfoSchema = z.object({
  slot: saveSlotIdSchema,
  hasBackup: z.boolean(),
  isCorrupt: z.boolean(),
  label: z.string().min(1).max(80).optional(),
  savedAt: isoDateTimeSchema.optional(),
  appVersion: appVersionSchema.optional(),
  turn: z.number().int().min(1).max(100).optional(),
  maxTurns: z.number().int().min(1).max(100).optional(),
  completed: z.boolean().optional(),
  presidentName: z.string().min(2).max(40).optional(),
  cabinetName: z.string().max(40).optional(),
  rulesetVersion: versionSchema.optional(),
  /** Persetujuan, kesehatan fiskal, kepercayaan (persepuluhan). */
  summary: z
    .object({ approval: z.number().int(), fiscalHealth: z.number().int(), trust: z.number().int() })
    .optional(),
});

export type SaveSlotInfo = z.infer<typeof saveSlotInfoSchema>;

export const importableSaveFileSchema = z.object({
  fileName: z.string().min(1).max(255),
  save: saveFileSchema,
  sourceRulesetVersion: versionSchema,
});

export type ImportableSaveFile = z.infer<typeof importableSaveFileSchema>;

export const rulesetMigrationMapSchema = z.object({
  fromRuleset: versionSchema,
  toRuleset: versionSchema,
  renamed: z.record(idSchema, idSchema).default({}),
  removed: z.array(idSchema).default([]),
});

export type RulesetMigrationMap = z.infer<typeof rulesetMigrationMapSchema>;
