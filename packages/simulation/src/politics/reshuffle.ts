import type { GameDefinitions, GameState, PendingCommand } from '@republika/shared';

import type { CommandErrorCode } from '../core/errors.js';
import type { Ledger } from '../core/ledger.js';
import { clamp } from '../core/math.js';
import { compareIds } from '../core/order.js';

/** Biaya AP reshuffle (TAHAP-6 §6B.3). */
export const RESHUFFLE_AP_COST = 1;
/** Dukungan partai menteri lama turun 6,0 saat diganti (persepuluhan). */
export const RESHUFFLE_OLD_FACTION_PENALTY_TENTHS = -60;

type RoleKind = 'ministry' | 'leader';

export function roleKind(defs: GameDefinitions, roleId: string): RoleKind | null {
  if (defs.ministries.some((ministry) => ministry.id === roleId)) return 'ministry';
  if (defs.leaders.some((leader) => leader.id === roleId)) return 'leader';
  return null;
}

export function currentHolderId(state: GameState, roleId: string): string | undefined {
  return state.cabinet[roleId]?.holderId ?? state.leaders[roleId]?.holderId;
}

/**
 * Validasi RESHUFFLE. K6: maksimal 1 reshuffle per kuartal (diantrekan atau
 * sudah diproses pada kuartal ini). Wakil presiden (`replaceable: false`) tetap.
 */
export function reshuffleError(
  state: GameState,
  defs: GameDefinitions,
  roleId: string,
  candidateId: string,
): CommandErrorCode | null {
  const kind = roleKind(defs, roleId);
  if (kind === null) return 'UNKNOWN_ROLE';
  if (
    kind === 'leader' &&
    defs.leaders.find((leader) => leader.id === roleId)?.replaceable === false
  )
    return 'ROLE_LOCKED';
  const candidate = defs.candidates.find((item) => item.id === candidateId);
  if (candidate === undefined || candidate.roleId !== roleId) return 'UNKNOWN_CANDIDATE';
  if (currentHolderId(state, roleId) === candidateId) return 'ALREADY_HOLDER';
  const pending = state.pendingCommands.some((command) => command.type === 'RESHUFFLE');
  if (pending || state.reshuffleUsedTurn === state.turn) return 'RESHUFFLE_LIMIT';
  if (state.actionPointsRemaining < RESHUFFLE_AP_COST) return 'INSUFFICIENT_AP';
  return null;
}

function changeSupport(
  work: GameState,
  factionId: string | null,
  delta: number,
  ledger: Ledger,
  roleId: string,
) {
  if (factionId === null || delta === 0) return;
  const faction = work.factions.find((item) => item.factionId === factionId);
  if (faction === undefined) return;
  const before = faction.supportTenths;
  faction.supportTenths = before + delta;
  ledger.push({
    kind: 'FACTION',
    sourceType: 'RESHUFFLE',
    sourceId: roleId,
    reasonCode: delta > 0 ? 'RESHUFFLE_APPOINTED' : 'RESHUFFLE_DISMISSED',
    target: factionId,
    unit: 'tenths',
    before,
    delta,
    after: before + delta,
  });
}

/**
 * Langkah 2b (setelah respons event, sebelum lobi): reshuffle diantrekan
 * diproses urut `roleId`, sehingga perubahan dukungan berlaku pada voting
 * kuartal yang sama.
 * - Menteri: efektivitas kementerian = `baseEffectiveness` calon (clamp 40..90),
 *   partai calon `+supportGain`, partai menteri lama −6,0.
 * - Pimpinan non-kementerian: kepercayaan += (integritas baru − lama) / 10.
 */
export function applyReshuffles(
  work: GameState,
  pending: readonly PendingCommand[],
  defs: GameDefinitions,
  ledger: Ledger,
): void {
  const commands = pending
    .flatMap((command) => (command.type === 'RESHUFFLE' ? [command] : []))
    .sort((a, b) => compareIds(a.roleId, b.roleId));
  for (const command of commands) {
    const kind = roleKind(defs, command.roleId);
    const candidate = defs.candidates.find((item) => item.id === command.candidateId);
    if (kind === null || candidate === undefined) continue;
    const oldId = currentHolderId(work, command.roleId);
    const old = defs.candidates.find((item) => item.id === oldId);

    ledger.push({
      kind: 'CABINET',
      sourceType: 'RESHUFFLE',
      sourceId: command.roleId,
      reasonCode: 'RESHUFFLE',
      target: command.roleId,
      message: `${old?.name ?? '—'} → ${candidate.name}`,
    });

    if (kind === 'ministry') {
      work.cabinet = { ...work.cabinet, [command.roleId]: { holderId: candidate.id } };
      const ministry = work.ministries.find((item) => item.ministryId === command.roleId);
      if (ministry !== undefined && candidate.baseEffectiveness !== null) {
        const before = ministry.effectiveness;
        const after = clamp(candidate.baseEffectiveness, 40, 90);
        ministry.effectiveness = after;
        if (after !== before) {
          ledger.push({
            kind: 'MINISTRY',
            sourceType: 'RESHUFFLE',
            sourceId: command.roleId,
            reasonCode: 'RESHUFFLE',
            target: command.roleId,
            unit: 'points',
            before,
            delta: after - before,
            after,
          });
        }
      }
      changeSupport(work, candidate.factionId, candidate.supportGainTenths, ledger, command.roleId);
      changeSupport(
        work,
        old?.factionId ?? null,
        RESHUFFLE_OLD_FACTION_PENALTY_TENTHS,
        ledger,
        command.roleId,
      );
    } else {
      work.leaders = { ...work.leaders, [command.roleId]: { holderId: candidate.id } };
      const delta = candidate.integrity - (old?.integrity ?? candidate.integrity);
      if (delta !== 0) {
        const before = work.indicators.trust;
        work.indicators.trust = before + delta;
        ledger.push({
          kind: 'INDICATOR',
          sourceType: 'RESHUFFLE',
          sourceId: command.roleId,
          reasonCode: 'RESHUFFLE_INTEGRITY',
          target: 'trust',
          unit: 'tenths',
          before,
          delta,
          after: before + delta,
        });
      }
    }
    work.reshuffleUsedTurn = work.turn;
  }
}
