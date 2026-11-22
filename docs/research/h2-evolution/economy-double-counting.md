# Economy double counting and attribution

The E6 ledger binds every proposal to:

- one source combat event;
- equipment snapshot evidence IDs;
- resolved existing H2 anchor IDs;
- existing context tags;
- physical H2 base;
- B replacement delta and C incremental delta;
- overlap and inclusion reason.

## Existing coverage

Current H2 already uses the physical kill/damage in COMBAT and can tag its
anchor with `LOW_EQUIP_COMBAT`. The same kill can also carry OPENING, TRADE,
MULTI_KILL, DISADVANTAGE, ALIVE_LEAD_TAKEN or POSTPLANT; the kernel chooses its
winning context modifier. E2 trade neutralization changes the victim's death,
E3 utility can reallocate the same damage/blind anchor, and E5 state impact can
reference the same kill. Economy does not create a new physical action.

Consequences:

- E6-B subtracts the existing `1.03` delta before applying its refined
  context. It is the only variant structurally compatible with replacement.
- E6-C is explicitly overlapping diagnostic sensitivity, not incremental
  truth.
- multiple HP/armor/kill views of one event are collapsed before caps;
- E6-D is factual only and never adds survival/save points.

## Current LOW_EQUIP_COMBAT audit

Production preparation builds one `round|player` equipment map from normalized
economy events. For every enemy hurt/death it computes a sorted list of
available opposing values, takes `sorted[floor(n/2)]`, and tags the H2 anchor
when opponent median is at least 2,500 and actor value is at most half that
median.

Limitations confirmed by code:

1. the opponent subset need not cover every counted opponent;
2. actor-team economy is not considered;
3. conflicting duplicate snapshots are resolved by last-write order;
4. even-sized pools use the upper middle value rather than the arithmetic
   median;
5. the same tag is evaluated on both hurt and death views, although `addTag`
   avoids duplicate string tags;
6. the physical COMBAT base already contains the action.

In ten usable matches, current tagged candidate views numbered 1,188 while the
stricter complete-team definition accepted 1,086. The difference is evidence
that a future policy should refine/replace the context, not add a second
economy family.

## Fairness risks

- pistol, eco and force rounds have structurally different baselines;
- CT equipment/kit prices and T equipment are asymmetric;
- AWP users concentrate loadout value, while support utility can raise value
  without a direct kill;
- team poverty and individual cheap equipment are not the same fact;
- short matches expose fewer economic cycles;
- unequal participation changes comparison coverage;
- rewarding damage per cost can encourage deliberate under-buying;
- rewarding carryover can encourage avoiding useful fights.

No subjective role label is inferred. These limitations require held-out joint
calibration in E7.

