# Evidence inventory

Availability describes the current implementation, not what a parser might
theoretically expose. `PARTIAL` means that some relevant evidence is missing;
it does not authorize replacing the missing part with zero.

| Signal | Source and evidence | Availability / coverage | M2 | H2 | EVP | Reliability and risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Enemy kill | live `PLAYER_DEATH`, actor/target roster teams, event/round ID | Available only with known enemy relation; M2 all live rounds, H2 counted clean rounds | kill, fact, KAST | COMBAT; strongest linked HP/kill component | multikill/entry evidence | Confirmed fact; duplicate IDs differ across consumers |
| Enemy HP damage | live `PLAYER_HURT`, HP ledger, `rawHealthDamage`, `healthAfter` | M2 global damage `PARTIAL`; H2 withholds on invalid HP ledger | enemyDamage, ADR | COMBAT | utility subset | Must cap overkill; missing ledger values are not zero |
| Enemy armor damage | `PLAYER_HURT.rawArmorDamage` | Only finite positive values, clean H2 rounds | no public aggregate | COMBAT | no | Confirmed amount when present; incomplete availability is not separately published |
| Assist | death `assisterId`, event/round ID | Known assister on enemy death | assists/fact | SUPPORT | non-flash assist | Confirmed attribution; flash assist is a subtype |
| Flash assist | death with `assistedFlash === true` and assister | Same death coverage | fact and assist | SUPPORT plus FLASH_ASSIST context candidate | FLASH_SUPPORT | Confirmed flag, but may overlap enemy blind evidence |
| Multikill | enemy deaths by actor in one round | Live round; M2 counts exact bucket, H2 clean/countable round | 2–5 kill bucket | MULTI_KILL context tag on each kill anchor | specialization | Derived from confirmed kills; same kills remain COMBAT |
| Opening kill/death | first ordered enemy death in round | M2 live round; H2 requires unique earliest tick in clean round | opening counts | OPENING tag on kill only | ENTRY | M2 breaks same tick by row order; H2 declines ambiguous earliest tick |
| Advantage/disadvantage kill | alive trajectory immediately before death | Requires reliable alive start/trajectory | kill context counts | DISADVANTAGE / ALIVE_LEAD_TAKEN tags | no direct specialization | Derived state; unavailable if roster trajectory is unreliable |
| Postplant combat | bomb plant then enemy hurt/death in same round | Exactly one plant and clean boundary in H2 | no dedicated metric | POSTPLANT context | no | Context only; physical combat is still counted once |
| Ordinary death | live target death, event/round ID | Known target; H2 counted clean round | neutral fact, death, KAST | negative `ownDeaths` episode in DEATH_RELATED | opening-death hard gate for entry | Fact, not tactical blame |
| Opening death | opening enemy death target | As opening event above | openingDeaths | no distinct victim tag; ordinary ownDeaths input | ENTRY gate | Current H2 cannot distinguish its death mass |
| Traded death | original death linked to later revenge | Consumer-specific trade rule | deathsTraded/KAST | not represented on victim death | no direct metric | Current H2 tags the revenge only; semantics differ |
| Untraded death | deaths minus traded deaths | Requires M2 trade result | untradedDeaths | no distinct input | no | Derived under M2 semantics only |
| Suicide | live death actor equals target / suicide attribute | Known identity | suicide error plus death | ownDeaths plus suicide raw counter (counter is not a separate H2 physical axis) | severe-harm diagnostics | Confirmed when identity/flag reliable |
| World death | death without actor / world cause | Known target | death fact | ownDeaths plus world raw counter | no | No enemy credit |
| Team death / team kill | death between teammates | Known roster relation | team-kill error and target death | DIRECT_HARM kill component plus target ownDeaths | severe team harm | Same event affects two players for different facts |
| Survival | no live death in a normalized round | M2 all rounds; H2 has no survival axis | survivedRounds/KAST | no direct input | clutch reconstruction uses alive state | Absence is safe only inside a complete observation window |
| Trade kill | one-to-one revenge link within five seconds | M2 tick rate required; H2 clean/countable round | fact/tradeKills/KAST | TRADE, optionally FAST_TRADE, on positive combat anchor | TRADE_SPECIALIST from M2 | Not an extra physical kill bonus in H2; context only |
| HE damage | enemy/friendly `PLAYER_HURT`, weapon `hegrenade` | Requires complete damage evidence for trustworthy total | grenade damage and total damage | same HP event enters COMBAT or DIRECT_HARM | UTILITY_DAMAGE | Same damage fact appears in total and grenade views |
| Inferno damage | enemy/friendly hurt, weapon `inferno` | Same HP-ledger limits | grenade damage and total damage | same HP event enters COMBAT or DIRECT_HARM | UTILITY_DAMAGE | Molotov/incendiary are intentionally combined |
| Enemy blind | `PLAYER_BLIND`, known enemy relation, duration | M2 global flash availability; H2 finite duration in clean round | count and summed duration | merged non-overlapping intervals in SUPPORT | FLASH_SUPPORT | M2 sums raw durations; H2 interval-unions by actor/target/round |
| Friendly blind | blind with allied relation | Same duration limits | team count/duration | DIRECT_HARM | hard gate/diagnostic | Unknown relation excluded, not coerced to friendly |
| Smoke thrown | smoke detonation/start event | Event-name support only | count | no | no | Throw fact only; effectiveness remains unavailable |
| Grenade thrown | detonation/start events by weapon/event kind | Depends on normalized event names | HE/flash/smoke/inferno counts | no independent throw axis | no | Use is not effectiveness |
| Bomb plant | live `BOMB_PLANTED`, actor T side | `de_` scenario and counted H2 round | bomb fact/count | OBJECTIVES, T-round denominator | OBJECTIVE_SPECIALIST | Confirmed action, not round impact |
| Bomb defuse | live `BOMB_DEFUSED`, actor CT side | `de_` scenario and counted H2 round | bomb fact/count | OBJECTIVES, CT-round denominator | OBJECTIVE_SPECIALIST | Confirmed action |
| Hostage rescue | prepared raw `hostage_rescued`, actor identity | `cs_` scenario, clean/counted round, CT actor | normalized support is limited | OBJECTIVES | no current objective specialization | Parser supplement evidence; not inferred from score |
| Hostage harm | prepared raw `hostage_hurt`, actor identity | `cs_` scenario, clean/counted round | limited | negative OBJECTIVES with floor | no | Confirmed action; missing hostage ID remains unknown |
| Objective applicability | map `de_`/`cs_`, then raw event fallback | Unknown if neither source is decisive | bomb metrics may still be facts | unknown scenario omits objective influence | EVP scenario gates objective | Prefix is authoritative current map rule |
| Freeze equipment value | `ECONOMY_SNAPSHOT.equipmentValue` | M2 AVAILABLE/PARTIAL/UNAVAILABLE; per observed round | total and observed-round count | LOW_EQUIP_COMBAT context only when actor and opponent median exist | no | Snapshot, not spending; unequal observation coverage matters |
| Money / spend | parser-normalized money is not supported as stable aggregate | UNAVAILABLE | `money: null` | no | no | Never infer from equipment delta |
| Inventory / weapon value | freeze inventory/equipment snapshot | Partial snapshots; pickup/drop continuity not modeled | inventory not exposed in analytics DTO | only equipment comparison | no | Saved weapons and drops cannot be reconstructed reliably from aggregate alone |
| Alive counts | start ticks plus ordered deaths/lifecycle | Requires complete/credible start and trajectory | advantage, clutch | context tags | clutch | Team identity is roster-based; T/CT is round-specific |
| Clutch opportunity/win | one survivor vs N, then team wins with survivor alive | Alive-context availability | won 1vX count | no direct input | CLUTCH_SPECIALIST | Opportunity alone is not a win; round IDs may be aggregate-only evidence |
| Round result | normalized winner team and score | Valid round with stable roster team ID | used by clutch and match stats | awards use match team scores, not a round bonus | policy context | Fact; must not infer stable team from side |
| Useful losing-round action | ordinary confirmed event in a lost round | Same event availability | counted normally | counted normally if round/player eligible | counted by relevant specialization | No standalone round-impact/causal value exists |

## Known unavailable evidence

The current normalized model does not support a trustworthy generic smoke
effectiveness score, player cash/spend history, tactical positioning quality,
intent, comms, or causal round-win attribution. Pickup/drop and saved-equipment
continuity are not complete enough to create economy-credit transfers. These
remain unavailable rather than zero.

