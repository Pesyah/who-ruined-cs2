# H2-E5 double-counting control

## Attribution ledger

Every available candidate has one ledger row containing:

- source event and resolved H2 anchor;
- original positive H2 episode family, axis, base and tags;
- objective factor where applicable;
- proposed state attribution;
- semantic overlap (`FULL`, `PARTIAL`, `NONE`);
- overlap amount and remaining incremental attribution;
- explicit inclusion/exclusion reason.

Deduplication is by evidence identity and meaning, not coincidentally equal
numbers. Multiple category labels on one kill never create multiple candidates.

## Existing H2 overlap

All 1,303 candidates in the usable sample overlap H2 at least at the physical
action/objective level. The common overlaps are:

- kill/damage in COMBAT;
- `OPENING`, `MULTI_KILL`, `TRADE` or `FAST_TRADE`;
- `DISADVANTAGE` and `ALIVE_LEAD_TAKEN`;
- postplant context;
- positive OBJECTIVES factors.

The potentially new fact is not “the player killed someone”. It is the exact
confirmed state magnitude before and after that already anchored action. R1 and
R3 intentionally show the consequence of adding it naively/separately. R2
subtracts the known semantic overlap and refuses events without a positive H2
anchor.

## Objective and clutch handling

An objective event with an existing positive objective factor is fully covered
in R2. Clutch progression and survival are contextual labels; they can alter
one capped composite value but never create extra full bonuses. This also
prevents one kill from being paid separately as COMBAT, disadvantage, clutch,
equality restoration and survival.

## E2 and E3 composition

The real-demo runner evaluates:

- frozen H2 baseline;
- E2 traded-death neutralization;
- E3 U2 usage-only contribution;
- E5 independently;
- the arithmetic combination E2 + E3 U2 + E5 R2 where all inputs are
  available.

E2 changes a victim death input, E3 U2 adds confirmed use rather than effect,
and E5 R2 adjusts an existing positive action after semantic overlap. Their
evidence roles are distinct enough for an offline composition, but the result
is not a proposed production policy. Across ten matches the combination changed
one hypothetical MVP and three Who Ruined identities; this is sensitivity, not
validation.

## Recommendation

Do not add R1 or R3 to H2. If round impact proceeds, prototype it as an exact
replacement/reallocation inside existing CONTEXT, using the ledger and larger
held-out calibration data. Objective and plain survival bonuses should remain
excluded. A new family is not justified while every observed candidate shares
an existing H2 action anchor.

