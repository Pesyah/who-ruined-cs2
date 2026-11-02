import { describe, expect, it } from 'vitest';
import {
  C2S2_MODEL_VERSION,
  C2S2_POLICY,
  C2S2_POLICY_DIGEST,
  C2S2_REFERENCE_VERSION,
  PARTICIPATION_FAMILY_POLICY,
  PARTICIPATION_FAMILY_POLICY_DIGEST,
  PARTICIPATION_MODEL_VERSION,
  PARTICIPATION_RATING_SCORER_VERSION,
  PARTICIPATION_REFERENCE_VERSION,
  P72_PARTICIPATION_SCORER_VERSION,
  projectP72ParticipationRatings,
  projectParticipationRatings,
  scoreC2S2PreparedProfile,
  scoreC2S2PreparedProfiles,
  scoreParticipationPreparedProfile,
  scoreParticipationPreparedProfiles,
  selectP72Awards,
  selectParticipationAwards,
} from '../src/index.js';

describe('participation scoring compatibility exports', () => {
  it('keeps historical runtime exports as aliases of the domain-named implementation', () => {
    expect(C2S2_MODEL_VERSION).toBe(PARTICIPATION_MODEL_VERSION);
    expect(C2S2_REFERENCE_VERSION).toBe(PARTICIPATION_REFERENCE_VERSION);
    expect(C2S2_POLICY_DIGEST).toBe(PARTICIPATION_FAMILY_POLICY_DIGEST);
    expect(C2S2_POLICY).toBe(PARTICIPATION_FAMILY_POLICY);
    expect(scoreC2S2PreparedProfile).toBe(scoreParticipationPreparedProfile);
    expect(scoreC2S2PreparedProfiles).toBe(scoreParticipationPreparedProfiles);
    expect(P72_PARTICIPATION_SCORER_VERSION).toBe(PARTICIPATION_RATING_SCORER_VERSION);
    expect(projectP72ParticipationRatings).toBe(projectParticipationRatings);
    expect(selectP72Awards).toBe(selectParticipationAwards);
  });
});
