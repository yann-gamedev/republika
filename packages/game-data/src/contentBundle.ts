import archetypesJson from '../content/archetypes.json';
import baselineJson from '../content/baseline.json';
import eventPlaceholderOne from '../content/events/EVT-PLACEHOLDER-001.json';
import eventPlaceholderTwo from '../content/events/EVT-PLACEHOLDER-002.json';
import factionPlaceholderOne from '../content/factions/FAC-PLACEHOLDER-01.json';
import factionPlaceholderTwo from '../content/factions/FAC-PLACEHOLDER-02.json';
import factionPlaceholderThree from '../content/factions/FAC-PLACEHOLDER-03.json';
import factionPlaceholderFour from '../content/factions/FAC-PLACEHOLDER-04.json';
import factionPlaceholderFive from '../content/factions/FAC-PLACEHOLDER-05.json';
import factionPlaceholderSix from '../content/factions/FAC-PLACEHOLDER-06.json';
import ministriesJson from '../content/ministries.json';
import policyEnergy from '../content/policies/POL-ENERGY-PLACEHOLDER-001.json';
import policyFiscal from '../content/policies/POL-FISCAL-PLACEHOLDER-001.json';
import policyGovernance from '../content/policies/POL-GOVERNANCE-PLACEHOLDER-001.json';
import policySocial from '../content/policies/POL-SOCIAL-PLACEHOLDER-001.json';
import scenarioJson from '../content/scenario.json';
import type { RawContentBundle } from '@republika/shared';

/**
 * Konten dibundel oleh Vite lewat import JSON statis. Jangan membaca disk saat
 * runtime aplikasi. Setiap file baru di content/ wajib didaftarkan di sini.
 */
export const rawContentBundle: RawContentBundle = {
  scenario: scenarioJson,
  baseline: baselineJson,
  factions: [
    factionPlaceholderOne,
    factionPlaceholderTwo,
    factionPlaceholderThree,
    factionPlaceholderFour,
    factionPlaceholderFive,
    factionPlaceholderSix,
  ],
  ministries: ministriesJson,
  policies: [policyFiscal, policySocial, policyEnergy, policyGovernance],
  events: [eventPlaceholderOne, eventPlaceholderTwo],
  archetypes: archetypesJson,
};
