# H2-E6 experiment results

Date: 2026-11-22. Fifteen authorized copies under `F:\CS2 Demos` were parsed
with the native `demoparser2 0.42.0`. The run did not write PostgreSQL,
artifacts or production results.

## Corpus and availability

Ten matchmaking matches were usable: five Dust II, three Train and two Office
matches, covering bomb and hostage scenarios. Five additional GOTV/pro files
(Cache, Mirage, Dust II, Anubis and Ancient) exposed economy evidence but only
one normalized round and no H2-eligible players each, so they were excluded
from model comparison.

| Measure | Result |
| --- | ---: |
| Usable / unsupported matches | 10 / 5 |
| Usable rounds / player slots / H2-eligible players | 189 / 100 / 99 |
| Freeze snapshots | 1,890 |
| Equipment value available | 1,867 (98.78%) |
| Inventory / balance / round spend available | 1,890 / 1,890 / 1,890 |
| Raw mapped item events / pickup observations | 10,091 / 10,084 |
| Listed drop / purchase events | 0 / 0 |
| Confirmed transfers | 0 |
| Confirmed active-weapon carryovers / same-type-only | 428 / 2 |
| Comparable combat candidate views | 10,142 |
| Refined low-equipment views | 1,086 |
| Existing LOW_EQUIP_COMBAT-tagged views | 1,188 |

The pickup count must not be read as floor pickups: the event includes item
issue/acquisition without purchase or donor semantics.

## Model sensitivity

| Model | Mean delta among 99 calculated players | Max absolute delta | Changed positions | MVP / Who Ruined changes | Capped players |
| --- | ---: | ---: | ---: | ---: | ---: |
| E6-A facts only | 0 | 0 | 0 | 0 / 0 | 0 |
| E6-B context reallocation | 0.001594 | 0.009690 | 2 | 0 / 0 | 0 |
| E6-C bounded efficiency | 0.016419 | 0.072423 | 10 | 0 / 1 | 5 |
| E6-D carryover diagnostic | 0 | 0 | 0 | 0 / 0 | 0 |

Every direct frozen-H2 baseline was unchanged, every reported experimental
value reconstructed exactly as `baseline + delta`, and no output contained
`NaN` or `Infinity`. E6-B is an anchor-local sensitivity proxy rather than an
exact nonlinear H2 kernel reprojection. Hypothetical rank/award changes are
sensitivity observations, not evidence of improved validity.

## Interpretation

- Raw money/spend fields are more available than the current adapter exposes,
  but itemized purchases still cannot be reconstructed safely.
- Complete equipment comparisons support a stricter LOW_EQUIP context.
- E6-B is small and behaves as a replacement; it is the only candidate worth
  taking into E7 calibration.
- E6-C is larger, overlaps existing COMBAT/context and shows the expected
  incentive risk. Do not promote it as a standalone bonus.
- Active-item carryover is observable but save intent is not. Keep E6-D
  diagnostic-only.
- The sample is small, map-concentrated and not a calibration/validation split.

## Production issue recorded, not fixed

The installed parser populates `balance`, while the normalization adapter asks
for `cash`. The raw E6 sample had balance in every usable freeze snapshot, yet
current normalized M2 correctly reports money unavailable. Correcting that
alias would be a separate versioned parser/contract task with compatibility
tests; it was not hidden inside this research stage.

