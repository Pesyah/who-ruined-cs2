# H2-E5 round-impact models

All values below are sensitivity probes, not production coefficients. They do
not estimate win probability and were not fitted to make a player win an
award.

## Shared factual input and caps

Each event has one primary category. `CLUTCH_PROGRESSION` and
`SURVIVAL_CONTEXT` are contextual labels on that event, not independent full
bonuses.

The nominal event values are:

| Primary category | Nominal value |
| --- | ---: |
| Advantage creation | 0.012 |
| Advantage recovery | 0.008 + up to 0.006 for confirmed deficit reduction |
| Equality restoration | 0.016 |
| Advantage consolidation | 0.005 |
| Plant | 0.010 |
| Defuse | 0.015 |
| Hostage rescue | 0.014 |

At most one supplemental amount is applied: 0.003 for confirmed clutch
progression, otherwise 0.002 for useful survival context. The event cap is
0.020. Repeated events in one player-round use factors `1, 0.7, 0.5, 0.35…`,
then a 0.050 round cap and 0.180 player-match cap. This prevents a sequence of
context labels from dominating a match.

## R1 — state-based context

R1 adds the bounded state value to the frozen H2 result:

```text
R1 = H2 + capped_state_context
```

It is deliberately outcome-independent for confirmed state improvements. A
lost 1v3 sequence can retain two improvements; a won clutch differs only when
there is separate confirmed clutch/survival context. R1 demonstrates the size
of the state signal, but it still sits on top of the physical kill and is
therefore unsuitable as a production additive model.

## R2 — marginal H2 adjustment

R2 requires an existing positive H2 action anchor. The ledger resolves a death
event to its exact H2 episode, including a unique preceding lethal hurt anchor
when needed.

```text
incremental = max(0, proposed_state_value - semantic_overlap)
R2 = H2 + capped_incremental
```

- `ALIVE_LEAD_TAKEN` fully covers advantage creation.
- A positive objective factor fully covers the corresponding objective event.
- `DISADVANTAGE` covers 70% of recovery/equality/clutch state context in this
  sensitivity probe.
- A positive physical H2 episode without the matching context covers 50%.
- Without a positive H2 action anchor, R2 contributes zero rather than creating
  an unrelated bonus.

These percentages are hypotheses, not calibrated truths. R2 is nevertheless
the only evaluated shape that explicitly subtracts semantic overlap before
adding anything.

## R3 — separate ROUND_IMPACT family

R3 converts capped R1 points into a separate raw family input:

```text
raw = min(0.018, capped_state_context / 10)
centered = clamp(raw - 0.002, -0.002, 0.016)
attribution = 10 * centered                         if centered >= 0
            = -g(5 * abs(centered))                otherwise
R3 = H2 + attribution
```

`g` is the frozen H2 negative softening function. The final experimental rating
is reconstructed exactly as baseline H2 plus this attribution. No existing
family input, policy digest or production score is changed.

## Sensitivity result

Across 98 eligible players in ten usable matches:

| Model | Mean added attribution | Maximum absolute | Player-position changes | MVP changes | Who Ruined changes |
| --- | ---: | ---: | ---: | ---: | ---: |
| R1 | 0.11931 | 0.18000 | 18 | 0/10 | 2/10 |
| R2 | 0.02715 | 0.05982 | 6 | 0/10 | 1/10 |
| R3 | 0.09941 | 0.16000 | 18 | 0/10 | 2/10 |

R1/R3 are large relative to a signal already sharing every event with H2. R2
is smaller (5.2%–33.1% of absolute COMBAT+CONTEXT by match) but still lacks a
validated calibration target. The evidence supports further R2-style context
reallocation research, not a seventh production family at this stage.

