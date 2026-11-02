import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { MatchesModule } from './modules/matches/matches.module.js';
import { ReplayModule } from './modules/replay/replay.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';

@Module({ imports: [HealthModule, MatchesModule, ReportsModule, ReplayModule] })
export class AppModule {}
