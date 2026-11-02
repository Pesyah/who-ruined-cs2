import { Module } from '@nestjs/common';
import { MatchesModule } from '../matches/matches.module.js';
import { ReplayController } from './replay.controller.js';

@Module({ imports: [MatchesModule], controllers: [ReplayController] })
export class ReplayModule {}
