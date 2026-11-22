# H2-E7 corpus and eligibility

The [final run report](e7-run-2026-11-22-v2.json) contains the versioned
manifest. Source paths are relative to the authorized corpus root. The report
records file size, SHA-256, source group, inference limits, parser/normalizer
versions and eligibility outcome. Unparsed rows have explicit `null` metadata.
Distribution is within the owner’s workspace.

The runner recursively hashed 123 `.dem` files. It selected up to 8 root,
6 `more-new-demo`, 12 `new-pool`, 5 `pgsql` and 7 `pro-players` files, in SHA-256
order within the source quotas. Identical SHA-256 values share one evaluation.
Every third selected file in each source group went to the holdout stress
partition. This split uses whole matches and was defined before evaluation.

| Outcome | Files | Inclusion |
| --- | ---: | --- |
| PASS | 29 | Same 286 H2-eligible player rows across C0–C11 |
| UNSUPPORTED | 9 | One normalized round and no H2-eligible players |
| SKIP | 85 | Outside the predeclared source quotas |
| PARTIAL / FAILED | 0 / 0 | None in this run |

Included matches contain 584 normalized rounds. The E4 timeline classifies
489 complete, 66 partial and 29 excluded. Scoring exposure comes from each
player’s frozen `countedRoundIds`, which can differ from the timeline summary.
Maps or folder names do not prove demo provenance. `demoType` is null where it
cannot be confirmed.

## E5 and E6 differ

E5’s report has 203 rounds and a 5 bomb / 5 hostage split. E6 reports 189
rounds and an 8 bomb / 2 hostage split. Those distributions establish that
the included samples differ. Neither report preserves a usable-match SHA
manifest, so the exact intersection and historical selection order are
unrecoverable from those reports. E7 uses one hash-bound input for all arms.

## GOTV/pro limitation

For the nine unsupported files, the parser’s event list omitted `round_end`
and `round_officially_ended`. It exposed 18–24 `round_freeze_end` rows apiece.
The normalizer can surface a partial terminal round but cannot derive the
other round winners and boundaries from that evidence. The manifest records
both the raw counts and `ROUND_END_MISSING` coverage issues. This locates the
gap at or before native event extraction. It does not establish whether the
source stream lacks the events or the pinned parser fails to expose them.
