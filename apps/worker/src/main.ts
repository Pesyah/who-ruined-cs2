import { claimNextJob, prisma } from '@who-ruined/database';
import { processJob } from './process-job.js';

const pollMs = Number(process.env.WORKER_POLL_MS ?? 1000);
let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

while (!stopping) {
  const job = await claimNextJob(120_000);
  if (job) await processJob(job.id, job.matchId);
  else await new Promise((resolve) => setTimeout(resolve, pollMs));
}
await prisma.$disconnect();
