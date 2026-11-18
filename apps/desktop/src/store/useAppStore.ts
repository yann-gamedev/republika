import { create } from 'zustand';

import { APP_VERSION, type Settings, type UiScale } from '@republika/shared';

import { saveStorage } from '@/platform';

const defaultSettings: Settings = {
  uiScale: 100,
  fullscreen: false,
  lastRunAppVersion: APP_VERSION,
  askedAboutPreviousVersion: false,
};

/**
 * Preferensi aplikasi (skala UI, layar penuh). State permainan ada di
 * `gameStore` dan hanya diubah lewat `GameController`.
 */
interface AppStore {
  settings: Settings;
  initialized: boolean;

  initialize: () => Promise<void>;
  setUiScale: (scale: UiScale) => void;
  setFullscreenPreference: (fullscreen: boolean) => void;
  /** Perbarui sebagian pengaturan lalu simpan ke settings.json. */
  updateSettings: (patch: Partial<Settings>) => void;
}

function persistSettings(settings: Settings): void {
  void saveStorage.writeSettings(settings).catch(() => {
    // Preferensi tetap berlaku di sesi ini walau gagal disimpan.
  });
}

export const useAppStore = create<AppStore>()((set, get) => ({
  settings: defaultSettings,
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

  updateSettings: (patch) => {
    const settings: Settings = { ...get().settings, ...patch };
    set({ settings });
    persistSettings(settings);
  },
}));
