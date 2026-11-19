import type { GameDefinitions, GameState, ProvinceState } from '@republika/shared';

import { compareIds } from '../core/order.js';

type Holders = Record<string, { holderId: string }>;

/**
 * Pemegang jabatan awal dari konten: calon `initial: true` per jabatan.
 * Jabatan yang sudah punya pemegang sah di `existing` dipertahankan.
 */
function holdersFor(
  roleIds: readonly string[],
  defs: GameDefinitions,
  existing: Readonly<Holders>,
): Holders {
  const result: Holders = {};
  for (const roleId of [...roleIds].sort(compareIds)) {
    const current = existing[roleId]?.holderId;
    const valid =
      current !== undefined &&
      defs.candidates.some((candidate) => candidate.id === current && candidate.roleId === roleId);
    if (valid) {
      result[roleId] = { holderId: current };
      continue;
    }
    const initial = defs.candidates.find(
      (candidate) => candidate.roleId === roleId && candidate.initial,
    );
    if (initial !== undefined) result[roleId] = { holderId: initial.id };
  }
  return result;
}

/** Kabinet (per kementerian) dan pimpinan (per jabatan) sesuai konten. */
export function officeHoldersFromContent(
  defs: GameDefinitions,
  existing: { readonly cabinet?: Readonly<Holders>; readonly leaders?: Readonly<Holders> } = {},
): { cabinet: Holders; leaders: Holders } {
  return {
    cabinet: holdersFor(
      defs.ministries.map((ministry) => ministry.id),
      defs,
      existing.cabinet ?? {},
    ),
    leaders: holdersFor(
      defs.leaders.map((leader) => leader.id),
      defs,
      existing.leaders ?? {},
    ),
  };
}

/** Provinsi dari konten; nilai yang sudah ada dipertahankan, provinsi baru memakai `baseSatisfaction`. */
export function provincesFromContent(
  defs: GameDefinitions,
  existing: Readonly<Record<string, ProvinceState>> = {},
): Record<string, ProvinceState> {
  const result: Record<string, ProvinceState> = {};
  for (const province of [...defs.provinces].sort((a, b) => compareIds(a.id, b.id))) {
    const current = existing[province.id];
    result[province.id] = {
      satisfactionTenths: current?.satisfactionTenths ?? province.baseSatisfactionTenths,
      actionsThisTurn: [],
    };
  }
  return result;
}

/** Selaraskan bagian 6B state dengan konten (dipakai migrasi ruleset). Murni. */
export function syncCampaignContent(state: GameState, defs: GameDefinitions): GameState {
  const holders = officeHoldersFromContent(defs, state);
  const promiseIds = state.promiseIds.filter((id) =>
    defs.promises.some((promise) => promise.id === id),
  );
  return {
    ...state,
    ...holders,
    // Janji yang dihapus dari konten membuat set tidak lengkap; janji tidak lagi dinilai.
    promiseIds: promiseIds.length === state.promiseIds.length ? promiseIds : [],
    provinces: provincesFromContent(defs, state.provinces),
  };
}
