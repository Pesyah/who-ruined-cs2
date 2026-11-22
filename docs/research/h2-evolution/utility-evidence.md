# H2-E3 utility evidence contract

Status: research only. Contract identity:
`h2-e3-utility-contribution@1-research`. It is not a persisted DTO and has no
production caller.

## Observed facts

| Type | Usage observation | Confirmed effect | Attribution | Reliability boundary |
| --- | --- | --- | --- | --- |
| HE | `HE_DETONATE` | enemy `PLAYER_HURT` with `weapon=hegrenade` | owner is the normalized actor; damage is player/round/type level | hurt rows do not contain grenade entity, and some damage may precede the detonation row, so a particular HE cannot be named |
| Molotov/incendiary | `INFERNO_START` | enemy `PLAYER_HURT` with `weapon=inferno` | owner is the normalized actor; damage is player/round/type level | `INFERNO_START` proves that the fire entity started, not that a throw event was observed; the source does not distinguish Molotov from incendiary |
| Flash | `FLASH_DETONATE` | enemy `PLAYER_BLIND`; flash-assisted death | blind rows can link to detonation by player, round and `entityId`; assist is only round-level | duration needs a finite value; overlapping intervals need tick rate; an assist cannot be decomposed safely from the existing H2 assist anchor |
| Smoke | `SMOKE_DETONATE` | none in the normalized factual model | owner is the normalized actor | detonation is usage only; tactical effectiveness needs a spatial/timeline model that E3 does not have |

No normalized `grenade_thrown` fact is present. Consequently the contract
never relabels detonation or inferno start as `THROWN`. Other grenade types,
including decoy, are not in the normalized factual-kind allowlist and are not
silently inferred.

## States and evidence references

- `DETONATED`: HE, flash or smoke detonation was observed.
- `EFFECT_CONFIRMED`: an inferno entity started, or a separately listed effect
  was observed. For inferno this still does not prove the original throw row.
- `UNKNOWN`: represented by diagnostics/unavailability, never by a zero-value
  credited record.
- Every usage and effect row keeps source event IDs, round ID and player ID.
  Flash rows additionally keep exact linked usage IDs when `entityId` agrees.
- HE/inferno effects use `ROUND_LEVEL_ONLY`; flash can be `EXACT_ENTITY`;
  smoke is `UNAVAILABLE` for effectiveness.

## Deduplication and coverage

All occurrences of a repeated normalized event ID are rejected. Usage facts
are also deduplicated by type, round, player and entity ID. If entity ID is
missing, exact player/round/tick identity is the conservative fallback. This
specifically prevents repeated `INFERNO_START` rows for one fire entity from
becoming multiple uses while preserving distinct entities and input order.

Only valid `LIVE` rounds enter the factual contract. Rating projections then
apply the player's own `countedRoundIds` and require `ELIGIBLE` participation.
Thus factual evidence can remain visible while an H2-excluded player-round
receives no experimental contribution.

## Damage and blind integrity

Enemy HE/inferno damage uses a sequential HP ledger over all hurt events, not
just utility rows. Damage is capped by prior HP. Missing `rawHealthDamage`, an
invalid `healthAfter`, a damaged predecessor chain, unknown target or unknown
team relation makes that player's affected round/type unavailable. It does not
invalidate another independent player.

Enemy flash duration merges overlapping intervals per target. A missing or
invalid duration is unavailable. Tick rate is required when intervals exist;
no `1 tick = 1 second` fallback is used. Friendly/self damage and blinds are
retained as diagnostic evidence but never become positive utility effect.
Their existing production `DIRECT_HARM` treatment is untouched.

A zero means that the canonical normalized stream contains a confirmed usage
but no conflicting or incomplete enemy effect row for that player/round/type.
It means “zero observed effect in this evidence contract,” not proof that the
grenade had no tactical value. Missing or damaged evidence remains `null` /
`UNAVAILABLE`.

## Current-model comparison

M2 counts each live detonation/start and aggregates utility damage/blinds with
global availability. It does not perform E3 entity deduplication or per-player
counted-round filtering. H2 has no usage reward: enemy damage enters `COMBAT`,
enemy blind time and assists enter `SUPPORT`, flash context can enter
`CONTEXT`, and friendly harm enters `DIRECT_HARM`. EVP consumes aggregate
flash/utility achievements. E3 therefore treats usage as new information but
effectiveness as overlapping information requiring explicit double-counting
control.

