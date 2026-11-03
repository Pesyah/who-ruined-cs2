import { describe, expect, it } from 'vitest';
import {
  ArtifactDeletionPort,
  ClockPort,
  MatchCommandPort,
  UNFINISHED_JOB_STATUSES,
  type MatchDeletionCandidate,
} from '../src/application/ports.js';
import { DeleteMatch } from '../src/application/use-cases/delete-match.js';

const requestedAt = new Date('2026-11-03T00:00:00.000Z');

function deletionCandidate(jobStatus: string): MatchDeletionCandidate {
  return {
    id: 'match-1',
    fileSha256: 'a'.repeat(64),
    map: 'de_dust2',
    status: 'COMPLETED',
    quality: 'VALID',
    createdAt: requestedAt,
    deletionState: null,
    deletionRequestedAt: null,
    rawFilePath: 'uploads/match-1.dem',
    normalizedFilePath: null,
    resultFilePath: 'results/match-1.json.gz',
    resultSha256: 'b'.repeat(64),
    resultPolicyId: null,
    resultPolicyDigest: null,
    jobs: [{ status: jobStatus }],
    reports: [{ jsonFilePath: 'reports/match-1.json.gz' }],
  };
}

class FakeMatchCommands extends MatchCommandPort {
  markedAt: Date | null = null;
  deleted = false;

  constructor(private readonly candidate: MatchDeletionCandidate | null) {
    super();
  }

  findDuplicate(): Promise<null> { return Promise.resolve(null); }
  countActiveJobs(): Promise<number> { return Promise.resolve(0); }
  registerUploadedMatch(): Promise<void> { return Promise.resolve(); }
  queueRescore(): Promise<void> { return Promise.resolve(); }
  findDeletionCandidate(): Promise<MatchDeletionCandidate | null> { return Promise.resolve(this.candidate); }
  markDeleting(_id: string, value: Date): Promise<void> { this.markedAt = value; return Promise.resolve(); }
  deleteMatch(): Promise<void> { this.deleted = true; return Promise.resolve(); }
}

class FakeArtifactDeletion extends ArtifactDeletionPort {
  deletedFiles: ReadonlySet<string> | null = null;

  deleteMatchFiles(_matchId: string, relativeFiles: ReadonlySet<string>): Promise<void> {
    this.deletedFiles = relativeFiles;
    return Promise.resolve();
  }
}

class FixedClock extends ClockPort {
  now(): Date { return requestedAt; }
  nowMilliseconds(): number { return requestedAt.getTime(); }
}

describe('match deletion job-state policy', () => {
  it.each(UNFINISHED_JOB_STATUSES)('blocks deletion while a %s job is unfinished', async (status) => {
    const commands = new FakeMatchCommands(deletionCandidate(status));
    const artifacts = new FakeArtifactDeletion();

    await expect(new DeleteMatch(commands, artifacts, new FixedClock()).execute('match-1'))
      .rejects.toMatchObject({ code: 'MATCH_ACTIVE', status: 409 });
    expect(commands.markedAt).toBeNull();
    expect(commands.deleted).toBe(false);
    expect(artifacts.deletedFiles).toBeNull();
  });

  it('allows deletion after a job reaches a terminal state', async () => {
    const commands = new FakeMatchCommands(deletionCandidate('COMPLETED'));
    const artifacts = new FakeArtifactDeletion();

    await new DeleteMatch(commands, artifacts, new FixedClock()).execute('match-1');

    expect(commands.markedAt).toEqual(requestedAt);
    expect(commands.deleted).toBe(true);
    expect(artifacts.deletedFiles).toEqual(new Set([
      'uploads/match-1.dem',
      'results/match-1.json.gz',
      'reports/match-1.json.gz',
    ]));
  });
});
