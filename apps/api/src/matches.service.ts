import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, readFile, rm } from 'node:fs/promises';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';
import { prisma } from '@who-ruined/database';
import { isSource2Header, loadNativeParser, NORMALIZER_VERSION, PARSER_LIBRARY_VERSION } from '@who-ruined/parser-adapter';
import { matchDataSchema, type MatchData } from '@who-ruined/contracts';
import { ApiError } from './safe-exception.filter.js';
import { dataRoot, safeDataPath } from './storage.js';
import path from 'node:path';

const unzip = promisify(gunzip);

async function sha256(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

async function hasSource2Magic(filePath: string): Promise<boolean> {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return bytesRead === 8 && buffer.subarray(0, 7).toString('ascii') === 'PBDEMS2';
  } finally { await handle.close(); }
}

@Injectable()
export class MatchesService {
  async ingest(file: Express.Multer.File): Promise<{ matchId: string; jobId: string; duplicate: boolean }> {
    if (!file.originalname.toLowerCase().endsWith('.dem')) { await rm(file.path, { force: true }); throw new ApiError('INVALID_DEMO', 'Поддерживаются только файлы .dem.', 415); }
    if (file.size === 0) { await rm(file.path, { force: true }); throw new ApiError('INVALID_DEMO', 'Файл пуст.', 422); }
    if (file.size < 16 || !(await hasSource2Magic(file.path))) { await rm(file.path, { force: true }); throw new ApiError('INVALID_DEMO', 'Файл не содержит заголовок CS2 Source 2 demo.', 422); }
    let header: unknown;
    try { header = loadNativeParser().parseHeader(file.path); } catch { await rm(file.path, { force: true }); throw new ApiError('INVALID_DEMO', 'Не удалось прочитать заголовок демо.', 422); }
    if (!isSource2Header(header)) { await rm(file.path, { force: true }); throw new ApiError('INVALID_DEMO', 'Файл не подтверждён как CS2 Source 2 demo.', 422); }
    const fileHash = await sha256(file.path);
    const duplicate = await prisma.match.findUnique({ where: { fileSha256_parserVersion_normalizerVersion: { fileSha256: fileHash, parserVersion: PARSER_LIBRARY_VERSION, normalizerVersion: NORMALIZER_VERSION } }, include: { jobs: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (duplicate) { await rm(file.path, { force: true }); return { matchId: duplicate.id, jobId: duplicate.jobs[0]?.id ?? '', duplicate: true }; }
    const matchId = randomUUID(); const jobId = randomUUID();
    const relativeRaw = path.relative(dataRoot, file.path).replaceAll('\\', '/');
    await prisma.$transaction([
      prisma.match.create({ data: { id: matchId, originalFileName: file.originalname.slice(0, 255), fileSha256: fileHash, status: 'QUEUED', parserVersion: PARSER_LIBRARY_VERSION, normalizerVersion: NORMALIZER_VERSION, rawFilePath: relativeRaw } }),
      prisma.job.create({ data: { id: jobId, matchId, type: 'PARSE', status: 'QUEUED', stage: 'QUEUED' } })
    ]);
    return { matchId, jobId, duplicate: false };
  }

  async job(id: string) {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new ApiError('JOB_NOT_FOUND', 'Задача не найдена.', 404);
    return { id: job.id, matchId: job.matchId, status: job.status, stage: job.stage, createdAt: job.createdAt.toISOString(), updatedAt: job.updatedAt.toISOString(), ...(job.errorCode ? { errorCode: job.errorCode } : {}), ...(job.errorMessage ? { message: job.errorMessage } : {}) };
  }

  async list(cursor?: string) {
    const rows = await prisma.match.findMany({ take: 21, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    const items = rows.slice(0, 20).map((match) => ({ id: match.id, map: match.map, score: null, status: match.status, quality: match.quality, createdAt: match.createdAt.toISOString() }));
    return { items, ...(rows.length > 20 ? { nextCursor: rows[19]?.id } : {}) };
  }

  async match(id: string): Promise<MatchData> {
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) throw new ApiError('MATCH_NOT_FOUND', 'Матч не найден.', 404);
    if (!match.normalizedFilePath) throw new ApiError('INCOMPLETE_MATCH', 'Анализ матча ещё не завершён.', 409);
    const raw = await unzip(await readFile(safeDataPath(match.normalizedFilePath)));
    return matchDataSchema.parse(JSON.parse(raw.toString('utf8')));
  }

  async rounds(id: string) { return { items: (await this.match(id)).rounds }; }
}
