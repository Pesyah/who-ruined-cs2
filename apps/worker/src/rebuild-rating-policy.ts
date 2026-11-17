import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ACTIVE_JOB_STAGES,
  lockMatchArtifacts,
  prisma,
  runSerializedJobWrite,
  type PrismaClient,
} from '@who-ruined/database';
import { evpPolicyId, evpReportSchemaVersion } from '@who-ruined/contracts';
import { evpReportBinding } from '@who-ruined/artifacts';
import { H2_PARTICIPATION_RATING_POLICY, rebuildCanonicalMatchResult } from '@who-ruined/scoring';
import { publishCanonicalMatchResult, readCanonicalMatchResult, removeOwnedResult } from './match-result-storage.js';
import { publishEvpReport, readStoredEvpReport } from './evp-report-storage.js';

export interface RatingRebuildOptions {
  client: PrismaClient;
  dataRoot: string;
  mode: 'apply' | 'dry-run';
  force?: boolean;
  matchId?: string;
  writeOutput?: (line: string) => void;
  writeError?: (line: string) => void;
  afterPublishBeforePointer?: () => void | Promise<void>;
}

export interface RatingRebuildSummary {
  mode: RatingRebuildOptions['mode'];
  target: string;
  matches: number;
  ready: number;
  changed: number;
  blocked: number;
  maxReconstructionError: number;
}

export function parseRatingRebuildArguments(
  argumentsList: string[],
): Pick<RatingRebuildOptions, 'mode' | 'force' | 'matchId'> {
  const apply = argumentsList.includes('--apply');
  const dryRun = argumentsList.includes('--dry-run');
  if (apply === dryRun) throw new Error('Specify exactly one of --dry-run or --apply');
  const matchArgument = argumentsList.find((argument) => argument.startsWith('--match='));
  const matchId = matchArgument?.slice('--match='.length);
  if (matchArgument && !matchId) throw new Error('RATING_REBUILD_MATCH_ID_REQUIRED');
  return {
    mode: apply ? 'apply' : 'dry-run',
    force: argumentsList.includes('--force'),
    ...(matchId ? { matchId } : {}),
  };
}

export async function runRatingRebuild(options: RatingRebuildOptions): Promise<RatingRebuildSummary> {
  const writeOutput = options.writeOutput ?? ((line) => process.stdout.write(line));
  const writeError = options.writeError ?? ((line) => process.stderr.write(line));
  const target = H2_PARTICIPATION_RATING_POLICY;
  const matches = await options.client.match.findMany({
    where: {
      resultFilePath: { not: null },
      ...(options.matchId ? { id: options.matchId } : {}),
    },
    orderBy: { id: 'asc' },
  });
  let ready = 0;
  let changed = 0;
  let blocked = 0;
  let maxReconstructionError = 0;
  for (const match of matches) {
    try {
      if (match.deletionState) throw new Error('MATCH_DELETION_IN_PROGRESS');
      const activeJobs = await options.client.job.count({
        where: { matchId: match.id, status: { in: [...ACTIVE_JOB_STAGES] } },
      });
      if (activeJobs) throw new Error('MATCH_ACTIVE');
      const current = await readCanonicalMatchResult(
        options.dataRoot,
        match.resultFilePath!,
        match.resultSha256 ?? undefined,
      );
      const next = rebuildCanonicalMatchResult(current);
      const nextEvpBinding = evpReportBinding(next);
      const evpPointerComplete = Boolean(
        match.evpFilePath
        && match.evpSha256
        && match.evpSchemaVersion === evpReportSchemaVersion
        && match.evpPolicyId === evpPolicyId
        && match.evpBindingDigest === nextEvpBinding.inputDigest,
      );
      let evpCurrent = false;
      if (evpPointerComplete) {
        try {
          await readStoredEvpReport(options.dataRoot, match.evpFilePath!, match.evpSha256!, next);
          evpCurrent = true;
        } catch {
          evpCurrent = false;
        }
      }
      for (const player of next.activeRating.players) {
        if (!player.rating) continue;
        maxReconstructionError = Math.max(
          maxReconstructionError,
          Math.abs(player.rating.value - player.rating.arithmetic.reconstructed),
        );
      }
      if (
        !options.force
        && current.internal.selectedPolicySelector === target.selector
        && current.internal.selectedPolicyId === target.id
        && current.internal.selectedPolicyDigest === target.digest
        && evpCurrent
      ) {
        ready += 1;
        writeOutput(`${match.id}\tREADY\n`);
        continue;
      }
      if (options.mode === 'dry-run') {
        changed += 1;
        writeOutput(`${match.id}\tWOULD_REBUILD\n`);
        continue;
      }
      const publication = await runSerializedJobWrite(options.client, async (transaction) => {
        await lockMatchArtifacts(transaction, match.id);
        const active = await transaction.job.count({
          where: { matchId: match.id, status: { in: [...ACTIVE_JOB_STAGES] } },
        });
        if (active) throw new Error('MATCH_ACTIVE');
        const verifyOwnedResult = async (): Promise<void> => {
          const owned = await transaction.match.count({
            where: {
              id: match.id,
              resultFilePath: match.resultFilePath,
              resultSha256: match.resultSha256,
              deletionState: null,
            },
          });
          if (owned !== 1) throw new Error('MATCH_RESULT_POINTER_CHANGED');
        };
        const published = await publishCanonicalMatchResult(options.dataRoot, next, verifyOwnedResult);
        const publishedEvp = await publishEvpReport(options.dataRoot, next, verifyOwnedResult);
        await options.afterPublishBeforePointer?.();
        const updated = await transaction.match.updateMany({
          where: {
            id: match.id,
            resultFilePath: match.resultFilePath,
            resultSha256: match.resultSha256,
            deletionState: null,
          },
          data: {
            resultFilePath: published.relativePath,
            resultSha256: published.sha256,
            resultSchemaVersion: next.schemaVersion,
            resultPolicyId: target.id,
            resultPolicyDigest: target.digest,
            evpFilePath: publishedEvp.relativePath,
            evpSchemaVersion: publishedEvp.report.schemaVersion,
            evpSha256: publishedEvp.sha256,
            evpPolicyId: publishedEvp.report.policyId,
            evpBindingDigest: publishedEvp.report.binding.inputDigest,
          },
        });
        if (updated.count !== 1) throw new Error('MATCH_RESULT_POINTER_CHANGED');
        return published;
      });
      if (match.resultFilePath !== publication.relativePath) {
        await removeOwnedResult(options.dataRoot, match.resultFilePath!);
      }
      changed += 1;
      writeOutput(`${match.id}\tREBUILT\n`);
    } catch (error) {
      blocked += 1;
      writeError(`${match.id}\tBLOCKED\t${error instanceof Error ? error.message : 'UNKNOWN'}\n`);
    }
  }
  return {
    mode: options.mode,
    target: target.selector,
    matches: matches.length,
    ready,
    changed,
    blocked,
    maxReconstructionError,
  };
}

async function main(): Promise<void> {
  const summary = await runRatingRebuild({
    client: prisma,
    dataRoot: path.resolve(process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data')),
    ...parseRatingRebuildArguments(process.argv.slice(2)),
  });
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  await prisma.$disconnect();
  if (summary.blocked) process.exitCode = 2;
}

const executedFile = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (executedFile === import.meta.url) await main();
