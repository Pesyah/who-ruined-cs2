import { rm } from 'node:fs/promises';
import {
  ACTIVE_JOB_STAGES,
  advanceJobStage,
  prisma,
} from '@who-ruined/database';
import type { WorkerRuntimeConfig } from './runtime-config.js';
import { assertNoSymlinkComponents, resolveDataPath } from './storage.js';

export interface JobFaultHooks {
  afterStage?: (stage: string) => Promise<void> | void;
}

export async function reachOwnedStage(
  jobId: string,
  leaseToken: string,
  stage: string,
  config: WorkerRuntimeConfig,
  hooks?: JobFaultHooks,
): Promise<void> {
  await advanceJobStage(jobId, leaseToken, stage, config.leaseMs);
  await hooks?.afterStage?.(stage);
}

export async function completeOwnedJob(options: {
  jobId: string;
  matchId: string;
  leaseToken: string;
  terminal: 'COMPLETED' | 'PARTIAL';
  matchData: Record<string, unknown>;
}): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const now = new Date();
    const owned = await transaction.job.count({
      where: {
        id: options.jobId,
        leaseToken: options.leaseToken,
        status: { in: [...ACTIVE_JOB_STAGES] },
        leaseUntil: { gte: now },
      },
    });
    if (owned !== 1) throw new Error('STALE_JOB_OWNER');
    await transaction.match.update({ where: { id: options.matchId }, data: options.matchData });
    const terminal = await transaction.job.updateMany({
      where: {
        id: options.jobId,
        leaseToken: options.leaseToken,
        status: { in: [...ACTIVE_JOB_STAGES] },
        leaseUntil: { gte: now },
      },
      data: {
        status: options.terminal,
        stage: options.terminal,
        leaseUntil: null,
        leaseToken: null,
      },
    });
    if (terminal.count !== 1) throw new Error('STALE_JOB_OWNER');
  });
}

export async function cleanupRawAfterPublication(
  dataRoot: string,
  matchId: string,
  rawFilePath: string,
  hooks?: JobFaultHooks,
): Promise<boolean> {
  const ready = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      resultFilePath: true,
      resultSha256: true,
      rawFilePath: true,
      status: true,
    },
  });
  if (
    !ready?.resultFilePath
    || !ready.resultSha256
    || ready.rawFilePath !== rawFilePath
    || !['COMPLETED', 'PARTIAL'].includes(ready.status)
  ) {
    return false;
  }
  const activeJobs = await prisma.job.count({
    where: { matchId, status: { in: [...ACTIVE_JOB_STAGES] } },
  });
  const shared = await prisma.match.count({
    where: { rawFilePath, id: { not: matchId } },
  });
  if (activeJobs > 0 || shared > 0) return false;
  const rawTarget = resolveDataPath(dataRoot, rawFilePath);
  await assertNoSymlinkComponents(dataRoot, rawTarget);
  await rm(rawTarget, { force: true });
  await hooks?.afterStage?.('RAW_DELETED');
  await prisma.match.updateMany({
    where: {
      id: matchId,
      rawFilePath,
      resultFilePath: ready.resultFilePath,
      resultSha256: ready.resultSha256,
    },
    data: { rawFilePath: null, sourceDeletedAt: new Date() },
  });
  return true;
}

export async function failOwnedJob(
  jobId: string,
  matchId: string,
  leaseToken: string,
  type: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const failed = await transaction.job.updateMany({
      where: {
        id: jobId,
        leaseToken,
        status: { in: [...ACTIVE_JOB_STAGES] },
      },
      data: {
        status: 'FAILED',
        stage: 'FAILED',
        leaseUntil: null,
        leaseToken: null,
        errorCode,
        errorMessage,
      },
    });
    if (failed.count !== 1) return;
    if (type === 'PARSE') {
      await transaction.match.update({
        where: { id: matchId },
        data: { status: 'FAILED', quality: 'UNSUPPORTED' },
      });
    }
  });
}
