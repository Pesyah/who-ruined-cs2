# Weapon transfer and carryover

## Transfer

A confirmed transfer requires a drop and a later pickup of the same stable
item entity by different roster players. The research contract can represent
this relation and its synthetic regression proves the binding, ordering and
non-duplication rules.

The real corpus cannot satisfy it. Across ten usable and five GOTV/pro demos:

- `item_pickup` was listed;
- `item_drop` and `item_purchase` were not listed;
- pickup rows had item/defindex/player/tick, but no entity ID or donor;
- no confirmed transfer was produced.

Therefore a pickup remains `PICKUP_ONLY/PARTIAL`. It must not credit a teammate
or be called a purchase. A drop without a linked recipient similarly remains
`DROP_ONLY` in the factual contract.

## Carryover

The raw tick API does expose an active-weapon entity handle. E6 calls an active
weapon carryover confirmed only when:

1. the player is confirmed alive at the sampled round end;
2. round-end and next-freeze snapshots both exist;
3. the positive entity handle is identical;
4. the weapon name is identical;
5. stable player and roster-team identity are unchanged.

The ten usable matches contained 428 such transitions and two same-name
transitions without identity. These figures cover only the active weapon at
the two boundaries. They do not prove continuity for holstered inventory.

Most importantly, carryover is not a save decision. A player can survive after
winning, finish a lost round during active combat, inherit an already secured
weapon, or have no meaningful alternative. E6-D therefore reports carryover
as a diagnostic fact and assigns exactly zero rating contribution. No bonus is
given for mere survival.

