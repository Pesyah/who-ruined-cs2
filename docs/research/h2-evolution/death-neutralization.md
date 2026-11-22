# H2-E2 traded-death neutralization

Status: isolated research adapter, version
`h2-e2-death-neutralization@1-research`. No production result or award is
rewritten.

## Exact intervention

For a confirmed trade link, the adapter finds the victim's episode satisfying
all of the following:

- `anchorId === originalDeathEventId`;
- `chosenAxis === ownDeaths`;
- `family === DEATH_RELATED`;
- finite negative `base`;
- exactly one matching episode;
- victim is eligible and the link round is counted for that victim.

Only that episode is removed. An untraded death of the same player, another
negative family, friendly harm and every positive fact remain. The victim gets
no fixed bonus.

The prepared physical-family transformation is linear before the existing
kernel. If the removed normalized episode base is `d < 0` and frozen
`scoreScale = s`, the research input is recomputed as:

```text
DEATH_RELATED_candidate = DEATH_RELATED_baseline - s * d
```

This is algebraically identical to removing `d` from the episode sum before
the frozen family baseline/centering. The baseline itself is retained. The
existing family kernel then performs context centering, direct-harm softening,
objective caps and the unchanged H2 projection. Consequently the final rating
change is not a fixed number: it depends on positive/negative mass and the
nonlinear negative-mass function.

## Three variants

1. **H2-BASELINE** projects the untouched persisted recompute seed.
2. **E2-TRADE-CANONICAL-ONLY** removes existing `TRADE`/`FAST_TRADE` tags and
   reapplies only canonical links to a uniquely recoverable positive combat or
   support anchor. Death inputs stay unchanged.
3. **E2-TRADED-DEATH-NEUTRALIZED** starts with variant 2 and removes each exact
   eligible traded-death anchor before projecting with the same kernel.

The adapter clones all inputs. The synthetic regression suite verifies the
original match, prepared profiles, M2 analytics and baseline H2 projection are
byte-for-value unchanged after the experiment.

## Unavailable and ambiguous cases

- Unknown tick rate makes both candidate variants unavailable.
- Duplicate death IDs never create a link.
- Unknown teams, non-live, suicide and team-death facts never create a link.
- Missing or duplicated `ownDeaths` episode evidence prevents neutralization;
  it is not replaced with an inferred value.
- An H2-excluded or participation-unreliable victim is not neutralized.
- If the revenge combat anchor cannot be recovered uniquely, the link remains
  factual but does not receive a context tag.

The last distinction matters for missing lethal HP links: the victim's exact
death anchor can still be neutralized when it exists, while the trader's
positive context attribution can independently remain unavailable.

## Causal-chain decision

A death event can be a revenge in one link and the original in the next. These
are two factual roles, not evidence that the entire chain was tactically good.
Neutralization is local to each independently confirmed victim-death anchor.
The experiment makes no causal claim about round outcome and does not cancel
ordinary untraded deaths.

