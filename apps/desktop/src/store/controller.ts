import { rulesetMigrationMaps } from '@republika/game-data';

import { contentHash, definitions } from '@/content/gameContent';
import { createCampaignSeed, createCommandId, nowIso, saveStorage } from '@/platform';

import { GameController } from './gameController';
import { gameStore } from './gameStore';

/** Instance controller tunggal untuk app. Test membuat instance sendiri. */
export const gameController = new GameController({
  storage: saveStorage,
  definitions,
  contentHash,
  now: nowIso,
  createSeed: createCampaignSeed,
  createCommandId,
  store: gameStore,
  rulesetMaps: rulesetMigrationMaps,
});
