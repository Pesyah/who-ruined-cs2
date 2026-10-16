# Architecture decisions

## ADR-001: conservative parser boundary

Native values are converted to arrays and validated at the adapter boundary. Field aliases live there or in the normalizer; a missing field is `null`, never `0`. Probe output contains schema only.

## ADR-002: stable identities

Team IDs are a SHA-256 prefix of the sorted stable player IDs. `T` and `CT` are per-round attributes and never team identities. SteamID64 is the player ID when available. Anonymous IDs force partial identity quality.

## ADR-003: M0/M1 gate without a demo

The repository had no `.dem` file on 2026-10-15. Synthetic fixtures are labeled in code and test only contracts, side switching, score transitions and failure behavior. M0 capability proof and M1 golden reconciliation remain pending; no parser event field is claimed as verified.

## ADR-004: local queue

Prisma + SQLite stores job metadata. One worker claims jobs using a conditional update and writes normalized gzip JSON through a temporary file followed by atomic rename. No Redis is introduced.

## ADR-005: preflight before native parsing

The pinned Windows binding panicked on a 10-byte malformed input during an actual automated test. Ingestion now checks minimum header length and `PBDEMS2` magic before `parseHeader`. The native parser remains the authoritative validation step for candidates that pass this cheap safety gate.

## ADR-006: scoring compatibility and successor separation

The normative v1 formula is implemented unchanged under its own version. A
separate experimental successor computes positive shortfall and bundled
confirmed harm, always assigns a losing-team leader only on eligible complete
input, and exposes close/tie/sensitivity instead of applying v1 abstention.
Configuration is immutable, Zod-validated and SHA-256 hashed.

## ADR-007: artifact-only rescore

Scoring consumes the persisted `m2-artifact-1` gzip artifact. `RESCORE` jobs
enter `SCORING` directly and never invoke the native demo parser. Reports are
atomically written and uniquely keyed by match, scorer version and config hash.
