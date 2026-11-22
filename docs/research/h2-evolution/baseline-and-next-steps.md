# H2 baseline and experiment protocol

## Frozen identity

| Item | Current value |
| --- | --- |
| Runtime selector | `H2` |
| Policy ID | `P72B_D_P10_N5_K025_A015_H2` |
| Policy digest | `7ac1d2d3afcffa9d4682e2979f06f4dad8d42f270ec0e858bac93019724baf48` |
| Rating scorer | `m3c8-p7.2-f-rating-projector@1.0.0-experimental` |
| Family model | `m3c8-c2-s2@1.0.0-experimental` |
| Family policy digest | `3c3ab8e042609295bf32cad7223a388f33876d89bcee5045bd006261cae0a744` |
| Prepared sidecar | `m3c8-participation-prepared@1.0.0-experimental` |
| Active public report | `m4.3-participation-rating@1` |
| Explanation report | `m4.6-participation-explanation@1` |

The H1 identifiers that remain in persisted schemas are read-compatibility
metadata, not an executable policy selector.

## Current calculation

The six family inputs are `COMBAT`, `SUPPORT`, `DEATH_RELATED`, `CONTEXT`,
`OBJECTIVES` and `DIRECT_HARM`. Let the first five inputs be `v_i`, and let `H`
be the already softened non-positive `DIRECT_HARM` input:

```text
P = Σ max(v_i, 0)
N = Σ max(-v_i, 0)

g(z) = z                                           when z <= 0.25
     = 0.25 + 0.15 * log1p((z - 0.25) / 0.15)     otherwise

H2 = 1 + 10P - g(5N) + 2H
```

Positive family values are attributed linearly at `10 × family`. Negative
families share `-g(5N)` in proportion to their negative mass. Direct harm is
attributed as `2H`. The implementation verifies that origin one plus all six
final attributions reconstructs the rating within `1e-12`.

## Physical inputs and transformations

The prepared physical axes are:

- COMBAT: enemy HP damage, enemy kills and enemy armor damage;
- SUPPORT: assists and enemy blind seconds;
- DEATH_RELATED: own deaths;
- DIRECT_HARM: allied HP damage, team kills, allied blind seconds and allied
  armor damage;
- OBJECTIVES: plants/defuses on `de_` maps, hostage rescues/harm on `cs_` maps;
- CONTEXT: one winning modifier on a positive COMBAT/SUPPORT episode.

Each physical anchor can carry several components, but only the component with
the largest absolute normalized value is retained. This prevents HP damage and
the lethal kill on one linked anchor from both contributing physically. Physical
signals are normalized by verified exposure and centered by frozen family
baselines. The context candidates are OPENING, TRADE, FAST_TRADE, MULTI_KILL,
DISADVANTAGE, ALIVE_LEAD_TAKEN, POSTPLANT, FLASH_ASSIST,
FLASH_TEAM_KILL_WINDOW, FLASH_TEAM_DAMAGE_WINDOW and LOW_EQUIP_COMBAT.
Only the strongest eligible tag per positive episode wins; total uncentered
context is capped at `0.2`, then each factor is centered by its frozen baseline.

Positive objectives are capped at `0.08`; hostage harm is floored at `-0.02`.
Direct harm is unchanged up to magnitude `0.075`, then softened by the frozen
log1p transform with `a = 0.05`. The H2 projector subsequently applies the
policy's `×2` harm multiplier. No rounding is introduced.

## Coverage, ranking and awards

Only player-rounds classified `PRESENT_VERIFIED` enter a rebuilt H2 profile.
Global round evidence, start observation, lifecycle and gameplay evidence
determine the participation class. A profile is withheld for unknown player
participation, insufficient verified exposure or required-input failure; three
or more verified full-round absences make it ineligible. Unknown map scenario
omits objective influence while retaining otherwise calculable H2 data.

MVP is the highest calculated H2 value among eligible players. Who Ruined is the
lowest calculated value on the losing team; on a draw its scope is all eligible
players. Ties use `1e-12` and deterministic profile-key ordering. Missing
players produce an incomplete pool rather than a synthetic score.

## Deterministic baseline

The existing exact snapshot suite
`apps/worker/test/participation-preparation-baseline.test.ts` exercises four
baseline shapes without copying the scorer: empty input, complex events,
player-round exclusion, and unknown tick rate/scenario. It records prepared
input, sidecar, rating, ordering, awards, warnings and special numeric values.
The focused H2-E1 suite adds behavioral assertions but intentionally does not
replace or refresh those snapshots.

## Future experiment protocol

An experimental successor should be evaluated as a pure consumer of the same
versioned evidence, never as a forked production scorer.

1. Freeze input artifact SHA, policy identity and `countedRoundIds`.
2. Record the current H2 output for every player: six raw inputs, six final
   attributions, total, ordering, awards and availability.
3. Change one semantic unit at a time (for example, trade-death cancellation),
   keeping all unrelated transforms identical.
4. Report per-player deltas and rank/award transitions; do not report only a
   match average.
5. Split synthetic adversarial fixtures from persisted real-match samples.
6. Require invariance for matches without the targeted evidence.
7. Reject NaN/Infinity, unknown-to-zero conversion, changed bindings and hidden
   coverage changes.

The current formula is experimental, uncalibrated and non-causal. Agreement
with a human narrative is not by itself calibration evidence.

