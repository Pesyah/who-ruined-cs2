# Coverage compatibility and double counting

## Coverage layers

| Consumer | Included rounds / denominator | Missing-data behavior | Compatibility concern |
| --- | --- | --- | --- |
| M2 | normalized rounds; live events; `roundsPlayed` is all match rounds | global AVAILABLE/PARTIAL/UNAVAILABLE for damage, flashes, economy, alive context | A partial event can coexist with a numeric sum of known values; consumers must inspect availability |
| H2 prepared base | valid rounds with unique/credible live boundaries | unclean rounds are globally excluded before physical preparation | Counts can be lower than M2 before player participation is considered |
| H2 player profile | only `PRESENT_VERIFIED` player-rounds in `countedRoundIds` | unknown participation or zero verified exposure withholds rating | Denominator and numerator are rebuilt from the same allowed rounds |
| H2 rating | calculated profiles only | unavailable stays `rating: null`; no legacy fallback | Award pool may be incomplete |
| EVP | M2 aggregates plus H2 participation eligibility/verified-round counts | specialization metrics can be null/unavailable; minimum comparison pool is two | Some numerators originate in all-round M2 while exposure comes from participation, so semantics must be reviewed per specialization |
| Radar | filters raw events/facts to each profile's `countedRoundIds` and divides by verified rounds | per-player axis can be UNAVAILABLE; match average uses comparable available values | Correctly avoids global zeroing, but depends on M2 event evidence completeness |

`clean`, `valid`, `verified` and `countedRoundIds` are not synonyms:

- `valid` is a normalized round property;
- `clean` means the H2 boundary/trajectory evidence passed global checks;
- `verified` is a player participation classification;
- `countedRoundIds` is the final per-player intersection used to rebuild H2.

A number computed from all M2 rounds cannot be divided by H2 verified rounds
unless its numerator is filtered to the same set. Otherwise partial exposure is
silently inflated. Conversely, an empty filtered set is not evidence of zero
when source availability is incomplete.

## Persisted sample coverage

The six saved dev results inspected read-only contained:

| Measure | Count |
| --- | ---: |
| Matches / players / rounds | 6 / 60 / 116 |
| H2 calculated / unavailable players | 59 / 1 |
| Verified player-rounds | 1,089 |
| Excluded player-rounds | 71 |
| Global-evidence exclusions | 60 |
| Partial / unknown participation rounds | 1 / 0 |
| M2 availability entries | 22 AVAILABLE / 2 PARTIAL |
| Missing raw damage / blind-duration events in saved normalized data | 0 / 0 |

The sample is limited to three `de_dust2` and three `cs_office` matches from the
local development result store. It is not a corpus estimate and no `.dem` was
opened or reprocessed.

## Double-counting audit

| Intersection | Same fact? | Current protection / behavior | Future rule |
| --- | --- | --- | --- |
| Kill + lethal HP damage | Usually the same lethal sequence | H2 links the lethal hurt and kill to one anchor, then chooses the largest normalized component | Keep one physical anchor; expose both as evidence, not two physical rewards |
| Kill + opening/multikill/trade | Same kill plus derived context | One COMBAT base; only strongest eligible context tag wins | Safe only as bounded context, not independent full bonuses |
| Damage + HE/inferno metric | Same `PLAYER_HURT` | M2 total and grenade views both report it; H2 uses one HP anchor | Cross-view reuse is acceptable; a future combined model must not sum both |
| Flash duration + flash assist | Can share a flash causal chain but different events | SUPPORT blind anchor and assist anchor can both contribute; context is per positive anchor | Needs event-chain evidence before any new combined bonus |
| Combat + low equipment | Same combat with freeze snapshot context | LOW_EQUIP_COMBAT is a context candidate; no second physical combat input | Safe under one-winner context and cap |
| Objective + postplant combat | Different actions in one round | objective family and combat anchor; POSTPLANT context on combat | Separate facts, but cap interaction if future outcome weight is added |
| Traded death + death penalty | Same death plus later confirming revenge | Current victim death remains fully counted; trader gets context | Future neutralization should remove only that death's negative input, with no victim bonus |
| ROUND_IMPACT + combat | Likely derived from the same kills/damage/alive changes | No production ROUND_IMPACT family exists | Do not add until incremental evidence and overlap controls are demonstrated |
| Team kill + allied HP damage | Often one lethal chain | Shared anchor chooses strongest DIRECT_HARM component | Preserve anchor dedup and harm softening |
| Blind overlap | Repeated blinds on same target/time interval | M2 sums durations; H2 unions intervals by actor/target/round | A unified model should use interval-unioned exposure |
| KAST trade + trade context | Same trade relation used in two outputs | M2 KAST and H2 context are separate products | Fine for display; do not sum KAST as another H2 trade bonus |
| Clutch + kills | Kills are inputs to a derived won 1vX | M2/EVP expose both; H2 has combat only | Any clutch factor should be bounded context with verified alive state |

## False-zero checklist

Do not emit zero when:

- `rawHealthDamage`, `healthAfter`, `blindDuration`, tick rate or team relation is
  absent;
- the round is invalid/unclean or the player-round is not counted;
- the scenario is unknown and objective applicability cannot be established;
- economy/alive context is globally PARTIAL or UNAVAILABLE;
- no comparable EVP/Radar pool exists.

Zero is justified only when the relevant observation window and source are
complete and no qualifying fact occurred. The confirmed-zero and unavailable
states must remain distinct in future experiment fixtures.

