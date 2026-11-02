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

export const MATCH_QUERY_PORT = Symbol('MATCH_QUERY_PORT');
export const MATCH_COMMAND_PORT = Symbol('MATCH_COMMAND_PORT');
export const ARTIFACT_READER_PORT = Symbol('ARTIFACT_READER_PORT');
export const REPLAY_READER_PORT = Symbol('REPLAY_READER_PORT');
export const DEMO_FILE_PORT = Symbol('DEMO_FILE_PORT');
export const ARTIFACT_DELETION_PORT = Symbol('ARTIFACT_DELETION_PORT');
export const API_SETTINGS_PORT = Symbol('API_SETTINGS_PORT');
export const CLOCK_PORT = Symbol('CLOCK_PORT');
export const ID_GENERATOR_PORT = Symbol('ID_GENERATOR_PORT');
export const AUDIT_LOG_PORT = Symbol('AUDIT_LOG_PORT');

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

export interface MatchQueryPort {
  findMatch(id: string): Promise<StoredMatch | null>;
  findJob(id: string): Promise<StoredJob | null>;
  listMatches(cursor: string | undefined, take: number): Promise<StoredMatch[]>;
  findScoringReport(matchId: string, scoringVersion: string, configHash: string): Promise<{ jsonFilePath: string } | null>;
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

export interface MatchCommandPort {
  findDuplicate(fileSha256: string, parserVersion: string, normalizerVersion: string): Promise<DuplicateMatch | null>;
  countActiveJobs(): Promise<number>;
  registerUploadedMatch(input: UploadRegistration): Promise<void>;
  queueRescore(input: RescoreRegistration): Promise<void>;
  findDeletionCandidate(id: string): Promise<MatchDeletionCandidate | null>;
  markDeleting(id: string, requestedAt: Date): Promise<void>;
  deleteMatch(id: string): Promise<void>;
}

export interface StoredMatchArtifact {
  match: MatchData;
  analytics: MatchAnalytics | null;
}

export interface ArtifactReaderPort {
  readMatchArtifact(stored: StoredMatch): Promise<StoredMatchArtifact>;
  readCanonicalResult(stored: StoredMatch, requireActivePolicy?: boolean): Promise<CanonicalMatchResult>;
  readParticipationSidecar(artifact: MatchArtifact, rawFilePath: string | null): Promise<ParticipationSidecar>;
  readScoringReport(relativePath: string): Promise<ScoringReport>;
}

export interface ReplayReaderPort {
  readIndex(matchId: string, fileSha256: string): Promise<ReplayIndexArtifact | null>;
  readRound(index: ReplayIndexArtifact, roundId: string): Promise<ReplayRoundArtifact>;
}

export interface DemoFilePort {
  parserVersion(): string;
  normalizerVersion(): string;
  ownedUploadPath(filePath: string): string;
  hasSource2Magic(filePath: string): Promise<boolean>;
  source2HeaderStatus(filePath: string): 'VALID' | 'INVALID' | 'UNREADABLE';
  sha256(filePath: string): Promise<string>;
  storedRelativePath(filePath: string): string;
  remove(filePath: string): Promise<void>;
}

export interface ArtifactDeletionPort {
  deleteMatchFiles(matchId: string, relativeFiles: ReadonlySet<string>): Promise<void>;
}

export interface ApiSettingsPort {
  maxQueuedJobs(): number;
  participationRatingEnabled(): boolean;
}

export interface ClockPort {
  now(): Date;
  nowMilliseconds(): number;
}

export interface IdGeneratorPort {
  create(): string;
}

export interface AuditLogPort {
  uploadIngested(bytes: number, durationMs: number, duplicate: boolean): void;
}
