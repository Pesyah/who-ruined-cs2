import { Inject, Injectable } from '@nestjs/common';
import { ApplicationError } from '../application-error.js';
import {
  ARTIFACT_DELETION_PORT,
  CLOCK_PORT,
  MATCH_COMMAND_PORT,
  type ArtifactDeletionPort,
  type ClockPort,
  type MatchCommandPort,
} from '../ports.js';

const activeJobStatuses = new Set([
  'QUEUED',
  'PARSING',
  'NORMALIZING',
  'VALIDATING',
  'FEATURIZING',
  'SCORING',
]);

@Injectable()
export class DeleteMatch {
  constructor(
    @Inject(MATCH_COMMAND_PORT) private readonly matches: MatchCommandPort,
    @Inject(ARTIFACT_DELETION_PORT) private readonly artifacts: ArtifactDeletionPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(id: string): Promise<void> {
    const match = await this.matches.findDeletionCandidate(id);
    if (!match) throw new ApplicationError('MATCH_NOT_FOUND', 'Матч не найден.', 404);
    if (match.jobs.some((job) => activeJobStatuses.has(job.status))) {
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
