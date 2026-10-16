# M3 scoring inputs

This document inventories factual M2 inputs consumed by the experimental M3-B
models. Formula and policy live in `scoring.md`; this inventory remains factual
and does not assign roles or turn missing opportunities into mistakes.

## Evidence classes

- **Direct fact**: emitted by the parser with an attributable player and tick.
- **Deterministic derivation**: computed from ordered direct facts under a
  documented formula.
- **Context-limited inference**: reproducible, but not evidence of intent or a
  tactical obligation.
- **Unavailable**: the parser/data model cannot support a truthful value.

## Feature inventory

| Feature | Source/formula | Attribution | Accuracy and limitations | Cross-team comparison |
| --- | --- | --- | --- | --- |
| Kills/deaths/assists | Live normalized death events; assists require an enemy victim and valid assister | Direct player IDs | Exact event accounting; post-round duplicates excluded | Counts are comparable, but depend on round count and opportunity |
| K/D/A scoreboard | Scoreboard phases reconciled with `.dem.info` | Direct player IDs | 9/9 real matches exactly reconciled; post-round duplicate deaths excluded | Suitable as factual totals, not a complete impact model |
| Enemy damage / ADR | Chronological actual HP loss, capped by remaining HP; ADR = damage / rounds | Direct attacker/victim | Avoids raw overkill; no independent external ADR reference | ADR normalizes rounds but not weapon/economy/role context |
| Team damage / team kills | Stable roster relation between actor and victim | Direct actor/victim | Confirmed real team-kill cases exist; intent remains unknown | Direct harm is comparable as a fact, not automatically equivalent blame |
| KAST | Round has kill, credited assist, survival or traded death | Deterministic per player/round | Formula tested; trade definition affects T component | Percentage comparable, but rewards different action types equally |
| Opening kill/death | First enemy-vs-enemy death in a live round | Direct actor/victim | Exactly one pair per round containing an enemy death | Comparable opportunity statistic; no tactical assignment inferred |
| Multi-kills | Exact enemy kills by player within one round | Deterministic | 2K/3K/4K/5K buckets, no duplicate event use | Comparable fact, economy and opponent strength not modeled |
| Trade kill / traded death | One-to-one revenge kill after original death, ordered by tick/row, inclusive 5 s | Both players attributable | Sequence is exact under definition; does not prove planned trade or obligation | Comparable sequence frequency; absence is not an automatic error |
| Untraded death | Live death not paired by the trade rule | Victim attributable | Context-limited: teammate position and feasibility are not modeled | Must not be scored as an error without tactical context |
| 1vX clutch | Player becomes sole survivor against X and validated team wins while player survives | Player and round | Deterministic from death sequence; disconnect/alive-data quality must be available | Comparable outcome fact; opportunity frequency varies strongly |
| Advantage/disadvantage kills | Event-tick alive counts for both stable teams | Killer | Available only when tick snapshots are complete | Contextual rate may be compared, but not treated as role-neutral skill alone |
| Survival | No live death for player in round | Player/round | Post-round and pre-freeze deaths do not affect it | Comparable rate with strong save/role context caveat |
| Plant/defuse/explosion | Direct bomb events | Actor where parser supplies one | Objective facts; Office correctly has none | Map/side/opportunity dependent |
| Flash assist | Death event with `assistedflash` and valid assister | Direct assister | Exact in parser event | Comparable factual contribution |
| Enemy/team blind | `player_blind` duration grouped by stable team relation | Thrower/victim | Duration direct; actual visual/tactical impact not modeled | Team blind is confirmed harm exposure, not proof of a mistake |
| HE damage | `player_hurt.weapon=hegrenade`, actual HP cap | Direct attacker/victim | Damage attribution reliable; throw-to-hurt entity link unnecessary | Comparable damage, opportunity/economy dependent |
| Inferno damage | `player_hurt.weapon=inferno`, actual HP cap | Direct attacker/victim | Molotov vs Incendiary cannot be distinguished | Compare combined fire damage only |
| Smoke throws | Direct detonation | Thrower | Usefulness/coverage unavailable without spatial model | Throw count alone is not impact |
| Equipment value | Freeze-time `current_equip_value` snapshots | Player/round | Available; cash and exact spend unavailable | Useful context for normalization, not a standalone contribution |
| Inventory/armor/kit | Freeze tick snapshots | Player/round | Direct state; drop donor/receiver unavailable | Context only |
| Disconnect/reconnect | Ordered connection events | Player internally; anonymized in reports | Reconnect detected only when a connect follows a recorded disconnect | Reliability/availability context, not performance |

## Confirmed harm versus presumed error

Actual team HP damage, team kills, team blind duration and suicides are confirmed
events. They may be exposed as harmful facts. The data does not establish
intent, communication, positional necessity or tactical justification.

Deaths, untraded deaths, missing drops, failure to flash, low utility use and
absence of an opening attempt are not automatically errors. A future scoring
model must keep direct harm separate from context-limited hypotheses and must
publish availability/confidence with every derived component.

## Objective comparison constraints

Players from both stable teams can be compared using the same formulas for
rates and direct facts. Fair comparison still requires round opportunity,
side/map, equipment and match outcome context. No mandatory role labels are
available or required. M3 must not infer AWPer, entry, support, lurker or IGL
roles merely to penalize deviations from a template.

Unavailable inputs must remain `null` and must never silently become zero or a
penalty. Current unavailable inputs include cash/spend, drop attribution, smoke
effectiveness, tactical intent and reliable Molotov-vs-Incendiary subtype.
