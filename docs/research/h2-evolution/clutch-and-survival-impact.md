# H2-E5 clutch, survival and lost-round impact

## Clutch evidence

E5 uses only E4 `CLUTCH_OPPORTUNITY`, `CLUTCH_WON` and `CLUTCH_LOST` facts. A
clutch requires an exact confirmed 1vX state with X at least two. Subsequent
actions are linked by their existing event IDs.

The ten-match sample contains 170 opportunities and 22 confirmed wins. There
are 139 action rows labelled `CLUTCH_PROGRESSION`. The label is descriptive:
the kill remains one candidate and one attribution-ledger row.

Three variants were considered:

1. no outcome bonus — safest against double counting;
2. a small bounded won-clutch context — represented only on an existing action;
3. reward only the confirmed state change beyond the physical COMBAT fact.

The data supports variant 3 for continued research. It does not establish a
standalone clutch coefficient. `DISADVANTAGE`, COMBAT and sometimes trade or
multikill already overlap the same anchor.

## Survival evidence

E4 can confirm whether a player is alive, dead or unknown at round end. That is
not proof that survival was useful. E5 therefore creates no candidate for
ordinary survival.

`SURVIVAL_CONTEXT` is attached only when an already confirmed action belongs to
a player who:

- survives a confirmed won clutch; or
- survives after confirmed postplant participation.

The sample has 167 such labelled action rows. This does not claim saved weapon
value: inventory/equipment transitions remain unavailable and belong to H2-E6.

## Lost rounds

Round loss does not erase confirmed state improvement. Of 1,303 candidates,
433 (33.23%) occurred for the eventual losing team. A sequence such as 1v3 to
1v2 to 1v1 retains both state facts even if the player then dies.

The model does not multiply those rows by a win/loss result. A confirmed won
clutch can add only the small capped contextual label described above. This
separates factual progress from the terminal outcome and avoids the rule
“won = useful, lost = useless”.

## Unavailable cases

Impact remains unavailable for unknown initial 1vX, unknown round outcome,
partial/excluded rounds, atomic same-tick attribution, unknown actor/target or
relation, and ordinary survival without an anchored action. These cases remain
visible as reasons rather than zero-valued achievements.

