# H2-E7 attribution and reallocation

**E2.** Use strict later-tick canonical trades with known tick rate and
counted exposure for the participants in both deaths. Validate exactly one
negative `ownDeaths` anchor in each used prepared variant before applying any
edit. Preserve legacy trade tags and the separate ordinary death anchors.
E7 credits at most the existing centered death debit. A pre-existing positive
centered value stays fixed. When removing the anchor would exceed the debit,
the cap absorbs the excess as a family-level offset. Unknown objective
applicability can use the sole complete physical variant.

**E3.** Deduplicate observed grenade usage with E3’s identity rules and use
U2 diminishing returns with a per-player/round cap. Each counted round
contributes `cappedUsage × 0.1 / countedRounds` to the prepared SUPPORT input.
This puts new evidence in the same per-round-normalized units as the other
physical contributions. Confirmed damage, blindness, assists and friendly
harm stay in their existing families. A targeted test demonstrates that the
historical protected mode can identify an exact outgoing anchor while its
proposed replacement is capped. E7 leaves that effect path outside the policy.

**E5.** For a confirmed `ENEMY_KILL` with one positive COMBAT anchor, reuse
the E5 semantic residual and propose an effective `ALIVE_LEAD_TAKEN` or
`DISADVANTAGE` multiplier. Convert per-round budget to a player-normalized
anchor increment by dividing by exposure and anchor base. Saturate the
multiplier at the frozen `1.10` maximum. A candidate competes with all existing
tags and the E6 replacement. Only positive winning residual consumes cap or a
diminishing slot. Full semantic overlap, ambiguous state and objective/survival
facts alone produce no additional credit.

**E6.** Require both counted team comparison pools to have values, at least
two counted players per pool and a positive opponent median. The E6-B rule
uses opponent median ≥ 2,500, lower allied median and actor loadout at most
half the opponent median. The refined `LOW_EQUIP_COMBAT` takes `1 + 1.5 ×
strength × min(0.05, 0.08 × shortfall)`, capped at `1.10`. The confirmed negative
case suppresses the old tag with multiplier `1`. Incomplete pools retain the
frozen tag and record an availability reason. Lethal hurt and death views
resolve to one anchor. Item carryover does not establish a save decision.

One winning modifier supplies the context signal per physical episode. For
example, an opening, trade, and underdog kill can have all of those tags while
the kernel selects a single winner. The ledger retains original base, old,
proposed and selected context, player/round bindings and evidence IDs, caps
and rejection reasons. Context `inputDelta` is a leave-one-override-out
marginal signal before saturation and centering. Those deltas need not sum.
Only the six final attributions support a reconstruction of the final score.
