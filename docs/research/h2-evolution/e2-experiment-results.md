# H2-E2 experiment results

Run date: 2026-11-17. Evidence: six existing gzipped `match-result@1`
artifacts in the authorized development data root. No `.dem` was opened, no
artifact was changed, and no database or production pipeline was invoked.

## What could be reconstructed

The canonical artifacts contain normalized death facts, stable roster teams,
round/tick/source-row ordering, positive tick rates, prepared H2 episodes and
per-player `countedRoundIds`. That is sufficient for deterministic normalized
trade relations, exact death-anchor removal and an offline projection through
the existing kernel.

They do not contain the complete raw round-boundary/lifecycle rows used when
the sidecar was first prepared. Results below therefore have evidence level
`SAVED_NORMALIZED_EVENTS_AND_RECOMPUTE_SEED`; they are not a second raw-parser
verification. Reopening `.dem` would be needed only to re-audit those raw
boundary facts.

## Per-match comparison

Match labels are local to this table; maps are factual. Rating deltas are
candidate minus baseline over calculated players. Award changes are
hypothetical only.

| Sample | Map | Canonical trades | Neutralized anchors | Calculated | Avg rating delta | Max abs delta | Rank positions changed | Hypothetical MVP | Hypothetical Who Ruined |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| A | `de_dust2` | 22 | 21 | 10 | +0.145533 | 0.336121 | 6 | unchanged | unchanged |
| B | `de_dust2` | 23 | 20 | 10 | +0.086151 | 0.184143 | 7 | unchanged | unchanged |
| C | `cs_office` | 20 | 16 | 9 | +0.105093 | 0.236335 | 6 | unchanged | unchanged |
| D | `cs_office` | 24 | 23 | 10 | +0.117841 | 0.300108 | 6 | changed | unchanged |
| E | `de_dust2` | 17 | 16 | 10 | +0.093849 | 0.168061 | 6 | unchanged | unchanged |
| F | `cs_office` | 20 | 19 | 10 | +0.097933 | 0.206064 | 5 | unchanged | unchanged |

Aggregate: 126 normalized canonical relations, 115 neutralized death anchors,
59 calculated player rows, mean signed rating delta `+0.107778`, maximum
absolute delta `0.336121`, and 36 changed within-match rank positions. One of
six hypothetical MVP selections changed; no hypothetical Who Ruined selection
changed.

The 11 relations not neutralized are not silently discarded: the victim was
not eligible for that round/profile or the exact prepared death anchor was not
available. Coverage is consumer-specific. The trader side recovered 117
counted context anchors, matching the persisted H2 TRADE-tag count observed in
H2-E1.

## Isolating trade semantics

`E2-TRADE-CANONICAL-ONLY` produced exactly zero rating/rank/award delta in all
six saved matches. On this sample, strict canonical matching therefore agrees
with the current persisted H2 context-tag result. This does not prove general
equivalence: the synthetic suite still reproduces known differences for
duplicate IDs, same-tick rows and unknown tick rate.

The `ROW_INDEX_ORDERED` option added no extra link in these six matches. The
default remains strict later-tick; the sample is too small to promote row order
to production semantics.

## Interpretation

The positive deltas are expected because the candidate removes a negative
physical input. They are not calibrated evidence that the candidate is fairer
or more predictive, and the hypothetical award changes are not real awards.
H2-E2 answers the narrower engineering question: a specific confirmed death
can be neutralized before the unchanged projection without inventing a bonus or
altering other facts.

