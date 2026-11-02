# P4 frontend module map

> **Historical snapshot — not current documentation.** Retained as milestone evidence. Use [the documentation index](../README.md) to find the current contract.

P4 changes source ownership, not product behavior. Routes, endpoint URLs,
request methods, Zod DTO schemas, TanStack Query keys and timing, loading/error
states, rating nullability, replay semantics, CSS and all locale resources stay
compatible.

## Ownership

| Path | Responsibility |
| --- | --- |
| `app/` | Router, providers, layout and route error boundary |
| `pages/` | URL parameters and route-level feature composition |
| `features/upload-demo/` | Upload transport/progress, validation and job/recent-match queries |
| `features/match-report/` | Match/analytics endpoints and queries plus match report sections |
| `features/player-report/` | Player report composition |
| `features/participation-rating/` | Active participation endpoint/query, DTO mapping and award UI |
| `features/rating-explanation/` | Explanation/evidence queries, mapping and explanation UI |
| `features/important-moments/` | Important-moment presentation |
| `features/match-replay/` | Replay endpoints/queries, geometry, playback policy and UI |
| `entities/match/` | Match presentation types, adapters and player helpers |
| `shared/api/` | HTTP transport, response decoding and typed API errors |
| `shared/ui/`, `shared/lib/`, `shared/i18n/` | Capability-independent primitives and runtime support |

Every feature has an `index.ts` public surface. Cross-feature imports go through
that surface. Entities and shared modules do not reach upward into route or
feature implementations. These rules are checked by `scripts/check-architecture.mjs`.

## Compatibility adapters

The previous root `api.ts`, `App.tsx`, `components/`, `hooks/`, `analytics/`,
`player.ts` and `replay/` paths re-export the new owners. `shared/upload.ts` is
the one temporary shared-to-feature compatibility adapter explicitly tolerated
by the architecture check. These adapters avoid a flag-day import break and do
not contain independent query, mapping or UI implementations.

Removal requires a repository and documentation usage search with no remaining
consumer. That cleanup belongs to P5/P6, not P4.

## Compatibility evidence

- endpoint decoding/error behavior remains covered by the existing frontend
  integration tests;
- query-key tuples have an explicit compatibility test;
- replay geometry remains covered and its exact five-second pre-roll/clamping
  is now a pure tested policy;
- rating adapters retain null/coverage rules and never recompute backend math;
- WRC Locale Kit source strings and locale JSON files were not rewritten.
