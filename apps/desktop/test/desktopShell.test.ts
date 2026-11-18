import { describe, expect, it } from 'vitest';

import { MemoryStorage } from '../src/platform/MemoryStorage';
import { LOG_FILE, MAX_LOG_BYTES, createLogger } from '../src/platform/logger';
import { saveStorage } from '../src/platform';
import { useAppStore } from '../src/store/useAppStore';

describe('log lokal', () => {
  it('menambah baris dan berotasi di 1 MB dengan maksimal 3 file', async () => {
    const storage = new MemoryStorage();
    const logger = createLogger(storage, () => '2031-01-01T00:00:00.000Z');
    await logger.log('info', 'resolve kuartal 1: 3.2 ms');
    expect(storage.memory.files.get(LOG_FILE)).toContain('INFO resolve kuartal 1: 3.2 ms');

    const big = 'x'.repeat(1900);
    for (let index = 0; index < 1700; index += 1) void logger.log('error', `${index} ${big}`);
    await logger.log('error', 'terakhir');
    const files = [...storage.memory.files.keys()].filter((key) => key.startsWith('logs/')).sort();
    expect(files).toEqual(['logs/republika.1.log', 'logs/republika.2.log', 'logs/republika.log']);
    for (const file of files) {
      expect(storage.memory.files.get(file)?.length ?? 0).toBeLessThanOrEqual(MAX_LOG_BYTES);
    }
    expect(storage.memory.files.get(LOG_FILE)).toContain('terakhir');
  });

  it('kegagalan menulis log tidak pernah melempar ke pemanggil', async () => {
    const storage = new MemoryStorage();
    storage.memory.writeTextAtomic = async () => {
      throw new Error('disk penuh');
    };
    const logger = createLogger(storage, () => 'now');
    await expect(logger.log('error', 'apa pun')).resolves.toBeUndefined();
  });
});

describe('pengaturan bertahan setelah restart', () => {
  it('skala UI dan layar penuh dibaca kembali dari settings.json', async () => {
    await useAppStore.getState().initialize();
    useAppStore.getState().setUiScale(125);
    useAppStore.getState().setFullscreenPreference(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await saveStorage.readSettings()).toMatchObject({ uiScale: 125, fullscreen: true });

    // "Restart": store kembali ke default, lalu dimuat ulang dari penyimpanan.
    useAppStore.setState({
      initialized: false,
      settings: { ...useAppStore.getState().settings, uiScale: 100, fullscreen: false },
    });
    await useAppStore.getState().initialize();
    expect(useAppStore.getState().settings).toMatchObject({ uiScale: 125, fullscreen: true });

    useAppStore.getState().updateSettings({ uiScale: 100, fullscreen: false });
  });
});
