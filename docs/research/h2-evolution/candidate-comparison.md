# H2-E7 candidate comparison

The table compares the same 286 calculated player rows in 29 matches.
Deltas are in rating points. Position counts refer to players whose overall
match rank changed. Award columns count changed winners by match.

| ID | Mechanisms | Mean delta | Max delta | Positions | MVP / Who Ruined |
| --- | --- | ---: | ---: | ---: | ---: |
| C0 | Frozen H2 | 0 | 0 | 0 | 0 / 0 |
| C1 | E2 | 0.025382 | 0.126045 | 79 | 1 / 5 |
| C2 | U2 | 0.006999 | 0.018500 | 10 | 0 / 0 |
| C3 | R2 | 0.000796 | 0.003248 | 0 | 0 / 0 |
| C4 | Economy B | 0.000752 | 0.004992 | 0 | 0 / 0 |
| C5 | E2 + U2 | 0.032424 | 0.138160 | 77 | 1 / 5 |
| C6 | E2 + U2 + R2 | 0.033225 | 0.138440 | 79 | 1 / 5 |
| C7 | All four | 0.033997 | 0.139892 | 78 | 1 / 5 |
| C8 | C7 without E2 | 0.008560 | 0.022442 | 10 | 0 / 0 |
| C9 | C7 without U2 | 0.026954 | 0.131426 | 79 | 1 / 5 |
| C10 | C7 without R2 | 0.033185 | 0.138636 | 79 | 1 / 5 |
| C11 | C7 without Economy B | 0.033225 | 0.138440 | 79 | 1 / 5 |

C7 median delta was 0.018210, with range 0.000909–0.139892, population SD
0.032675 and p95 0.103913. All 286 changes were positive. Maximum movement
was three places overall and two within a team, with 42 team positions
changed. Four matches had incomplete pools, identical across arms. The
single MVP change left a 0.017211 gap to the previous winner. The five
Who Ruined changes had winner gaps of approximately 0.024–0.085. Nominal C7
had no exact award ties.

The joint change minus the sum of standalone changes was positive above
`1e-12` for 58 players. Mean interaction was +0.000067, maximum +0.001262.
That scale exceeds arithmetic tolerance. Falling negative mass can change
the marginal value of other family inputs and alter their final distribution.
Effective context also has one winning tag per anchor, and E5 residual slots
depend on what remains after competing context. Mean raw COMBAT and OBJECTIVES
inputs were unchanged, while final COMBAT/OBJECTIVES allocations moved through
the redistribution of negative mass.

Removing E2 from C7 accounts for the same six winner changes. Removing U2,
R2 or Economy B independently changes no winners relative to C7. None of
the six low/high coefficient probes changes an award relative to nominal.
They change 0–10 positions. Full distributions, gaps, family effects, ablation
comparisons, evidence counts and slices are in the [run report](e7-run-2026-11-22-v2.json).
