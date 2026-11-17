import { createStore, useStore } from 'zustand';

import type { GameState, TurnReport } from '@republika/shared';

export type UiStatus = 'idle' | 'busy' | 'saveFailed';

export interface Toast {
  readonly id: number;
  readonly tone: 'info' | 'success' | 'error';
  readonly message: string;
}

/**
 * Store tipis (AGENT §5.17): hanya state engine terakhir, laporan terakhir,
 * dan status UI. History tidak disimpan di sini; dimuat dari save saat
 * halaman Riwayat/Laporan dibuka. Komponen hanya membaca store ini.
 */
export interface GameStoreState {
  readonly state: GameState | null;
  readonly lastReport: TurnReport | null;
  readonly uiStatus: UiStatus;
  readonly toast: Toast | null;
}

export const initialGameStoreState: GameStoreState = {
  state: null,
  lastReport: null,
  uiStatus: 'idle',
  toast: null,
};

export function createGameStore() {
  return createStore<GameStoreState>()(() => initialGameStoreState);
}

export type GameStore = ReturnType<typeof createGameStore>;

export const gameStore = createGameStore();

export function useGameStore<T>(selector: (state: GameStoreState) => T): T {
  return useStore(gameStore, selector);
}
