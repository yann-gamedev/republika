import archetypesJson from '../content/archetypes.json';
import backgroundsJson from '../content/backgrounds.json';
import baselineJson from '../content/baseline.json';
import candidatesJson from '../content/cabinet-candidates.json';
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
import regionalEvent01 from '../content/events/EVT-REG-PLACEHOLDER-001.json';
import regionalEvent02 from '../content/events/EVT-REG-PLACEHOLDER-002.json';
import regionalEvent03 from '../content/events/EVT-REG-PLACEHOLDER-003.json';
import factionCakrawala from '../content/factions/FAC-CAKRAWALA.json';
import factionMadani from '../content/factions/FAC-MADANI.json';
import factionPanjiMerdeka from '../content/factions/FAC-PANJI-MERDEKA.json';
import factionSimpulDaerah from '../content/factions/FAC-SIMPUL-DAERAH.json';
import factionSuaraJelata from '../content/factions/FAC-SUARA-JELATA.json';
import factionTunasLestari from '../content/factions/FAC-TUNAS-LESTARI.json';
import leadersJson from '../content/leaders.json';
import ministriesJson from '../content/ministries.json';
import policyEnergy from '../content/policies/POL-ENERGY-PLACEHOLDER-001.json';
import policyFiscal from '../content/policies/POL-FISCAL-PLACEHOLDER-001.json';
import policyGovernance from '../content/policies/POL-GOVERNANCE-PLACEHOLDER-001.json';
import policySocial from '../content/policies/POL-SOCIAL-PLACEHOLDER-001.json';
import promisesJson from '../content/promises.json';
import provincesJson from '../content/provinces.json';
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
    factionCakrawala,
    factionSuaraJelata,
    factionTunasLestari,
    factionMadani,
    factionPanjiMerdeka,
    factionSimpulDaerah,
  ],
  ministries: ministriesJson,
  policies: [policyFiscal, policySocial, policyEnergy, policyGovernance],
  events: [
    eventPlaceholderOne,
    eventPlaceholderTwo,
    regionalEvent01,
    regionalEvent02,
    regionalEvent03,
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
  backgrounds: backgroundsJson,
  promises: promisesJson,
  provinces: provincesJson,
  leaders: leadersJson,
  candidates: candidatesJson,
};
