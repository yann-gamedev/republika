import { z } from 'zod';

import { commandIdSchema, idSchema } from './common.js';

const base = { commandId: commandIdSchema };

export const gameCommandSchema = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('ENACT_POLICY'),
    policyId: idSchema,
  }),
  z.object({
    ...base,
    type: z.literal('LOBBY_FACTION'),
    factionId: idSchema,
  }),
  z.object({
    ...base,
    type: z.literal('RESPOND_EVENT'),
    eventId: idSchema,
    choiceId: z.string().min(1).max(20),
  }),
  z.object({
    ...base,
    type: z.literal('CANCEL_PENDING'),
    pendingCommandId: commandIdSchema,
  }),
  z.object({
    ...base,
    type: z.literal('END_QUARTER'),
  }),
]);

export type GameCommand = z.infer<typeof gameCommandSchema>;
