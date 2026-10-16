# M2 analytics contract

The local API remains under `/api/v1`; the analytics payload itself is
versioned as `schemaVersion: "m2-1"` and `featureVersion: "m2-0.1.0"`.

## Endpoints

- `GET /api/v1/matches/{matchId}/analytics`
- `GET /api/v1/matches/{matchId}/players/{playerId}/analytics`

Old M1 gzip artifacts remain readable by the match and rounds endpoints. They
return HTTP 409 from the analytics endpoint until the demo is reprocessed with
the M2 normalizer. New artifacts contain `{ match, analytics }` and are
validated with the shared Zod contract before being written atomically.

## Semantics

- Unknown parser values are `null`; zero means a supported observation with no
  matching fact.
- `availability` is `AVAILABLE`, `PARTIAL` or `UNAVAILABLE` for damage, flash,
  economy and alive-player context.
- Enemy damage and ADR use chronological actual HP loss capped at the victim's
  remaining health. Raw overkill is never added to ADR.
- A trade is a deterministic one-to-one revenge kill at or after the original
  death and no more than five seconds later. It is a sequence fact, not an
  inference about intent.
- KAST is the share of rounds with a kill, credited assist, survival or a death
  matched as traded.
- Opening kill/death is the first enemy-vs-enemy death in a live round.
- Clutches are factual won 1vX states derived from roster survival and the
  validated round winner.
- Ordinary deaths are emitted as `NEUTRAL` facts. Only direct team damage, team
  kills and suicides are categorized as `ERROR`; there is no M3 score.
- `smokeEffectiveness` and economy `money` are always `null` in the current
  parser contract.

The anonymized synthetic integration fixture is
`tests/fixtures/m2-match-analytics.json`. It contains no real nickname,
SteamID64 or demo-derived personal data.
