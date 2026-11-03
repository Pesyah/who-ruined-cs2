import { Inject, Injectable } from '@nestjs/common';
import { ApplicationError } from '../application-error.js';
import {
  ArtifactDeletionPort,
  ClockPort,
  MatchCommandPort,
  UNFINISHED_JOB_STATUSES,
} from '../ports.js';

const unfinishedJobStatuses: ReadonlySet<string> = new Set(UNFINISHED_JOB_STATUSES);

@Injectable()
export class DeleteMatch {
  constructor(
    @Inject(MatchCommandPort) private readonly matches: MatchCommandPort,
    @Inject(ArtifactDeletionPort) private readonly artifacts: ArtifactDeletionPort,
    @Inject(ClockPort) private readonly clock: ClockPort,
  ) {}

  async execute(id: string): Promise<void> {
    const match = await this.matches.findDeletionCandidate(id);
    if (!match) throw new ApplicationError('MATCH_NOT_FOUND', 'Матч не найден.', 404);
    if (match.jobs.some((job) => unfinishedJobStatuses.has(job.status))) {
      throw new ApplicationError('MATCH_ACTIVE', 'Активный анализ необходимо завершить перед удалением матча.', 409);
    }

    await this.matches.markDeleting(id, match.deletionRequestedAt ?? this.clock.now());
    const files = new Set<string>();
    for (const candidate of [
      match.rawFilePath,
      match.normalizedFilePath,
      match.resultFilePath,
      ...match.reports.map((report) => report.jsonFilePath),
    ]) {
      if (candidate) files.add(candidate);
    }
    await this.artifacts.deleteMatchFiles(id, files);
    await this.matches.deleteMatch(id);
  }
}
