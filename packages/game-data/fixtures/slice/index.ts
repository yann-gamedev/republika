import type { RawContentBundle } from '@republika/shared';

import archetypes from './archetypes.json';
import baseline from './baseline.json';
import eventFlood from './events/EVT-FX-001.json';
import eventProtest from './events/EVT-FX-002.json';
import factionOne from './factions/FAC-FX-01.json';
import factionTwo from './factions/FAC-FX-02.json';
import factionThree from './factions/FAC-FX-03.json';
import ministries from './ministries.json';
import policyEnergy from './policies/POL-ENERGY-FX-001.json';
import policyFiscal from './policies/POL-FISCAL-FX-001.json';
import policySocial from './policies/POL-SOCIAL-FX-001.json';
import scenario from './scenario.json';

/**
 * Konten fixture vertical slice untuk test engine (Tahap 2). Bukan konten
 * rilis: `content/` milik pemilik proyek dan tidak disentuh agent.
 * Mengubah angka di sini sengaja membuat snapshot engine gagal.
 */
export const sliceFixtureBundle: RawContentBundle = {
  scenario,
  baseline,
  factions: [factionOne, factionTwo, factionThree],
  ministries,
  policies: [policyEnergy, policyFiscal, policySocial],
  events: [eventFlood, eventProtest],
  archetypes,
};
