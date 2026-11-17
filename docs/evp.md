# Experimental EVP report

**Status:** active backend contract for evp-policy@1-experimental. EVP is
experimental, uncalibrated and independent of H2. The policy and its thresholds
are owned by packages/scoring; this document describes integration and
persistence, not a new scoring formula.

## Storage decision

EVP is stored as a separate immutable evp-report@1 gzip artifact:

    experimental/evp/<matchId>/<inputDigest>.evp-report@1.json.gz

This was chosen instead of extending match-result@1: old canonical results
remain readable, the public EVP DTO can evolve independently, and ordinary
legacy-report RESCORE does not rewrite either H2 or EVP. PostgreSQL stores a
nullable path, SHA-256, schema version, policy ID and input-binding digest.

The input digest covers the canonical M2 artifact, roster-bound participation
availability/coverage, scenario and current H2 MVP. It deliberately excludes
canonical creation time and mutable legacy production reports. Consequently a
compatible RESCORE reuses the exact EVP artifact, while a rating rebuild must
validate or republish EVP before atomically changing both pointers.

Publication follows the common artifact protocol: bounded JSON/gzip, safe
relative paths, symlink rejection, write/fsync, lease check, immutable
create/reuse/conflict and SHA verification. The file is published before the
fenced PostgreSQL terminal update. A stale worker cannot update the pointer;
an unreferenced publication left by a crash is removed by normal reconciliation.
DELETE removes both the referenced file and the match-owned EVP directory.

## Contract and API

GET /api/v1/matches/:id/evp reads the stored report only. It never opens a
demo, runs scoring, queues work or modifies PostgreSQL. The response includes:

- applicability and typed reason codes;
- zero, one or two awards;
- all candidate and specialization diagnostics;
- actual metrics, thresholds and relative comparison results;
- team-harm availability and decision;
- verified event/round evidence IDs;
- explicit MVP exclusion and source binding.

Validation rejects duplicate participants/awards, more than two awards, an MVP
award, candidate/award disagreement, non-finite values, roster mismatch,
unknown evidence IDs, stale source binding and a wrong policy. Missing values
remain null; a valid report with zero awards is not an error.

Public read failures distinguish:

| Code | Meaning |
| --- | --- |
| REPORT_NOT_READY + EVP/NOT_CREATED | historical canonical result has no EVP pointer |
| REPORT_CORRUPT + EVP/MISSING | PostgreSQL points at an absent artifact |
| REPORT_CORRUPT + EVP/CORRUPT or a specific integrity reason | checksum, gzip, schema, binding or relation failure |
| REPORT_POLICY_MISMATCH + EVP/POLICY_MISMATCH | pointer or payload uses another EVP policy |

An EVP report can be valid and inapplicable because required evidence or MVP is
unavailable. That state is returned in the versioned DTO rather than converted
to an empty fabricated success.

## Worker behavior

- **PARSE:** canonical M2/H2 data is produced once, then
  prepareEvpMatchInput() and calculateEvpAwards() build and validate the sibling
  report. No extra demoparser2 run is performed.
- **RESCORE:** verifies an existing complete EVP pointer and binding, then
  recalculates only the requested legacy scoring report. A historical all-null
  pointer is allowed; a partial or stale pointer fails closed.
- **rating:rebuild:** rebuilds H2, validates/reuses or publishes EVP for the
  rebuilt inputs and swaps both pointers through the serialized job-write
  transaction.
- **Historical backfill:** computes EVP only from a stored canonical result:

      npm.cmd run evp:backfill -- --dry-run
      npm.cmd run evp:backfill -- --apply
      npm.cmd run evp:backfill -- --apply --match=<matchId>

Backfill refuses deletion-in-progress, active jobs, changed pointers, corrupt
or incompatible canonical data. Apply is idempotent: current artifacts report
REUSED; new compatible reports report CREATED; unsafe rows report BLOCKED. It
never reparses a demo or changes H2.

## Compatibility

The database columns are additive and nullable. An old match without EVP still
serves its existing match/H2/replay APIs; only the EVP endpoint returns
REPORT_NOT_READY with EVP/NOT_CREATED details. Adding EVP does not mutate the historical match-result@1. The
experimental identity, maximum of two awards and MVP exclusion are enforced by
scoring, the persisted schema and read-time relation checks.
