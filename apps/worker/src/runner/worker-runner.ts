import type { resolveWorkerRuntimeConfig } from '../runtime-config.js';
import type { workerDependencies } from './worker-dependencies.js';

type WorkerRuntimeConfig = ReturnType<typeof resolveWorkerRuntimeConfig>;
type WorkerDependencies = typeof workerDependencies;

export interface WorkerRunnerOptions {
  config: WorkerRuntimeConfig;
  dataRoot: string;
  dependencies: WorkerDependencies;
}

export async function runWorker({ config, dataRoot, dependencies }: WorkerRunnerOptions): Promise<void> {
  await dependencies.recoverExpiredJobs({ leaseMs: config.leaseMs, maxAttempts: config.maxJobAttempts });
  const reconciliation = await dependencies.reconcileWorkerTemp(dataRoot);
  if (reconciliation.removed > 0) console.log(JSON.stringify({ level: 'info', event: 'artifactDiscarded', count: reconciliation.removed }));
  const orphanedResults = await dependencies.reconcileOrphanedMatchResults(dataRoot);
  if (orphanedResults.removed > 0) console.log(JSON.stringify({ level: 'info', event: 'orphanedResultDiscarded', count: orphanedResults.removed }));
  const deletedMatches = await dependencies.reconcileDeletingMatches(dataRoot);
  if (deletedMatches > 0) console.log(JSON.stringify({ level: 'info', event: 'matchDeletionReconciled', count: deletedMatches }));
  const sourceCleanup = await dependencies.reconcilePublishedSourceCleanup(dataRoot, config.retainSourceDemo);
  if (sourceCleanup.removed > 0) console.log(JSON.stringify({ level: 'info', event: 'sourceCleanupReconciled', count: sourceCleanup.removed }));

  let stopping = false;
  let activeAbort: AbortController | null = null;

  const stop = () => {
    stopping = true;
    activeAbort?.abort();
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);

  while (!stopping) {
    const job = await dependencies.claimNextJob({ leaseMs: config.leaseMs, maxAttempts: config.maxJobAttempts });
    if (!job) {
      await new Promise((resolve) => setTimeout(resolve, config.pollMs));
      continue;
    }
    console.log(JSON.stringify({ level: 'info', event: 'jobClaimed', type: job.type, attempt: job.attempt }));
    if (job.attempt > 1) console.log(JSON.stringify({ level: 'info', event: 'jobRecovered', type: job.type, attempt: job.attempt }));
    activeAbort = new AbortController();
    let renewing = false;
    const heartbeat = setInterval(async () => {
      if (renewing || activeAbort?.signal.aborted) return;
      renewing = true;
      try {
        const renewed = await dependencies.renewJobLease(job.id, job.leaseToken, config.leaseMs);
        if (!renewed) activeAbort?.abort();
      } catch {
        activeAbort?.abort();
      } finally {
        renewing = false;
      }
    }, config.heartbeatMs);
    heartbeat.unref();
    try {
      await dependencies.processJob(job.id, job.matchId, job.leaseToken, { signal: activeAbort.signal, config });
    } finally {
      clearInterval(heartbeat);
      if (stopping) await dependencies.releaseJobLeaseForRetry(job.id, job.leaseToken, config.maxJobAttempts);
      const reconciled = await dependencies.reconcileOrphanedMatchResults(dataRoot);
      if (reconciled.removed > 0) console.log(JSON.stringify({ level: 'info', event: 'orphanedResultDiscarded', count: reconciled.removed }));
      activeAbort = null;
    }
  }
  await dependencies.disconnect();
}
