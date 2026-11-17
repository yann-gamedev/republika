import { expect, it } from 'vitest';

import { useAppStore } from '../src/store/useAppStore';

it('aksi mock tidak mengubah GameState', () => {
  const store = useAppStore.getState();
  const before = structuredClone(store.gameState);
  store.recordMockChoice('policy:example', 'example', 'Aksi contoh');
  store.selectEventChoice('event:example', 'A', 'Keputusan contoh');
  expect(useAppStore.getState().gameState).toEqual(before);
  expect(useAppStore.getState().mockSelections['event:example']).toBe('A');
  useAppStore.setState({ mockSelections: {}, feedback: null });
});
