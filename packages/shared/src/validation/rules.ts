import { z } from 'zod';

import { EFFECT_TIMINGS } from '../types/constants.js';
import { flagSchema, idSchema, reasonCodeSchema } from './common.js';
import { indicatorKeySchema } from './indicators.js';

export const effectTimingSchema = z.enum(EFFECT_TIMINGS);

const indicatorTenths = z.number().int('Perubahan indikator harus bilangan bulat persepuluhan.');
const treasuryBillion = z.number().int('Perubahan kas harus bilangan bulat miliar.');

export const requirementSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('INDICATOR_AT_LEAST'),
    target: indicatorKeySchema,
    valueTenths: indicatorTenths,
  }),
  z.object({
    type: z.literal('INDICATOR_AT_MOST'),
    target: indicatorKeySchema,
    valueTenths: indicatorTenths,
  }),
  z.object({
    type: z.literal('TREASURY_AT_LEAST'),
    valueBillion: treasuryBillion,
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
]);

export type Requirement = z.infer<typeof requirementSchema>;

export const factionSupportTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('faction'), factionId: idSchema }),
  z.object({ kind: z.literal('ideologyTag'), ideologyTag: z.string().min(1).max(40) }),
]);

export type FactionSupportTarget = z.infer<typeof factionSupportTargetSchema>;

export const effectRuleSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('MODIFY_INDICATOR'),
      target: indicatorKeySchema,
      deltaTenths: indicatorTenths,
      timing: effectTimingSchema,
      delayTurns: z.number().int().min(1).max(40).optional(),
      reasonCode: reasonCodeSchema,
    }),
    z.object({
      type: z.literal('MODIFY_TREASURY'),
      deltaBillion: treasuryBillion,
      reasonCode: reasonCodeSchema,
    }),
    z.object({
      type: z.literal('CHANGE_FACTION_SUPPORT'),
      target: factionSupportTargetSchema,
      deltaTenths: indicatorTenths,
      reasonCode: reasonCodeSchema,
    }),
    z.object({
      type: z.literal('MODIFY_MINISTRY_EFFECTIVENESS'),
      ministryId: idSchema,
      delta: z.number().int().min(-50).max(50),
      reasonCode: reasonCodeSchema,
    }),
    z.object({
      type: z.literal('SET_FLAG'),
      flag: flagSchema,
      reasonCode: reasonCodeSchema,
    }),
    z.object({
      type: z.literal('CLEAR_FLAG'),
      flag: flagSchema,
      reasonCode: reasonCodeSchema,
    }),
  ])
  .superRefine((effect, context) => {
    if (effect.type !== 'MODIFY_INDICATOR') return;
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
  });

export type EffectRule = z.infer<typeof effectRuleSchema>;

export const conditionalModifierSchema = z.object({
  when: z.array(requirementSchema).min(1, 'Modifier membutuhkan minimal satu syarat.'),
  appliesTo: indicatorKeySchema,
  multiplier: z.number().finite().min(0.1).max(3),
});

export type ConditionalModifier = z.infer<typeof conditionalModifierSchema>;
