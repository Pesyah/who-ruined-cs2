# H2-E5 experiment results

Date: 2026-11-22. The experiment native-parsed authorized copies under
`F:\CS2 Demos`; it did not write PostgreSQL, artifacts or production results.

## Usable sample

Ten matchmaking demos were used: five bomb and five hostage matches across
`de_dust2`, `de_train` and `cs_office`.

| Measure | Result |
| --- | ---: |
| Matches / player slots | 10 / 100 |
| H2-eligible players | 98 |
| Rounds | 203 |
| Complete / partial / excluded | 169 / 24 / 10 |
| Available impact candidates | 1,303 |
| Rejected transition rows | 246 |
| Lost-team candidates | 433 (33.23%) |
| Clutch opportunities / wins | 170 / 22 |
| Average / maximum nominal event value | 0.01093 / 0.01900 |
| T / CT candidates | 648 / 655 |

Category labels (labels can overlap on one event):

| Category | Count |
| --- | ---: |
| Advantage creation | 409 |
| Advantage recovery | 181 |
| Equality restoration | 244 |
| Advantage consolidation | 426 |
| Clutch progression | 139 |
| Objective state change | 43 |
| Survival context | 167 |

The side counts are almost balanced in this small sample, but this is not
evidence of side neutrality across the game population.

## Confidence differential

The former count-only E4 interpretation could derive 1,492 enemy transitions.
The corrected action-attribution rule accepts 1,279 and withholds 213. Most
rejections come from partial/excluded coverage or pre/post states made partial
by unsupported attribution. No withheld row is converted to zero.

## Model comparison

R1 and R3 changed 18 player positions each; R2 changed six. R1/R3 changed two
hypothetical Who Ruined identities each, R2 changed one. No standalone E5 model
changed an MVP in these ten matches. The E2+E3 U2+E5 R2 composition changed one
MVP and three Who Ruined identities.

Every experimental projection reconstructed exactly, emitted no NaN/Infinity,
and the direct frozen-H2 projection equalled the E5 baseline in all ten
matches. These award differences are hypothetical and are not evidence that a
variant is better.

## Additional unusable files

Five professional/GOTV demos (`de_mirage`, `de_anubis`, `de_dust2`, `de_nuke`,
`de_ancient`) were also native-parsed. The current adapter recovered map and ten
players but only 81–88 normalized events and no rounds. They are documented as
unsupported for E5 rather than counted as empty successful matches.

## Limits and recommendation

- Maps are concentrated in Dust II, Train and Office.
- Only 98 eligible player profiles are available.
- Coefficients are sensitivity probes, not fitted estimates.
- H2 context centering is aggregate, so exact event-level final-attribution
  reallocation still needs a policy design.
- Equipment saving remains unavailable until H2-E6.

The sample demonstrates that exact state magnitude contains descriptive
information beyond the existing tag name, especially in lost rounds. It does
not justify a separate `ROUND_IMPACT` family. Continue, if desired, with an
R2-like replacement of specific CONTEXT semantics and validate it on a larger
held-out corpus before any production decision.

