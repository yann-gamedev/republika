import type {
  EffectRule,
  GameDefinitions,
  IndicatorKey,
  Requirement,
  ValidationIssue,
} from '@republika/shared';

/** Target jumlah konten MVP (Tahap 4). Kekurangan hanya peringatan. */
export const CONTENT_TARGETS = {
  factions: 6,
  ministries: 4,
  policies: 12,
  events: 15,
  archetypes: 6,
  maxTurns: 20,
} as const;

function warning(code: string, path: string, message: string): ValidationIssue {
  return { severity: 'warning', code, path, message };
}

/** Indikator yang lebih baik bila turun. */
const LOWER_IS_BETTER: ReadonlySet<IndicatorKey> = new Set(['inflationPct', 'unemploymentPct']);

/** Apakah efek ini merugikan pemain (sisi negatif sebuah kebijakan)? */
export function isDownside(effect: EffectRule): boolean {
  switch (effect.type) {
    case 'MODIFY_INDICATOR':
      return LOWER_IS_BETTER.has(effect.target) ? effect.deltaTenths > 0 : effect.deltaTenths < 0;
    case 'MODIFY_TREASURY':
      return effect.deltaBillion < 0;
    case 'CHANGE_FACTION_SUPPORT':
      return effect.deltaTenths < 0;
    case 'MODIFY_MINISTRY_EFFECTIVENESS':
      return effect.delta < 0;
    case 'SET_FLAG':
    case 'CLEAR_FLAG':
      return false;
  }
}

/**
 * Alasan sekumpulan syarat tidak mungkin terpenuhi bersamaan, atau `null`.
 * Hanya kontradiksi langsung yang diperiksa (bukan dinamika permainan).
 */
export function contradiction(
  requirements: readonly Requirement[],
  maxTurns: number,
  flagsEverSet: ReadonlySet<string>,
): string | null {
  for (const requirement of requirements) {
    if (requirement.type === 'TURN_AT_LEAST' && requirement.value > maxTurns) {
      return `butuh kuartal ≥ ${requirement.value}, padahal kampanye hanya ${maxTurns} kuartal`;
    }
    if (requirement.type === 'FLAG_SET' && !flagsEverSet.has(requirement.flag)) {
      return `butuh flag ${requirement.flag} yang tidak pernah di-set`;
    }
    for (const other of requirements) {
      if (
        requirement.type === 'INDICATOR_AT_LEAST' &&
        other.type === 'INDICATOR_AT_MOST' &&
        requirement.target === other.target &&
        requirement.valueTenths > other.valueTenths
      ) {
        return `${requirement.target} harus ≥ ${requirement.valueTenths / 10} dan ≤ ${other.valueTenths / 10}`;
      }
      if (
        requirement.type === 'FLAG_SET' &&
        other.type === 'FLAG_NOT_SET' &&
        requirement.flag === other.flag
      ) {
        return `flag ${requirement.flag} harus ada dan tidak ada sekaligus`;
      }
      if (
        requirement.type === 'POLICY_ACTIVE' &&
        other.type === 'POLICY_NOT_ACTIVE' &&
        requirement.policyId === other.policyId
      ) {
        return `${requirement.policyId} harus aktif dan tidak aktif sekaligus`;
      }
    }
  }
  return null;
}

function allEffects(defs: GameDefinitions): EffectRule[] {
  return [
    ...defs.policies.flatMap((policy) => policy.effects),
    ...defs.events.flatMap((event) => event.choices.flatMap((choice) => choice.effects)),
  ];
}

function allRequirements(defs: GameDefinitions): Requirement[] {
  return [
    ...defs.policies.flatMap((policy) => [
      ...policy.requirements,
      ...policy.modifiers.flatMap((modifier) => modifier.when),
    ]),
    ...defs.events.flatMap((event) => event.eligibility),
  ];
}

/**
 * Peringatan kualitas konten untuk `content:check` (bukan error): jumlah di
 * bawah target MVP, kebijakan tanpa sisi negatif, syarat mustahil, dan flag
 * yang di-set tanpa pernah dibaca atau sebaliknya.
 */
export function qualityWarnings(defs: GameDefinitions): ValidationIssue[] {
  const warnings: ValidationIssue[] = [];

  const counts: Array<[keyof typeof CONTENT_TARGETS, number, string]> = [
    ['factions', defs.factions.length, 'fraksi'],
    ['ministries', defs.ministries.length, 'kementerian'],
    ['policies', defs.policies.length, 'kebijakan'],
    ['events', defs.events.length, 'event'],
    ['archetypes', defs.archetypes.length, 'arketipe (termasuk fallback)'],
  ];
  for (const [key, count, label] of counts) {
    if (count < CONTENT_TARGETS[key]) {
      warnings.push(
        warning(
          'CONTENT_BELOW_TARGET',
          key,
          `Baru ${count} ${label}; target MVP ${CONTENT_TARGETS[key]}.`,
        ),
      );
    }
  }
  if (defs.scenario.maxTurns < CONTENT_TARGETS.maxTurns) {
    warnings.push(
      warning(
        'CONTENT_BELOW_TARGET',
        'scenario.maxTurns',
        `Kampanye ${defs.scenario.maxTurns} kuartal; target MVP ${CONTENT_TARGETS.maxTurns}.`,
      ),
    );
  }

  for (const policy of defs.policies) {
    if (!policy.effects.some(isDownside)) {
      warnings.push(
        warning(
          'POLICY_NO_DOWNSIDE',
          `policies.${policy.id}`,
          `Kebijakan ${policy.id} tidak punya efek negatif sama sekali. Terlalu dominan?`,
        ),
      );
    }
  }

  const flagsSet = new Set(
    allEffects(defs).flatMap((effect) => (effect.type === 'SET_FLAG' ? [effect.flag] : [])),
  );
  const flagsRead = new Set(
    allRequirements(defs).flatMap((requirement) =>
      requirement.type === 'FLAG_SET' || requirement.type === 'FLAG_NOT_SET'
        ? [requirement.flag]
        : [],
    ),
  );

  for (const event of defs.events) {
    const reason = contradiction(event.eligibility, defs.scenario.maxTurns, flagsSet);
    if (reason !== null) {
      warnings.push(
        warning(
          'EVENT_NEVER_ELIGIBLE',
          `events.${event.id}.eligibility`,
          `Event ${event.id} tidak mungkin muncul: ${reason}.`,
        ),
      );
    }
  }
  for (const policy of defs.policies) {
    const reason = contradiction(policy.requirements, defs.scenario.maxTurns, flagsSet);
    if (reason !== null) {
      warnings.push(
        warning(
          'POLICY_NEVER_AVAILABLE',
          `policies.${policy.id}.requirements`,
          `Kebijakan ${policy.id} tidak mungkin diajukan: ${reason}.`,
        ),
      );
    }
  }

  for (const flag of [...flagsSet].sort()) {
    if (!flagsRead.has(flag)) {
      warnings.push(
        warning(
          'FLAG_NEVER_READ',
          `flags.${flag}`,
          `Flag ${flag} di-set tetapi tidak pernah dibaca.`,
        ),
      );
    }
  }
  for (const flag of [...flagsRead].sort()) {
    if (!flagsSet.has(flag)) {
      warnings.push(
        warning(
          'FLAG_NEVER_SET',
          `flags.${flag}`,
          `Flag ${flag} dibaca tetapi tidak pernah di-set.`,
        ),
      );
    }
  }

  return warnings;
}
