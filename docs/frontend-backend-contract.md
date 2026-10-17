# M3-B frontend/backend contract

Frontend code is intentionally unchanged. Consume the `m3-score-1` DTO from
`tests/fixtures/m3-scoring-report.json`; do not infer fields from private demos.

## Endpoints

```text
GET  /api/v1/matches/:id/report?version=<tag>&configHash=<sha256>
GET  /api/v1/matches/:id/players/:playerId/report?version=<tag>&configHash=<sha256>
POST /api/v1/matches/:id/rescore
Content-Type: application/json
{"scoringVersion":"scoring-successor@0.1.0-alpha75-beta25","configHash":"<optional sha256>"}
```

If version/hash is omitted on GET, the baseline successor is selected. Rescore
returns HTTP 202 with `matchId`, `jobId`, resolved `scoringVersion` and
`configHash`; poll the existing `/jobs/:id`. Unknown config is 422. Missing
match/player is 404. A missing scoring report, unfinished match or old artifact
without `m2-artifact-1` analytics is 409. `PARTIAL`, `UNSUPPORTED` and
`INSUFFICIENT_COVERAGE` are report states, never fake completed verdicts.

## Rendering semantics

- `experimental` is always true in M3-B and must be visible.
- `mvp` and `whoRuined` are nullable. MVP is global; Who Ruined is losing-team
  only. They may both belong to the losing team but normally represent different
  players.
- Display `ruinRaw`, absolute `margin`, `close`, `primaryScoreTied`, warnings
  and coverage next to `relativeIndex`. Never append `%` or call it probability.
- `noConfirmedHarm=true` means the assignment came from relative positive
  shortfall, not a proven harmful action.
- Use `components` as separate Performance, Context Contribution and Confirmed
  Harm panels. Null is unavailable, not zero.
- Filter actions with findings/episodes; do not derive new blame labels. A
  nickname remains an internal player-analysis link while a separate Steam
  profile link uses the existing identity DTO.
- `rounds` provides round/tick anchors and finding/episode IDs. The player
  endpoint contains only that player's episodes and per-round rows.

Every finding/episode has `scorerVersion`, `configHash`, player, round, tick(s),
source event IDs, neutral observed facts, confidence/evidence strength and an
`explanationKey`. Research episodes have `significance=null` and cannot affect
the displayed score.

Pending frontend work: connect these endpoints, show pending/error states,
close/tie and experimental disclaimers, component tabs and round drill-down.
No React/CSS changes are part of M3-B backend work.
