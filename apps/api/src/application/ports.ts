import type {
  CanonicalMatchResult,
  MatchAnalytics,
  MatchArtifact,
  MatchData,
  ParticipationSidecar,
  ReplayIndexArtifact,
  ReplayRoundArtifact,
  ScoringReport,
} from '@who-ruined/contracts';

/** Jobs that count toward admission limits and block destructive deletion. */
export const UNFINISHED_JOB_STATUSES = [
  'QUEUED',
  'PARSING',
  'NORMALIZING',
  'VALIDATING',
  'FEATURIZING',
  'SCORING',
] as const;

export interface StoredMatch {
  id: string;
  fileSha256: string;
  map: string | null;
  status: string;
  quality: string | null;
  createdAt: Date;
  deletionState: string | null;
  deletionRequestedAt: Date | null;
  rawFilePath: string | null;
  normalizedFilePath: string | null;
  resultFilePath: string | null;
  resultSha256: string | null;
  resultPolicyId: string | null;
  resultPolicyDigest: string | null;
}

export interface StoredJob {
  id: string;
  matchId: string;
  status: string;
  stage: string;
  createdAt: Date;
  updatedAt: Date;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface DuplicateMatch {
  id: string;
  jobs: Array<{ id: string }>;
}

export interface MatchDeletionCandidate extends StoredMatch {
  jobs: Array<{ status: string }>;
  reports: Array<{ jsonFilePath: string }>;
}

// Abstract classes give each application boundary one shared TypeScript and Nest runtime token.
export abstract class MatchQueryPort {
  abstract findMatch(id: string): Promise<StoredMatch | null>;
  abstract findJob(id: string): Promise<StoredJob | null>;
  abstract listMatches(cursor: string | undefined, take: number): Promise<StoredMatch[]>;
  abstract findScoringReport(matchId: string, scoringVersion: string, configHash: string): Promise<{ jsonFilePath: string } | null>;
}

export interface UploadRegistration {
  matchId: string;
  jobId: string;
  originalFileName: string;
  fileSha256: string;
  parserVersion: string;
  normalizerVersion: string;
  rawFilePath: string;
}

export interface RescoreRegistration {
  jobId: string;
  matchId: string;
  scoringVersion: string;
  configHash: string;
}

export abstract class MatchCommandPort {
  abstract findDuplicate(fileSha256: string, parserVersion: string, normalizerVersion: string): Promise<DuplicateMatch | null>;
  abstract countActiveJobs(): Promise<number>;
  abstract registerUploadedMatch(input: UploadRegistration): Promise<void>;
  abstract queueRescore(input: RescoreRegistration): Promise<void>;
  abstract findDeletionCandidate(id: string): Promise<MatchDeletionCandidate | null>;
  abstract markDeleting(id: string, requestedAt: Date): Promise<void>;
  abstract deleteMatch(id: string): Promise<void>;
}

export interface StoredMatchArtifact {
  match: MatchData;
  analytics: MatchAnalytics | null;
}

export abstract class ArtifactReaderPort {
  abstract readMatchArtifact(stored: StoredMatch): Promise<StoredMatchArtifact>;
  abstract readCanonicalResult(stored: StoredMatch, requireActivePolicy?: boolean): Promise<CanonicalMatchResult>;
  abstract readParticipationSidecar(artifact: MatchArtifact, rawFilePath: string | null): Promise<ParticipationSidecar>;
  abstract readScoringReport(relativePath: string): Promise<ScoringReport>;
}

export abstract class ReplayReaderPort {
  abstract readIndex(matchId: string, fileSha256: string): Promise<ReplayIndexArtifact | null>;
  abstract readRound(index: ReplayIndexArtifact, roundId: string): Promise<ReplayRoundArtifact>;
}

export abstract class DemoFilePort {
  abstract parserVersion(): string;
  abstract normalizerVersion(): string;
  abstract ownedUploadPath(filePath: string): string;
  abstract hasSource2Magic(filePath: string): Promise<boolean>;
  abstract source2HeaderStatus(filePath: string): 'VALID' | 'INVALID' | 'UNREADABLE';
  abstract sha256(filePath: string): Promise<string>;
  abstract storedRelativePath(filePath: string): string;
  abstract remove(filePath: string): Promise<void>;
}

export abstract class ArtifactDeletionPort {
  abstract deleteMatchFiles(matchId: string, relativeFiles: ReadonlySet<string>): Promise<void>;
}

export abstract class ApiSettingsPort {
  abstract maxQueuedJobs(): number;
  abstract participationRatingEnabled(): boolean;
}

export abstract class ClockPort {
  abstract now(): Date;
  abstract nowMilliseconds(): number;
}

export abstract class IdGeneratorPort {
  abstract create(): string;
}

export abstract class AuditLogPort {
  abstract uploadIngested(bytes: number, durationMs: number, duplicate: boolean): void;
}
