# Milestone status

## 2026-10-16 — M0/M1 validated on three real demos

### M0 — capability proof: passed

`pnpm parser:probe` completed for Office, Dust2 and Train using
`@laihoe/demoparser2@0.42.0`. All five required parser APIs work on patches
14190–14191. The sanitized cross-fixture event/field matrix and M2 capability
assessment are in `docs/compatibility.md`.

### M1 — vertical slice: passed

All three external fixtures completed upload → randomized storage → worker →
parser → normalization → validation → SQLite → atomic JSON.gz → API → browser
UI. Re-upload deduplication returned the same match/job with HTTP 202.

| Map | Final score | Players | Rounds | Live deaths | Non-live deaths | Quality | Independent reference |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `cs_office` | 13:8 | 10 | 21 | 152 | 0 | `VALID` | 10/10 K/D/A and 21/21 score transitions match `.dem.info` |
| `de_dust2` | 3:13 | 10 | 16 | 111 | 0 | `VALID` | 10/10 K/D/A and 16/16 score transitions match `.dem.info` |
| `de_train` | 10:13 | 10 | 23 | 180 | 1 | `VALID` | 10/10 K/D/A and 23/23 score transitions match `.dem.info` |

Scores are shown in stable reference-team order, not as a claim about which
team belongs to the user. Confirming “my team won/lost” independently requires
the user's SteamID64; map identity and winning/losing squads themselves are
unambiguous.

All three fixtures have two stable roster-derived teams, five unique players
per team, a validated side swap, no invalid rounds and no quality issues. Real
display names and SteamID64 strings survive side changes and are exposed by the
normalized model/API. The UI renders the real display name and a separate
Steam profile link; identifiers are never converted to JS numbers.

### Defects fixed during three-demo reconciliation

- A Train suicide during pre-freeze was previously dropped and made K/D/A
  disagree with the reference. It is now retained as a non-live death and kept
  out of live feature input.
- Scoreboard K/D/A is now derived from all parsed death phases, while live
  events remain governed by the one-death-per-player-per-round invariant.
- Tick rate is derived from observed `tick`/`game_time` deltas (64 on all three
  fixtures) instead of remaining unavailable.
- SteamID64 format is validated as a string; malformed/missing identity makes
  identity quality partial. UI Steam links are constructed only for valid IDs.
- The capability probe now covers bomb begin/complete events, inferno lifecycle
  and selected time/economy tick fields.

### Golden acceptance status

- At least three real, external demos: **passed (3/3)**.
- Exact 10-player K/D/A and all round score transitions: **passed (3/3)**.
- Regular MR12 with stable side switch: **passed (3 fixtures)**.
- Bomb, flash, HE/inferno, friendly damage and trade-source coverage:
  **capability confirmed** on Dust2/Train; M2 metrics are not implemented.
- Team-kill positive fixture: **open**; both new matches contain zero team kills.
- Overtime or expected-`PARTIAL` fixture: **open**; none has overtime.
- Corrupt/truncated rejection fixture and full E2E robustness: **deferred to M4**.
- Docker Compose configuration: valid; container startup remains unverified on
  this host while the Docker daemon is unavailable.

M0/M1 remain complete. M2–M4 and scoring have not started.

## Recorded future requirements

### M2

Prepare typed, availability-aware gameplay metrics and contextual per-player
analysis from only the capabilities confirmed in `docs/compatibility.md`.
Damage must use chronological actual-HP-loss caps; trades require deterministic
one-to-one matching and the SPEC 5-second boundary.

### M3

- Show match MVP and the primary Who Ruined result simultaneously.
- Make player names open internal per-player analysis pages.
- Analyze contribution to victory for the winning team and contribution to
  defeat for the losing team.
- Add the player-analysis filter “Положительный вклад / Ошибки / Все действия”.
- Keep Steam profile links separate from internal name navigation.

### Future milestone (not implemented)

Investigate match ingestion by Steam share code, `steam://` links and, only if
technically and legally available, FACEIT links. URL download remains disabled
for the local MVP and requires a separate security/privacy design.

## Verification

Final lint/typecheck/test/build counts are recorded after the closing gate run
for this iteration. Golden tests explicitly report `SKIPPED` when their external
path variables are missing; a skipped fixture is never counted as passed.
