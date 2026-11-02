import type { TFunction } from 'i18next';
import {
  isPublicApiErrorCode,
  type JobStatus,
  type PublicApiErrorCode,
} from '@who-ruined/contracts';
import { ApiClientError } from './api/transport.js';

type ErrorMessageCategory =
  | 'GENERAL'
  | 'INCOMPLETE'
  | 'INGESTION'
  | 'INVALID_DEMO'
  | 'JOB'
  | 'MATCH'
  | 'MODE'
  | 'POLICY'
  | 'RATING_DISABLED'
  | 'REPORT_CORRUPT'
  | 'REPORT_NOT_READY'
  | 'REPORT_POLICY'
  | 'SIZE'
  | 'STORAGE';

const publicApiErrorCategory = {
  EXPERIMENTAL_PARTICIPATION_RATING_DISABLED: 'RATING_DISABLED',
  INCOMPLETE_MATCH: 'INCOMPLETE',
  INGESTION_PERSISTENCE_FAILED: 'INGESTION',
  INTERNAL_ERROR: 'GENERAL',
  INVALID_DEMO: 'INVALID_DEMO',
  INVALID_POLICY_SELECTOR: 'POLICY',
  INVALID_QUERY: 'GENERAL',
  INVALID_REQUEST: 'GENERAL',
  JOB_NOT_FOUND: 'JOB',
  MATCH_ACTIVE: 'GENERAL',
  MATCH_NOT_FOUND: 'MATCH',
  PARTICIPATION_SIDECAR_BACKFILL_REQUIRED: 'GENERAL',
  PARTICIPATION_SIDECAR_FINGERPRINT_MISMATCH: 'GENERAL',
  PARTICIPATION_SIDECAR_INVALID: 'GENERAL',
  PARTICIPATION_SIDECAR_POLICY_MISMATCH: 'GENERAL',
  PARTICIPATION_SIDECAR_ROSTER_MISMATCH: 'GENERAL',
  PARTICIPATION_SIDECAR_SCHEMA_MISMATCH: 'GENERAL',
  PARTICIPATION_SIDECAR_STALE: 'GENERAL',
  PARTICIPATION_SIDECAR_UNAVAILABLE_REQUIRES_ORIGINAL_DEMO: 'GENERAL',
  PLAYER_NOT_FOUND: 'GENERAL',
  QUEUE_SATURATED: 'GENERAL',
  REPLAY_CORRUPT: 'GENERAL',
  REPLAY_ROUND_NOT_FOUND: 'GENERAL',
  REPLAY_UNAVAILABLE: 'GENERAL',
  REPORT_CORRUPT: 'REPORT_CORRUPT',
  REPORT_NOT_READY: 'REPORT_NOT_READY',
  REPORT_POLICY_MISMATCH: 'REPORT_POLICY',
  REQUEST_REJECTED: 'GENERAL',
  SIZE_LIMIT: 'SIZE',
  SOURCE_DEMO_UNAVAILABLE: 'GENERAL',
  STORAGE_FAILURE: 'GENERAL',
  STORAGE_UNAVAILABLE: 'STORAGE',
  UNSUPPORTED_MODE: 'MODE',
  UNSUPPORTED_ROSTER_SIZE: 'GENERAL',
  UPLOAD_BUSY: 'GENERAL',
  UPLOAD_STORAGE_INVALID: 'GENERAL',
} as const satisfies Record<PublicApiErrorCode, ErrorMessageCategory>;

function publicErrorMessage(category: ErrorMessageCategory, t: TFunction): string {
  switch (category) {
    case 'INVALID_DEMO': return t('error-invalid-demo', 'Choose a valid, non-empty CS2 .dem file.');
    case 'SIZE': return t('error-size-limit', 'This file exceeds the server upload limit.');
    case 'INGESTION': return t('error-ingestion-persistence', 'The upload could not be saved. Try again later.');
    case 'STORAGE': return t('error-storage-unavailable', 'The analysis storage is unavailable. Ask the operator to check the local service.');
    case 'MODE': return t('error-mode', 'This game mode is not supported yet.');
    case 'INCOMPLETE': return t('error-incomplete', 'The match analysis is not complete yet.');
    case 'MATCH': return t('error-match', 'This match could not be found.');
    case 'JOB': return t('error-job', 'This analysis job could not be found.');
    case 'REPORT_NOT_READY': return t('error-report-not-ready', 'The rating is not ready yet. Wait for processing to finish and try again.');
    case 'REPORT_CORRUPT': return t('error-report-corrupt', 'The stored rating report could not be verified. Operator action is required.');
    case 'REPORT_POLICY': return t('error-report-policy', 'The stored report does not match the active rating configuration. Operator action is required.');
    case 'POLICY': return t('error-policy-selector', 'The client requested an unsupported rating selector.');
    case 'RATING_DISABLED': return t('error-rating-disabled', 'The experimental participation rating is not enabled on this server.');
    case 'GENERAL': return t('error-general', 'Something went wrong. Please try again.');
  }
}

export function statusLabel(status: JobStatus, t: TFunction): string {
  switch (status) {
    case 'QUEUED': return t('status-queued', 'Queued');
    case 'PARSING': return t('status-parsing', 'Reading demo events');
    case 'NORMALIZING': return t('status-normalizing', 'Reconstructing the match');
    case 'VALIDATING': return t('status-validating', 'Checking rounds and scores');
    case 'FEATURIZING': return t('status-featurizing', 'Calculating match metrics');
    case 'SCORING': return t('status-scoring', 'Preparing the analysis');
    case 'COMPLETED': return t('status-completed', 'Ready');
    case 'PARTIAL': return t('status-partial', 'Partial result');
    case 'FAILED': return t('status-failed', 'Analysis failed');
    case 'CANCELLED': return t('status-cancelled', 'Analysis cancelled');
  }
}
export function errorMessage(error: unknown, t: TFunction): string {
  return errorCodeMessage(error instanceof ApiClientError ? error.code : 'UNKNOWN', t);
}
export function errorCodeMessage(code: string, t: TFunction): string {
  if (isPublicApiErrorCode(code)) return publicErrorMessage(publicApiErrorCategory[code], t);
  switch (code) {
    case 'PARSE_TIMEOUT': return t('error-timeout', 'The demo took too long to process. Try another demo.');
    case 'PARSE_FAILED': return t('error-parse', 'The demo could not be read. Try another demo.');
    case 'MISSING_REQUIRED_EVENTS': return t('error-events', 'Required demo events are missing.');
    case 'VALIDATION_FAILED': return t('error-validation', 'The match data could not be validated.');
    case 'NETWORK_ERROR': return t('error-network', 'Cannot reach the analysis service. Check your connection and try again.');
    case 'UPLOAD_TIMEOUT': return t('error-upload-timeout', 'The upload timed out. Check your connection and try again.');
    case 'INVALID_RESPONSE': return t('error-response', 'The service returned an unsupported response.');
    default: return t('error-general', 'Something went wrong. Please try again.');
  }
}
