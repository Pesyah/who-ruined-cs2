import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface.js';
import { replayMetadataOpenApiSchema, replayRoundOpenApiSchema } from '@who-ruined/contracts';
import { ReplayQueries } from '../../application/use-cases/replay-queries.js';
import { assertExactQuery, assertOpaqueId } from '../../http-validation.js';

@ApiTags('matches')
@Controller()
export class ReplayController {
  constructor(@Inject(ReplayQueries) private readonly queries: ReplayQueries) {}

  @Get('matches/:id/replay')
  @ApiOperation({ operationId: 'MatchesController_replay', summary: 'Versioned metadata and availability for stored 2D match replay' })
  @ApiOkResponse({ description: 'm4.7-replay-metadata@1', schema: replayMetadataOpenApiSchema as unknown as SchemaObject })
  replay(@Param('id') id: string, @Req() request: Request) {
    assertExactQuery(request, []);
    return this.queries.metadata(assertOpaqueId(id, 'MATCH_NOT_FOUND'));
  }

  @Get('matches/:id/replay/rounds/:roundId')
  @ApiOperation({ operationId: 'MatchesController_replayRound', summary: 'One stored replay round with sampled player coordinates and factual events' })
  @ApiOkResponse({ description: 'm4.7-replay-round@1', schema: replayRoundOpenApiSchema as unknown as SchemaObject })
  @ApiNotFoundResponse({ description: 'Match or replay round not found' })
  @ApiConflictResponse({ description: 'Replay unavailable or corrupt' })
  replayRound(@Param('id') id: string, @Param('roundId') roundId: string, @Req() request: Request) {
    assertExactQuery(request, []);
    return this.queries.round(assertOpaqueId(id, 'MATCH_NOT_FOUND'), assertOpaqueId(roundId, 'REPLAY_ROUND_NOT_FOUND'));
  }
}
