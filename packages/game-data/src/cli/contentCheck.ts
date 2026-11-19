import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ValidationIssue } from '@republika/shared';

import { parseRawContent } from '../parseContent.js';
import { readContentFromDisk } from '../readContentFromDisk.js';

function printIssue(issue: ValidationIssue): void {
  const label = issue.severity === 'error' ? 'KESALAHAN' : 'PERINGATAN';
  console.log(`  [${label}] ${issue.code} di ${issue.path}`);
  console.log(`    ${issue.message}`);
}

function main(): void {
  const contentDirectory =
    process.argv[2] === undefined
      ? resolve(dirname(fileURLToPath(import.meta.url)), '../../content')
      : resolve(process.argv[2]);
  console.log('REPUBLIKA — Pemeriksaan Konten');
  console.log(`Folder: ${contentDirectory}`);

  const disk = readContentFromDisk(contentDirectory);
  console.log(`Berkas JSON terbaca: ${disk.fileCount}`);

  if (disk.issues.length > 0) {
    for (const issue of disk.issues) printIssue(issue);
    console.error(`Pemeriksaan gagal: ${disk.issues.length} masalah baca berkas.`);
    process.exitCode = 1;
    return;
  }

  const result = parseRawContent(disk.raw);
  const allIssues = [...disk.issues, ...result.issues];

  if (allIssues.length > 0) {
    for (const issue of allIssues) printIssue(issue);
    console.error(`Pemeriksaan gagal: ${allIssues.length} kesalahan.`);
    process.exitCode = 1;
  }

  if (result.warnings.length > 0) {
    console.log(`Peringatan konten (${result.warnings.length}):`);
    for (const issue of result.warnings) printIssue(issue);
  }

  if (result.definitions !== null && result.contentHash !== null) {
    const definitions = result.definitions;
    console.log('Ringkasan konten:');
    console.log(
      `  Skenario: ${definitions.scenario.maxTurns} kuartal, ruleset v${definitions.scenario.rulesetVersion}`,
    );
    console.log(
      `  Fraksi: ${definitions.factions.length} (${definitions.factions.reduce((total, faction) => total + faction.seats, 0)} kursi)`,
    );
    console.log(`  Kementerian: ${definitions.ministries.length}`);
    console.log(`  Kebijakan: ${definitions.policies.length}`);
    console.log(`  Event: ${definitions.events.length}`);
    console.log(`  Arketipe: ${definitions.archetypes.length}`);
    console.log(`  Latar belakang: ${definitions.backgrounds.length}`);
    console.log(`  Janji kampanye: ${definitions.promises.length}`);
    console.log(`  Provinsi: ${definitions.provinces.length}`);
    console.log(
      `  Jabatan: ${definitions.ministries.length} menteri + ${definitions.leaders.length} pimpinan, ${definitions.candidates.length} calon`,
    );
    console.log(`contentHash: ${result.contentHash}`);
    console.log(
      `Konten valid. ${result.warnings.length > 0 ? `${result.warnings.length} peringatan untuk ditinjau.` : 'Tidak ada peringatan.'}`,
    );
  }

  if (result.issues.length > 0) {
    process.exitCode = 1;
  }
}

main();
