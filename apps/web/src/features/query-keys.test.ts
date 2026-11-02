import { describe, expect, it } from 'vitest';

import { matchReportKeys } from './match-report/queries.js';
import { replayKeys } from './match-replay/queries.js';
import { participationRatingKey } from './participation-rating/queries.js';
import { ratingExplanationKeys } from './rating-explanation/queries.js';

describe('frontend query-key compatibility', () => {
  it('retains the existing cache identities after feature moves', () => {
    expect(matchReportKeys.match('match-1')).toEqual(['match', 'match-1']);
    expect(matchReportKeys.analytics('match-1')).toEqual(['analytics', 'match-1']);
    expect(participationRatingKey('match-1')).toEqual(['active-participation-rating', 'match-1']);
    expect(ratingExplanationKeys.evidence('match-1')).toEqual(['evidence-report', 'match-1']);
    expect(ratingExplanationKeys.explanation('match-1')).toEqual(['participation-explanation', 'match-1']);
    expect(replayKeys.metadata('match-1')).toEqual(['replay-metadata', 'match-1']);
    expect(replayKeys.round('match-1', 'round-2')).toEqual(['replay-round', 'match-1', 'round-2']);
  });
});
