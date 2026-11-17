import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { matchArtifactSchema } from '@who-ruined/contracts';
import { computeMatchAnalytics } from '@who-ruined/features';
import { buildCanonicalMatchResult } from '@who-ruined/scoring';
import { syntheticValidMatch } from '@who-ruined/testkit';
import {
  createPostgresTestDatabase,
  postgresIntegrationAvailable,
  type PostgresTestDatabase,
} from '../../../packages/database/test/postgres-test-database.js';
import { readStoredEvpReport } from '../src/evp-report-storage.js';
import { publishCanonicalMatchResult, readCanonicalMatchResult } from '../src/match-result-storage.js';
import { reconcileOrphanedMatchResults } from '../src/reconcile.js';
import { runRatingRebuild } from '../src/rebuild-rating-policy.js';
import { waitForMatchArtifactLockWait } from './fixtures/postgres-lock-wait.js';
import { syntheticParticipationSidecar } from './fixtures/synthetic-participation-sidecar.js';

const databases: PostgresTestDatabase[] = [];
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.dispose()));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function canonical() {
  const match = syntheticValidMatch();
  return buildCanonicalMatchResult({
    artifact: matchArtifactSchema.parse({
      schemaVersion: 'm2-artifact-1',
      match,
      analytics: computeMatchAnalytics(match),
    }),
    sidecar: syntheticParticipationSidecar(),
    productionReports: [],
    sourceDemoRetained: false,
    createdAt: '2026-11-09T00:00:00.000Z',
  });
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

async function fixture() {
  const database = await createPostgresTestDatabase(3);
  databases.push(database);
  const dataRoot = await mkdtemp(path.join(os.tmpdir(), 'wrc-rating-rebuild-race-'));
  roots.push(dataRoot);
  const result = canonical();
  const published = await publishCanonicalMatchResult(dataRoot, result);
  await database.clients[0]!.match.create({
    data: {
      id: result.artifact.match.matchId,
      originalFileName: 'synthetic.dem',
      fileSha256: result.artifact.match.fileSha256,
      status: 'COMPLETED',
      quality: 'VALID',
      parserVersion: 'synthetic-parser',
      normalizerVersion: 'synthetic-normalizer',
      resultFilePath: published.relativePath,
      resultSchemaVersion: result.schemaVersion,
      resultSha256: published.sha256,
      resultPolicyId: result.internal.selectedPolicyId,
      resultPolicyDigest: result.internal.selectedPolicyDigest,
    },
  });
  return { clients: database.clients, dataRoot, result };
}

async function expectValidEvpPointer(
  client: PostgresTestDatabase['clients'][number],
  dataRoot: string,
  result: ReturnType<typeof canonical>,
): Promise<void> {
  const persisted = await client.match.findUniqueOrThrow({
    where: { id: result.artifact.match.matchId },
  });
  await expect(access(path.join(dataRoot, persisted.resultFilePath!))).resolves.toBeUndefined();
  await expect(readCanonicalMatchResult(
    dataRoot,
    persisted.resultFilePath!,
    persisted.resultSha256!,
  )).resolves.toMatchObject({
    artifact: { match: { matchId: result.artifact.match.matchId } },
  });
  await expect(access(path.join(dataRoot, persisted.evpFilePath!))).resolves.toBeUndefined();
  await expect(readStoredEvpReport(
    dataRoot,
    persisted.evpFilePath!,
    persisted.evpSha256!,
    result,
  )).resolves.toMatchObject({
    matchId: result.artifact.match.matchId,
    binding: { inputDigest: persisted.evpBindingDigest },
  });
}

describe.skipIf(!postgresIntegrationAvailable)('rating rebuild and reconciliation ordering', () => {
  it('protects rebuild publication when rebuild acquires the match lock first', async () => {
    const { clients, dataRoot, result } = await fixture();
    const published = deferred();
    const allowCommit = deferred();
    const rebuild = runRatingRebuild({
      client: clients[0]!,
      dataRoot,
      mode: 'apply',
      force: true,
      matchId: result.artifact.match.matchId,
      writeOutput: () => undefined,
      writeError: () => undefined,
      afterPublishBeforePointer: async () => {
        published.resolve();
        await allowCommit.promise;
      },
    });
    await published.promise;
    const reconciliation = reconcileOrphanedMatchResults(dataRoot, { client: clients[1]! });
    await waitForMatchArtifactLockWait(clients[2]!, result.artifact.match.matchId);
    allowCommit.resolve();

    await expect(rebuild).resolves.toMatchObject({ changed: 1, blocked: 0 });
    // Post-commit cleanup and reconciliation may race to remove the previous
    // canonical version. Both outcomes are safe; current pointers must survive.
    const reconciliationResult = await reconciliation;
    expect(reconciliationResult.retained).toBe(2);
    expect([0, 1]).toContain(reconciliationResult.removed);
    await expectValidEvpPointer(clients[0]!, dataRoot, result);
  });

  it('publishes safely after reconciliation acquires the match lock first', async () => {
    const { clients, dataRoot, result } = await fixture();
    const evpDirectory = path.join(dataRoot, 'experimental', 'evp', result.artifact.match.matchId);
    const orphan = path.join(evpDirectory, 'orphan.json.gz');
    await mkdir(evpDirectory, { recursive: true });
    await writeFile(orphan, 'orphan');
    const locked = deferred();
    const allowReconciliation = deferred();
    let paused = false;
    const reconciliation = reconcileOrphanedMatchResults(dataRoot, {
      client: clients[1]!,
      afterMatchLock: async (matchId) => {
        if (paused || matchId !== result.artifact.match.matchId) return;
        paused = true;
        locked.resolve();
        await allowReconciliation.promise;
      },
    });
    await locked.promise;
    const rebuild = runRatingRebuild({
      client: clients[0]!,
      dataRoot,
      mode: 'apply',
      force: true,
      matchId: result.artifact.match.matchId,
      writeOutput: () => undefined,
      writeError: () => undefined,
    });
    allowReconciliation.resolve();

    await expect(reconciliation).resolves.toMatchObject({ removed: 1 });
    await expect(rebuild).resolves.toMatchObject({ changed: 1, blocked: 0 });
    await expect(access(orphan)).rejects.toMatchObject({ code: 'ENOENT' });
    await expectValidEvpPointer(clients[0]!, dataRoot, result);
  });
});
