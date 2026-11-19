import type { GameDefinitions, GameState, PendingCommand, ProvinceAction } from '@republika/shared';

import type { CommandErrorCode } from '../core/errors.js';
import type { Ledger } from '../core/ledger.js';
import { clamp, roundTenths } from '../core/math.js';
import { compareIds } from '../core/order.js';

/**
 * Angka aksi daerah (TAHAP-6 Lampiran C, disetujui K6; placeholder untuk
 * balancing). Satuan persepuluhan kecuali disebut lain.
 * DECISION: konstanta engine, bukan konten, karena berlaku seragam untuk semua provinsi.
 */
export const PROVINCE_RULES = {
  visit: { apCost: 1, localTenths: 60, approvalTenths: 3 },
  aid: { apCost: 0, treasuryBillion: -3000, localTenths: 40 },
  hear: { apCost: 0 },
  envoy: { apCost: 0, localTenths: 30, effectivenessDelta: -2 },
  /** Kepuasan bergerak 25% menuju approval nasional + offset tiap kuartal. */
  driftRate: 0.25,
  /** Di bawah 25,0 provinsi bergejolak (flag `UNREST_<id>`). */
  unrestBelowTenths: 250,
} as const;

export function provinceApCost(action: ProvinceAction): number {
  switch (action) {
    case 'VISIT':
      return PROVINCE_RULES.visit.apCost;
    case 'AID':
      return PROVINCE_RULES.aid.apCost;
    case 'HEAR':
      return PROVINCE_RULES.hear.apCost;
    case 'ENVOY':
      return PROVINCE_RULES.envoy.apCost;
  }
}

function flagSuffix(provinceId: string): string {
  return provinceId.replace(/-/gu, '_');
}

export function aspirationFlag(provinceId: string): string {
  return `ASPIRATION_${flagSuffix(provinceId)}`;
}

export function unrestFlag(provinceId: string): string {
  return `UNREST_${flagSuffix(provinceId)}`;
}

/**
 * Validasi PROVINCE_ACTION: satu aksi per jenis per provinsi per kuartal;
 * `HEAR` hanya sekali per kuartal di seluruh negeri.
 */
export function provinceActionError(
  state: GameState,
  provinceId: string,
  action: ProvinceAction,
): CommandErrorCode | null {
  const province = state.provinces[provinceId];
  if (province === undefined) return 'UNKNOWN_PROVINCE';
  if (province.actionsThisTurn.includes(action)) return 'PROVINCE_ACTION_LIMIT';
  if (
    action === 'HEAR' &&
    Object.values(state.provinces).some((item) => item.actionsThisTurn.includes('HEAR'))
  ) {
    return 'PROVINCE_ACTION_LIMIT';
  }
  if (state.actionPointsRemaining < provinceApCost(action)) return 'INSUFFICIENT_AP';
  return null;
}

/** Catat/hapus aksi antrean di state provinsi (untuk validasi "satu per jenis"). */
export function withProvinceAction(
  state: GameState,
  provinceId: string,
  action: ProvinceAction,
  queued: boolean,
): GameState['provinces'] {
  const province = state.provinces[provinceId];
  if (province === undefined) return state.provinces;
  const actions = queued
    ? [...province.actionsThisTurn, action]
    : province.actionsThisTurn.filter((item) => item !== action);
  return { ...state.provinces, [provinceId]: { ...province, actionsThisTurn: actions } };
}

function changeLocal(
  work: GameState,
  provinceId: string,
  delta: number,
  reasonCode: string,
  ledger: Ledger,
) {
  const province = work.provinces[provinceId];
  if (province === undefined) return;
  const before = province.satisfactionTenths;
  province.satisfactionTenths = before + delta;
  ledger.push({
    kind: 'PROVINCE',
    sourceType: 'PROVINCE',
    sourceId: provinceId,
    reasonCode,
    target: provinceId,
    unit: 'tenths',
    before,
    delta,
    after: before + delta,
  });
}

/** Langkah 2c: aksi daerah diantrekan, urut (provinceId, jenis aksi). */
export function applyProvinceActions(
  work: GameState,
  pending: readonly PendingCommand[],
  defs: GameDefinitions,
  ledger: Ledger,
): void {
  const commands = pending
    .flatMap((command) => (command.type === 'PROVINCE_ACTION' ? [command] : []))
    .sort((a, b) => compareIds(a.provinceId, b.provinceId) || compareIds(a.action, b.action));
  for (const command of commands) {
    if (work.provinces[command.provinceId] === undefined) continue;
    switch (command.action) {
      case 'VISIT': {
        changeLocal(
          work,
          command.provinceId,
          PROVINCE_RULES.visit.localTenths,
          'PROVINCE_VISIT',
          ledger,
        );
        const before = work.indicators.approval;
        work.indicators.approval = before + PROVINCE_RULES.visit.approvalTenths;
        ledger.push({
          kind: 'INDICATOR',
          sourceType: 'PROVINCE',
          sourceId: command.provinceId,
          reasonCode: 'PROVINCE_VISIT',
          target: 'approval',
          unit: 'tenths',
          before,
          delta: PROVINCE_RULES.visit.approvalTenths,
          after: before + PROVINCE_RULES.visit.approvalTenths,
        });
        break;
      }
      case 'AID': {
        const before = work.treasuryBillion;
        work.treasuryBillion = before + PROVINCE_RULES.aid.treasuryBillion;
        ledger.push({
          kind: 'TREASURY',
          sourceType: 'PROVINCE',
          sourceId: command.provinceId,
          reasonCode: 'PROVINCE_AID',
          target: 'treasury',
          unit: 'billion',
          before,
          delta: PROVINCE_RULES.aid.treasuryBillion,
          after: before + PROVINCE_RULES.aid.treasuryBillion,
        });
        changeLocal(
          work,
          command.provinceId,
          PROVINCE_RULES.aid.localTenths,
          'PROVINCE_AID',
          ledger,
        );
        break;
      }
      case 'HEAR': {
        const flag = aspirationFlag(command.provinceId);
        if (!work.flags.includes(flag)) {
          work.flags = [...work.flags, flag].sort(compareIds);
          ledger.push({
            kind: 'FLAG',
            sourceType: 'PROVINCE',
            sourceId: command.provinceId,
            reasonCode: 'PROVINCE_HEAR',
            target: flag,
            unit: 'flag',
            before: 0,
            delta: 1,
            after: 1,
          });
        }
        break;
      }
      case 'ENVOY': {
        // Utusan diambil dari kementerian bidang tata kelola (Dalam Negeri).
        const ministryId = defs.ministries.find((item) =>
          item.categories.includes('GOVERNANCE'),
        )?.id;
        const ministry = work.ministries.find((item) => item.ministryId === ministryId);
        if (ministry !== undefined) {
          const before = ministry.effectiveness;
          ministry.effectiveness = before + PROVINCE_RULES.envoy.effectivenessDelta;
          ledger.push({
            kind: 'MINISTRY',
            sourceType: 'PROVINCE',
            sourceId: command.provinceId,
            reasonCode: 'PROVINCE_ENVOY',
            target: ministry.ministryId,
            unit: 'points',
            before,
            delta: PROVINCE_RULES.envoy.effectivenessDelta,
            after: before + PROVINCE_RULES.envoy.effectivenessDelta,
          });
        }
        changeLocal(
          work,
          command.provinceId,
          PROVINCE_RULES.envoy.localTenths,
          'PROVINCE_ENVOY',
          ledger,
        );
        break;
      }
    }
  }
}

/** Langkah 8 (setelah baseline nasional): drift 25% menuju approval + offset. */
export function applyProvinceDrift(work: GameState, defs: GameDefinitions, ledger: Ledger): void {
  let moved = 0;
  for (const province of [...defs.provinces].sort((a, b) => compareIds(a.id, b.id))) {
    const state = work.provinces[province.id];
    if (state === undefined) continue;
    const target = clamp(work.indicators.approval + province.offsetTenths, 0, 1000);
    const delta = roundTenths(
      ((target - state.satisfactionTenths) * PROVINCE_RULES.driftRate) / 10,
    );
    if (delta === 0) continue;
    state.satisfactionTenths += delta;
    moved += 1;
  }
  // DECISION: drift dicatat sebagai satu entri ringkas per kuartal (bukan 38 entri)
  // agar ukuran save 20 kuartal tetap di bawah 300 KB; aksi tetap dicatat per provinsi.
  if (moved > 0) {
    ledger.push({
      kind: 'PROVINCE',
      sourceType: 'BASELINE',
      reasonCode: 'PROVINCE_DRIFT',
      target: 'ALL',
      message: `${moved} provinsi bergerak menuju persetujuan nasional.`,
    });
  }
}

/** Langkah 10: clamp 0..100 lalu set/lepas flag gejolak. */
export function normalizeProvinces(work: GameState, ledger: Ledger): void {
  for (const provinceId of Object.keys(work.provinces).sort(compareIds)) {
    const province = work.provinces[provinceId];
    if (province === undefined) continue;
    const before = province.satisfactionTenths;
    const after = clamp(before, 0, 1000);
    if (after !== before) {
      province.satisfactionTenths = after;
      ledger.push({
        kind: 'PROVINCE',
        sourceType: 'SYSTEM',
        reasonCode: 'CLAMPED',
        target: provinceId,
        unit: 'tenths',
        before,
        delta: after - before,
        after,
      });
    }
    const flag = unrestFlag(provinceId);
    const unrest = after < PROVINCE_RULES.unrestBelowTenths;
    const has = work.flags.includes(flag);
    if (unrest === has) continue;
    work.flags = unrest
      ? [...work.flags, flag].sort(compareIds)
      : work.flags.filter((item) => item !== flag);
    ledger.push({
      kind: 'FLAG',
      sourceType: 'PROVINCE',
      sourceId: provinceId,
      reasonCode: unrest ? 'PROVINCE_UNREST' : 'PROVINCE_CALM',
      target: flag,
      unit: 'flag',
      before: has ? 1 : 0,
      delta: unrest ? 1 : -1,
      after: unrest ? 1 : 0,
    });
  }
}

/** Jumlah provinsi bergejolak (untuk badge sidebar). */
export function unrestCount(state: GameState): number {
  return Object.values(state.provinces).filter(
    (province) => province.satisfactionTenths < PROVINCE_RULES.unrestBelowTenths,
  ).length;
}
