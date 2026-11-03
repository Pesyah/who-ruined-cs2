import { Injectable } from '@nestjs/common';
import {
  type CanonicalMatchResult,
  matchArtifactSchema,
  matchDataSchema,
  scoringReportSchema,
  type MatchArtifact,
} from '@who-ruined/contracts';
import {
  assertCanonicalMatchResultBinding,
  parseCanonicalMatchResult,
} from '@who-ruined/artifacts';
import { H2_PARTICIPATION_RATING_POLICY } from '@who-ruined/scoring';
import type { ArtifactReaderPort, StoredMatch } from '../application/ports.js';
import { readBoundedGzipJson } from '../bounded-gzip.js';
import { readParticipationSidecarForApi } from '../participation-rating.js';
import { ApplicationError } from '../application/application-error.js';

@Injectable()
export class StoredArtifactReader implements ArtifactReaderPort {
  async readMatchArtifact(stored: StoredMatch) {
    if (stored.resultFilePath) {
      const result = await this.readCanonicalResult(stored);
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

  async readCanonicalResult(
    stored: StoredMatch,
    requireActivePolicy = false,
  ): Promise<CanonicalMatchResult> {
    if (!stored.resultFilePath || !stored.resultSha256) {
      throw new ApplicationError('REPORT_NOT_READY', 'Канонический отчёт ещё не готов.', 409);
    }

    let decoded: unknown;
    try {
      decoded = await readBoundedGzipJson(stored.resultFilePath, stored.resultSha256);
    } catch {
      throw new ApplicationError('REPORT_CORRUPT', 'Канонический отчёт не является корректным gzip JSON.', 409);
    }

    let result: CanonicalMatchResult;
    try {
      result = parseCanonicalMatchResult(decoded);
    } catch {
      throw new ApplicationError('REPORT_CORRUPT', 'Канонический отчёт не соответствует поддерживаемой схеме.', 409);
    }

    try {
      assertCanonicalMatchResultBinding(result, { matchId: stored.id });
    } catch {
      throw new ApplicationError('REPORT_CORRUPT', 'Канонический отчёт привязан к другому матчу.', 409);
    }
    try {
      assertCanonicalMatchResultBinding(result, {
        matchId: stored.id,
        policyId: stored.resultPolicyId,
        policyDigest: stored.resultPolicyDigest,
      });
    } catch {
      throw new ApplicationError('REPORT_CORRUPT', 'Policy binding канонического отчёта и SQLite не совпадает.', 409);
    }

    if (
      requireActivePolicy
      && (
        result.internal.selectedPolicySelector !== H2_PARTICIPATION_RATING_POLICY.selector
        || result.internal.selectedPolicyId !== H2_PARTICIPATION_RATING_POLICY.id
        || result.internal.selectedPolicyDigest !== H2_PARTICIPATION_RATING_POLICY.digest
      )
    ) {
      throw new ApplicationError('REPORT_POLICY_MISMATCH', 'Сохранённый отчёт создан не для H2; выполните локальный rating:rebuild.', 409);
    }
    return result;
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
