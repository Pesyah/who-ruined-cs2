import { Injectable } from '@nestjs/common';
import { prisma } from '@who-ruined/database';
import type {
  MatchCommandPort,
  MatchDeletionCandidate,
  MatchQueryPort,
  RescoreRegistration,
  StoredJob,
  StoredMatch,
  UploadRegistration,
} from '../application/ports.js';

const activeJobStatuses = ['QUEUED', 'PARSING', 'NORMALIZING', 'VALIDATING', 'FEATURIZING', 'SCORING'] as const;

@Injectable()
export class PrismaApiRepository implements MatchQueryPort, MatchCommandPort {
  findMatch(id: string): Promise<StoredMatch | null> {
    return prisma.match.findUnique({ where: { id } });
  }

  findJob(id: string): Promise<StoredJob | null> {
    return prisma.job.findUnique({ where: { id } });
  }

  listMatches(cursor: string | undefined, take: number): Promise<StoredMatch[]> {
    return prisma.match.findMany({
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findScoringReport(matchId: string, scoringVersion: string, configHash: string) {
    return prisma.report.findUnique({
      where: { matchId_scoringVersion_configHash: { matchId, scoringVersion, configHash } },
      select: { jsonFilePath: true },
    });
  }

  async findDuplicate(fileSha256: string, parserVersion: string, normalizerVersion: string) {
    return prisma.match.findUnique({
      where: {
        fileSha256_parserVersion_normalizerVersion: {
          fileSha256,
          parserVersion,
          normalizerVersion,
        },
      },
      select: {
        id: true,
        jobs: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true } },
      },
    });
  }

  countActiveJobs(): Promise<number> {
    return prisma.job.count({ where: { status: { in: [...activeJobStatuses] } } });
  }

  async registerUploadedMatch(input: UploadRegistration): Promise<void> {
    await prisma.$transaction([
      prisma.match.create({
        data: {
          id: input.matchId,
          originalFileName: input.originalFileName,
          fileSha256: input.fileSha256,
          status: 'QUEUED',
          parserVersion: input.parserVersion,
          normalizerVersion: input.normalizerVersion,
          rawFilePath: input.rawFilePath,
        },
      }),
      prisma.job.create({
        data: {
          id: input.jobId,
          matchId: input.matchId,
          type: 'PARSE',
          status: 'QUEUED',
          stage: 'QUEUED',
        },
      }),
    ]);
  }

  async queueRescore(input: RescoreRegistration): Promise<void> {
    await prisma.job.create({
      data: {
        id: input.jobId,
        matchId: input.matchId,
        type: 'RESCORE',
        status: 'QUEUED',
        stage: 'QUEUED',
        requestedScoringVersion: input.scoringVersion,
        requestedConfigHash: input.configHash,
      },
    });
  }

  findDeletionCandidate(id: string): Promise<MatchDeletionCandidate | null> {
    return prisma.match.findUnique({
      where: { id },
      include: { jobs: { select: { status: true } }, reports: { select: { jsonFilePath: true } } },
    });
  }

  async markDeleting(id: string, requestedAt: Date): Promise<void> {
    await prisma.match.update({
      where: { id },
      data: { deletionState: 'DELETING', deletionRequestedAt: requestedAt },
    });
  }

  async deleteMatch(id: string): Promise<void> {
    await prisma.match.delete({ where: { id } });
  }
}
