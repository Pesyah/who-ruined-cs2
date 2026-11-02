import type { CanonicalMatchResult } from '@who-ruined/contracts';
import {
  assertCanonicalMatchResultBinding,
  parseCanonicalMatchResult,
} from '@who-ruined/artifacts';
import { PARTICIPATION_RATING_POLICIES } from '@who-ruined/scoring';
import { ApplicationError } from './application/application-error.js';
import { resolveActiveRatingPolicy } from './runtime-config.js';
import { readBoundedGzipJson } from './bounded-gzip.js';

export async function readCanonicalResult(stored: {
  id: string;
  resultFilePath: string | null;
  resultSha256: string | null;
  resultPolicyId: string | null;
  resultPolicyDigest: string | null;
}, requireActivePolicy = false): Promise<CanonicalMatchResult> {
  if (!stored.resultFilePath || !stored.resultSha256) throw new ApplicationError('REPORT_NOT_READY', 'Канонический отчёт ещё не готов.', 409);
  let decoded: unknown;
  try { decoded = await readBoundedGzipJson(stored.resultFilePath, stored.resultSha256); }
  catch { throw new ApplicationError('REPORT_CORRUPT', 'Канонический отчёт не является корректным gzip JSON.', 409); }
  let value: CanonicalMatchResult;
  try {
    value = parseCanonicalMatchResult(decoded);
  } catch {
    throw new ApplicationError('REPORT_CORRUPT', 'Канонический отчёт не соответствует поддерживаемой схеме.', 409);
  }
  try {
    assertCanonicalMatchResultBinding(value, { matchId: stored.id });
  } catch {
    throw new ApplicationError('REPORT_CORRUPT', 'Канонический отчёт привязан к другому матчу.', 409);
  }
  try {
    assertCanonicalMatchResultBinding(value, {
      matchId: stored.id,
      policyId: stored.resultPolicyId,
      policyDigest: stored.resultPolicyDigest,
    });
  } catch {
    throw new ApplicationError('REPORT_CORRUPT', 'Policy binding канонического отчёта и SQLite не совпадает.', 409);
  }
  if (requireActivePolicy) {
    const expected = PARTICIPATION_RATING_POLICIES[resolveActiveRatingPolicy()];
    if (value.internal.selectedPolicyId !== expected.id || value.internal.selectedPolicyDigest !== expected.digest) {
      throw new ApplicationError('REPORT_POLICY_MISMATCH', 'Сохранённый отчёт создан для другой owner policy; выполните локальный rating:rebuild.', 409);
    }
  }
  return value;
}
