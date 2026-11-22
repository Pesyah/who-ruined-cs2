# H2-E3 experiment results

Date: 2026-11-17. Evidence level: six saved canonical
`match-result@1` artifacts with normalized events and recompute seed. The
artifacts were schema-validated before analysis. No demo reparse was needed,
although the owner authorized it for this stage.

## Sample and evidence

The convenience sample contains 60 player slots, 116 rounds, three
`de_dust2` and three `cs_office` matches. One player is not H2-calculated, so
rating comparisons contain 59 players.

| Evidence | Count |
| --- | ---: |
| HE detonation | 359 |
| Inferno start | 225 |
| Flash detonation | 494 |
| Smoke detonation | 397 |
| Player/round HE effect rows with observed events | 144 |
| Player/round fire effect rows with observed events | 40 |
| Player/round flash effect rows with observed events | 231 |
| Exact H2 anchors eligible for protected reallocation | 513 |

No duplicate usage entity or unknown usage owner was found in the six saved
matches. This does not prove those cases cannot occur; synthetic regression
tests define their conservative handling.

Effectiveness was unavailable in 31 HE and 32 fire player/round rows because
the sequential HP evidence was incomplete or inconsistent. Flash duration was
available in this sample. All 383 smoke player/round rows were unavailable for
tactical effectiveness by design. An unavailable row is never zero-filled.

## Configuration comparison

For U1 across all matches, aggregate usage contribution was 10.320, naive
effect was 1.9988 and protected/reallocatable effect was 1.9565. Mean usage
addition among 59 calculated players was about 0.175 rating points. The naive
model averaged about 0.209 total added points. The protected model cannot be
summarized by addition alone because it first removes old H2 anchors; its mean
rating delta was about +0.064, and its largest absolute player delta was about
0.402.

| U1 projection | Changed rank positions (sum across matches) | Hypothetical MVP changes | Hypothetical Who Ruined changes |
| --- | ---: | ---: | ---: |
| Usage only | 22 / 59 | 0 / 6 | 0 / 6 |
| Naive usage + effect | 23 / 59 | 0 / 6 | 0 / 6 |
| Reallocated usage + effect | 22 / 59 | 0 / 6 | 0 / 6 |

U1 usage caps were reached in 99 player-rounds, U2 in 19 and U3 in 142. The
large spread confirms that cap choice is a first-order policy decision, not a
minor tuning detail. No coefficients are selected from this six-match sample.

Protected utility divided by the magnitude of current COMBAT+SUPPORT varied
substantially and exceeded 1 in two matches. This ratio is unstable when the
centered baseline families are small; it is a warning against choosing weights
from aggregate ratios alone.

## A/B/C conclusion

- A (usage only) changes information content and is bounded, but still rewards
  access to utility/economy.
- B (naive effect) visibly double-counts current COMBAT/SUPPORT and is rejected
  as a policy candidate.
- C (reallocation) prevents double credit for exact anchors and exposes where
  safe decomposition is impossible. Its nonlinear deltas require a larger
  evaluation corpus before policy selection.

## Fairness limits

The data are too small for statistical claims about support roles, economy,
side, map, winners/losers or match length. Counts suggest the proposed usage
signal is materially correlated with number of rounds and available utility.
Future evaluation should normalize or cap by verified exposure and stratify by
map, T/CT round, economy, team outcome and role proxy. Stable team IDs, not
T/CT, must remain the identity basis.

## Test result

Twenty-six labelled synthetic cases cover the required evidence, unknown,
deduplication, cap, coverage, friendly-harm, double-counting and reconstruction
rules. Production H2, M2 and EVP outputs are snapshotted before/after the
research call in the characterization suite. Full gate results are recorded in
the stage handoff, not promoted here as model validation.

## Recommendation for the next policy design

Advance usage-only U2-style diminishing returns as the safest candidate to a
larger offline calibration, without accepting its current numbers. Continue C
for explicit effectiveness after designing exact decomposition of lethal
damage and flash-assist anchors. Keep smoke effect unavailable until the future
round/spatial reconstruction can support it. Do not mix E2 and E3 deltas; if a
joint experiment is required, edit one cloned prepared profile and run the
unchanged projector once.

