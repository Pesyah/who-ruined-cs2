# H2-E4 state reconstruction

## Architecture

The algorithm is a composition, not a second parser:

```text
raw demo
  -> existing parser adapter and normalization
  -> existing participation sidecar
       (LIVE boundaries, start observations, lifecycle/coverage)
  -> H2-E4 one-pass event fold
       (alive identities, objective phase, transitions, diagnostics)
```

`roundStartEvidenceFromSidecars()` adapts existing sidecars into the research
input. `reconstructRoundTimelines()` groups normalized and prepared hostage
facts by round and tick. Each round is traversed once after deterministic sort
by `tick`, `rowIndex`, then event ID.

## Reliability invariants

1. Unknown start observations stay in an explicit unknown set.
2. A death removes one known or unknown victim at most once.
3. Duplicate event IDs are rejected in all occurrences.
4. A missing/unknown victim cannot change alive counts.
5. Friendly, suicide and world deaths remain death facts but are not enemy-kill
   advantage evidence.
6. Stable team identity comes from the roster; side is read from each round.
7. Events outside verified LIVE boundaries cannot change state.
8. An alive-count snapshot mismatch downgrades coverage; counts never overwrite
   player identities.
9. Round outcome comes from normalized terminal evidence.
10. All emitted evidence IDs resolve to normalized or prepared input.

The terminal state retains the accumulated uncertainty. Later evidence cannot
silently turn an uncertain start into a fully confirmed history.

## Objective state

Bomb maps support `BOMB_PLANTED`, begin/abort defuse, `BOMB_DEFUSED` and
`BOMB_EXPLODED`. Hostage maps accept only prepared hostage rescue/harm facts.
Bomb facts on a hostage scenario and hostage facts on a bomb scenario are
diagnostic failures, not inferred cross-mode equivalents.

## Existing H2, E2 and E3

E4 does not recompute E2/E3 internally. The real-demo validator independently
builds their research evidence and verifies that their event references resolve
in the timeline. One utility reference in the five-match sample was outside a
verified LIVE boundary; E4 correctly withheld it as a coverage difference.

The current H2 trajectory already supplied clean boundaries and coarse
alive-count transitions. E4 adds named alive-player sets, explicit uncertainty,
objective phase, ordered/atomic same-tick behavior and factual clutch/survival
views. It does not modify the H2 trajectory or make old H2 agree by mutation.

## Complexity and measured performance

After sorting, the state fold is linear in timeline events. Lookups use maps and
sets; the algorithm does not rescan all match events for every player.

On the five explicitly listed development demos, reconstruction processed
1,075–1,640 normalized events in 24–35 ms per match in the recorded run. Native
parsing took about 1.0–1.4 seconds and dominated total time. These are local
diagnostic measurements, not a benchmark or memory claim.

## ROUND_IMPACT boundary

E5 may consume only confirmed transitions and must preserve event identity.
One kill cannot independently receive multiple bonuses for the same numerical
transition, trade and utility causal chain. Partial/atomic transitions require
an explicit policy; they cannot be treated as confirmed ordered impact.

