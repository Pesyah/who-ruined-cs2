import { Module } from '@nestjs/common';
import { MatchesModule } from '../matches/matches.module.js';
import { ReportsController } from './reports.controller.js';

@Module({ imports: [MatchesModule], controllers: [ReportsController] })
export class ReportsModule {}
