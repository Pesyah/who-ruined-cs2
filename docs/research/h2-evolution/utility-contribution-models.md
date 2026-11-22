# H2-E3 contribution models and caps

All variants are deterministic, pure research projections over the same
normalized match, recompute seed and counted-round coverage. Production H2,
M2, EVP and awards are not written or changed.

## Common rules

For player `p` and counted round `r`:

1. Each accepted usage fact has a non-negative weight.
2. Confirmed enemy damage, merged enemy blind duration and confirmed flash
   assists can produce a non-negative effect proposal.
3. Unknown effectiveness produces no effect proposal; it is not converted to
   zero.
4. Usage, effect and total are capped separately per round.
5. No usage and ineffective usage both have zero penalty.
6. Existing friendly harm remains in the unchanged H2 baseline.

An experimental row reconstructs exactly as:

```text
rating = h2AfterReallocation + usageContribution + effectContribution
```

`h2AfterReallocation` equals baseline H2 for usage-only and naive diagnostics.
For the protected model it is H2 recomputed after exact overlapping anchors
were removed. This is a research decomposition, not a seventh production H2
family.

## Three parameter configurations

These are sensitivity probes, not selected policy coefficients.

| ID | Usage rule | Usage cap | Effect cap | Total cap | Purpose |
| --- | --- | ---: | ---: | ---: | --- |
| `U1_LINEAR` | 0.008 per accepted use | 0.024 | 0.018 | 0.036 | simple linear reference |
| `U2_DIMINISHING` | 0.010 multiplied by 1, 0.60, 0.35, 0.20 for successive uses | 0.022 | 0.015 | 0.032 | stronger anti-spam saturation |
| `U3_TYPE_WEIGHTED` | HE 0.007, fire 0.009, flash 0.010, smoke 0.006 | 0.026 | 0.017 | 0.036 | type-sensitivity probe |

Successive uses after the fourth in U2 keep the 0.20 factor but remain bounded
by the round cap. Effects are normalized only for comparison: damage per 100
HP, blind duration per 5 seconds and flash-assist count. These denominators are
not calibration claims.

## Compared projections

- `H2-BASELINE`: unchanged production H2 projection.
- `E3-USAGE-ONLY`: baseline plus capped usage. This is the lowest-risk future
  direction because usage is absent from current H2.
- `E3-NAIVE-USAGE-AND-EFFECT`: baseline plus usage and all confirmed effects.
  It is deliberately retained as a double-counting diagnostic, not a
  recommendation.
- `E3-REALLOCATED-USAGE-AND-EFFECT`: removes only exact H2 effect anchors,
  recomputes the existing kernel/projector, then adds bounded explicit utility
  effect. Flash assists and composite lethal damage anchors are excluded when
  they cannot be separated without moving unrelated H2 information.

The reallocated result may be below baseline even though both new components
are non-negative: removing an old anchor also changes centering, winning
context and nonlinear positive/negative projection. That is why “subtract
some final points” is not used.

## Anti-spam characterization

The synthetic suite covers one and four uses, six-use cap overflow, repeated
event IDs, repeated inferno entity starts, no-effect uses, very large damage,
multiple overlapping flashes and a player with no utility. U1/U3 hit their
linear caps frequently; U2 preserves more differences among the first few
uses while sharply reducing later marginal credit. None makes unlimited spam
an unbounded path to rating.

## H2-E2 compatibility

H2-E2 neutralizes one exact `DEATH_RELATED` anchor; E3 reallocation removes
exact positive `COMBAT`/`SUPPORT` anchors. The anchor edits are disjoint, but
both affect the nonlinear projection and must be applied to one cloned profile
and projected once if a future joint experiment is authorized. E3 does not
combine their reported deltas, does not create a mixed production policy, and
does not reuse H2-E2 results as an E3 baseline.

