# H2-E3 double-counting map

## Existing overlap

| E3 fact | Existing H2 path | Anchor relationship | Safe E3 treatment |
| --- | --- | --- | --- |
| Detonation/start usage | none | new evidence | usage-only addition is possible |
| HE/inferno enemy HP | `COMBAT.enemyHp` | exact hurt event ID if the episode is standalone; lethal episode may also contain kill value | reallocate only a unique standalone `enemyHp` episode |
| Enemy blind duration | `SUPPORT.enemyBlind` | deterministic synthetic actor/target/round anchor | reallocate only when that exact support episode exists |
| Flash assist | assist physical episode plus possible `FLASH_ASSIST` context | death event anchor mixes assist and context | report, but do not add in protected projection |
| Friendly utility harm | `DIRECT_HARM` | existing negative physical evidence | never offset or cancel it |
| Smoke tactical value | absent | no spatial evidence | unavailable, not guessed |

## A — usage-only extension

Approach A adds only capped usage. It has the clearest incremental meaning:
H2 currently does not reward detonation/start facts. It still correlates with
economy and role, so a future policy needs broader match calibration, but it
does not duplicate a current physical effect axis.

## B — marginal effect on top of H2

The naive implementation demonstrates the risk: the same hurt/blind/assist is
already in H2, then receives another positive amount. Event IDs make the
overlap observable but do not make it marginal. Approach B is therefore a
diagnostic upper bound only. No claim is made that its delta is new causal
information.

## C — explicit reallocation

The protected implementation finds a unique H2 episode with the expected
family and chosen physical axis, removes its base from both prepared rows,
removes the episode, invokes the unchanged H2 kernel/projector, and only then
adds explicit bounded effect. If the anchor is missing, duplicated, composite
or semantically mixed, the effect is not reallocated and gets no extra rating
credit.

This deliberately leaves some confirmed effects as evidence-only:

- flash assists cannot be separated from ordinary assist and context;
- lethal grenade damage may share one chosen episode with a kill;
- unknown/damaged HP and blind evidence is unavailable;
- round-level attribution cannot name a particular HE or fire entity.

This incompleteness is preferable to invented attribution. Approach C is the
sound basis for a future effect-bearing model, but its changed centering and
context response require more calibration than approach A.

## Recommendation

Carry A forward as the first policy candidate. Retain C as the research path
for explicit effectiveness once composite episode decomposition is designed
and tested. Reject B as a production candidate. Do not introduce a utility
family by adding effect points on top of unchanged COMBAT/SUPPORT.

