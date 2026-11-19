import ruleset2 from '../migrations/ruleset-2.json';
import ruleset3 from '../migrations/ruleset-3.json';
import { rulesetMigrationMapSchema, type RulesetMigrationMap } from '@republika/shared';

/**
 * Peta migrasi ruleset yang dibundel (AGENT §5.13). Setiap kali ID konten
 * diganti/dihapus dan `rulesetVersion` naik, tambahkan file
 * `migrations/ruleset-<N>.json` lalu daftarkan di sini, mis.:
 *
 *   import ruleset4 from '../migrations/ruleset-4.json';
 *   const RAW_MAPS: readonly unknown[] = [ruleset4];
 *
 * Lihat docs/RELEASE.md.
 */
/** v2: ID fraksi placeholder diganti ID final (nama partai fiktif baru). */
/** v3: konten Tahap 6B (latar belakang, janji, provinsi, kabinet); tidak ada ID yang diganti. */
const RAW_MAPS: readonly unknown[] = [ruleset2, ruleset3];

export const rulesetMigrationMaps: readonly RulesetMigrationMap[] = RAW_MAPS.map((raw) =>
  rulesetMigrationMapSchema.parse(raw),
);
