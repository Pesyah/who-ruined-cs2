import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from './matches.service.js';

@Module({ controllers: [HealthController, MatchesController], providers: [MatchesService] })
export class AppModule {}
