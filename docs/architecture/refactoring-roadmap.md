# Refactoring roadmap P1–P6

Status: P1–P6 complete; final verdict is **accepted with limitations**.  
Baseline and findings: [refactoring-audit.md](./refactoring-audit.md).  
Target boundaries: [target-architecture.md](./target-architecture.md).
Final evidence: [final-quality-report.md](./final-quality-report.md).

The roadmap froze H1/H2 behavior during P1–P6. The later owner decision to
retire executable H1 is documented in [ADR-011](../decisions.md); historical
H1 references below describe that refactoring baseline, not current runtime
selection.

## Delivery principles

1. Refactor by compatibility seam, not by mass move. A stage may contain several
   small reviewable changes; each ends green and runnable.
2. Characterization tests precede a risky move. Old and new implementations may
   coexist behind an adapter only for the shortest practical period.
3. Moving a file and changing its behavior are separate changes whenever
   possible. Mechanical formatting is separate from both.
4. Public DTOs, error codes, schema/version IDs, policy digests, arithmetic,
   artifact paths, DB semantics and UI behavior are frozen unless the owner
   explicitly authorizes a version/migration outside this program.
5. Synthetic fixtures are explicitly synthetic. Real-demo claims require an
   authorized isolated run with real files; normal refactoring gates do not parse
   the owner's corpus.
6. Every stage records its before/after dependency map, compatibility evidence,
   checks and remaining adapters. A failed gate stops the stage, not the product.

## Frozen equivalence matrix

Every stage that touches the relevant area must preserve:

| Area | Equivalence evidence |
|---|---|
| H2/H1 | Exact existing policy IDs/digests; six-family raw/final values; `1 + Σ attribution`; ties, draw, null and incomplete pools |
| Match identity | Stable roster-derived team IDs across T/CT swaps; round/score/event IDs unchanged |
| Persisted results | Existing `match-result@1`, participation sidecar and replay fixtures still decode and verify |
| API | Existing routes, status codes, response schemas and machine error codes |
| Worker | Lease fencing, retry/recovery, publish-before-pointer, cleanup-after-binding and RESCORE-without-demo |
| Parser/domain | Missing values remain null/unavailable; no guessed rows/rosters; same normalized fixture output |
| Frontend | Same routes, queries, loading/error/stale states, 37 locales, RTL, mobile and accessibility behavior |
| Replay | Same metadata/round schemas, calibration and partial/unavailable semantics |

## P1 — Structure and enforceable boundaries

**Scale:** large but mostly mechanical; approximately 3–5 reviewable increments.

### Scope

Establish the target module skeleton, dependency rules and reproducible clean
checkout before deeper code changes.

**Implementation status in `refactor/codebase-quality`: complete.** The former
temporary `match-domain -> parser-adapter` exception was removed in P2.1.

### Tasks

1. Fix clean-checkout quality gates:
   - make Prisma generation an explicit prerequisite of database typecheck;
   - correct Turbo test outputs or enable intentional coverage output;
   - prove `setup:windows` → gates works without a warm cache.
2. Add a lightweight workspace/import boundary check for the rules in
   `target-architecture.md`; avoid a new dependency if a small repository script
   is sufficient.
3. Split `packages/contracts/src/index.ts` into internal bounded-context files,
   keeping the root exports and generated schemas identical.
4. Introduce API feature folders and Nest modules. Move one coherent endpoint
   group at a time; initially delegate to existing behavior so HTTP output does
   not change.
5. Separate worker composition/runner/CLI entrypoints from job implementation
   without altering `processJob` internals yet.
6. Split database source into client lifecycle and cohesive job lease operations;
   keep compatibility exports until consumers are migrated.
7. Record a dependency diagram and a temporary-adapter inventory.

### Dependencies and owner decisions

- P0 documents approved.
- Decide whether shared artifact behavior becomes `@who-ruined/artifacts`.
- Decide whether an automated formatter will be a separate mechanical change.

### Risks

- TypeScript package exports or build order can change unintentionally during
  moves.
- Nest providers can become duplicated or use a different lifecycle.
- A broad reformat can hide semantic changes.

### Must not change

No route, DTO, error, formula, artifact, Prisma schema, job transition, retention
policy, CSS/design or locale value.

### Completion criteria

- Target top-level folders exist with documented owners.
- Forbidden dependency edges fail an automated check.
- Root compatibility imports still work.
- A fresh checkout passes typecheck on the first run after documented setup.
- No temporary adapter lacks an owner/removal condition.

### Checks

Run `npm.cmd run setup:windows`, first-run `typecheck` and `build` in a clean
disposable copy without generated Prisma output. Run the boundary check,
contract/OpenAPI compatibility probes, lint for changed packages and relevant
package tests with direct consumers. The full repository test/golden/i18n/design
regression belongs to P6. No real demos or golden real-demo tests without
separate owner permission.

## P2 — Domain model, application ports and Clean Code

**Scale:** large; approximately 4–6 reviewable increments.

### Scope

Remove infrastructure leakage from domain/application code, establish precise
errors/ports and improve naming/readability without changing algorithms.

**Implementation status: complete.** `NormalizationInput` is parser-neutral,
raw aliases and `UnknownRow` interpretation belong to parser-adapter, and the
production dependency points `parser-adapter -> match-domain`. API controllers
call focused ingestion, match-query, report/rating, replay, rescore and deletion
use cases. Those use cases depend on application-owned ports; Prisma, native
header parsing and filesystem/gzip implementations live in infrastructure.
`api-error@1` is the compiler-checked public error-code catalog and the web
mapping is exhaustive while retaining the unknown-code fallback. The
architecture check enforces the new internal API boundary.

Exact serialized SHA-256 baselines for the empty, T/CT side-switch and overtime
synthetic fixtures are unchanged. The monolithic `MatchesService` was removed.
P6 migrated the remaining API tests to `modules/*` and removed the unused P1
root controller re-export files. The `normalizeSnapshot` name remains a
source-compatible domain entrypoint; its typed input is no longer parser-bound.

### Tasks

1. Define parser-neutral `NormalizationInput` and internal branded IDs where
   they prevent real identity mistakes.
2. Move raw alias/`UnknownRow` interpretation fully into parser-adapter; migrate
   normalization behind an equivalence adapter, then remove the reversed
   `match-domain -> parser-adapter` dependency.
3. Extract API application use cases from `MatchesService`:
   ingestion, match queries, report queries, rescore and deletion.
4. Define narrow application-owned ports for match/job repositories, artifact
   reads/writes, parser header validation, clock and IDs only where needed.
5. Replace direct Prisma singleton use in API/worker use cases with injected
   adapters; keep transactional lease/fencing behavior cohesive.
6. Define a versioned public API error response/catalog and exhaustive API→UI
   mapping while preserving every current serialized code and unknown fallback.
7. Replace internal historical names with domain names only behind compatibility
   exports. Do not rename schema/policy IDs or persisted values.
8. Reformat/split the most unreadable files by cohesive responsibility after
   behavior tests exist; do not create generic helper layers.

### Dependencies

- P1 module boundaries and import check.
- Existing normalized/contract fixtures and new characterization snapshots.

### Risks

- Type brands can leak into DTOs and accidentally change serialization.
- Repository extraction can weaken transaction boundaries if methods become
  generic CRUD.
- Error typing can accidentally change HTTP status/message semantics.

### Must not change

Normalized data, roster/team identity, parser capability policy, DB schema,
public strings/codes, API payloads and job behavior.

### Completion criteria

- `match-domain` has no parser-adapter/framework/infra import.
- API controllers contain only transport work and call focused use cases.
- Application code depends on narrow ports; infrastructure is wired in a
  composition root.
- Public error codes are compiler-checked across API/contracts/web.
- Historical internal names remain only where compatibility requires them.
- Characterization fixtures are deep-equal before/after.

### Checks

For each P2 increment, run lint/typecheck/tests for the changed package, its
direct consumers and the specific compatibility fixture or invariant. The
parser/domain increment additionally runs the architecture check and exact
synthetic normalization-equivalence fixtures for side-swap/team identity,
overtime and null/unavailable data. API increments add focused error and
old-fixture contract tests. Full repository lint/typecheck/test/build remains
the P6 gate. Do not run golden real demos unless separately approved.

## P3 — Scoring, parser, worker, replay and artifact lifecycle

**Status:** implemented. Compatibility evidence is summarized in
[p3-compatibility-matrix.md](./p3-compatibility-matrix.md). The canonical/API
rating path is unified. P6 removed the test-only historical worker helper and
moved its assertions onto the active projection/award path.

**Scale:** extra large and highest risk; approximately 6–10 small increments.

### Scope

Refactor the computational and processing core after boundaries are enforced,
without changing any arithmetic or lifecycle result.

### Tasks

1. Introduce the approved shared artifact codec/store boundary:
   canonical JSON, hashes, bounded gzip, safe paths, schemas/bindings and atomic
   publication with transport-neutral errors.
2. Migrate one artifact kind at a time: canonical match result, participation
   sidecar, replay index/round, legacy report/cache. Keep old readers until
   compatibility fixtures pass.
3. Make scoring config loading explicit at composition/CLI roots; scorers receive
   immutable validated config and perform no import-time filesystem I/O.
4. Consolidate participation projection/ordering/awards into one pure owner.
   Keep active and legacy response builders as mapping adapters.
5. Split participation preparation into typed pure modules (round boundaries,
   lifecycle/HP ledger, trades, objectives, context, profile assembly). Native
   parser queries stay in parser-adapter/infrastructure.
6. Split PARSE and RESCORE use cases. Extract pipeline steps while preserving the
   exact lease and publication sequence.
7. Isolate worker loop, heartbeat/cancellation and reconciliation from the job
   pipeline; inject clock/parser/repositories where tests need control.
8. Separate replay sampling, calibration/frame construction and artifact
   publication; preserve optional/partial replay behavior.
9. Remove legacy internal rating/report paths only after a usage search,
   compatibility decision and tests prove no consumer/persisted requirement.
10. Add deterministic equivalence tests and small performance/memory checks for
    pure transforms and artifact limits.

### Dependencies and owner decisions

- P1–P2 complete.
- Artifact package/location approved.
- Legacy experimental endpoint retention/deprecation decided.
- Existing policy/schema IDs and persisted fixtures inventoried.

### Risks

- Silent floating-point/order changes in H2/H1.
- Different tie/award/null behavior between legacy and active projections.
- Broken read compatibility for existing gzip artifacts.
- Weakened lease fencing, cleanup order or crash recovery.
- Parser query expansion causing time/memory regressions.

### Must not change

H2/H1 formulas, coefficients, digests, ranking, awards, participation semantics,
ordinary-death policy, event/trade definitions, parser field availability,
replay schemas, source retention, DB pointers or error semantics.

### Completion criteria

- Scoring/feature/domain code is pure with explicit inputs.
- One rating projection owns arithmetic, ordering and awards.
- API and worker share artifact protocol implementation.
- PARSE and RESCORE pipelines are focused and independently tested.
- Old persisted fixtures decode identically; new output verifies with old public
  schemas and exact policy identities.
- No production use remains for a removed legacy path.

### Checks

Targeted scoring/worker/artifact package gates plus compatibility fixtures for
all six families, negative attribution, H2/H1 reconstruction,
ties/draw/null/incomplete pool and T/CT side swap. Worker fault-injection tests
cover stale lease, abort, crash, publish failure and cleanup; artifact tests
cover corruption/size/path bounds. The full repository gate remains P6. An
isolated real-backend/demo smoke requires explicit owner approval and never
touches the normal database/corpus.

## P4 — Frontend modularization

**Scale:** large but lower backend risk; approximately 4–7 increments.

**Status:** implemented. Router/providers/layout now live in `app`; route pages
are thin composition roots; endpoint transport, query ownership, presentation
mapping and UI are grouped by capability under `features`; match presentation
types/adapters live in `entities/match`; reusable transport, UI, i18n and hooks
live under `shared`. P6 removed the unused pre-P4 source-path re-exports after
repository-wide consumer searches and targeted checks.
Routes, endpoint URLs, query keys/timing, DTO decoding, null handling, replay
sampling/pre-roll, locale files and CSS were preserved. The architecture check
now enforces the frontend layer and feature-public-API rules.

### Scope

Organize React by capability, separate data/view concerns and improve readable
components while preserving the current product and design.

### Tasks

1. Create `app`, feature, entity and shared public boundaries; move one route or
   capability at a time with compatibility re-exports.
2. Split the root API client into transport/decoder plus feature endpoint
   modules; keep Zod/server contracts authoritative.
3. Co-locate query hooks, query keys, DTO-to-view mapping and UI for match,
   player, rating, explanation, important moments and replay.
4. Keep pages as route/composition components; split long JSX into named,
   testable presentational pieces with domain props.
5. Separate runtime i18n from sync/compact tooling if it reduces coupling; retain
   the exact WRC Locale Kit workflow and locale files.
6. Gradually organize CSS by layer/feature. Do not redesign, change tokens or
   mass-format unrelated code.
7. Add targeted component/interaction tests only where moves expose a real risk:
   null/coverage, loading/error/stale data, replay controls, keyboard and RTL.

### Dependencies

- Stable contracts/errors from P2.
- Rating/artifact semantics stable after P3.

### Risks

- Query-key changes causing duplicate requests or stale behavior.
- Lost focus/keyboard/RTL/reduced-motion behavior.
- Locale extraction failures from dynamic keys.
- Accidental score calculation or fallback entering view code.

### Must not change

Routes, API calls, current visual language, product features, 37 translations,
loading/error semantics, accessibility promises or backend ownership of math.

### Completion criteria

- Feature ownership is clear from paths/imports.
- Route pages compose features and contain little business mapping.
- UI never invents a rating/event or converts absence to zero.
- No dynamic i18n keys; all locale checks remain clean.
- Representative mobile/desktop/RTL/keyboard/reduced-motion checks pass.

### Checks

P4 uses the web lint/typecheck/test/build gates, the repository architecture
check and one `i18n:check`. Query-key identities and replay pre-roll have focused
compatibility tests. Full repository regression, contrast/browser matrices and
the final clean-state quality gate remain P6 work; preview fixtures are only
synthetic UI evidence.

## P5 — Documentation and developer experience

**Scale:** medium; approximately 2–4 increments.

**Implementation status: complete.** The root README is now the product and
developer entry point. `docs/README.md` separates living reference from
historical milestone evidence. Current architecture, API, storage/lifecycle,
frontend, scoring, limitations, development and compatibility-adapter docs are
owned by named canonical pages. Commands, routes, ports, runtime variables and
the P6-only full gate were checked against repository configuration. `AGENTS.md`
was shortened and updated for the P4 feature-first frontend.

### Scope

Make current documentation match the refactored product and separate living
reference from historical research.

### Tasks

1. Rewrite README around product purpose, architecture, prerequisites, quick
   start, commands, user flow, limits and current feature status.
2. Update live API/frontend/backend/local-dev/compatibility documents for H2,
   explanation, important moments and 2D replay.
3. Create an architecture overview, dependency rules, artifact/lifecycle docs
   and concise decision records for owner-approved choices.
4. Index historical `m3-*`, `m4.*` and milestone reports as historical; move only
   with link checks, never delete their evidence.
5. Document clean checkout, Windows commands, local isolated data rules, tests,
   synthetic vs real-demo validation and common failures.
6. Audit package scripts, examples, ports and environment variables against code.
7. Keep `AGENTS.md` concise enough to enforce; remove a rule only when obsolete
   and replaced by a current invariant.

### Dependencies

- P1–P4 final paths and commands.
- Owner decisions recorded.

### Risks

- Links break during historical reorganization.
- Documentation describes target intent instead of actual code.
- Public wording overclaims rating validity or real-demo evidence.

### Must not change

Production code/behavior, historical content, privacy boundaries or public
claims beyond available evidence.

### Completion criteria

- A new developer can set up, run, test and locate every major subsystem.
- README is a product/developer entrypoint, not a milestone diary.
- Current vs historical docs are unmistakable.
- Every documented command/path/env/endpoint is verified.
- Rating/replay limitations and synthetic/real evidence are honest.

### Checks

Link/path/command and contradiction audits plus `git diff`. P5 changes no
production workflow or user-facing strings, so code gates, i18n, Docker and demo
execution stay deferred to P6 unless a specific documentation finding exposes a
technical regression.

## P6 — Final quality gate

**Scale:** medium in planned work, potentially large if it reveals defects.

**Implementation status: complete; accepted with limitations.** The full
repository gate, clean-checkout reproduction, compatibility audits and isolated
frontend preview passed. Real demos, a live backend, Docker/Compose and the owner
database were intentionally not exercised; see the
[final quality report](./final-quality-report.md).

### Scope

Prove compatibility, maintainability, security boundaries and reproducibility;
produce the final audit without adding features.

### Tasks

1. Run the full frozen equivalence matrix and compare against the P0 baseline.
2. Verify workspace dependency graph, public exports and absence of cycles/
   forbidden edges.
3. Run contract fixtures for old persisted artifacts and API errors/endpoints.
4. Run worker fault/recovery, storage corruption/limit and deterministic scoring
   suites from clean state.
5. Run frontend regression, i18n/contrast/accessibility/responsive/RTL checks.
6. Review configuration, secrets/log privacy, path traversal, upload limits,
   parser isolation, DB/artifact lifecycle and public-deployment disclaimers.
7. Inspect performance on controlled fixtures. Real demos are used only in an
   isolated owner-approved environment; never the normal DB or full corpus.
8. Remove only temporary adapters whose documented removal conditions are met.
9. Produce a short final quality report with deviations and remaining risks.

### Dependencies

P1–P5 complete and no unresolved compatibility decision.

### Risks

- Late discovery of a behavioral delta may require returning to the owning
  stage; P6 must not hide it with a fixture update.
- Environment-specific native parser behavior can be mistaken for refactor
  regression.

### Must not change

No feature, algorithm, schema, DB migration or redesign is introduced to make a
gate pass. Defects are fixed in the owning module with the same compatibility
requirements.

### Completion criteria

- Clean-checkout gates pass first run.
- Compatibility/equivalence matrix is fully evidenced or an explicit external
  blocker is recorded.
- No unauthorized contract, persisted-data or arithmetic delta.
- Documentation matches code; temporary adapters are accounted for.
- Remaining risks are specific, owned and do not masquerade as completion.

### Checks

`npm.cmd run architecture:check`, `lint`, `typecheck`, `test:packages`,
`build`, `i18n:check` and `design:contrast`; dependency/contract/artifact/
worker fault suites; targeted browser checks. The root `test` command remains
separately permissioned because it includes the external real-demo golden test.
If authorized later, an isolated real-backend/demo smoke must use documented
paths, a disposable database and no corpus reparse.

## Recommended sequence and gates

The owner-proposed P1→P6 order is technically sound with one clarification:
P1 must fix clean-checkout gates and add boundary enforcement before moving
modules. Artifact consolidation starts structurally in P1 only after the owner
chooses its location; semantic migration waits for P3. Frontend waits until
contracts/core settle, preventing repeated moves.

```text
P0 audit
  -> P1 enforce/build structure
  -> P2 domain + ports + precise contracts
  -> P3 core computation/processing/storage
  -> P4 frontend modules
  -> P5 living documentation/DX
  -> P6 equivalence and final audit
```

At every arrow, the changed packages and direct consumers must be buildable,
their risk-targeted tests green, and the application functionally equivalent.
The full repository regression is performed at P6.

