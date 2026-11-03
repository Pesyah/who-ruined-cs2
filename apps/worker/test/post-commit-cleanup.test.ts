import { DatabaseSync } from 'node:sqlite';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchArtifactSchema, type ParticipationSidecar } from '@who-ruined/contracts';
import { computeMatchAnalytics } from '@who-ruined/features';
import {
  buildCanonicalMatchResult,
  C2S2_MODEL_VERSION,
  C2S2_POLICY_DIGEST,
  C2S2_REFERENCE_VERSION,
} from '@who-ruined/scoring';
import { syntheticValidMatch } from '@who-ruined/testkit';
import { PrismaClient } from '../../../packages/database/generated/client/index.js';

const database = vi.hoisted(() => ({ client: null as unknown as PrismaClient | null }));

vi.mock('@who-ruined/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@who-ruined/database')>();
  const prisma = new Proxy({}, {
    get: (_target, property) => {
      if (!database.client) throw new Error('TEST_DATABASE_NOT_READY');
      const value = database.client[property as keyof PrismaClient];
      return typeof value === 'function' ? value.bind(database.client) : value;
    },
  });
  return { ...actual, prisma };
});

const { cleanupRawAfterPublication, runPostCommitCleanup } = await import(
  '../src/job-lifecycle.js'
);
const { publishCanonicalMatchResult, readCanonicalMatchResult } = await import(
  '../src/match-result-storage.js'
);
const { PARTICIPATION_SIDECAR_POLICIES, PARTICIPATION_SIDECAR_SCHEMA_VERSION } = await import(
  '../src/participation-model.js'
);
const { reconcilePublishedSourceCleanup } = await import('../src/reconcile.js');

const roots: string[] = [];
const clients: PrismaClient[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  database.client = null;
  await Promise.all(clients.splice(0).map((client) => client.$disconnect()));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function sidecarFixture(): ParticipationSidecar {
  const match = syntheticValidMatch();
  const profiles = match.players.map((player, index) => {
    const tRounds = match.rounds.filter(
      (round) => round.sideByTeamId[player.teamId] === 'T',
    ).length;
    const ctRounds = match.rounds.length - tRounds;
    const calculated = {
      status: 'CALCULATED_RESEARCH_ONLY' as const,
      reason: null,
      familyContributions: {
        COMBAT: 0,
        SUPPORT: 0,
        DEATH_RELATED: 0,
        DIRECT_HARM: 0,
        CONTEXT: 0,
        OBJECTIVES: 0,
      },
      episodeContributions: [],
    };
    const prepared = {
      profileKey: `${match.matchId}:P${String(index + 1).padStart(2, '0')}`,
      playerId: player.id,
      teamId: player.teamId,
      scenario: 'BOMB' as const,
      rounds: match.rounds.length,
      validRounds: match.rounds.length,
      tRounds,
      ctRounds,
      requiredInputStatus: 'COMPLETE',
      p4BPlus: calculated,
      p4CPlus: {
        ...calculated,
        objectiveSignals: { 'objective:plants': 0, 'objective:defuses': 0 },
      },
    };
    return {
      profileKey: prepared.profileKey,
      playerId: player.id,
      teamId: player.teamId,
      status: 'ELIGIBLE' as const,
      reason: null,
      verifiedRounds: match.rounds.length,
      absentRounds: 0,
      partialRounds: 0,
      unknownRounds: 0,
      globalExcludedRounds: 0,
      tRounds,
      ctRounds,
      countedRoundIds: match.rounds.map((round) => round.id),
      excludedRoundIds: [],
      prepared,
    };
  });
  return {
    schemaVersion: PARTICIPATION_SIDECAR_SCHEMA_VERSION,
    createdAt: '2026-11-03T00:00:00.000Z',
    fingerprint: 'f'.repeat(64),
    binding: {
      matchId: match.matchId,
      fileSha256: match.fileSha256,
      parserVersion: 'synthetic-parser',
      normalizerVersion: 'synthetic-normalizer',
    },
    model: {
      preparedInputModel: C2S2_MODEL_VERSION,
      preparedInputDigest: C2S2_POLICY_DIGEST,
      referenceVersion: C2S2_REFERENCE_VERSION,
      policies: PARTICIPATION_SIDECAR_POLICIES,
    },
    scenario: 'BOMB',
    participation: [],
    profiles,
    provenance: {
      source: 'RAW_DEMO_EVENTS_AND_TICKS',
      lifecycleEvents: [],
      contextTags: [],
      s2AppliedBy: 'synthetic-test',
    },
  };
}

async function cleanupFixture(): Promise<{
  client: PrismaClient;
  dataRoot: string;
  rawFilePath: string;
  rawTarget: string;
  resultFilePath: string;
  resultSha256: string;
}> {
  const dataRoot = await mkdtemp(path.join(os.tmpdir(), 'wrc-post-commit-cleanup-'));
  roots.push(dataRoot);
  const rawFilePath = 'uploads/synthetic.dem';
  const rawTarget = path.join(dataRoot, 'uploads', 'synthetic.dem');
  await mkdir(path.dirname(rawTarget), { recursive: true });
  await writeFile(rawTarget, 'synthetic source');

  const match = syntheticValidMatch();
  const artifact = matchArtifactSchema.parse({
    schemaVersion: 'm2-artifact-1',
    match,
    analytics: computeMatchAnalytics(match),
  });
  const result = buildCanonicalMatchResult({
    artifact,
    sidecar: sidecarFixture(),
    productionReports: [],
    sourceDemoRetained: true,
    createdAt: '2026-11-03T00:00:00.000Z',
  });
  const published = await publishCanonicalMatchResult(dataRoot, result);

  const databasePath = path.join(dataRoot, 'cleanup.db');
  const sql = new DatabaseSync(databasePath);
  sql.exec(`
    CREATE TABLE Match (
      id TEXT PRIMARY KEY, originalFileName TEXT NOT NULL, fileSha256 TEXT NOT NULL,
      map TEXT, status TEXT NOT NULL, quality TEXT, createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL, parserVersion TEXT NOT NULL, normalizerVersion TEXT NOT NULL,
      normalizedFilePath TEXT, rawFilePath TEXT, resultFilePath TEXT, resultSchemaVersion TEXT,
      resultSha256 TEXT, resultPolicyId TEXT, resultPolicyDigest TEXT, sourceDeletedAt DATETIME,
      deletionState TEXT, deletionRequestedAt DATETIME, winningTeamId TEXT, losingTeamId TEXT
    );
    CREATE TABLE Job (
      id TEXT PRIMARY KEY, matchId TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL,
      stage TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, leaseUntil DATETIME,
      leaseToken TEXT, errorCode TEXT, errorMessage TEXT, requestedScoringVersion TEXT,
      requestedConfigHash TEXT, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL,
      FOREIGN KEY(matchId) REFERENCES Match(id) ON DELETE CASCADE
    );
  `);
  const now = new Date('2026-11-03T00:00:00.000Z').toISOString();
  sql.prepare(`
    INSERT INTO Match (
      id, originalFileName, fileSha256, map, status, quality, createdAt, updatedAt,
      parserVersion, normalizerVersion, rawFilePath, resultFilePath, resultSchemaVersion,
      resultSha256, resultPolicyId, resultPolicyDigest
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    match.matchId, 'synthetic.dem', match.fileSha256, match.map, 'COMPLETED', 'VALID',
    now, now, 'synthetic-parser', 'synthetic-normalizer', rawFilePath,
    published.relativePath, 'match-result@1', published.sha256,
    result.internal.selectedPolicyId, result.internal.selectedPolicyDigest,
  );
  sql.prepare(`
    INSERT INTO Job (id, matchId, type, status, stage, attempts, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('job', match.matchId, 'PARSE', 'COMPLETED', 'COMPLETED', 1, now, now);
  sql.close();

  const client = new PrismaClient({
    datasourceUrl: `file:${databasePath.replaceAll('\\', '/')}`,
  });
  clients.push(client);
  database.client = client;
  return {
    client,
    dataRoot,
    rawFilePath,
    rawTarget,
    resultFilePath: published.relativePath,
    resultSha256: published.sha256,
  };
}

describe('post-commit cleanup', () => {
  it('logs an optional cleanup failure without rejecting the completed operation', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(runPostCommitCleanup(
      'post_commit_cleanup_failed',
      async () => { throw new Error('synthetic delete failure'); },
    )).resolves.toBe(false);

    expect(warning).toHaveBeenCalledOnce();
    expect(JSON.parse(String(warning.mock.calls[0]![0]))).toEqual({
      level: 'warn',
      event: 'post_commit_cleanup_failed',
      code: 'synthetic delete failure',
    });
  });

  it('retries a real failed source cleanup through idempotent reconciliation', async () => {
    const fixture = await cleanupFixture();
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(runPostCommitCleanup(
      'post_commit_cleanup_failed',
      async () => {
        await cleanupRawAfterPublication(
          fixture.dataRoot,
          'synthetic_match',
          fixture.rawFilePath,
          {
            beforeSourceDelete: () => { throw new Error('synthetic delete failure'); },
          },
        );
      },
    )).resolves.toBe(false);

    await expect(access(fixture.rawTarget)).resolves.toBeUndefined();
    await expect(fixture.client.match.findUnique({
      where: { id: 'synthetic_match' },
    })).resolves.toMatchObject({
      status: 'COMPLETED',
      rawFilePath: fixture.rawFilePath,
      resultFilePath: fixture.resultFilePath,
      resultSha256: fixture.resultSha256,
      sourceDeletedAt: null,
    });
    await expect(fixture.client.job.findUnique({ where: { id: 'job' } }))
      .resolves.toMatchObject({ status: 'COMPLETED', stage: 'COMPLETED' });

    await expect(reconcilePublishedSourceCleanup(fixture.dataRoot, false))
      .resolves.toEqual({ removed: 1, retained: 0 });

    await expect(access(fixture.rawTarget)).rejects.toMatchObject({ code: 'ENOENT' });
    const reconciled = await fixture.client.match.findUnique({
      where: { id: 'synthetic_match' },
    });
    expect(reconciled).toMatchObject({
      status: 'COMPLETED',
      rawFilePath: null,
      resultFilePath: fixture.resultFilePath,
      resultSha256: fixture.resultSha256,
      sourceDeletedAt: expect.any(Date),
    });
    await expect(readCanonicalMatchResult(
      fixture.dataRoot,
      fixture.resultFilePath,
      fixture.resultSha256,
    )).resolves.toMatchObject({
      schemaVersion: 'match-result@1',
      artifact: { match: { matchId: 'synthetic_match' } },
    });

    await expect(reconcilePublishedSourceCleanup(fixture.dataRoot, false))
      .resolves.toEqual({ removed: 0, retained: 0 });
    await expect(fixture.client.match.findUnique({
      where: { id: 'synthetic_match' },
    })).resolves.toEqual(reconciled);
    expect(warning).toHaveBeenCalledOnce();
  });
});
