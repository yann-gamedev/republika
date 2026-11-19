import { z } from 'zod';

import { PORTRAIT_HEADS } from '../types/constants.js';
import type { IndicatorKey } from '../types/indicators.js';
import { colorSchema, decimalNumberSchema, idSchema, versionSchema } from './common.js';
import { archetypeConditionJsonSchema, type ArchetypeCondition } from './content.js';
import { indicatorKeySchema } from './indicators.js';

/**
 * Konten Tahap 6B: latar belakang presiden, janji kampanye, provinsi, jabatan
 * pimpinan, dan calon pejabat. Semua koleksi opsional (default kosong) agar
 * konten lama tetap valid; engine menoleransi koleksi kosong.
 */

const personNameSchema = z.string().trim().min(3).max(60);
const sceneKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{1,40}$/, 'Kunci adegan harus huruf kecil dengan tanda hubung.');

export const appearanceJsonSchema = z.object({
  head: z.enum(PORTRAIT_HEADS),
  skin: colorSchema,
  suit: colorSchema,
  accent: colorSchema,
  glasses: z.boolean().default(false),
});

export type Appearance = z.infer<typeof appearanceJsonSchema>;

export const backgroundJsonSchema = z.object({
  id: idSchema,
  version: versionSchema,
  name: z.string().trim().min(3).max(60),
  description: z.string().trim().max(300),
  scene: sceneKeySchema,
  startModifiers: z
    .array(
      z.object({
        target: indicatorKeySchema,
        delta: decimalNumberSchema(-20, 20, 1, 'Modifier latar belakang'),
      }),
    )
    .max(6),
  treasuryTrillion: decimalNumberSchema(-100, 100, 3, 'Kas latar belakang').default(0),
});

export type BackgroundJson = z.infer<typeof backgroundJsonSchema>;

export interface BackgroundDefinition {
  readonly id: string;
  readonly version: number;
  readonly name: string;
  readonly description: string;
  readonly scene: string;
  readonly startModifiers: ReadonlyArray<{
    readonly target: IndicatorKey;
    readonly deltaTenths: number;
  }>;
  readonly treasuryBillion: number;
}

export const promiseJsonSchema = z.object({
  id: idSchema,
  version: versionSchema,
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(300),
  /** Dinilai pada state akhir kampanye dengan statistik yang sama seperti arketipe. */
  check: archetypeConditionJsonSchema,
});

export interface PromiseDefinition {
  readonly id: string;
  readonly version: number;
  readonly name: string;
  readonly description: string;
  readonly check: ArchetypeCondition;
}

export const provinceJsonSchema = z.object({
  id: idSchema,
  version: versionSchema,
  name: z.string().trim().min(3).max(60),
  region: z.string().trim().min(3).max(40),
  issue: z.string().trim().max(160),
  col: z.number().int().min(1).max(17),
  row: z.number().int().min(1).max(7),
  baseSatisfaction: decimalNumberSchema(0, 100, 1, 'Kepuasan awal provinsi'),
  /** Selisih kepuasan provinsi terhadap persetujuan nasional (titik tuju drift). */
  offset: decimalNumberSchema(-30, 30, 1, 'Offset provinsi'),
});

export interface ProvinceDefinition {
  readonly id: string;
  readonly version: number;
  readonly name: string;
  readonly region: string;
  readonly issue: string;
  readonly col: number;
  readonly row: number;
  readonly baseSatisfactionTenths: number;
  readonly offsetTenths: number;
}

/** Jabatan pimpinan non-kementerian (mis. Mensesneg, KSP, Jaksa Agung, Wapres). */
export const leaderJsonSchema = z.object({
  id: idSchema,
  version: versionSchema,
  title: z.string().trim().min(3).max(60),
  replaceable: z.boolean().default(true),
});

export type LeaderDefinition = z.infer<typeof leaderJsonSchema>;

export const candidateJsonSchema = z.object({
  id: idSchema,
  version: versionSchema,
  /** ID kementerian (`MIN-*`) atau jabatan pimpinan (`LDR-*`). */
  roleId: idSchema,
  name: personNameSchema,
  factionId: idSchema.nullable().default(null),
  /** Pejabat yang menjabat saat pelantikan; tepat satu per jabatan. */
  initial: z.boolean().default(false),
  /** Efektivitas kementerian bila calon ini menjabat (hanya jabatan menteri). */
  baseEffectiveness: z.number().int().min(40).max(90).optional(),
  integrity: z.number().int().min(0).max(100),
  supportGain: decimalNumberSchema(0, 20, 1, 'Tambahan dukungan partai calon'),
  appearance: appearanceJsonSchema,
  bio: z.string().trim().max(400).default(''),
});

export interface CandidateDefinition {
  readonly id: string;
  readonly version: number;
  readonly roleId: string;
  readonly name: string;
  readonly factionId: string | null;
  readonly initial: boolean;
  readonly baseEffectiveness: number | null;
  readonly integrity: number;
  readonly supportGainTenths: number;
  readonly appearance: Appearance;
  readonly bio: string;
}
