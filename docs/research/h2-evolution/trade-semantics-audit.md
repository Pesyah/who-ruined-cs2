# Trade semantics audit

## Current algorithms

| Question | M2 factual analytics | H2 preparation |
| --- | --- | --- |
| Source | ordered live enemy `PLAYER_DEATH` events | deduplicated enemy deaths inside clean round boundaries |
| One-to-one | original and revenge are each consumed once | revenge is consumed once; each original is visited once |
| Window | `0..5 s`, with same-tick row order considered later | strictly `> 0` and `<= 5 s` |
| Tick rate unknown | no trades | currently substitutes `1` tick/s |
| Selection | sequential `.find()` first-fit | dynamic-programming maximum link count |
| Tie break | event order | total delay, then link signature |
| Same tick | allowed only when revenge rowIndex is later | rejected because elapsed seconds is zero |
| Duplicate event ID | matching deduplicates, but M2 fact emission can repeat the fact | input deaths are deduplicated by ID |
| Round coverage | every normalized live round | globally clean boundary, then player `countedRoundIds` |
| Unknown team | no link | no link |
| Non-live event | excluded | excluded |

Both implementations require the revenge target to be the original killer and
the revenge actor to be on the original victim's roster team. Mere temporal
proximity is insufficient.

## Characterized edge cases

`apps/worker/test/h2-e1-trade-semantics.test.ts` uses only explicitly synthetic
fixtures and public M2/H2 pipeline entry points.

| Scenario | Observed M2 | Observed H2 |
| --- | --- | --- |
| Ordinary untraded death | death only | negative `ownDeaths` episode; no TRADE tag |
| Traded opening death | death can become KAST-traded | opening kill and revenge context are separate; victim death unchanged |
| Later traded death | linked by the same rule | linked by the same rule when clean/positive delay |
| Multiple reciprocal trades | distinct links | distinct links |
| Two originals, one revenge | one link | one link; maximum matching uses one revenge |
| Same tick, later rowIndex | trade | not a trade |
| Exactly 5 seconds | trade | trade |
| More than 5 seconds | no trade | no trade |
| Unknown tick rate, four ticks apart | no trade | trade under `tickRate ?? 1` |
| Unclean round | can remain a trade in M2 | excluded before matching |
| Missing damage | trade fact can still exist | context tag may be prepared, but incomplete HP ledger can withhold score |
| Unknown team | no trade | no trade |
| Duplicate event ID | duplicate emitted M2 trade facts were observed | one deduplicated tag |
| Non-live event | excluded | excluded |
| Cross-round revenge | excluded | excluded |

Existing feature tests separately characterize grenade/combat overlap, winning
clutch, and normal actions in losing rounds. Those are included in the overall
adversarial harness but are not trade links.

## Greedy versus maximum matching

The implementations are structurally different. M2 walks originals in order
and takes the first unused candidate; H2 searches for the largest link set and
then minimizes total delay. Under a conventional two-team round, candidate
edges have constrained temporal and roster structure, so the H2-E1 synthetic
set did not establish a cardinality divergence. That absence is not a proof of
equivalence. The next model should not depend on either incidental algorithm:
it should define and test one matching objective as part of the factual trade
contract.

## Persisted sample

Six read-only development canonical results contained 126 M2 trade-kill facts
and 117 persisted H2 TRADE-tagged episodes. The nine-count difference exactly
matched M2 trade facts in H2-excluded rounds. Eight of 60 players differed. No
additional same-tick or matching-strategy divergence was established from the
persisted representation, because the canonical H2 seed retains selected tags,
not all candidate edges.

## Future single semantic

Recommended direction for H2-E2:

1. Derive one versioned factual relation with `originalDeathEventId`,
   `revengeDeathEventId`, victim, killer, trader, round and measured delay.
2. Require known roster relations, a clean live observation interval, a known
   positive tick rate, deterministic event ordering and a documented one-to-one
   matching objective.
3. Decide explicitly whether same-tick/later-row events are valid. Do not let
   the decision emerge from converting ticks to seconds.
4. Persist unavailability/rejection reasons for unknown tick rate, ambiguous
   identity, duplicate event identity and incomplete round evidence.
5. Make M2, H2, moments, EVP and Radar consume that relation instead of
   independently reconstructing trades.

## Traded-death neutralization design point

Today the original victim receives an `ownDeaths` physical episode and the
trader's revenge anchor receives a TRADE context tag. The victim episode has no
link to the revenge in the prepared profile. Opening status does not change the
death input.

The future requirement is precise: a confirmed traded death within five
seconds cancels the negative contribution of that specific death, regardless of
whether it was opening, while K/D/A still records the death. It must not also
award a victim bonus.

The safe layer is physical-input preparation: retain the death fact for M2/KDA,
link its death anchor to the authoritative trade relation, and set that death
anchor's `ownDeaths` contribution to neutral for the experimental model before
exposure normalization and `DEATH_RELATED` centering. Then run the unchanged
family kernel and H2 projection. Do not add a fixed final-rating offset: family
centering and the cross-family negative-mass `g(5N)` transform are nonlinear,
so a fixed point refund cannot reconstruct the removed death contribution.

Characterization confirms that current H2 gives the victim identical death
episode and family input whether the death is traded or not. This is a future
semantic change, not a bug fix performed by H2-E1.

