import { Inject, Injectable } from '@nestjs/common';
import { scoringConfigHash } from '@who-ruined/scoring';
import { ApplicationError } from '../application-error.js';
import { resolveScoringConfig } from '../scoring-config.js';
import {
  ID_GENERATOR_PORT,
  MATCH_COMMAND_PORT,
  type IdGeneratorPort,
  type MatchCommandPort,
} from '../ports.js';
import { StoredMatchAccess } from '../stored-match-access.js';

export interface RescoreMatchRequest {
  scoringVersion: string;
  configHash?: string;
}

@Injectable()
export class RescoreMatch {
  constructor(
    @Inject(MATCH_COMMAND_PORT) private readonly matches: MatchCommandPort,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(StoredMatchAccess) private readonly storedMatches: StoredMatchAccess,
  ) {}

  async execute(id: string, request: RescoreMatchRequest): Promise<{
    matchId: string;
    jobId: string;
    scoringVersion: string;
    configHash: string;
  }> {
    const config = resolveScoringConfig(request.scoringVersion, request.configHash);
    const match = await this.storedMatches.requireRecord(id);
    if (!match.normalizedFilePath && !match.resultFilePath) {
      throw new ApplicationError('SOURCE_DEMO_UNAVAILABLE', 'Для rescore нужен сохранённый M2-артефакт или канонический результат.', 409);
    }
    const artifact = await this.storedMatches.load(id);
    if (!artifact.analytics) {
      throw new ApplicationError('INCOMPLETE_MATCH', 'Старый артефакт не содержит M2-аналитику; требуется повторный разбор демо.', 409);
    }
    const jobId = this.ids.create();
    const configHash = scoringConfigHash(config);
    await this.matches.queueRescore({
      jobId,
      matchId: id,
      scoringVersion: config.version,
      configHash,
    });
    return { matchId: id, jobId, scoringVersion: config.version, configHash };
  }
}
