import { expect, it } from 'vitest';

import { useAppStore } from '../src/store/useAppStore';

it('preferensi skala dan layar penuh diperbarui tanpa menyentuh state permainan', () => {
  const store = useAppStore.getState();
  store.setUiScale(110);
  store.setFullscreenPreference(true);
  expect(useAppStore.getState().settings).toMatchObject({ uiScale: 110, fullscreen: true });
  expect(Object.keys(useAppStore.getState())).not.toContain('gameState');
});
