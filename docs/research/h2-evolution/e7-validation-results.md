# H2-E7 validation results

Native evaluation processed 38 selected files. C0 matched the direct frozen
projection on every usable match. The runner checked finite family inputs,
terms and rating, stable availability across arms and six-family
reconstruction within `1e-12`. Repeated candidate evaluation used the
same prepared evidence. The synthetic suite also permutes events, snapshots,
profiles and start rows and compares the complete C7 result.

Two independently launched native runs matched across all 123 manifest
bindings, aggregate metrics and all 29 C7 result/ledger digests after removing
time and resource measurements. Local preflight and repeat manifests are kept
under `_local-archive` with their own run filenames.

| Check | Result |
| --- | --- |
| New E7 cases | PASS, 13 synthetic tests |
| E1–E7 and frozen-H2 baseline | PASS, 165 tests including 8 baseline tests |
| Worker, scoring and features suites | PASS under `quality:fast` |
| `quality:fast` including architecture, lint, typecheck, tests, build, i18n and contrast | PASS |
| Strict TypeScript check including E7 tests and runner | PASS |
| Native E7 corpus evaluation and independent repeat | PASS, 29 evaluated, 9 unsupported, 85 outside quotas |
| PostgreSQL integration | SKIP, no database was used |

## Evidence and stress slices

Nominal C7 applied 278 death corrections. Another 279 links met the trade
conditions with the death debit already cleared. One lacked an exact
consistent anchor. U2 credited 3,197 player-rounds, with 61 round-cap
activations. R2 accepted 1,413 state adjustments in its configured processing
order. Economy proposed 1,829 refined tags and suppressed 215 original tags
with confirmed non-underdog comparisons. Proposals can lose the winner
selection. The ledger recorded 4,161 proposals with pre-existing context.

Bomb accounts for 21 matches (207 calculated players), hostage for 8 (79).
The eight map strata range from one to nine matches. Among nonzero ledger
changes, R2 had 719 CT and 694 T observations, including 797 in lost rounds.
Economy had 877 CT and 875 T, including 991 in lost rounds. These are counts
of observations with different opportunity denominators. The run supports
no fairness conclusion on side, buy tier, map, observed player role or
tactical value. See `mapSlices`, `scenarioSlices`, `lengthSlices`, `coverage`
and `contextSlices` in the [run report](e7-run-2026-11-22-v2.json).

## Profiling

On this Windows run, the 29 included matches contained 15–24 rounds and
1,058–1,907 normalized events each. Per-match timing, rounded to milliseconds
below, includes parser extraction, one prepared dataset and the nominal
12-arm matrix. A separate fresh C7 projection measures one arm.

| Step | Min ms | Median ms | Max ms |
| --- | ---: | ---: | ---: |
| Parse, normalize and sample economy ticks | 1,052 | 1,558 | 2,171 |
| Prepare shared evidence | 112 | 176 | 319 |
| One C7 projection | 2 | 4 | 6 |
| C0–C11 matrix | 20 | 34 | 57 |

Peak process RSS was 760,176 KiB. It includes the native parser and Node
runtime, with no attribution to individual arms. Exact size/timing pairs are
available in the manifest. The input range and warm process state do not
support an asymptotic performance claim.

## Retained evaluation evidence

The [frozen E7 report](e7-run-2026-11-22-v2.json) preserves the candidate and
sensitivity results. The E7 sweep runner retired when the implementation
moved into scoring. To verify H2/H3 parity on the E8 corpus, use the
[maintained comparison](../../h3-comparison.md).
