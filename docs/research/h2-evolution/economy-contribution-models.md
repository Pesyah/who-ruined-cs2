# Economy contribution models

All variants use `h2-e6-economy@1-research`, preserve the frozen H2 projection
as baseline and reconstruct `experimental = baseline + delta` exactly. The
coefficients are sensitivity probes, not a proposed production policy.

## Shared combat evidence

Only counted-round enemy kills and finite enemy HP/armor damage are candidates.
Actor, target and both roster teams must be known. Freeze equipment comparison
requires complete counted-player values for both teams and at least two
players per comparison pool.

For actor equipment `a` and opponent-team median `m > 0`:

```text
relativeLoadout = a / m
shortfall = clamp(1 - relativeLoadout, 0, 0.75)
refinedLow = m >= 2500
             and actorTeamMedian < opponentTeamMedian
             and relativeLoadout <= 0.5
```

No division by own equipment occurs. A confirmed zero loadout is valid and a
missing loadout is unavailable.

## E6-A — facts only

Reconstruct snapshots, combat context and transitions. Delta is always zero.
This is the required control and the recommended production posture until
joint calibration.

## E6-B — LOW_EQUIP_COMBAT reallocation

For a unique positive existing H2 action anchor:

```text
proposedModifier = refinedLow
  ? 1 + min(0.05, 0.08 * shortfall)
  : 1
existingDelta = base * 0.03 when current LOW_EQUIP_COMBAT is present, else 0
deltaB = base * (proposedModifier - 1) - existingDelta
```

This is replacement/reallocation. It never stacks the new context on the
current `1.03` modifier. A stricter context can produce a small negative delta
by removing an existing modifier; it is not a penalty for buying expensive
equipment.

E6-B is an anchor-local sensitivity proxy, not an exact rerun of the nonlinear
family kernel after retagging every episode. `base * modifier` is observable at
the action anchor, while centering and family projection act on the aggregate.
An exact production-policy candidate must therefore be implemented and tested
as a separate E7 policy projection before any coefficient decision.

## E6-C — bounded combat efficiency

Diagnostic additive probe:

```text
deltaC_event = min(0.012, base * min(0.20, 0.25 * shortfall))
```

It applies only to `refinedLow` and a unique positive H2 action anchor. HP,
armor and kill views of one physical event share one payment: the greatest
absolute candidate delta is retained. Caps are 0.012 per event, 0.03 per round
and 0.12 per match.

This variant remains unsuitable as a production addition because it overlaps
the COMBAT action and existing context, and can make cheap-loadout play
structurally advantageous. It is retained for sensitivity comparison only.

## E6-D — confirmed active-weapon carryover

Confirmed continuity is reported but delta is zero. The corpus does not
identify tactical save intent or establish causal value, so no score formula
is justified.

## Weapon-price and team-economy variants

Inventory names do not supply a versioned price table or purchase provenance.
E6 therefore does not invent a weapon-cost lookup. Whole-loadout and team
median comparisons are testable; exact weapon purchase efficiency is not.

