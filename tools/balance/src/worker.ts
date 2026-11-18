import { parentPort, workerData } from 'node:worker_threads';

import type { GameDefinitions } from '@republika/shared';
import { campaignMetrics, type Strategy } from '@republika/simulation/test-utils';

interface Job {
  readonly defs: GameDefinitions;
  readonly tasks: ReadonlyArray<{ strategy: Strategy; seed: string }>;
  readonly turns: number;
}

const job = workerData as Job;
const results = job.tasks.map((task) =>
  campaignMetrics(job.defs, task.strategy, task.seed, job.turns),
);
parentPort?.postMessage(results);
