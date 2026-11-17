import { z } from 'zod';

import { INDICATOR_DOMAINS, INDICATOR_KEYS } from '../types/indicators.js';

export const indicatorKeySchema = z.enum(INDICATOR_KEYS);

const fixedPointIndicator = z.number().int('Indikator harus bilangan bulat persepuluhan.');

export const indicatorsSchema = z
  .object({
    approval: fixedPointIndicator,
    stability: fixedPointIndicator,
    fiscalHealth: fixedPointIndicator,
    growthPct: fixedPointIndicator,
    inflationPct: fixedPointIndicator,
    unemploymentPct: fixedPointIndicator,
    welfare: fixedPointIndicator,
    trust: fixedPointIndicator,
  })
  .superRefine((indicators, context) => {
    for (const key of INDICATOR_KEYS) {
      const domain = INDICATOR_DOMAINS[key];
      const value = indicators[key];
      const min = domain.min * 10;
      const max = domain.max * 10;
      if (value < min || value > max) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${domain.label} harus di antara ${domain.min} dan ${domain.max} (fixed-point ${min}..${max}).`,
        });
      }
    }
  });

export type Indicators = z.infer<typeof indicatorsSchema>;
