import archetypesJson from '../content/archetypes.json';
import baselineJson from '../content/baseline.json';
import historicalEvent01 from '../content/events/EVT-HIST-001.json';
import historicalEvent02 from '../content/events/EVT-HIST-002.json';
import historicalEvent03 from '../content/events/EVT-HIST-003.json';
import historicalEvent04 from '../content/events/EVT-HIST-004.json';
import historicalEvent05 from '../content/events/EVT-HIST-005.json';
import historicalEvent06 from '../content/events/EVT-HIST-006.json';
import historicalEvent07 from '../content/events/EVT-HIST-007.json';
import historicalEvent08 from '../content/events/EVT-HIST-008.json';
import historicalEvent09 from '../content/events/EVT-HIST-009.json';
import historicalEvent10 from '../content/events/EVT-HIST-010.json';
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
  events: [
    eventPlaceholderOne,
    eventPlaceholderTwo,
    historicalEvent01,
    historicalEvent02,
    historicalEvent03,
    historicalEvent04,
    historicalEvent05,
    historicalEvent06,
    historicalEvent07,
    historicalEvent08,
    historicalEvent09,
    historicalEvent10,
  ],
  archetypes: archetypesJson,
};
