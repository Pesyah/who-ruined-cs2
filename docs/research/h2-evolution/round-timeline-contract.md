# H2-E4 round timeline contract

Status: research-only. Contract identity:
`h2-e4-round-timeline@1-research`.

The contract is produced by
[the H3 round timeline module](../../../packages/scoring/src/h3/round-timeline.ts). It has no API route,
persisted artifact version or production scoring caller. H2-E4 does not add a
family, rating points, an award or a policy identity.

## Inputs and ownership

The reconstruction consumes two existing factual boundaries:

1. `ParticipationSidecar` owns verified LIVE boundaries, per-player start
   observations, lifecycle-sensitive participation classes and stable roster
   identities.
2. Normalized `MatchData` owns stable teams, round sides, normalized events and
   confirmed round winners.

`C2S2PreparedSidecar.hostageActions` may add factual hostage actions that are
not present in normalized `MatchEvent`. E4 does not independently parse raw
rows or reproduce the worker's boundary/start-alive algorithm.

## Match and round shape

The top-level result contains:

- `schemaVersion`, `matchId` and ordered `rounds`;
- rejected duplicate IDs;
- non-LIVE, outside-boundary and unknown-round event diagnostics.

Each round records:

- stable `teamIds` and round-specific `sideByTeamId`;
- verified LIVE start/end and boundary evidence;
- `COMPLETE`, `PARTIAL`, `UNAVAILABLE` or `EXCLUDED` coverage;
- ordered or atomic timeline transitions;
- winner evidence and terminal game state;
- factual clutch opportunities, player survival and useful actions in a lost
  round;
- uncertainty diagnostics.

T and CT never replace stable roster-based team IDs.

## Game state

Every state keeps, per stable team:

- exact identities confirmed alive;
- player identities whose start state remains unknown;
- confirmed-alive count;
- exact count, which is `null` while any member remains unknown;
- numerical difference only when both exact counts are known;
- objective phase and confidence.

This representation deliberately distinguishes a confirmed zero from an
unknown count. It never fills an incomplete roster to five.

## Timeline entry

An entry contains tick, optional parser row order, evidence event IDs,
actor/target IDs, action kinds, exact pre/post states, source, confidence and
uncertainty reasons. H2-E5 closure additionally distinguishes factual
`stateChangeConfidence` from actor/target/team `attributionConfidence` and
records `evidenceAnchorIds`. A confirmed enemy death can additionally expose:

- advantage/equality/disadvantage before the action;
- before/after numerical difference;
- whether it restored equality, created advantage, eliminated enemy advantage
  or merely reduced the deficit.

These are facts, not H2 weights.

## Same-tick contract

When every event at a tick has a unique parser `rowIndex`, the contract exposes
ordered intermediate states. It also reports whether the ordered final state
equals an atomic application of that tick.

A single supplemental event needs no invented ordering and is marked
`SINGLE_EVENT` even when it has no parser row index.

When the order is absent or ambiguous, all events at the tick become one
`ATOMIC_SAME_TICK` transition. No synthetic order is chosen. Multiple deaths
remove distinct confirmed victims at most once; conflicting objective
terminals make the phase unknown.

## Terminal evidence

The round result comes from normalized winner/score evidence, never the last
kill. Bomb phases are applied only to bomb scenarios. Hostage actions remain
separate. Equipment saving is explicitly `null` because the current normalized
contract does not preserve a trustworthy weapon/inventory transition across
rounds.

