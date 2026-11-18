import type { FactionDefinition, TurnReport } from '@republika/shared';

/** Satu pemungutan suara dari laporan kuartal (deterministik, tidak dihitung ulang). */
export type VoteOutcome = TurnReport['votes'][number];

export const SEAT_ROWS = [
  { count: 14, radius: 110 },
  { count: 17, radius: 140 },
  { count: 20, radius: 170 },
  { count: 23, radius: 200 },
  { count: 26, radius: 230 },
] as const;

export const CHAMBER = { width: 640, height: 330, centerX: 320, centerY: 290 } as const;

export interface SeatPoint {
  readonly x: number;
  readonly y: number;
}

/** 100 posisi kursi setengah lingkaran, urut dari kiri ke kanan (sudut menurun). */
export function seatPositions(): SeatPoint[] {
  const all: Array<SeatPoint & { angle: number }> = [];
  for (const row of SEAT_ROWS) {
    for (let index = 0; index < row.count; index += 1) {
      const angle = Math.PI - (index / (row.count - 1)) * Math.PI;
      all.push({
        angle,
        x: CHAMBER.centerX + row.radius * Math.cos(angle),
        y: CHAMBER.centerY - row.radius * Math.sin(angle),
      });
    }
  }
  return all
    .sort((left, right) => right.angle - left.angle || left.y - right.y)
    .map(({ x, y }) => ({ x, y }));
}

export interface RevealFaction {
  readonly factionId: string;
  readonly seats: number;
  readonly vote: 'FOR' | 'AGAINST';
}

/**
 * Urutan reveal: fraksi diurutkan menurut `factionId` (sama dengan engine).
 * Kursi tiap fraksi memberi suara sebagai satu blok (AGENT §5.5).
 */
export function revealOrder(
  vote: VoteOutcome,
  factions: readonly FactionDefinition[],
): RevealFaction[] {
  return [...vote.factionVotes]
    .sort((left, right) => left.factionId.localeCompare(right.factionId))
    .map((item) => ({
      factionId: item.factionId,
      seats: factions.find((faction) => faction.id === item.factionId)?.seats ?? 0,
      vote: item.vote,
    }));
}

export type SeatState = { readonly factionId: string } & (
  { readonly status: 'pending' } | { readonly status: 'FOR' | 'AGAINST' }
);

/** Status setiap kursi setelah `step` fraksi diumumkan. */
export function seatStates(order: readonly RevealFaction[], step: number): SeatState[] {
  return order.flatMap((faction, index) =>
    Array.from({ length: faction.seats }, (): SeatState =>
      index < step
        ? { factionId: faction.factionId, status: faction.vote }
        : { factionId: faction.factionId, status: 'pending' },
    ),
  );
}

export interface Tally {
  readonly yes: number;
  readonly no: number;
  readonly pending: number;
}

export function tally(order: readonly RevealFaction[], step: number): Tally {
  let yes = 0;
  let no = 0;
  let pending = 0;
  order.forEach((faction, index) => {
    if (index >= step) pending += faction.seats;
    else if (faction.vote === 'FOR') yes += faction.seats;
    else no += faction.seats;
  });
  return { yes, no, pending };
}
