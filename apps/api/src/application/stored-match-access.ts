import { Inject, Injectable } from '@nestjs/common';
import type { MatchData } from '@who-ruined/contracts';
import { ApplicationError } from './application-error.js';
import {
  ARTIFACT_READER_PORT,
  MATCH_QUERY_PORT,
  type ArtifactReaderPort,
  type MatchQueryPort,
  type StoredMatch,
  type StoredMatchArtifact,
} from './ports.js';

@Injectable()
export class StoredMatchAccess {
  constructor(
    @Inject(MATCH_QUERY_PORT) private readonly matches: MatchQueryPort,
    @Inject(ARTIFACT_READER_PORT) private readonly artifacts: ArtifactReaderPort,
  ) {}

  async requireRecord(id: string): Promise<StoredMatch> {
    const stored = await this.matches.findMatch(id);
    if (!stored || stored.deletionState) throw new ApplicationError('MATCH_NOT_FOUND', 'Матч не найден.', 404);
    return stored;
  }

  async load(id: string): Promise<StoredMatchArtifact> {
    return this.artifacts.readMatchArtifact(await this.requireRecord(id));
  }

  async match(id: string): Promise<MatchData> {
    return (await this.load(id)).match;
  }
}
