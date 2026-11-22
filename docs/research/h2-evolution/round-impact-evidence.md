# H2-E5 round-impact evidence

Status: research-only. Contract identity:
`h2-e5-round-impact@1-research`.

The implementation lives in
[the H3 state context module](../../../packages/scoring/src/h3/state-context.ts). It consumes
`h2-e4-round-timeline@1-research`; it does not construct a second timeline,
persist an artifact, expose an API, or participate in the worker pipeline.

## Evidence boundary

An available impact candidate requires all of the following:

- a `COMPLETE` E4 round;
- a unique source event and evidence anchor;
- a unique actor with a stable roster team;
- confirmed pre-state and post-state;
- confirmed state change and action attribution;
- deterministic event order (`ROW_INDEX_ORDERED`, or one unambiguous event);
- a supported enemy-kill or objective transition.

The contract preserves match, round, player, team, event, tick, action,
pre/post state, outcome, phase, evidence references, confidence, primary
category and additional descriptive categories. Proposed numerical values are
kept in the separate attribution ledger and model projections.

`PARTIAL`, `UNAVAILABLE`, duplicate, atomic same-tick, unknown actor/target,
unknown relation and excluded-round rows remain explicit rejections. A known
numerical difference alone is not sufficient evidence.

## E4 confidence closure

E4 previously calculated `advantage` whenever the before/after counts were
known, even when applying the event returned `PARTIAL`, such as
`ACTOR_ALREADY_DEAD`. `usefulLostActions()` could then consume the same row.

E4 now distinguishes:

- `stateChangeConfidence`: confidence that the factual state changed;
- `attributionConfidence`: confidence that this actor, target and team
  relation caused the change;
- `evidenceAnchorIds`: the source facts supporting the transition.

`advantage` and lost-round attribution require both confirmed states and
confirmed action attribution. One supplemental event without `rowIndex` is
`SINGLE_EVENT`; only a multi-event tick with unavailable/ambiguous order is
atomic.

On the five demos used by E4, the old numerical rule could derive 717 enemy
transitions; 669 remain fully attributed and 48 are now withheld. The
previously reported useful lost-round count changes from 222 to 203. On the
expanded ten-match E5 sample, 1,279 of 1,492 numerically derivable enemy
transitions are confirmed; 213 are withheld rather than scored.

## Event indexing

E4 now builds `eventId -> events` and `roundId -> events` indexes once. Duplicate
IDs are derived from the first index; each round folds only its indexed rows.
The normalized phase is copied into the internal timeline row, removing the
per-event `match.events.find()` lookup. Sorting remains tick, parser row index,
then event ID, so input-array permutation does not change output.

## Confirmed categories

- **Advantage creation:** equality or deficit to a positive numerical lead.
- **Advantage recovery:** a still-negative deficit becomes smaller.
- **Equality restoration:** a negative difference becomes zero.
- **Advantage consolidation:** an already-positive lead grows.
- **Clutch progression:** the same confirmed transition is performed by the
  sole remaining player after a confirmed 1vX opportunity.
- **Objective state change:** confirmed plant, defuse or hostage rescue with a
  known actor.
- **Survival context:** a label on an already anchored action when the actor is
  confirmed alive after a won clutch or confirmed postplant participation.

The last two clutch/survival labels do not create additional event rows.
Ordinary survival, equipment saving, bomb explosion without an attributable
actor and incomplete objective evidence do not become impact candidates.

