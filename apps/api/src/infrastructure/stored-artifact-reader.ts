import { Injectable } from '@nestjs/common';
import {
  matchArtifactSchema,
  matchDataSchema,
  scoringReportSchema,
  type MatchArtifact,
} from '@who-ruined/contracts';
import type { ArtifactReaderPort, StoredMatch } from '../application/ports.js';
import { readBoundedGzipJson } from '../bounded-gzip.js';
import { readCanonicalResult } from '../match-result-storage.js';
import { readParticipationSidecarForApi } from '../participation-rating.js';
import { ApplicationError } from '../application/application-error.js';

@Injectable()
export class StoredArtifactReader implements ArtifactReaderPort {
  async readMatchArtifact(stored: StoredMatch) {
    if (stored.resultFilePath) {
      const result = await readCanonicalResult(stored);
      return { match: result.artifact.match, analytics: result.artifact.analytics };
    }
    if (!stored.normalizedFilePath) throw new ApplicationError('INCOMPLETE_MATCH', 'Анализ матча ещё не завершён.', 409);
    let decoded: unknown;
    try {
      decoded = await readBoundedGzipJson(stored.normalizedFilePath);
    } catch {
      throw new ApplicationError('INCOMPLETE_MATCH', 'Сохранённый артефакт недоступен или повреждён.', 409);
    }
    const artifact = matchArtifactSchema.safeParse(decoded);
    if (artifact.success) return { match: artifact.data.match, analytics: artifact.data.analytics };
    const legacy = matchDataSchema.safeParse(decoded);
    if (legacy.success) return { match: legacy.data, analytics: null };
    throw new ApplicationError('INCOMPLETE_MATCH', 'Артефакт создан несовместимой версией; требуется повторный разбор исходного демо.', 409);
  }

  readCanonicalResult(stored: StoredMatch, requireActivePolicy = false) {
    return readCanonicalResult(stored, requireActivePolicy);
  }

  readParticipationSidecar(artifact: MatchArtifact, rawFilePath: string | null) {
    return readParticipationSidecarForApi(artifact, rawFilePath);
  }

  async readScoringReport(relativePath: string) {
    let decoded: unknown;
    try {
      decoded = await readBoundedGzipJson(relativePath);
    } catch {
      throw new ApplicationError('REPORT_CORRUPT', 'Scoring-отчёт недоступен или повреждён.', 409);
    }
    return scoringReportSchema.parse(decoded);
  }
}
