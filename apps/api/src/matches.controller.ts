import { Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { MatchesService } from './matches.service.js';
import { dataRoot } from './storage.js';
import { ApiError } from './safe-exception.filter.js';

const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 262_144_000);

@ApiTags('matches')
@Controller()
export class MatchesController {
  constructor(private readonly service: MatchesService) {}

  @Post('matches')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['demo'], properties: { demo: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('demo', { storage: diskStorage({ destination: path.join(dataRoot, 'uploads'), filename: (_request, _file, callback) => callback(null, `${randomUUID()}.dem`) }), limits: { fileSize: maxUploadBytes, files: 1 } }))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new ApiError('INVALID_DEMO', 'Поле multipart demo обязательно.', 422);
    return this.service.ingest(file);
  }

  @Get('jobs/:id') job(@Param('id') id: string) { return this.service.job(id); }
  @Get('matches') list(@Query('cursor') cursor?: string) { return this.service.list(cursor); }
  @Get('matches/:id') match(@Param('id') id: string) { return this.service.match(id); }
  @Get('matches/:id/rounds') rounds(@Param('id') id: string) { return this.service.rounds(id); }
}
