# Active participation rating API

The same route serves H3 for `match-result@2` and H2 for historical `match-result@1`. The H3 rating, explanation and Radar contracts are documented in the [frontend handoff](h3-frontend-handoff.md). The arithmetic and examples below describe historical H2 unless otherwise noted.

> M4.5 retirement note: the earlier
> `GET /api/v1/matches/{matchId}/experimental-rating` P2/C2+S2 endpoint is no
> longer registered and is absent from OpenAPI. This document describes the
> remaining participation-rating endpoint. HTTP policy selection is rejected.

The stored rating remains experimental, uncalibrated and non-causal. Ordinary deaths and low scores do not establish tactical mistakes or intent.

## Route and activation

```http
GET /api/v1/matches/{matchId}/experimental-participation-rating
```

The rating and explanation are enabled by default. Set `ENABLE_EXPERIMENTAL_PARTICIPATION_RATING=0` to disable those routes. Every HTTP query parameter
named `policy`, including legacy `H1` and `H2` values, is rejected with
`422 INVALID_POLICY_SELECTOR`.

The historical response schema is `m4.3-participation-rating@1`. It contains one rating
per player (or `null` plus a typed reason), all six families, K/D/A and factual
M2 analytics, coverage, ordering, MVP and Who Ruined pools. It deliberately
does not contain a policy selector, policy digest, alternative rating,
prepared input or recompute seed.

## Frozen arithmetic

For five non-harm inputs `v_i` and the already-S2-transformed `H_S2`:

```text
P = sum(max(v_i, 0))
N = sum(max(-v_i, 0))
g(z) = z                                  when z <= 0.25
     = 0.25 + 0.15*log1p((z-0.25)/0.15)  otherwise
rating = 1 + 10P - g(5N) + 2*H_S2
```

The historical H2 identity is frozen:

| Policy | Policy ID | SHA-256 digest | direct-harm multiplier |
| --- | --- | --- | ---: |
| H2 | `P72B_D_P10_N5_K025_A015_H2` | `7ac1d2d3afcffa9d4682e2979f06f4dad8d42f270ec0e858bac93019724baf48` | 2 |

The historical H1 identity
`P72B_D_P10_N5_K025_A015_H1` /
`3d299d81f8e8cd336ec6288431fa83240f6a0209bfeed3b80f89930ab88f5c75`
remains accepted only in persisted `match-result@1` schemas and old sidecar
fingerprint metadata. No runtime function can calculate or select H1.

`1 + sum(rating.finalAttribution) == rating.value` within `1e-12`.
`rawFamilyInputs.DIRECT_HARM` is `H_S2`; it is not transformed again.

## Response outline

This example is synthetic and abbreviated:

```json
{
  "schemaVersion": "m4.3-participation-rating@1",
  "reportVersion": "match-result@1",
  "matchId": "synthetic-match-01",
  "experimental": true,
  "calibrated": false,
  "causalBlame": false,
  "scenario": "BOMB",
  "players": [
    {
      "playerId": "player-01",
      "teamId": "team-a",
      "displayName": "Player 01",
      "steamId": null,
      "availability": { "status": "CALCULATED_RESEARCH_ONLY", "reason": null },
      "rating": {
        "value": 1.4,
        "rawFamilyInputs": {
          "COMBAT": 0.04,
          "SUPPORT": 0.01,
          "DEATH_RELATED": -0.02,
          "DIRECT_HARM": -0.01,
          "CONTEXT": 0.002,
          "OBJECTIVES": 0
        },
        "arithmetic": {
          "origin": 1,
          "reconstructed": 1.4,
          "tolerance": 1e-12,
          "exactWithinTolerance": true
        }
      }
    }
  ],
  "awards": {
    "eligiblePoolSize": 10,
    "incompletePool": false,
    "outcome": "DECIDED",
    "mvp": { "playerId": "player-05", "awardPoolSize": 10 },
    "whoRuined": {
      "playerId": "player-09",
      "awardPoolSize": 5,
      "scope": "LOSING_TEAM_ELIGIBLE"
    }
  },
  "provenance": { "originalDemoParsedAtRequest": false }
}
```

The authoritative runtime type and OpenAPI schema are exported by
`@who-ruined/contracts`.

## Availability and awards

Numeric `rating` exists only for `CALCULATED_RESEARCH_ONLY`. The preserved null
states are `PARTICIPATION_ABSENT_GT_2_ROUNDS`,
`PARTICIPATION_EVIDENCE_UNKNOWN`, `PARTIAL_COVERAGE_INSUFFICIENT`,
`WITHHELD_INSUFFICIENT_VERIFIED_EXPOSURE` and `UNKNOWN_APPLICABILITY`.
Unavailable is never converted to zero or 1.0.

MVP is the maximum among all calculated eligible players. Who Ruined is the
minimum among calculated players on the losing stable roster. A genuine draw
uses all calculated players and scope `DRAW_ALL_ELIGIBLE`; unknown outcome is
not treated as a draw. Pool sizes, incomplete-pool state and ties are explicit.

## Canonical-result errors

| HTTP | Code | Meaning |
| ---: | --- | --- |
| 404 | `EXPERIMENTAL_PARTICIPATION_RATING_DISABLED` | Feature flag is off. |
| 404 | `MATCH_NOT_FOUND` | Match is absent or deleting. |
| 409 | `REPORT_NOT_READY` | Canonical result is not ready. |
| 409 | `REPORT_CORRUPT` | File missing, invalid, wrong schema/checksum or wrong DB binding. |
| 409 | `REPORT_POLICY_MISMATCH` | The historical result uses an unreadable rating policy such as H1. |
| 422 | `INVALID_POLICY_SELECTOR` | Public policy selection is forbidden. |

Legacy matches not yet migrated retain the older typed sidecar/backfill errors.
No GET parses a demo, creates files, queues a backfill or modifies PostgreSQL.

## Owner rebuild

```powershell
npm.cmd run rating:rebuild -- --dry-run --match=<match-id>
npm.cmd run rating:rebuild -- --apply --match=<match-id>
```

The command targets H3. For existing H3 it validates the private seed and can republish the result and its bound EVP report without reparsing. Historical upgrades require an explicit match ID, a retained demo matching the original SHA-256 and compatible parser and normalizer versions. If evidence is unavailable, the command reports `BLOCKED` and leaves the historical pointer intact. Review the dry-run summary before applying. [Storage lifecycle](storage-lifecycle.md).
