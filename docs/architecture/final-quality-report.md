# P6 final quality report

Date: 2026-11-01  
Worktree: `F:\Who Ruined CS2 - refactor`  
Branch: `refactor/codebase-quality`  
Audited refactor baseline (`HEAD`): `c321a870df496d719a21b42df5d72d91f981a739`  
Main-line merge base: `14cb365a1f72ba03828e4e6255371ca56d1516a4`

This report verifies the pre-H2-only P6 baseline. The later H1 retirement is
documented separately in [ADR-011](../decisions.md).

## Verdict

**P6 is accepted with limitations.** The refactored repository passes its
package-level quality gate and reproduces from a clean disposable copy. This is
not a public-deployment approval and is not a claim of current real-demo or live
backend equivalence: those checks were explicitly outside the authorized P6
scope.

## Final architecture

The repository remains a modular monolith with three process boundaries:
React/Vite web, Nest API and a leased worker. Twelve workspaces have an acyclic
dependency graph. The architecture guard checked 145 production imports with no
temporary exception:

- contracts remain dependency-free;
- parser-adapter maps native input into parser-neutral match-domain input;
- match-domain, features and scoring stay independent of apps, Prisma, HTTP and
  filesystem infrastructure;
- API and worker own composition/application/infrastructure boundaries;
- web depends on contracts and web-owned feature/entity/shared modules only.

The active rating chain has one computational owner:

```text
canonical result -> buildActiveParticipationRating -> projectParticipationRatings
legacy API       -> buildActiveParticipationRating -> projectParticipationRatings
explanation      -------------------------------> projectParticipationRatings
                                                    -> scoreParticipationPreparedProfiles
```

The worker compatibility fixture also uses this projection and the shared award
selector. Public C2S2/P72 names remain aliases, but production internals use
participation-domain names where practical. Policy IDs/digests, floating-point
order, schemas and serialized research identities were not renamed.

## Compatibility evidence

- Static controller enumeration found the same 14 HTTP method/path pairs before
  and after refactoring: no added or removed route.
- `git diff HEAD -- prisma` is empty: no Prisma schema or migration change.
- Versioned contract, old-artifact, rating, explanation, replay, public-error
  and HTTP behavior fixtures pass in their owning packages.
- H2/H1 reconstruction, six families, negative attribution, null/incomplete
  pools, ties/draw, awards and roster-derived team identity are covered by
  deterministic synthetic fixtures.
- Artifact tests cover safe paths, compression/inflation/depth limits,
  schema/binding/integrity failures and immutable create/reuse/conflict.
  Temporary publication files are cleaned after write, sync or publish failure.
- Worker tests cover fenced leases, retry/recovery, publish-before-pointer,
  cleanup-after-binding and RESCORE from stored artifacts without a demo.

P6 removed only repository-internal compatibility paths whose consumer search
and targeted checks were clean: old frontend flat-path adapters, two API root
controller re-exports and the duplicate test-only worker rating helper. Public
package exports and serialized compatibility remain documented in
[compatibility-adapters.md](../compatibility-adapters.md).

## Full gate

| Check | Result | Evidence |
| --- | --- | --- |
| `npm.cmd run architecture:check` | PASS | 12 workspaces, 145 imports, no cycles/forbidden edges |
| `npm.cmd run lint` | PASS | 12/12 workspace tasks; one sandbox log-permission retry, no code failure |
| `npm.cmd run typecheck` | PASS | 21/21 tasks, Prisma generated |
| `npm.cmd run test:packages` | PASS | 242 tests across apps/packages |
| `npm.cmd run build` | PASS | 13/13 tasks; web built 530 modules |
| `npm.cmd run i18n:check` | PASS | 37 locales; no pending tasks or write |
| `npm.cmd run design:contrast` | PASS | 41 surfaces; minimum ratio 4.67:1 |
| Root `npm.cmd run test` | NOT RUN | Includes separately permissioned external real-demo golden test |

Targeted scoring, worker, API and web tests/typechecks also passed before the
full gate. Synthetic fixtures are labeled and are not represented as real-demo
evidence.

## Clean-checkout reproduction

A disposable plain source copy was created without `.git`, `node_modules`,
`.turbo`, `dist`, data or generated Prisma output. From that state:

1. `npm.cmd run setup:windows` completed with the pinned pnpm and frozen
   lockfile, reusing the local package cache without a network download;
2. first-run `npm.cmd run typecheck` passed with no warm Turbo cache and
   generated Prisma successfully;
3. first-run `npm.cmd run build` passed and produced all workspace outputs.

The disposable copy was deleted after verification.

## Configuration, storage and security review

- No tracked demo, SQLite/database, private-key, credential or non-example
  environment file was found. Ignore files cover local data, demos, databases,
  caches and generated Prisma output.
- Compose exposes API/web on loopback, shares one explicit data mount between
  API and worker, and forwards the implemented upload/parser/result/replay
  limits. Unconsumed `PUBLIC_MODE` and `LOG_LEVEL` examples were removed.
- `scripts/dev-up.ps1` uses a fixed isolated project/data root, rejects the
  owner data directory and validates mounts and loopback ports before startup.
- Artifact paths are root-bounded and symlink-resistant; reads are bounded and
  integrity/binding checked; publication is immutable and atomic.
- The worker keeps lease fencing and publication/DB/source-cleanup ordering.
- Public hosting remains out of scope: there is no authentication,
  authorization, tenant isolation, durable multi-host queue, cross-process rate
  limit, malware scan or public object-store design.

Docker/Compose was inspected statically but not started. No existing SQLite,
backend, worker or owner data was accessed.

## Frontend preview

An isolated Vite process on `127.0.0.1:5197` rendered development-only
synthetic loading, request-error and unavailable-data states. At a 360×800
viewport, Russian/Arabic content had no horizontal overflow; Arabic set
`lang=ar`, `dir=rtl` and computed RTL direction. The checked pages emitted no
console warning/error. The temporary browser tab, viewport override and Vite
process were closed after the check.

`prefers-reduced-motion` handling is present in CSS and interactive replay/
story components, but the browser session itself reported a non-reduced OS
preference; reduced-motion was not visually emulated in this pass.

## Remaining limitations

1. Native parser and real-demo equivalence were not rerun. The separately
   permissioned golden test and any performance measurement on real demos remain
   future evidence.
2. API/worker/SQLite/artifact behavior was not live-smoked in P6; Docker/Compose
   was not executed. Package and fault-injection tests are the evidence here.
3. The frontend browser pass used explicit synthetic previews, not live API data.
4. Public deployment needs a separate security/operations milestone.

No new feature, scoring formula, schema, migration, route, locale or redesign was
introduced by P6.
