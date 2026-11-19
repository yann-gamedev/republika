import { mkdirSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';

import { parseRawContent } from '@republika/game-data';
import { readContentFromDisk } from '@republika/game-data/disk';
import type { GameDefinitions } from '@republika/shared';
import {
  STRATEGIES,
  backgroundShowdown,
  campaignMetrics,
  type CampaignMetrics,
  type Strategy,
} from '@republika/simulation/test-utils';

import { aggregate, balanceMarkdown } from './aggregate.js';

/**
 * pnpm balance --runs=5000 [--strategies=all|a,b] [--turns=20] [--seed=bal]
 *               [--workers=N] [--out=docs/balance/latest.md] [--content=dir]
 *
 * `--runs` adalah total kampanye, dibagi rata ke strategi terpilih. Seed tiap
 * kampanye = `<seed>-<strategi>-<i>`, jadi hasil identik berapa pun jumlah worker.
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

function runInWorker(
  defs: GameDefinitions,
  tasks: ReadonlyArray<{ strategy: Strategy; seed: string }>,
  turns: number,
): Promise<CampaignMetrics[]> {
  return new Promise((resolvePromise, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      workerData: { defs, tasks, turns },
      execArgv: ['--import', 'tsx'],
    });
    worker.once('message', (results: CampaignMetrics[]) => resolvePromise(results));
    worker.once('error', reject);
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const runs = Number.parseInt(args.get('runs') ?? '5000', 10);
  if (!Number.isInteger(runs) || runs < 1) fail('--runs harus bilangan bulat positif.');
  const turns = Number.parseInt(args.get('turns') ?? '20', 10);
  if (!Number.isInteger(turns) || turns < 1 || turns > 100) fail('--turns harus 1–100.');
  const strategiesArg = args.get('strategies') ?? 'all';
  const strategies = (
    strategiesArg === 'all' ? [...STRATEGIES] : strategiesArg.split(',')
  ) as Strategy[];
  for (const strategy of strategies) {
    if (!STRATEGIES.includes(strategy)) fail(`strategi "${strategy}" tidak dikenal.`);
  }
  const seed = args.get('seed') ?? 'balance';
  const cwd = process.env.INIT_CWD ?? process.cwd();
  const contentDir = resolve(cwd, args.get('content') ?? 'packages/game-data/content');
  const disk = readContentFromDisk(contentDir);
  const parsed = parseRawContent(disk.raw);
  if (disk.issues.length > 0 || parsed.definitions === null)
    fail(`konten tidak valid di ${contentDir}.`);
  const defs = parsed.definitions;

  const tasks = Array.from({ length: runs }, (_, index) => {
    const strategy = strategies[index % strategies.length] as Strategy;
    return { strategy, seed: `${seed}-${strategy}-${Math.floor(index / strategies.length)}` };
  });

  const workers = Math.max(
    1,
    Math.min(Number.parseInt(args.get('workers') ?? `${availableParallelism()}`, 10), tasks.length),
  );
  const started = performance.now();
  let metrics: CampaignMetrics[];
  if (workers === 1) {
    metrics = tasks.map((task) => campaignMetrics(defs, task.strategy, task.seed, turns));
  } else {
    const chunks = Array.from({ length: workers }, (_, worker) =>
      tasks.filter((_, index) => index % workers === worker),
    );
    metrics = (await Promise.all(chunks.map((chunk) => runInWorker(defs, chunk, turns)))).flat();
  }
  const seconds = (performance.now() - started) / 1000;

  // Tahap 6B.2: latar belakang tidak boleh menang di > 40% pertandingan.
  const showdownSeeds = Math.max(1, Math.ceil(runs / 50));
  const showdown =
    defs.backgrounds.length > 1
      ? backgroundShowdown(defs, strategies, showdownSeeds, seed, turns)
      : null;
  const summary = aggregate(metrics, defs, strategies, showdown);
  const markdown = balanceMarkdown(summary, { seed, turns });
  const out = args.get('out');
  if (out === undefined) {
    process.stdout.write(markdown);
  } else {
    const target = resolve(cwd, out);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, markdown, 'utf8');
    console.log(`Laporan ditulis ke ${target}`);
  }
  console.error(
    `Selesai: ${summary.runs} kampanye, ${workers} worker, ${seconds.toFixed(1)} dtk, softlock ${summary.softlocks.length}, save maks ${(summary.saveBytes.max / 1024).toFixed(1)} KiB.`,
  );
  if (summary.softlocks.length > 0) process.exitCode = 1;
}

void main();
