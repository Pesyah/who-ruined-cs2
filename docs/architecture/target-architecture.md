# Target architecture

Status: P1–P6 implemented; the final quality gate is accepted with the
limitations recorded in
[final-quality-report.md](./final-quality-report.md). This document records the
approved design target; [the current architecture map](../backend-map.md) owns
exact runtime paths and data flow.  
Primary constraint: behavior and compatibility are frozen while internals move.

The H1/H2 references below describe the P1–P6 compatibility target. Executable
H1 was retired afterward; [ADR-011](../decisions.md) and the
[current scoring reference](../scoring.md) own the H2-only runtime decision.

## Design goals

The target is a modular monolith, not microservices. API, worker and web remain
separate deployable processes in the pnpm monorepo. The architecture should make
five facts obvious from the filesystem and imports:

1. where a use case starts;
2. where domain rules and mathematics live;
3. which code performs I/O;
4. which schemas/identifiers are compatibility contracts;
5. which tests prove functional equivalence.

The design applies SOLID at real boundaries and prefers pure functions over
class hierarchies for deterministic transformations. It does not add a generic
framework inside the application.

## Approved repository shape

Names below describe target responsibilities rather than an exact file listing.
The implemented tree keeps only documented public/package compatibility
surfaces; see [the final audit](../compatibility-adapters.md).

```text
apps/
  api/src/
    app.module.ts                    # Nest composition root only
    main.ts                          # process/bootstrap/http policy
    modules/
      health/
      matches/
        http/                        # controllers, request parsing, OpenAPI
        application/                 # ingest/list/get/delete/rescore use cases
        infrastructure/              # Prisma/fs/native-header adapters
      reports/
        http/
        application/                 # analytics/rating/explanation queries
        infrastructure/              # artifact readers
      replay/
        http/
        application/
        infrastructure/
    shared/http/                     # exception filter, request ID, validation

  worker/src/
    main.ts                          # composition + process signals only
    runner/
      worker-loop.ts                 # poll, lease heartbeat, cancellation
    application/
      process-parse-job.ts
      process-rescore-job.ts
      reconcile-storage.ts
    pipeline/
      normalize-match.ts
      compute-analytics.ts
      prepare-participation.ts
      build-replay.ts
      build-match-result.ts
      publish-result.ts
    infrastructure/
      parser-process/
      prisma/
      artifacts/
    cli/                             # prepare/rebuild/migrate entrypoints

  web/src/
    app/                             # router, providers, layout, error boundary
    pages/                           # route composition, minimal logic
    features/
      upload-demo/
      match-report/
      player-report/
      participation-rating/
      rating-explanation/
      important-moments/
      match-replay/
    entities/match/                  # presentation adapters/types for Match DTO
    shared/
      api/                           # decode, transport, machine errors
      ui/                            # genuinely shared visual primitives
      i18n/                          # runtime, catalog, locales
      lib/
    tooling/i18n/                    # sync/compact CLI code, if moved in P4/P5

packages/
  contracts/src/
    common/
    matches/v1/
    analytics/v1/
    scoring/v1/
    participation/v1/
    explanation/v1/
    replay/v1/
    errors/v1/
    index.ts                         # compatibility re-export barrel

  match-domain/src/
    model/                           # internal branded IDs/invariants
    normalization/                   # parser-neutral input and normalization
    validation/
    index.ts                         # stable package API

  parser-adapter/src/
    port.ts                          # DemoParser capability contract
    demoparser2/                     # native library, aliases, row decoding
    replay/                          # replay sampling request mapping
    probe/                           # capability probe CLI
    index.ts

  features/src/
    damage/
    trades/
    utility/
    participation/
    compute-match-analytics.ts
    index.ts

  scoring/src/
    legacy/                          # current versioned finding scorer
    participation/
      policy.ts
      family-kernel.ts
      projection.ts
      awards.ts
      result.ts
    explanation/
    important-moments/
    config/                          # schemas/registries, no import-time I/O
    index.ts                         # compatibility exports

  artifacts/                        # shared filesystem protocol
    src/codecs/                      # known schemas/bindings/fingerprints
    src/store/                       # bounded gzip + atomic publish + safe paths
    src/errors.ts                    # transport-neutral failure union

  database/src/
    client.ts                        # factory/lifecycle, no implicit global owner
    jobs/                            # fenced lease operations
    matches/                         # behavior-oriented Prisma adapters
    reports/
    index.ts

  testkit/src/
    builders/                        # explicitly synthetic typed builders
    fixtures/                        # small anonymized contract fixtures
    assertions/                      # stable compatibility assertions only

  validation/src/
    core/                            # pure cross-artifact validators
    cli/                             # filesystem/process/reporting adapters

prisma/
scripts/
docs/
  architecture/                     # live architecture and decisions
  operations/                       # live local/deployment operation docs
  history/                          # historical milestones, not deleted
```

`packages/artifacts` was approved and implemented in P3 because API and worker
share one persisted protocol. It remains transport-neutral and owns no HTTP,
Prisma, scoring policy or product decisions.

## Module responsibilities

### Contracts

`@who-ruined/contracts` owns serialized DTO schemas, artifact schemas, public
machine error shapes and generated OpenAPI schemas. It does not own scoring
algorithms, I/O or UI presentation models. Internal files are split for
navigability while the package root keeps existing exports.

### Match domain

Owns stable roster identity, round intervals, side-per-team mapping, normalized
event identity and domain validation. It accepts a typed, parser-neutral
`NormalizationInput`. It never imports demoparser, Prisma, filesystem or Nest.

Branded IDs may be used internally to prevent accidental Match/Team/Player/Round
mixups; DTO boundaries may remain strings to preserve wire formats.

### Parser adapter

Owns `@laihoe/demoparser2`, capability/version constants, raw alias handling,
Zod decoding and mapping to `NormalizationInput`/replay samples. Unknown or
missing parser values become explicit nullable/unavailable values here. It does
not decide game scoring or silently repair invalid facts.

### Features

Owns factual, availability-aware analytics over normalized match data. All
functions are deterministic and pure. Trades, damage, KAST and participation
facts retain evidence IDs and coverage. No ranking or blame labels enter this
package.

### Scoring

Owns versioned policies, H2/H1 mathematics, legacy scoring, award selection,
explanation projections and important-moment selection. Scorers receive typed
inputs and immutable configs; they do not read files, environment or DB.

One internal participation projection is the source for canonical, legacy API
and explanation rating DTOs. Version-specific mappers may expose different
schemas but cannot repeat formulas, ordering, tie handling or null rules. P6
removed the test-only worker helper that duplicated historical arithmetic.

### Artifacts

Owns the shared filesystem protocol, not business decisions:

- safe relative paths under a supplied root;
- bounded gzip JSON reading;
- Zod schema decoding;
- canonical serialization and SHA-256/fingerprint validation;
- binding checks passed as explicit expectations;
- temp write, fsync/close, ownership check and immutable hard-link publication
  with create/reuse/conflict semantics and guaranteed temp cleanup.

It returns a discriminated failure such as `MISSING`, `COMPRESSED_LIMIT`,
`SCHEMA_MISMATCH`, `BINDING_MISMATCH` or `INTEGRITY_MISMATCH`. API maps these to
HTTP codes; worker maps them to job/recovery results. It knows neither Nest
`ApiError` nor Prisma.

### Database

Owns Prisma generation/client lifecycle and behavior-oriented persistence
adapters. Fenced job claim/renew/advance/release operations stay cohesive and
transactional. Application code does not expose Prisma model types as domain
types and does not build generic CRUD repositories.

### API

HTTP controllers validate opaque identifiers/query/body, call exactly one use
case/query and map typed outcomes to versioned responses. Application use cases
coordinate ports but do not perform parsing/formulas. Infrastructure implements
ports with Prisma, artifact store and the parser header adapter.

Feature grouping follows the useful locality of the reference Nest repository,
but controller/service/DTO folders are not goals by themselves. A module exists
for a coherent user capability, not every class.

### Worker

The worker composition root creates parser runner, repositories, artifact store,
clock and runtime config. `worker-loop` owns polling, heartbeat, cancellation and
shutdown. A parse-job use case explicitly orders the existing states; a rescore
use case starts from stored artifacts and never reads `.dem`.

Pipeline steps return typed values and contain either one deterministic
transformation or one infrastructure effect. The application orchestrator is
allowed to be procedural because sequence is the domain of a job pipeline; it
must not contain the detailed formulas.

### Web

Route pages own URL parameters and compose features. Feature modules own query
hooks, DTO-to-view mapping and UI for one capability. Shared UI contains only
primitives used across features. `analytics/types.ts`-style presentation types
stay distinct from server contracts.

P4 implements this shape under `apps/web/src`:

- `app` owns router creation, providers, layout and the route error boundary;
- `pages` read route parameters and compose feature public APIs;
- `features` owns upload/job, match report, player report, participation rating,
  rating explanation, important moments and replay behavior;
- `entities/match` owns the client presentation model and contract adapters;
- `shared/api` owns HTTP decoding/transport, while `shared/ui`, `shared/lib` and
  `shared/i18n` contain capability-independent code.

Feature-to-feature imports use the target feature's `index.ts`. The architecture
check rejects deep cross-feature imports, upward entity imports, shared-to-feature
imports and pages that bypass the new boundaries. P6 removed the unused old root
`api.ts`, `App.tsx`, `components`, `hooks`, `analytics`, `player`,
`replay` and upload adapter paths after repository/documentation searches and
targeted compatibility checks. See `docs/compatibility-adapters.md`.

The web never imports scoring, derives missing metrics, invents events or turns
`null` into zero. All strings, errors, aria labels and empty states continue
through i18next; 37 locale behavior remains unchanged.

## Allowed dependency directions

```text
                          +------------------+
web -------------------->| contracts        |
                          +------------------+

api transport ---> api application ---> application-owned ports
       |                    |                       ^
       v                    v                       |
   contracts           scoring queries         infrastructure
                           (pure)          (Prisma/artifacts/parser)

worker runner ---> worker application ---> match-domain -> contracts
                         |        |-------> features -----> contracts
                         |        |-------> scoring ------> contracts
                         |        `-------> ports <-------- infrastructure
                         `--------------------------------> contracts

parser-adapter --maps native data--> match-domain normalization input
artifacts ------validates schemas---> contracts
database ---------------------------> generated Prisma only
```

Hard rules:

- `match-domain`, `features` and pure `scoring` cannot import apps, Prisma,
  parser library, filesystem, environment or HTTP.
- `web` may import only contracts and web code.
- `contracts` imports no workspace package.
- apps are composition roots and may depend on packages; packages never import
  apps.
- test-only dependencies do not justify a production dependency edge.
- cross-feature access goes through a public module API, not a deep relative
  import into another feature's internals.
- no cyclic workspace or feature dependencies.

An automated import-boundary check should enforce these rules in P1. It can be
a small repository script; a new dependency is optional, not required.

## Classes, interfaces and dependency injection

Use classes where identity/lifecycle matters:

- Nest controllers/modules/providers;
- Prisma-backed repositories with an injected client;
- filesystem artifact store with a configured root/limits;
- owned parser process runner with timeout/abort lifecycle;
- worker loop/lease heartbeat coordinator if state benefits from encapsulation.

Use interfaces or DI tokens for real external seams:

```ts
interface DemoParser {
  parseMatch(path: string, signal: AbortSignal): Promise<NormalizationInput>;
  parseReplay(path: string, request: ReplaySamplingRequest, signal: AbortSignal): Promise<ReplaySamples>;
}

interface JobRepository {
  claimNext(policy: JobLeasePolicy, now: Date): Promise<ClaimedJob | null>;
  renew(id: string, token: string, until: Date): Promise<boolean>;
  advance(id: string, token: string, transition: JobTransition): Promise<void>;
}

interface MatchResultStore {
  read(matchId: string, pointer: MatchResultPointer): Promise<CanonicalMatchResult>;
  publish(matchId: string, value: CanonicalMatchResult): Promise<PublishedArtifact>;
}
```

Ports should live beside the application use case that consumes them. A single
pure function does not need an interface. Avoid abstract base repositories and
inheritance; use composition unless there is a real shared invariant/lifecycle.

Inject `Clock`/`IdGenerator` only where nondeterminism is observed and tests need
control. Do not wrap every built-in function.

## Pure functions and composition

The following remain functions with explicit inputs/outputs:

- parser row decoding after raw I/O;
- normalization and match validation;
- feature calculations and availability aggregation;
- participation preparation and family kernels;
- H2/H1 projection, ranking, ties and awards;
- explanation and important-moment selection;
- DTO/view-model transformations;
- replay coordinate calibration/frame interpolation from captured samples;
- canonical serialization (hash calculation may call deterministic crypto).

Pure results should use discriminated unions for unavailable/invalid states
instead of throwing where absence is expected. Exceptions are appropriate for
violated invariants and infrastructure failures, then mapped once at a boundary.

## Mathematical models and configuration

1. Policy code is grouped by business concept, not research milestone filename.
   Stable identifiers such as `P72B_D_P10_N5_K025_A015_H2`, model versions and
   digests remain unchanged and may appear in compatibility modules/constants.
2. Config JSON is loaded and Zod-validated at API/worker/CLI composition time.
   Pure scorers receive the parsed frozen object. No import-time filesystem I/O.
3. One projection produces raw family inputs, kernel details, final attribution,
   player ordering and award candidates. DTO mappers cannot recalculate.
4. Golden arithmetic tests freeze H2/H1 values, six-family reconstruction,
   negative contributions, null/partial pools, exact ties, draw behavior and
   roster identity across T/CT swaps.
5. Any future algorithm change receives a new schema/policy/config identity.
   Refactoring the implementation alone must reproduce current bytes/numbers
   within the existing tolerance.

## Parser, worker and replay flow

```text
native .dem
  -> OwnedDemoParserProcess (timeout/abort/size limits)
  -> ParserAdapter mapping (aliases/null/provenance)
  -> NormalizationInput
  -> normalize + validate stable match
  -> factual analytics
  -> participation input + scoring
  -> replay samples -> replay artifacts
  -> canonical result
  -> ArtifactStore verified atomic publish
  -> fenced SQLite pointer/state transition
  -> optional source cleanup after successful binding
```

The sequence above is a compatibility invariant. Refactoring cannot move the DB
pointer before verified publication, delete the source before binding, weaken
lease-token predicates or turn replay failure into whole-match failure if the
current policy treats replay as optional.

Replay calibration assets/logic stay separate from scoring. Replay DTOs contain
facts and coverage; the frontend is responsible only for rendering/interaction.

## React organization

Each feature exposes a small public surface, for example:

```text
features/rating-explanation/
  api/use-rating-explanation.ts
  model/to-rating-explanation-view.ts
  ui/RatingExplanation.tsx
  index.ts
```

Rules:

- query keys and endpoint decoding are centralized per feature;
- route pages do not assemble long business transformations inline;
- feature UI receives prepared view data and explicit loading/error/stale data;
- common components are promoted to `shared/ui` only after actual reuse;
- CSS moves gradually by feature or layer without changing visual design;
- i18n keys/default English stay static and literal;
- mobile, RTL, keyboard and reduced-motion behavior are regression gates.

No state library is needed while TanStack Query plus local component state is
sufficient.

## Versioning and compatibility

The following are immutable without an explicit new version/migration:

- REST paths/methods/status and machine error semantics;
- public Zod DTO fields and serialized enum values;
- `match-result@1`, `match-result-recompute-seed@1`,
  `m4.3-participation-rating@1`, `m4.6-participation-explanation@1`,
  `m4.7-replay-index@1`, `m4.7-replay-round@1` and related stored schemas;
- H2/H1 policy IDs, digests, selected-policy behavior and arithmetic tolerance;
- artifact relative paths, binding/fingerprint rules and SQLite pointers;
- roster-derived team identity, null/coverage semantics and deterministic tie
  breaks.

Compatibility method:

1. characterize current behavior with typed fixtures;
2. introduce a new internal implementation behind the same public export;
3. compare old/new outputs in tests;
4. switch one caller at a time;
5. remove an adapter only when no persisted/API consumer needs it;
6. keep root package exports until all internal imports are migrated.

Persisted-data changes require read-old/write-current support and an explicit,
dry-run-first migration. P1–P6 do not silently rewrite existing matches.

## Concrete transformations

### 1. API use cases and ingestion

Implemented in P2: `MatchesController`, `ReportsController` and
`ReplayController` validate transport and call focused use cases for ingestion,
match queries, reports/rating, replay, rescore and deletion. `IngestDemo`
coordinates narrow persistence, demo-file, settings, clock, ID and audit ports.
`StoredMatchAccess` centralizes compatible artifact lookup without exposing
Prisma models.

`PrismaApiRepository`, `LocalDemoFiles`, `StoredArtifactReader`,
`StoredReplayReader` and `LocalArtifactDeletion` are infrastructure adapters
wired once through `MatchesModule`. The upload transaction, deduplication race,
cleanup ordering, deletion marker and public HTTP behavior are covered by the
existing contract tests. Application failures use transport-neutral
`ApplicationError`; the Nest exception filter alone serializes the unchanged
HTTP envelope using the versioned `api-error@1` code catalog.

### 2. Domain normalization

Implemented in P2.1: parser-adapter owns native `UnknownRow` aliases and
produces parser-neutral `NormalizationInput` with typed player/event/tick
facts and provenance. The existing `normalizeSnapshot(input)` compatibility
entrypoint in match-domain owns roster/team/round invariants and has no
parser-adapter import. Exact-output synthetic fixtures cover unavailable data,
T/CT side switches and overtime; real-demo golden evidence remains separately
permissioned.

### 3. Participation rating

Implemented in P3: `buildActiveParticipationRating()` is the single owner of
projection, ordering, ties and awards. The retained experimental endpoint maps
that result to its versioned compatibility envelope without recalculating it.

### 4. Worker job

Implemented in P3: `processJob()` dispatches focused PARSE and RESCORE pipelines.
Lease/finalization, report storage, parser execution and participation
evidence/codec concerns are separate modules. Publication remains before the
fenced SQLite pointer; source cleanup remains after the committed binding.

### 5. Artifact verification

Implemented in P3: the shared artifact package owns the persisted protocol.

It verifies and writes known artifact kinds with transport-neutral
failures. API maps them to existing public codes. Worker adapters preserve the
existing job error semantics.

### 6. Player report UI

Implemented in P4: `player-report` composes rating explanation, important
moments and replay features through their public exports. Route pages own URL
composition, feature modules own query/view behavior, and React contains neither
score arithmetic nor missing-value fallbacks. P6 removed the unused flat-path
compatibility copies without changing the design.

## Decisions requiring owner approval before implementation

The shared artifact package was approved and implemented in P3.

1. **Legacy experimental rating endpoint/code:** preserve indefinitely or define
   a deprecation/removal milestone after all stored results use
   `match-result@1`. No removal is assumed by this plan.
2. **Internal historical names:** retain only in compatibility modules (recommended)
   versus allow them throughout scoring. Serialized names never change.
3. **Formatting policy:** adopt an automated formatter in a dedicated mechanical
   change or keep current ESLint-only style. It must not be mixed with semantic
   refactoring.
4. **Frontend folder convention:** resolved in P4 as the capability-first
   structure above. No stricter taxonomy or new framework was introduced.
5. **Public deployment architecture:** remains outside this refactor. PostgreSQL,
   durable queues, auth/rate limits and object storage need a separate security
   and operations milestone, not speculative interfaces now.

## Non-goals

- no microservices, event bus, CQRS framework or generic repository framework;
- no algorithm/policy recalibration;
- no new product features or redesign;
- no automatic rewrite of persisted data;
- no renaming of public/serialized research identifiers;
- no claim of real-demo equivalence from synthetic fixtures.

