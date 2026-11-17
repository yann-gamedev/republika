import {
  POLICY_CATEGORIES,
  type EffectRule,
  type GameDefinitions,
  type Requirement,
  type ValidationIssue,
} from '@republika/shared';

interface ValidationOutput {
  readonly issues: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
}

function error(code: string, path: string, message: string): ValidationIssue {
  return { severity: 'error', code, path, message };
}

function warning(code: string, path: string, message: string): ValidationIssue {
  return { severity: 'warning', code, path, message };
}

export function validateContent(definitions: GameDefinitions): ValidationOutput {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const policyIds = new Set(definitions.policies.map((policy) => policy.id));
  const factionById = new Map(definitions.factions.map((faction) => [faction.id, faction]));
  const ministryIds = new Set(definitions.ministries.map((ministry) => ministry.id));
  const ideologyTags = new Set(definitions.factions.flatMap((faction) => faction.ideologyTags));

  const seenIds = new Map<string, string>();
  const collections: Array<{ path: string; ids: readonly string[] }> = [
    { path: 'policies', ids: definitions.policies.map((policy) => policy.id) },
    { path: 'factions', ids: definitions.factions.map((faction) => faction.id) },
    { path: 'ministries', ids: definitions.ministries.map((ministry) => ministry.id) },
    { path: 'events', ids: definitions.events.map((event) => event.id) },
    { path: 'archetypes', ids: definitions.archetypes.map((archetype) => archetype.id) },
  ];

  for (const collection of collections) {
    for (const id of collection.ids) {
      const existing = seenIds.get(id);
      if (existing !== undefined) {
        issues.push(
          error(
            'DUPLICATE_ID',
            `${collection.path}.${id}`,
            `ID ${id} duplikat dengan ${existing}.`,
          ),
        );
      } else {
        seenIds.set(id, collection.path);
      }
    }
  }

  const checkRequirement = (requirement: Requirement, path: string): void => {
    if (
      (requirement.type === 'POLICY_ACTIVE' || requirement.type === 'POLICY_NOT_ACTIVE') &&
      !policyIds.has(requirement.policyId)
    ) {
      issues.push(
        error(
          'UNKNOWN_POLICY_REFERENCE',
          `${path}.policyId`,
          `Kebijakan ${requirement.policyId} tidak ditemukan.`,
        ),
      );
    }
  };

  const checkEffect = (effect: EffectRule, path: string): void => {
    if (effect.type === 'MODIFY_MINISTRY_EFFECTIVENESS' && !ministryIds.has(effect.ministryId)) {
      issues.push(
        error(
          'UNKNOWN_MINISTRY_REFERENCE',
          `${path}.ministryId`,
          `Kementerian ${effect.ministryId} tidak ditemukan.`,
        ),
      );
    }
    if (effect.type === 'CHANGE_FACTION_SUPPORT') {
      if (effect.target.kind === 'faction' && !factionById.has(effect.target.factionId)) {
        issues.push(
          error(
            'UNKNOWN_FACTION_REFERENCE',
            `${path}.factionId`,
            `Fraksi ${effect.target.factionId} tidak ditemukan.`,
          ),
        );
      }
      if (effect.target.kind === 'ideologyTag' && !ideologyTags.has(effect.target.ideologyTag)) {
        issues.push(
          error(
            'UNKNOWN_IDEOLOGY_TAG',
            `${path}.ideologyTag`,
            `Tidak ada fraksi dengan tag ideologi "${effect.target.ideologyTag}".`,
          ),
        );
      }
    }
  };

  for (const [index, policy] of definitions.policies.entries()) {
    const path = `policies[${index}].${policy.id}`;
    policy.requirements.forEach((requirement, requirementIndex) => {
      checkRequirement(requirement, `${path}.requirements[${requirementIndex}]`);
    });
    policy.conflicts.forEach((conflictId, conflictIndex) => {
      if (conflictId === policy.id) {
        issues.push(
          error(
            'SELF_CONFLICT',
            `${path}.conflicts[${conflictIndex}]`,
            `Kebijakan ${policy.id} tidak boleh berkonflik dengan dirinya sendiri.`,
          ),
        );
      } else if (!policyIds.has(conflictId)) {
        issues.push(
          error(
            'UNKNOWN_POLICY_REFERENCE',
            `${path}.conflicts[${conflictIndex}]`,
            `Kebijakan konflik ${conflictId} tidak ditemukan.`,
          ),
        );
      }
    });
    policy.effects.forEach((effect, effectIndex) => {
      checkEffect(effect, `${path}.effects[${effectIndex}]`);
    });
    policy.modifiers.forEach((modifier, modifierIndex) => {
      modifier.when.forEach((requirement, requirementIndex) => {
        checkRequirement(
          requirement,
          `${path}.modifiers[${modifierIndex}].when[${requirementIndex}]`,
        );
      });
    });
  }

  for (const [index, event] of definitions.events.entries()) {
    const path = `events[${index}].${event.id}`;
    event.eligibility.forEach((requirement, requirementIndex) => {
      checkRequirement(requirement, `${path}.eligibility[${requirementIndex}]`);
    });
    event.choices.forEach((choice, choiceIndex) => {
      choice.effects.forEach((effect, effectIndex) => {
        checkEffect(effect, `${path}.choices[${choiceIndex}].effects[${effectIndex}]`);
      });
    });
    if (!event.choices.some((choice) => choice.neutral)) {
      issues.push(
        error(
          'EVENT_NEUTRAL_MISSING',
          `${path}.choices`,
          'Setiap event wajib punya minimal satu opsi neutral.',
        ),
      );
    }
  }

  const totalSeats = definitions.factions.reduce((total, faction) => total + faction.seats, 0);
  if (totalSeats !== 100) {
    issues.push(
      error(
        'SEATS_TOTAL',
        'factions',
        `Total kursi semua fraksi harus 100, ditemukan ${totalSeats}.`,
      ),
    );
  }

  const ministriesByCategory = new Map<string, string[]>();
  for (const ministry of definitions.ministries) {
    for (const category of ministry.categories) {
      const current = ministriesByCategory.get(category) ?? [];
      current.push(ministry.id);
      ministriesByCategory.set(category, current);
    }
  }
  for (const category of POLICY_CATEGORIES) {
    const ministryIdsForCategory = ministriesByCategory.get(category) ?? [];
    if (ministryIdsForCategory.length === 0) {
      issues.push(
        error(
          'CATEGORY_MINISTRY_MISSING',
          'ministries',
          `Kategori ${category} belum memiliki kementerian.`,
        ),
      );
    }
    if (ministryIdsForCategory.length > 1) {
      issues.push(
        error(
          'CATEGORY_MINISTRY_DUPLICATE',
          'ministries',
          `Kategori ${category} dibawahi lebih dari satu kementerian: ${ministryIdsForCategory.join(', ')}.`,
        ),
      );
    }
  }

  const graph = new Map<string, string[]>();
  for (const policy of definitions.policies) {
    graph.set(
      policy.id,
      policy.conflicts.filter(
        (conflictId) => conflictId !== policy.id && policyIds.has(conflictId),
      ),
    );
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const reportedCycles = new Set<string>();

  const visit = (policyId: string): void => {
    if (visiting.has(policyId)) {
      const cycleKey = [...visiting].sort().join('|');
      if (!reportedCycles.has(cycleKey)) {
        reportedCycles.add(cycleKey);
        issues.push(
          error(
            'CONFLICT_CYCLE',
            `policies.${policyId}.conflicts`,
            `Konflik melingkar terdeteksi: ${[...visiting, policyId].join(' -> ')}.`,
          ),
        );
      }
      return;
    }
    if (visited.has(policyId)) return;
    visiting.add(policyId);
    for (const next of graph.get(policyId) ?? []) {
      visit(next);
    }
    visiting.delete(policyId);
    visited.add(policyId);
  };

  for (const policyId of graph.keys()) {
    visit(policyId);
  }

  const hasFallback = definitions.archetypes.some(
    (archetype) => archetype.priority === 0 && archetype.conditions.length === 0,
  );
  if (!hasFallback) {
    warnings.push(
      warning(
        'ARCHETYPE_FALLBACK_MISSING',
        'archetypes',
        'Tidak ada arketipe fallback (priority 0 tanpa kondisi); "Pemerintahan Seimbang" tidak akan pernah dipakai.',
      ),
    );
  }

  for (const [id, path] of seenIds) {
    if (id.includes('PLACEHOLDER')) {
      warnings.push(
        warning(
          'PLACEHOLDER_CONTENT',
          path,
          `${id} masih placeholder. Ganti dengan konten final sebelum rilis.`,
        ),
      );
    }
  }

  return { issues, warnings };
}
