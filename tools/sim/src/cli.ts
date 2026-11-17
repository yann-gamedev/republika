import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseRawContent } from '@republika/game-data';
import { readContentFromDisk } from '@republika/game-data/disk';
import {
  STRATEGIES,
  campaignMarkdown,
  runCampaign,
  type Strategy,
} from '@republika/simulation/test-utils';

/**
 * pnpm sim --seed=<s> --strategy=<random|greedy-approval|austerity|welfare|no-op>
 *          --turns=20 [--out=report.md] [--content=<folder>]
 *
 * Membaca konten langsung dari disk (sama seperti content:check), menjalankan
 * satu kampanye bot, lalu mencetak/menulis laporan markdown.
 */
function parseArgs(argv: readonly string[]): Map<string, string> {
  const args = new Map<string, string>();
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.*)$/u.exec(arg);
    if (match?.[1] !== undefined && match[2] !== undefined) args.set(match[1], match[2]);
  }
  return args;
}

function fail(message: string): never {
  console.error(`Kesalahan: ${message}`);
  process.exit(1);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const seed = args.get('seed') ?? 'republika';
  const strategy = (args.get('strategy') ?? 'random') as Strategy;
  if (!STRATEGIES.includes(strategy)) {
    fail(`strategi "${strategy}" tidak dikenal. Pilih: ${STRATEGIES.join(', ')}.`);
  }
  const turnsArg = args.get('turns');
  const turns = turnsArg === undefined ? undefined : Number.parseInt(turnsArg, 10);
  if (turns !== undefined && (!Number.isInteger(turns) || turns < 1 || turns > 100)) {
    fail('--turns harus bilangan bulat 1–100.');
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const contentDir = resolve(
    process.env.INIT_CWD ?? process.cwd(),
    args.get('content') ?? resolve(here, '../../../packages/game-data/content'),
  );
  const disk = readContentFromDisk(contentDir);
  const parsed = parseRawContent(disk.raw);
  if (disk.issues.length > 0 || parsed.definitions === null) {
    fail(`konten tidak valid di ${contentDir}. Jalankan pnpm content:check untuk rinciannya.`);
  }

  const started = performance.now();
  const run = runCampaign({
    defs: parsed.definitions,
    seed,
    strategy,
    ...(turns === undefined ? {} : { turns }),
  });
  const markdown = campaignMarkdown(run, parsed.definitions);
  const elapsed = performance.now() - started;

  const out = args.get('out');
  if (out === undefined) {
    process.stdout.write(markdown);
  } else {
    const target = resolve(process.env.INIT_CWD ?? process.cwd(), out);
    writeFileSync(target, markdown, 'utf8');
    console.log(`Laporan ditulis ke ${target}`);
  }
  console.error(
    `Selesai: ${run.reports.length} kuartal, arketipe "${run.archetypeName ?? '—'}", ${elapsed.toFixed(0)} ms.`,
  );
}

main();
