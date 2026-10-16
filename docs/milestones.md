# Milestone status

## M0/M1 — accepted on three real demos

Office (`cs_office`, 13:8), Dust2 (`de_dust2`, 3:13) and Train
(`de_train`, 10:13) still pass the real golden suite. All have ten players, two
stable roster-derived teams, exact side changes, valid round winners and exact
score transitions. Every K/D/A row matches the external `.dem.info` sidecar.
The Train pre-freeze suicide remains an all-phase scoreboard fact and is not
leaked into live analytics.

## M2 — implementation complete, independent validation partial

Implemented without M3 scoring:

- normalized hurt, blind, grenade, bomb and freeze-economy facts with event
  context (phase, stable team, side, time, alive counts, bomb state, equipment;
  unavailable money is `null`);
- deterministic K/D/A, ADR, actual HP damage, KAST, openings, multikills,
  trades/untraded deaths/trade participation, survival, 1vX and alive-state
  advantage/disadvantage facts;
- flash, HE, inferno and smoke factual analytics, friendly utility and team
  damage, team kills and suicides;
- versioned `m2-1` contract, worker `FEATURIZING` stage, gzip artifact, match
  and per-player API endpoints, OpenAPI routes and an anonymized frontend JSON
  fixture;
- factual categories `POSITIVE_CONTRIBUTION`, `ERROR` and `NEUTRAL`. Ordinary
  deaths are neutral facts; no score or blame verdict exists.

The three real demos pass exact deterministic M2 aggregate regression checks.
An isolated Dust2 upload completed upload → SQLite → worker → parser →
normalization → validation → feature computation → JSON.gz → API. The match,
analytics and per-player endpoints returned valid versioned payloads; a second
upload returned the same match/job with `duplicate: true`.

M2 is **not declared fully acceptance-closed** because no independent external
reference for ADR/KAST/trades/clutches/utility damage was supplied. Internal
consistency and deterministic regression are passed; independent metric
reconciliation remains open. The expanded M2.5 batch positively covers real
team kills; the overtime fixture is still open.

## Acceptance gates

| Gate | Status |
| --- | --- |
| Parser capability on 3 real Source 2 demos | PASS |
| M0/M1 K/D/A and score reconciliation against `.dem.info` | PASS (3/3) |
| Stable roster teams and side swap | PASS (3/3) |
| M2 deterministic unit tests, missing/null semantics and 5-second trade boundary | PASS |
| M2 real-demo internal aggregate golden tests | PASS (3/3) |
| Worker/SQLite/JSON.gz/API integration and SHA dedup | PASS (Dust2 isolated run) |
| Independent ADR/KAST/trade/utility reference | OPEN — reference unavailable |
| Positive real team-kill fixture | PASS (2 events in the 9-demo M2.5 batch) |
| Overtime/expected-`PARTIAL` fixture | OPEN |
| Docker Compose startup | OPEN — Docker daemon unavailable on this host |
| M3 scoring/ranking | NOT STARTED |

The original M2 gate completed successfully with 31 tests. The M2.5 gate below
supersedes that count with the expanded regression suite.

## Recorded future requirements

M3 must show MVP and Who Ruined simultaneously, provide internal clickable
player analysis, distinguish contribution to victory from contribution to
defeat, support “Положительный вклад / Ошибки / Все действия”, and keep Steam
profile links separate. A later milestone may investigate Steam share codes,
`steam://` and technically/legal available FACEIT links. None is implemented
here.

## M2.5 — validation infrastructure

`pnpm validate:demos "F:\CS2 Demos"` processed all 9 discovered demos in
isolated child processes. All 9 had matching `.dem.info` files and finished
`PASS`: exact 10-player K/D/A, every round score transition, M1 invariants and
M2 mathematical checks passed. Exported JSON was scanned for paths, filenames,
SteamID patterns and display-name fields; no personal-data match was found.

The expanded real batch contains 2 team kills, 4 live suicides, 10 non-live
suicides and 7 detected reconnect sequences. It contains no overtime. Synthetic
tests therefore cover overtime side switches, corrupt/truncated native-parser
failure isolation, simultaneous event ordering, exact trade-window boundaries,
team/world deaths, post-round exclusion, clutch, utility and economy math.

The batch exposed and fixed incorrect scoreboard treatment of deaths after a
terminal event. The correct deterministic distinction is based on objective
terminal ordering, duplicate round deaths and delayed C4 death behavior; the
fix reconciles all 9 matches without changing expected reference data.

M2.5 final gate: `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`
completed successfully. The full run executed 38 tests, including 3 configured
real-demo golden tests; skipped tests: 0.

## M3-A — scoring model design

Design only; no scoring engine or ranking API is implemented. The restored
`SPEC.md` 1.0.0 v1 formula is retained verbatim as a compatibility baseline.
The proposal separates Performance, Impact and Mistakes, documents explicit
conflicts with later requirements, supplies numerical examples, and defines
calibration, fairness, abstention and false-positive gates. M3-B is blocked on
the owner decisions listed in `docs/m3-scoring-proposal.md` section 10.

M3-A gate: `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` passed;
38 tests passed, including 3 configured real-demo golden tests, with 0 skipped.
