import {
  INDICATOR_DOMAINS,
  type EffectRule,
  type EventChoice,
  type EventDefinition,
  type FactionDefinition,
} from '@republika/shared';

import { isFavourable } from '@/app/useGame';
import { factionName } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { formatSignedIndicator, formatSignedRupiahTriliun } from '@/format/formatters';

export interface Consequence {
  readonly key: string;
  readonly text: string;
  readonly good: boolean | null;
}

/** Konsekuensi kualitatif: arah perubahan tanpa angka pasti. */
export function consequence(effect: EffectRule, index: number): Consequence | null {
  switch (effect.type) {
    case 'MODIFY_INDICATOR':
      return {
        key: `${index}`,
        text: copy.events.qualitative(
          INDICATOR_DOMAINS[effect.target].shortLabel,
          effect.deltaTenths >= 0,
          effect.timing === 'DELAYED',
        ),
        good: isFavourable(effect.target, effect.deltaTenths),
      };
    case 'MODIFY_TREASURY':
      return {
        key: `${index}`,
        text: copy.events.qualitative(copy.common.treasury, effect.deltaBillion >= 0, false),
        good: effect.deltaBillion > 0,
      };
    case 'CHANGE_FACTION_SUPPORT':
      return {
        key: `${index}`,
        text: copy.events.qualitative(
          effect.target.kind === 'faction'
            ? copy.events.supportOf(factionName(effect.target.factionId))
            : copy.events.supportOfTag(effect.target.ideologyTag),
          effect.deltaTenths >= 0,
          false,
        ),
        good: effect.deltaTenths > 0,
      };
    case 'MODIFY_MINISTRY_EFFECTIVENESS':
      return {
        key: `${index}`,
        text: copy.events.qualitative(copy.cabinet.effectiveness, effect.delta >= 0, false),
        good: effect.delta > 0,
      };
    case 'SET_FLAG':
    case 'CLEAR_FLAG':
      // Flag adalah mekanisme rantai peristiwa; tidak dibocorkan ke pemain.
      return null;
  }
}

export function choiceConsequences(choice: EventChoice): Consequence[] {
  return choice.effects.flatMap((effect, index) => {
    const item = consequence(effect, index);
    return item === null ? [] : [item];
  });
}

export interface ImpactRow {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly good: boolean | null;
  readonly note?: string;
}

/** Pembulatan ke persepuluhan terdekat menjauhi nol (sama dengan engine). */
function roundTenths(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/**
 * Perkiraan dampak pilihan untuk panel samping.
 * DECISION: indikator ditampilkan sebagai rentang [×0,75, ×1,25] seperti
 * proyeksi kebijakan (AGENT §5.8); kas ditampilkan pasti. Efek event tidak
 * kena pengali kementerian, jadi rentang ini sengaja konservatif.
 */
export function choiceImpact(choice: EventChoice): ImpactRow[] {
  return choice.effects.flatMap((effect, index): ImpactRow[] => {
    switch (effect.type) {
      case 'MODIFY_INDICATOR': {
        const low = roundTenths(effect.deltaTenths * 0.75);
        const high = roundTenths(effect.deltaTenths * 1.25);
        const [from, to] = low <= high ? [low, high] : [high, low];
        return [
          {
            key: `${index}`,
            label: INDICATOR_DOMAINS[effect.target].shortLabel,
            value: `${formatSignedIndicator(from)} … ${formatSignedIndicator(to)}`,
            good: isFavourable(effect.target, effect.deltaTenths),
            ...(effect.timing === 'DELAYED'
              ? { note: copy.events.impactDelayed(effect.delayTurns ?? 1) }
              : {}),
          },
        ];
      }
      case 'MODIFY_TREASURY':
        return [
          {
            key: `${index}`,
            label: copy.common.treasury,
            value: formatSignedRupiahTriliun(effect.deltaBillion),
            good: effect.deltaBillion > 0,
          },
        ];
      case 'CHANGE_FACTION_SUPPORT':
      case 'MODIFY_MINISTRY_EFFECTIVENESS':
      case 'SET_FLAG':
      case 'CLEAR_FLAG':
        return [];
    }
  });
}

export type Stake = 'gain' | 'loss' | 'waiting' | 'neutral';

export interface Stakeholder {
  readonly factionId: string;
  readonly name: string;
  readonly stake: Stake;
}

function affectedFactions(effect: EffectRule, factions: readonly FactionDefinition[]): string[] {
  if (effect.type !== 'CHANGE_FACTION_SUPPORT') return [];
  if (effect.target.kind === 'faction') return [effect.target.factionId];
  const tag = effect.target.ideologyTag;
  return factions.filter((faction) => faction.ideologyTags.includes(tag)).map((item) => item.id);
}

/**
 * Partai yang disebut efek event (langsung atau lewat tag ideologi), urut ID.
 * Sikap mengikuti pilihan terpilih: naik = diuntungkan, turun = dirugikan.
 */
export function stakeholders(
  event: EventDefinition,
  choiceId: string | null,
  factions: readonly FactionDefinition[],
): Stakeholder[] {
  const ids = new Set(
    event.choices.flatMap((choice) =>
      choice.effects.flatMap((effect) => affectedFactions(effect, factions)),
    ),
  );
  const chosen = event.choices.find((choice) => choice.id === choiceId);
  return [...ids].sort().map((factionId) => {
    const delta = (chosen?.effects ?? []).reduce(
      (sum, effect) =>
        affectedFactions(effect, factions).includes(factionId) &&
        effect.type === 'CHANGE_FACTION_SUPPORT'
          ? sum + effect.deltaTenths
          : sum,
      0,
    );
    const stake: Stake =
      chosen === undefined ? 'waiting' : delta > 0 ? 'gain' : delta < 0 ? 'loss' : 'neutral';
    return {
      factionId,
      name: factions.find((faction) => faction.id === factionId)?.name ?? factionId,
      stake,
    };
  });
}
