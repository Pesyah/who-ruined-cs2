import path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { ApplicationError } from '../application-error.js';
import {
  ApiSettingsPort,
  AuditLogPort,
  ClockPort,
  DemoFilePort,
  type DuplicateMatch,
  IdGeneratorPort,
  MatchCommandPort,
} from '../ports.js';

export interface IngestDemoResult {
  matchId: string;
  jobId: string;
  duplicate: boolean;
}

@Injectable()
export class IngestDemo {
  constructor(
    @Inject(MatchCommandPort) private readonly matches: MatchCommandPort,
    @Inject(DemoFilePort) private readonly demoFiles: DemoFilePort,
    @Inject(ApiSettingsPort) private readonly settings: ApiSettingsPort,
    @Inject(ClockPort) private readonly clock: ClockPort,
    @Inject(IdGeneratorPort) private readonly ids: IdGeneratorPort,
    @Inject(AuditLogPort) private readonly auditLog: AuditLogPort,
  ) {}

  private duplicateResult(file: Express.Multer.File, startedAt: number, duplicate: DuplicateMatch): IngestDemoResult {
    this.auditLog.uploadIngested(file.size, this.clock.nowMilliseconds() - startedAt, true);
    return { matchId: duplicate.id, jobId: duplicate.jobs[0]?.id ?? '', duplicate: true };
  }

  async execute(file: Express.Multer.File): Promise<IngestDemoResult> {
    const startedAt = this.clock.nowMilliseconds();
    const temporaryPath = this.demoFiles.ownedUploadPath(file.path);
    let retainedByMatch = false;
    try {
      if (!file.originalname.toLowerCase().endsWith('.dem')) throw new ApplicationError('INVALID_DEMO', 'Поддерживаются только файлы .dem.', 415);
      if (file.size === 0) throw new ApplicationError('INVALID_DEMO', 'Файл пуст.', 422);
      if (file.size < 16 || !(await this.demoFiles.hasSource2Magic(temporaryPath))) {
        throw new ApplicationError('INVALID_DEMO', 'Файл не содержит заголовок CS2 Source 2 demo.', 422);
      }
      const headerStatus = this.demoFiles.source2HeaderStatus(temporaryPath);
      if (headerStatus === 'UNREADABLE') {
        throw new ApplicationError('INVALID_DEMO', 'Не удалось прочитать заголовок демо.', 422);
      }
      if (headerStatus === 'INVALID') {
        throw new ApplicationError('INVALID_DEMO', 'Файл не подтверждён как CS2 Source 2 demo.', 422);
      }

      const fileHash = await this.demoFiles.sha256(temporaryPath);
      const parserVersion = this.demoFiles.parserVersion();
      const normalizerVersion = this.demoFiles.normalizerVersion();
      const findDuplicate = () => this.matches.findDuplicate(fileHash, parserVersion, normalizerVersion);
      const duplicate = await findDuplicate();
      if (duplicate) return this.duplicateResult(file, startedAt, duplicate);

      if (await this.matches.countActiveJobs() >= this.settings.maxQueuedJobs()) {
        throw new ApplicationError('QUEUE_SATURATED', 'Очередь анализа временно заполнена.', 503);
      }

      const matchId = this.ids.create();
      const jobId = this.ids.create();
      try {
        await this.matches.registerUploadedMatch({
          matchId,
          jobId,
          originalFileName: path.basename(file.originalname).slice(0, 255),
          fileSha256: fileHash,
          parserVersion,
          normalizerVersion,
          rawFilePath: this.demoFiles.storedRelativePath(temporaryPath),
        });
      } catch {
        const concurrentDuplicate = await findDuplicate().catch(() => null);
        if (concurrentDuplicate) return this.duplicateResult(file, startedAt, concurrentDuplicate);
        throw new ApplicationError('INGESTION_PERSISTENCE_FAILED', 'Не удалось сохранить загрузку и поставить её в очередь.', 503);
      }

      retainedByMatch = true;
      this.auditLog.uploadIngested(file.size, this.clock.nowMilliseconds() - startedAt, false);
      return { matchId, jobId, duplicate: false };
    } finally {
      if (!retainedByMatch) await this.demoFiles.remove(temporaryPath).catch(() => undefined);
    }
  }
}
