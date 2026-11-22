# H2-E4 real-demo validation

Validation date: 2026-11-18. All rows below were parsed from raw `.dem` files
under the owner-authorized `F:\CS2 Demos` tree with the installed native parser.
They are not synthetic fixtures. No database write or source-demo mutation was
performed.

## Sample

| Demo | Map / mode | Rounds | Complete / partial / excluded | Atomic ticks | Clutch wins | Useful lost-round actions |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `pgsql/match730_003851785288766455842_1420457056_183.dem` | de_dust2 / bomb | 16 | 15 / 0 / 1 | 0 | 1 | 30 |
| `pgsql/match730_003851789916593717377_1555013623_185.dem` | cs_office / hostage | 21 | 19 / 1 / 1 | 0 | 2 | 47 |
| `pgsql/match730_003851795190813557248_0113151138_186.dem` | de_dust2 / bomb | 16 | 15 / 0 / 1 | 0 | 2 | 39 |
| `match730_003848126212853465438_0402902606_380.dem` | de_train / bomb | 23 | 22 / 0 / 1 | 0 | 2 | 62 |
| `match730_003848493855611552081_2106352981_186.dem` | cs_office / hostage | 21 | 18 / 2 / 1 | 2 | 0 | 44 |
| **Total** | 3 maps, 2 modes | **97** | **89 / 3 / 5** | **2** | **7** | **222** |

The exact filenames and SHA-256 values are emitted by
the original E4 research runner. The shortened table avoids presenting the sample as a
portable golden corpus.

## Aggregate observations

- Initial states: 95 × 5v5, one 5v4 and one 4v5. No missing player was filled
  to five.
- Timeline entries: 6,751.
- Advantage created: 233; equality restored: 140; deficit reduced: 239.
- Clutch opportunities: 91; confirmed wins: 7.
- Rounds containing at least one useful losing-team transition: 93.
- Confirmed hostage actions: 2, both retained as atomic same-tick evidence
  because no trustworthy relative row order existed.
- Alive snapshot mismatches: 0.

Each match had one final/incomplete boundary classified
`ROUND_GLOBAL_EVIDENCE_MISSING`; it remained excluded. One office match also
had an interrupted-participation round. These were not converted to clean
rounds.

## Differential validation

- E2: 105 canonical trade links; every original/revenge event reference was
  present in E4.
- E3: 1,707 use/effect references. Four were outside verified LIVE boundaries
  (one in a dust2 match, three in the second office match); E4 withheld them and
  classified the difference as coverage, not missing data or a fabricated
  state.
- Existing normalized `aliveByTeamId`: zero count discrepancies against E4's
  exact states.
- Persisted H2 comparison was available for three matches / 30 players. All
  `countedRoundIds` matched; maximum rating delta was exactly zero within the
  existing `1e-12` tolerance.

## Performance sample

Native parsing took roughly 0.98–1.42 seconds per file. E4 reconstruction took
24–35 ms for 1,075–1,640 normalized events. Same-tick ordered intermediate
states were common; only two groups lacked trusted order and used the atomic
path. These numbers describe one local run and are not production capacity
claims.

## Coverage limits

The sample contains standard 5v5, partial/excluded rounds, side changes, bomb
and hostage maps, trades, 1vX situations and useful actions in lost rounds. It
does not establish population-level frequency, tactical value, visibility,
positioning or equipment-save quality. H2-E5 must preserve these limits.

