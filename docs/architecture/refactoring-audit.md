# Architecture refactoring audit

> **Historical snapshot — not current documentation.** Retained as milestone evidence. Use [the documentation index](../README.md) to find the current contract.

Status: P0 baseline, 2026-10-31  
Audited revision: `c321a87` (`refactor/codebase-quality`, based on `origin/main`)  
Scope: architecture and maintainability only; no production behavior was changed.

## Method and boundaries

The audit covered `apps/api`, `apps/worker`, `apps/web`, all workspace packages,
Prisma, scripts, root configuration, documentation and tests. It followed the
normative boundaries in `SPEC.md`: parser adapter → normalized facts → features
→ scoring → reports/API → UI; stable teams are roster-based; missing data stays
unavailable; scoring remains deterministic and ordinary deaths are not blame.

Evidence came from source/import inspection and the clean-worktree baseline
below. No demo was parsed, no database or Docker service was touched, and the
three external real-demo golden tests were allowed to skip.

The reference repository
[`Pizershtain/nestjs-auth-example`](https://github.com/Pizershtain/nestjs-auth-example)
was used only for its easy-to-scan `src/modules/<feature>` locality and the
reader-oriented `README_STUDENT_PART.md`. Its weak typing, broad services,
duplicated validation and naming inconsistencies are not patterns to copy.

## Current system map

```text
web ────────────────────────────────> contracts
api ──> contracts, database, parser-adapter, scoring
worker ─> database, parser-adapter, match-domain, features, scoring, contracts
validation ─> parser-adapter, match-domain, features, scoring, contracts

match-domain ─> contracts, parser-adapter   # boundary inversion, see A1
features ─────> contracts
scoring ──────> contracts                   # runtime; feature/testkit are test-only
database ─────> generated Prisma client
testkit ──────> contracts
```

Main persisted/read paths:

1. API streams a `.dem`, validates admission/header, writes metadata and queues
   a job.
2. Worker claims a fenced lease, runs the native parser in an owned child,
   normalizes/validates, computes M2 analytics, prepares participation evidence,
   scores H1/H2, builds replay artifacts and atomically publishes
   `match-result@1`.
3. API reads SQLite pointers plus gzip artifacts, verifies bindings/schemas and
   returns versioned DTOs.
4. Web validates DTOs from `@who-ruined/contracts`, uses TanStack Query and
   renders reports, explanations and replay without recalculating scores.

This overall flow is sound. The main debt is that its responsibilities are
concentrated in a few entry files and the same artifact/rating protocol is
implemented more than once.

## Critical findings

| ID | Location | Current responsibility | Problem and impact | Recommendation | Priority | Stage |
|---|---|---|---|---|---|---|
| A1 | `packages/match-domain/src/index.ts` imports `ParsedDemoSnapshot`, `UnknownRow`, `asInteger/asText` from `@who-ruined/parser-adapter` | Round/team reconstruction and domain validation directly from raw parser rows | Domain knows the concrete parser transport and permissive row shape. Parser alias changes can force domain changes; raw `unknown` parsing leaks past the adapter. This contradicts the intended boundary. | Define a parser-neutral normalization input/port owned by the domain; map native rows and aliases in parser-adapter; keep missing values explicit. Move in small compatibility-preserving steps. | Critical | P1–P2 |
| A2 | `apps/api/src/matches.service.ts`, `matches.controller.ts`, one-provider `app.module.ts` | Upload, dedupe, jobs, list/detail, replay, analytics, rating, explanation, legacy reports, rescore and deletion | `MatchesService` has many unrelated reasons to change and directly combines Prisma, filesystem/artifact access, parser header checks and scoring. A small endpoint change risks unrelated behavior; tests need broad mocking. | Keep the `/matches` resource but split application use cases and feature-local HTTP adapters; inject repository/artifact/parser-header ports at Nest composition roots. | High | P1–P2 |
| A3 | `apps/worker/src/process-job.ts`, `main.ts`, `prepared-participation-input.ts`, `participation-sidecar.ts` | Lease orchestration, parsing, normalization, replay, participation preparation, scoring, publishing, cleanup and DB state | `processJob` is a transaction script across every layer. Participation preparation contains 2,840-character lines and mixes parser calls, domain reconstruction and formulas. Fencing/publication order is hard to review and difficult to test independently. | Preserve the exact state machine, but extract PARSE/RESCORE use cases and explicit pipeline steps. Put native parsing and storage behind adapters; split pure participation transformations by domain concept. | Critical | P1, P3 |
| A4 | API: `bounded-gzip.ts`, `replay-storage.ts`, `match-result-storage.ts`, `participation-rating.ts`; worker: `storage.ts`, `match-result-storage.ts`, `replay-artifact.ts`, `participation-sidecar.ts` | Safe paths, gzip JSON, canonical serialization, hashing, binding/schema/fingerprint checks and artifact paths | The same protocol is reimplemented with different error types. `canonical()`/SHA logic and participation paths exist in multiple places. Drift can make worker-written data unreadable or differently verified by API. | Introduce a small shared artifact codec/store module with typed failures and no HTTP/Prisma dependency. API and worker map those failures at their boundaries. Do not create a universal repository. | Critical | P1–P3 |
| A5 | `apps/api/src/participation-rating.ts`, `packages/scoring/src/active-match-result.ts`, `apps/worker/src/participation-sidecar.ts` | Projects prepared profiles, orders players, selects awards and assembles rating DTOs | `buildParticipationRatingReport` and `buildActiveParticipationRating` repeat roster checks, projections, ordering, coverage and DTO assembly. A legacy worker runtime report has another H1/H2 assembly path. Formula/pool/null fixes can land in only one path. | Make one pure scoring projection/assembly owner. Keep old DTOs/endpoints as thin compatibility mappers, then remove demonstrably unused internal legacy code only after contract tests. | Critical | P2–P3 |
| A6 | `packages/scoring/src/index.ts` and versioned JSON config | Legacy finding scorer, ranking, config loading and public barrel | The package reads JSON with `node:fs` during module evaluation, while the same file owns pure scoring. This hides I/O, complicates tests/composition and weakens the “pure deterministic scorer” invariant. Large one-line return logic also obscures policy review. | Load and validate config at a composition boundary, pass an immutable typed config into pure scorers, and split implementation files while preserving root exports, hashes and arithmetic. | High | P3 |
| A7 | `packages/contracts/src/index.ts`, `apps/api/src/safe-exception.filter.ts`, `http-validation.ts`, `apps/web/src/shared/messages.ts` | All schemas/OpenAPI projections/types plus HTTP error transport/localization | A 622-line contract barrel holds unrelated generations. `ApiError.code` is `string`; `contracts.errorCodes` omits many live codes; web knows a third subset. Compiler cannot prove API/UI error compatibility. | Split contract source by bounded context/version and re-export from the existing root. Add a versioned error response and explicit machine-code unions/mappings while keeping every serialized code unchanged. | High | P1–P2 |
| A8 | `packages/database/src/index.ts`; direct `prisma` imports in API/worker/CLI | Prisma lifecycle and job lease repository | The package exports both a client factory-style repository and a global `new PrismaClient()`. Application services still query the singleton directly, coupling use cases to Prisma and process lifecycle. Transaction/fencing invariants are distributed. | Instantiate Prisma in API/worker composition roots, expose narrow repositories for match/job/report use cases, and keep transactional fencing operations together. Avoid generic CRUD repositories. | High | P1–P3 |
| A9 | `apps/web/src/components`, `pages`, `hooks`, root `api.ts`, `index.css` | Routes, fetching, adapters and all match/rating/replay UI | The application works, but feature code is flat: rating, explanation, replay and match report reach across generic folders. Several JSX files contain 700–1,500 character lines. Ownership and safe change scope are unclear as features grow. | Reorganize incrementally by user capability (`match-report`, `rating`, `explanation`, `replay`, `upload`) with co-located hooks/view adapters; retain shared UI/i18n and current routes/design. | Medium–High | P4 |
| A10 | `AGENTS.md`, `README.md`, `docs/frontend.md`, `docs/integration-e2e.md`, `turbo.json`, database package scripts | Developer guidance and quality gates | Live docs still say M3 is absent and 2D replay is future. On a clean checkout, first `typecheck` races Prisma generation; tests advertise `coverage/**` but produce none, so Turbo warns for every package. New contributors get stale architecture and a non-reproducible first gate. | Fix the cold-start task graph in P1, correct test outputs, then make README/live docs describe current M4.6/M4.7 and clearly mark historical milestone documents in P5. | High | P1, P5–P6 |

## Detailed evidence and constraints

### A1 — parser/domain inversion

`normalizeSnapshot()` in `match-domain` performs legitimate domain work:
stable roster team IDs, round intervals, side maps, scores and event identity.
The problem is not that the file is long; it is that it receives adapter-owned
`ParsedDemoSnapshot` and uses adapter helpers over `UnknownRow`. The target input
must express facts such as parsed round markers, player identities and events,
not demoparser column aliases. A temporary adapter can construct the new input
while old normalization tests prove byte/semantic equivalence.

### A2 — API application boundary

`MatchesService` methods include `ingest`, `job`, `list`, `match`, replay
metadata/round, analytics/player analytics, participation rating/explanation,
legacy reports, `rescore` and `deleteMatch`. These are valid features, but not
one application responsibility. Nest modules should organize locality; they
must not merely create one class per file or move the same monolith under a
`modules` folder.

### A3 — worker orchestration and lifecycle

The current worker correctly implements important safety properties: atomic job
claim, renewable lease token, owned child timeout, publish-before-pointer,
source cleanup after publication and recovery reconciliation. Refactoring must
first characterize these sequences in tests. Extracted steps should return
typed results; the orchestrator remains the single place that orders state
transitions. Splitting methods must not split the transaction/fencing invariant.

### A4 — artifact protocol

The justified common abstraction is narrow: canonical JSON, SHA-256, bounded
gzip decode, atomic publish, safe relative path and binding/schema validation
for known artifact kinds. Storage location and HTTP error mapping remain in
apps. Schema/version IDs and current relative paths are compatibility data, not
rename targets.

### A5 — duplicated rating assembly

Both active and experimental report builders call the same kernel but separately
perform stable ordering, draw handling, incomplete-pool behavior, coverage,
`rating:null`, arithmetic reconstruction and award selection. This is semantic
duplication, unlike two coincidentally similar UI mappers. One internal result
model should feed version-specific DTO mappers. H2/H1 values, tie breaks,
`DRAW_ALL_ELIGIBLE`, policy digests and `1 + Σ finalAttribution` are frozen.

### A6 — scoring purity

The participation kernel is already mostly pure and has strong mathematical
tests. The legacy scorer's import-time config I/O is the boundary violation.
The fix is not a `ScoringManager` hierarchy: use immutable data plus pure
functions, with a small config loader at an app/CLI composition root.

### A7 — contracts and errors

Internal source files may be split without changing the package root import.
Keep Zod as the I/O authority and continue generating OpenAPI shapes from those
schemas. A typed error catalog should distinguish public API codes from internal
worker/diagnostic codes; the UI must retain an unknown-code fallback.

### A8 — persistence

Job lease methods already show the right cohesion in `createJobRepository`.
That pattern should expand only around behavioral transactions, not every
Prisma model. Repository ports belong beside the application use case that
needs them; Prisma implementations belong in infrastructure and are wired once.

### A9 — frontend

The UI correctly avoids computing ratings, preserves `null`, lazy-loads 37
locales and accounts for RTL/reduced motion. P4 is a locality/readability change,
not a redesign. Route pages should compose feature modules; query keys/API
decoding should live with the feature or a typed shared API client; presentational
components should receive ready view data.

### A10 — documentation and gates

Historical `m3-*`/`m4.*` records are valuable evidence and must not be deleted.
They need an explicit historical index/status, while README, architecture,
frontend and operations docs become the current truth. The cold-checkout
`typecheck` race is reproducible: `database:typecheck` starts before
`prisma generate` completes because root `typecheck` depends on upstream builds,
not the package's own generation step.

## Optional style improvements (not architecture blockers)

- Reformat dense one-line implementations in
  `apps/worker/src/prepared-participation-input.ts`,
  `apps/worker/src/participation-sidecar.ts`, `packages/scoring/src/index.ts` and
  several React files. The issue is reviewability; line count alone is not a
  reason to split a cohesive algorithm.
- Prefer domain file names over generic `index.ts`/`api.ts` once compatibility
  barrels exist. Do not rename stable exports just to match filenames.
- Consider a formatter only as a separately approved repository-wide decision;
  do not combine a formatting avalanche with semantic refactoring.
- Normalize language in internal log/error source where practical, while
  preserving public machine codes and localized UI behavior.
- Add short comments only for non-obvious invariants (fencing, arithmetic,
  compatibility), not narration of straightforward code.

## Existing strengths to preserve

- Strict TypeScript (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`) and Zod validation at I/O.
- Stable roster-based team identity and explicit side-per-round mapping.
- Deterministic scoring, frozen policies/digests and attribution reconstruction.
- Owned parser child, bounded gzip, safe path checks, atomic publication and
  lease fencing/recovery.
- API returns stored results without reparsing on GET.
- Synthetic fixtures are labeled; real-demo tests skip instead of inventing
  evidence.
- Web keeps scoring on the server, validates DTOs, retains unavailable/null and
  supports 37 locales, RTL and reduced motion.
- `@who-ruined/testkit` now centralizes the core synthetic match builder; extend
  it selectively rather than creating a second fixture system.

## Baseline results

Environment: Windows, Node `v22.17.0`, npm `10.9.2`, pnpm `11.25.0`.
`npm.cmd run setup:windows` used the frozen lockfile and downloaded no packages.

| Check | Result | Notes |
|---|---|---|
| `npm.cmd run lint` | PASS | 11/11 workspace tasks |
| first `npm.cmd run typecheck` on clean checkout | FAIL | Prisma client absent while `database:typecheck` raced `database:build`; TS2307 plus implicit-any fallout |
| `npm.cmd run build` | PASS | 11/11 tasks; generated Prisma client and built web/API/worker/packages |
| second `npm.cmd run typecheck` | PASS | 18/18 tasks after generation |
| `npm.cmd run test` | PASS with expected skips | 225 automated tests passed; 3 external real-demo golden tests skipped because paths were not configured |
| `npm.cmd run i18n:check` | PASS | no writes, no pending tasks/errors across 37 locales |
| `npm.cmd run design:contrast` | PASS | 41 surfaces; minimum observed ratio 4.67:1 |

Turbo emitted “no output files found” for test tasks because `turbo.json`
declares `coverage/**` while current Vitest scripts do not emit coverage. This
does not invalidate the tests, but test caching/output configuration should be
corrected before relying on cached quality gates.

## Audit conclusion

No rewrite is justified. The product already has strong correctness and safety
invariants. The safest program is an incremental strangler refactor: first lock
dependency/compatibility gates, then split boundaries and remove duplication,
then deeply clean parser/scoring/worker, then reorganize React and documentation.
Every step must preserve serialized artifacts, SQLite data, endpoint semantics,
H2/H1 arithmetic and observed UI behavior.
