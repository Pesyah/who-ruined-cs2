# Architecture decisions

**Status:** living decision log. Historical context is preserved inside each ADR; current runtime details are owned by the linked canonical documents.

## ADR-001: conservative parser boundary

Native values are converted and validated inside `@who-ruined/parser-adapter`. Field aliases and native quirks stop there. Match-domain receives parser-neutral `NormalizationInput`; a missing value is `null`, never zero. Diagnostic probes expose schema/capability information rather than private player data.

## ADR-002: stable identities

Team IDs derive from the sorted stable roster IDs. T and CT are per-round side attributes and never team identities. SteamID64 is used when available; anonymous identity lowers data quality instead of being guessed.

## ADR-003: synthetic evidence is not parser proof

At the initial 2026-10-15 milestone no demo was available, so synthetic tests were limited to contracts, side switching, score transitions and failures. Later isolated external-demo checks are recorded in [parser compatibility](compatibility.md), including their reference limits. Synthetic fixtures remain labeled and never inherit those real-demo claims.

## ADR-004: SQLite queue with fenced leases

Prisma/SQLite stores job metadata. Workers claim jobs through conditional updates, receive lease tokens, heartbeat, and fence every stage/terminal mutation. Expired work is recovered only up to a finite attempt limit. Redis is not introduced for the trusted local topology.

## ADR-005: preflight before native parsing

The pinned Windows parser binding panicked on a deliberately malformed tiny input during an automated test. Ingestion checks minimum header length and Source 2 magic before native parsing. Candidates that pass still require native parsing and normalized validation; preflight is not a substitute for parser evidence.

## ADR-006: factual analytics and scoring remain separate

M2 features are factual and availability-aware. Legacy v1/successor reports remain versioned compatibility outputs. The active H2/H1 participation rating is a separate experimental projection with frozen policy IDs/digests and one shared arithmetic path. Ordinary deaths are not blame.

## ADR-007: artifact-only rescore

A RESCORE job reads normalized analytics embedded in `match-result@1` (or a compatible legacy normalized artifact) and never invokes the demo parser. Insufficient stored input produces a typed failure. Active H2/H1 owner-policy rebuild is separate and uses the canonical private recompute seed, also without a demo.

## ADR-008: immutable artifacts before database pointers

Large results live as bounded gzip artifacts; SQLite stores relative paths and SHA-256 bindings. Writers publish create/reuse/conflict immutably and verify lease ownership before final creation. The database pointer and terminal job state commit only after publication. Reconciliation handles orphaned publications because filesystem and SQLite cannot share a transaction. See [storage lifecycle](storage-lifecycle.md).

## ADR-009: capability-first frontend

React routes are thin composition roots. Feature modules own endpoint/query/view behavior; match entities and shared UI/i18n remain below them. Compatibility re-exports preserve old source paths temporarily. Server DTOs are authoritative and the browser does not calculate ratings or invent replay facts.

## ADR-010: local product and public deployment are different designs

The implemented system assumes one trusted owner, loopback services, a shared local data root and SQLite. Resource bounds harden that environment but do not provide authentication, tenant isolation or public-service admission control. Public hosting requires a separate threat model, persistence/backup design and operations review; no `PUBLIC_MODE` flag can provide those guarantees.
