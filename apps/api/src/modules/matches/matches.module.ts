import { Module } from '@nestjs/common';
import {
  API_SETTINGS_PORT,
  ARTIFACT_DELETION_PORT,
  ARTIFACT_READER_PORT,
  AUDIT_LOG_PORT,
  CLOCK_PORT,
  DEMO_FILE_PORT,
  ID_GENERATOR_PORT,
  MATCH_COMMAND_PORT,
  MATCH_QUERY_PORT,
  REPLAY_READER_PORT,
} from '../../application/ports.js';
import { StoredMatchAccess } from '../../application/stored-match-access.js';
import { DeleteMatch } from '../../application/use-cases/delete-match.js';
import { IngestDemo } from '../../application/use-cases/ingest-demo.js';
import { MatchQueries } from '../../application/use-cases/match-queries.js';
import { ReplayQueries } from '../../application/use-cases/replay-queries.js';
import { ReportQueries } from '../../application/use-cases/report-queries.js';
import { RescoreMatch } from '../../application/use-cases/rescore-match.js';
import { LocalArtifactDeletion } from '../../infrastructure/local-artifact-deletion.js';
import { LocalDemoFiles } from '../../infrastructure/local-demo-files.js';
import { PrismaApiRepository } from '../../infrastructure/prisma-api-repository.js';
import { StoredArtifactReader } from '../../infrastructure/stored-artifact-reader.js';
import { StoredReplayReader } from '../../infrastructure/stored-replay-reader.js';
import {
  ConsoleAuditLog,
  CryptoIdGenerator,
  RuntimeApiSettings,
  SystemClock,
} from '../../infrastructure/system-services.js';
import { MatchesController } from './matches.controller.js';

@Module({
  controllers: [MatchesController],
  providers: [
    PrismaApiRepository,
    StoredArtifactReader,
    StoredReplayReader,
    LocalDemoFiles,
    LocalArtifactDeletion,
    RuntimeApiSettings,
    SystemClock,
    CryptoIdGenerator,
    ConsoleAuditLog,
    { provide: MATCH_QUERY_PORT, useExisting: PrismaApiRepository },
    { provide: MATCH_COMMAND_PORT, useExisting: PrismaApiRepository },
    { provide: ARTIFACT_READER_PORT, useExisting: StoredArtifactReader },
    { provide: REPLAY_READER_PORT, useExisting: StoredReplayReader },
    { provide: DEMO_FILE_PORT, useExisting: LocalDemoFiles },
    { provide: ARTIFACT_DELETION_PORT, useExisting: LocalArtifactDeletion },
    { provide: API_SETTINGS_PORT, useExisting: RuntimeApiSettings },
    { provide: CLOCK_PORT, useExisting: SystemClock },
    { provide: ID_GENERATOR_PORT, useExisting: CryptoIdGenerator },
    { provide: AUDIT_LOG_PORT, useExisting: ConsoleAuditLog },
    StoredMatchAccess,
    IngestDemo,
    MatchQueries,
    ReportQueries,
    ReplayQueries,
    RescoreMatch,
    DeleteMatch,
  ],
  exports: [ReportQueries, ReplayQueries, RescoreMatch],
})
export class MatchesModule {}
