import { Injectable } from '@nestjs/common';
import type { ReplayReaderPort } from '../application/ports.js';
import { readReplayIndex, readReplayRound } from '../replay-storage.js';

@Injectable()
export class StoredReplayReader implements ReplayReaderPort {
  readIndex(matchId: string, fileSha256: string) {
    return readReplayIndex(matchId, fileSha256);
  }

  readRound = readReplayRound;
}
