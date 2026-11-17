import { create } from 'zustand';

import { APP_VERSION, type GameState, type Settings, type UiScale } from '@republika/shared';

import { createMockGameState, mockGameState } from '@/features/mock/mockState';
import { saveStorage } from '@/platform';

const defaultSettings: Settings = {
  uiScale: 100,
  fullscreen: false,
  lastRunAppVersion: APP_VERSION,
  askedAboutPreviousVersion: false,
};

interface AppStore {
  gameState: GameState;
  settings: Settings;
  feedback: string | null;
  mockSelections: Readonly<Record<string, string>>;
  initialized: boolean;

  initialize: () => Promise<void>;
  startNewGame: (presidentName: string, cabinetName: string) => void;
  setUiScale: (scale: UiScale) => void;
  setFullscreenPreference: (fullscreen: boolean) => void;
  notify: (message: string) => void;
  clearFeedback: () => void;
  recordMockChoice: (key: string, choiceId: string, message: string) => void;
  selectEventChoice: (eventId: string, choiceId: string, message: string) => void;
}

function persistSettings(settings: Settings): void {
  void saveStorage.writeSettings(settings).catch(() => {
    // Tahap 1: persistensi file desktop belum aktif. Perubahan tetap berlaku di sesi.
  });
}

export const useAppStore = create<AppStore>()((set, get) => ({
  gameState: mockGameState,
  settings: defaultSettings,
  feedback: null,
  mockSelections: {},
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    try {
      // Pertama kali jalan: siapkan saves/ dan logs/ (AGENT §5.12).
      await saveStorage.init();
      const stored = await saveStorage.readSettings();
      set({
        ...(stored === null ? {} : { settings: stored }),
        initialized: true,
      });
    } catch {
      set({ initialized: true });
    }
  },

  startNewGame: (presidentName, cabinetName) => {
    set({
      gameState: createMockGameState(presidentName, cabinetName),
      mockSelections: {},
      feedback: null,
    });
  },

  setUiScale: (scale) => {
    const settings: Settings = { ...get().settings, uiScale: scale };
    set({ settings });
    persistSettings(settings);
  },

  setFullscreenPreference: (fullscreen) => {
    const settings: Settings = { ...get().settings, fullscreen };
    set({ settings });
    persistSettings(settings);
  },

  notify: (message) => {
    set({ feedback: message });
  },

  clearFeedback: () => {
    set({ feedback: null });
  },

  recordMockChoice: (key, choiceId, message) => {
    set((state) => ({
      mockSelections: { ...state.mockSelections, [key]: choiceId },
      feedback: message,
    }));
  },

  selectEventChoice: (eventId, choiceId, message) => {
    get().recordMockChoice(eventId, choiceId, message);
  },
}));
