# P3 compatibility checkpoints

> **Historical snapshot — not current documentation.** Retained as milestone evidence. Use [the documentation index](../README.md) to find the current contract.

This is a compact implementation checklist, not a new product specification.
All fixtures are synthetic or persisted contract fixtures; real demos are
excluded unless the owner separately authorizes them.

| Boundary | Frozen behavior | Evidence |
|---|---|---|
| Artifact store | relative-path containment, no symlink traversal, compressed/decompressed/depth limits, compressed SHA-256, immutable create/reuse/conflict, callback before publication | artifacts/API/worker storage tests |
| Canonical result | unchanged JSON/gzip bytes, match-result@1, checksum, match/policy binding, publish before DB pointer | match-result and rescore fixtures |
| Participation | unchanged sidecar path/schema/fingerprint/policy and roster binding | participation API/sidecar fixtures |
| Replay | unchanged index/round paths, fingerprint, binding, sample/event counts, optional failure | replay storage/artifact fixtures |
| Rating | exact H2/H1 values, six families, negative contributions, 1 + sum attribution, null/incomplete, ties/draw/awards | scoring and participation fixtures |
| Worker | fenced stage transitions, heartbeat/abort/recovery, immutable publication before pointer, source cleanup after binding, RESCORE without .dem | worker lifecycle/fault fixtures |

Expected values and hashes are not updated to accommodate a refactor. A failed
equivalence check blocks only the owning P3 increment.
