import {
  archetypeJsonSchema,
  baselineJsonSchema,
  eventJsonSchema,
  factionJsonSchema,
  ministryJsonSchema,
  policyJsonSchema,
  scenarioJsonSchema,
  type ArchetypeDefinition,
  type GameDefinitions,
  type RawContentBundle,
  type ValidationIssue,
} from '@republika/shared';
import { z } from 'zod';

import {
  convertArchetype,
  convertBaseline,
  convertEvent,
  convertFaction,
  convertMinistry,
  convertPolicy,
  convertScenario,
} from './convert.js';
import { validateContent } from './crossValidate.js';
import { qualityWarnings } from './quality.js';
import { computeContentHash } from './hash.js';

export interface ParseContentResult {
  readonly definitions: GameDefinitions | null;
  readonly contentHash: string | null;
  readonly issues: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
}

function parseAt<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): z.infer<TSchema> | undefined {
  const result = schema.safeParse(input);
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

function byId<T extends { readonly id: string }>(left: T, right: T): number {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export function parseRawContent(raw: RawContentBundle): ParseContentResult {
  const issues: ValidationIssue[] = [];

  const scenario = parseAt(scenarioJsonSchema, raw.scenario, 'scenario.json', issues);
  const baseline = parseAt(baselineJsonSchema, raw.baseline, 'baseline.json', issues);
  const ministries = parseAt(ministryJsonSchema.array(), raw.ministries, 'ministries.json', issues);
  const archetypes = parseAt(
    archetypeJsonSchema.array(),
    raw.archetypes,
    'archetypes.json',
    issues,
  );
  const factions = raw.factions.map((faction, index) =>
    parseAt(factionJsonSchema, faction, `factions[${index}]`, issues),
  );
  const policies = raw.policies.map((policy, index) =>
    parseAt(policyJsonSchema, policy, `policies[${index}]`, issues),
  );
  const events = raw.events.map((event, index) =>
    parseAt(eventJsonSchema, event, `events[${index}]`, issues),
  );

  if (
    scenario === undefined ||
    baseline === undefined ||
    ministries === undefined ||
    archetypes === undefined ||
    factions.some((faction) => faction === undefined) ||
    policies.some((policy) => policy === undefined) ||
    events.some((event) => event === undefined)
  ) {
    return { definitions: null, contentHash: null, issues, warnings: [] };
  }

  const parsedFactions = factions.filter(
    (faction): faction is NonNullable<typeof faction> => faction !== undefined,
  );
  const parsedPolicies = policies.filter(
    (policy): policy is NonNullable<typeof policy> => policy !== undefined,
  );
  const parsedEvents = events.filter(
    (event): event is NonNullable<typeof event> => event !== undefined,
  );

  let convertedArchetypes: ArchetypeDefinition[];
  try {
    convertedArchetypes = archetypes.map(convertArchetype).sort(byId);
  } catch (conversionError) {
    issues.push({
      severity: 'error',
      code: 'CONVERSION_FAILED',
      path: 'archetypes.json',
      message:
        conversionError instanceof Error ? conversionError.message : 'Konversi arketipe gagal.',
    });
    return { definitions: null, contentHash: null, issues, warnings: [] };
  }

  const definitions: GameDefinitions = {
    scenario: convertScenario(scenario),
    baseline: convertBaseline(baseline),
    factions: parsedFactions.map(convertFaction).sort(byId),
    ministries: ministries.map(convertMinistry).sort(byId),
    policies: parsedPolicies.map(convertPolicy).sort(byId),
    events: parsedEvents.map(convertEvent).sort(byId),
    archetypes: convertedArchetypes,
  };

  const crossValidation = validateContent(definitions);
  issues.push(...crossValidation.issues);

  const contentHash = issues.length === 0 ? computeContentHash(definitions) : null;

  return {
    definitions: issues.length === 0 ? definitions : null,
    contentHash,
    issues,
    warnings: [...crossValidation.warnings, ...qualityWarnings(definitions)],
  };
}
