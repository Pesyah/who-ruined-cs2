# Parser compatibility

> Real-demo capability probe for `@laihoe/demoparser2@0.42.0`. Only maps,
> versions, counts and field names are committed. Player names and SteamID64
> values are deliberately excluded.

## Golden fixtures

| Fixture | Map | Patch | Listed events | Players | Rounds | Raw deaths | `player_hurt` |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Office | `cs_office` | 14191 | 40 | 10 | 21 | 152 | 635 |
| Dust2 | `de_dust2` | 14191 | 50 | 10 | 16 | 111 | 491 |
| Train | `de_train` | 14190 | 51 | 10 | 23 | 181 | 729 |

All three headers are Source 2 (`valve_demo_2`). `parseHeader`,
`parsePlayerInfo`, `listGameEvents`, `parseEvents` and selected `parseTicks`
completed on every fixture. Player info exposes `name`, `steamid` and
`team_number`; all three fixtures contain ten valid unique SteamID64 strings
and non-placeholder display names.

## Event/field matrix

Counts are shown as Office / Dust2 / Train. Zero means the event is absent in
that fixture, not necessarily unsupported by the parser.

| Event | Count | Observed fields |
| --- | ---: | --- |
| `round_prestart` | 21 / 16 / 23 | `event_name`, `tick` |
| `round_poststart` | 21 / 16 / 23 | `event_name`, `tick` |
| `round_freeze_end` | 21 / 16 / 23 | `event_name`, `tick` |
| `round_officially_ended` | 40 / 30 / 44 | `event_name`, `tick` |
| `cs_win_panel_match` | 1 / 1 / 1 | `event_name`, `tick` |
| `player_death` | 152 / 111 / 181 | actor/victim/assister name and SteamID, `assistedflash`, weapon, headshot and combat flags, `tick` |
| `player_hurt` | 635 / 491 / 729 | actor/victim name and SteamID, `health`, `armor`, `dmg_health`, `dmg_armor`, `weapon`, `hitgroup`, `tick` |
| `bomb_beginplant` | 0 / 10 / 18 | actor name/SteamID, `site`, `tick` |
| `bomb_begindefuse` | 0 / 2 / 7 | actor name/SteamID, `haskit`, `tick` |
| `bomb_planted` | 0 / 10 / 15 | actor name/SteamID, `site`, `c4`, `tick` |
| `bomb_defused` | 0 / 2 / 2 | actor name/SteamID, `site`, `c4`, `tick` |
| `bomb_exploded` | 0 / 2 / 1 | actor name/SteamID, `site`, `c4`, `tick` |
| `player_blind` | 53 / 123 / 158 | thrower/victim name and SteamID, `blind_duration`, `entityid`, `tick` |
| `flashbang_detonate` | 46 / 82 / 88 | thrower name/SteamID, `entityid`, position, `tick` |
| `hegrenade_detonate` | 63 / 49 / 49 | thrower name/SteamID, `entityid`, position, `tick` |
| `inferno_startburn` | 49 / 49 / 42 | thrower name/SteamID, `entityid`, position, `tick` |
| `inferno_expire` | 49 / 49 / 42 | thrower name/SteamID, `entityid`, position, `tick` |
| `smokegrenade_detonate` | 49 / 52 / 78 | thrower name/SteamID, `entityid`, position, `tick` |

`round_start` and `round_end` are not listed in these demos. Each of the first
N−1 official round-end ticks appears twice; the final round is instead closed
by `cs_win_panel_match`. The normalizer deduplicates ticks and validates every
winner against the stable-team score transition.

## Tick properties

Event-adjacent `parseTicks` returned ten rows per sampled tick with:

- identity/side/score: `name`, `steamid`, `team_name`, `team_num`,
  `team_rounds_total`;
- state/time: `is_alive`, `game_time`, `tick`;
- partial economy: `current_equip_value`, `inventory`, `armor_value`,
  `has_helmet`, `has_defuser`.

`cash` was requested separately and was omitted by this parser version. The
ratio between tick deltas and `game_time` deltas is consistently 64 tick/s in
all three fixtures. Normalized `tickRate` is therefore 64, derived from observed
data rather than assumed.

## M2 capability assessment (no M2 implementation yet)

| Capability | Status | Evidence and limitation |
| --- | --- | --- |
| Round boundaries, sides, winners, score | Confirmed | Three exact `.info` reconciliations; all round transitions match. Full side swap at halftime can appear on the preceding end tick. |
| Plant/defuse/explosion | Confirmed on Dust2/Train | Actor, site and tick are direct. All observed bomb events fall inside one live round. Office has no bomb events because it is a hostage map. |
| Opening kill/death | Reliably derivable | Ordered enemy-vs-enemy deaths exist for every live round in Dust2 and Train. World, suicide and team deaths can be excluded explicitly. |
| Trades | Derivable with explicit matching | Stable teams, ordered ticks and observed 64 tick/s support the SPEC 5-second rule. Simultaneous events and one-to-one victim matching still require M2 unit/golden tests. Candidate pairs are not yet product metrics. |
| Flash blindness | Confirmed | `player_blind` directly identifies thrower/victim and duration. Friendly and enemy blinds are both present. Detonation `entityid` is available. |
| Flash assists | Confirmed | `player_death` exposes assister plus `assistedflash`. Dust2 has 3 and Train 2 observed flash-assist deaths. Victim-team assister rows must remain excluded. |
| HE damage | Reliably derivable with HP cap | `player_hurt.weapon=hegrenade` includes attacker, victim, damage and remaining health. Detonation-to-hurt entity linkage is absent, but damage attribution is direct. |
| Molotov/incendiary damage | Partially derivable | `player_hurt.weapon=inferno` and burn start/expire events are present. Damage attribution is available, but startburn alone does not reliably distinguish Molotov from Incendiary. |
| Enemy/team damage | Derivable with chronology | Stable teams plus hurt rows identify friendly/enemy relations. `dmg_health` includes overkill in some rows, so actual HP loss must be capped using chronological health state; raw sums are not valid ADR/team-damage totals. |
| Team kills | Parser fields supported; positive fixture absent | Attacker/victim IDs make detection deterministic, but Dust2 and Train contain zero team kills. Do not claim a real positive-case golden validation yet. |
| Alive-player count | Confirmed | `is_alive` returned complete 10-player snapshots at every death tick checked; death chronology also supplies deterministic transitions. |
| Economy | Partial | Freeze-time inventory, equipment value, armor, helmet and defuser are available. Cash is unavailable; exact spend/buy-quality analysis cannot be claimed. |

## Reconciled edge cases and open gates

- Train contains one pre-freeze suicide between `round_prestart` and
  `round_freeze_end`. It is retained as `PLAYER_DEATH_NONLIVE`, included in the
  all-phase scoreboard, and excluded from live-round feature input.
- All three `.dem.info` sidecars independently match every K/D/A row and every
  round score transition. No names or identifiers from them are committed.
- None of the three fixtures has overtime. Overtime/expected-`PARTIAL` remains
  an open golden gate.
- No tactical intent, causal blame, cash economy, exact incendiary-vs-Molotov
  classification or team-kill positive case is established by these probes.
