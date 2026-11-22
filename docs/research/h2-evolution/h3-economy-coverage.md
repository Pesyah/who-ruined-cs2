# H3 economy and equipment coverage

E6-B participates in H3's `CONTEXT`. For a confirmed enemy action with one
positive combat anchor, the comparison uses the acting player's own freeze
loadout and complete verified comparison pools for both teams. There must be
at least two counted players with known values per side. The actor's team
median must be lower than the opponent median, which must be at least 2,500.
The actor loadout must be at most half the opponent median. E6-B uses
`1 + 1.5 × min(0.05, 0.08 × clamp(1 − actor/opponentMedian, 0, 0.75))` with
an effective multiplier cap of `1.10`.

Confirmed evidence that fails the rule suppresses the old low-gear tag. An
incomplete comparison withholds replacement, retaining the frozen context
with its existing provenance. Conflicting snapshots are withheld, including
contradictory observations with the same evidence ID. A known zero loadout
remains a valid observation. An unknown value does not qualify as cheap.
Player and team are roster-bound, while side is round-specific. Damage and
kill views resolve to a single H2 anchor. Opening, trade, state and economy
still compete for one action modifier, and H3 reports the selected tag.

| E6 evidence | H3 disposition | Why |
| --- | --- | --- |
| Freeze equipment value and team medians | CONTEXT on the verified action | Measures actual observed resource disparity at the supported boundary. |
| Own, target and round-start gear values | Diagnostics and comparison provenance | Exact weapon equipped when a combat action occurred can differ from freeze-time loadout. A buy/force class adds unsupported inference. |
| Inventory, armor, helmet, grenades and kit | Informational | These describe resources. Gear possession has no standalone demonstrated result. Scored damage and objective actions already credit their observed use. |
| Raw `balance`, `cash_spent_this_round`, `total_cash_spent` | Informational | Balance and accumulated spend are observable. The aggregate cannot reconstruct per-item purchases, responsibility for team buys or tactical success. |
| `item_pickup` and potential `item_drop`/`item_equip` | Partial observations | E6 saw acquisitions that could include buy or default issue. The native sample lacks paired drop/ownership evidence and pickup identity. Item equip names do not establish an owner transition. |
| Stable weapon transfer | Unavailable in the studied data | A donor requires ordered drop/pickup on the same entity. Weapon type and timestamp alone are insufficient. |
| Active item carryover | Informational | E6 observed 428 same-handle continuities. Keeping an item is observable and can be useful, but no independent counterfactual benefit is verified. Later productive use is scored where it occurs. |
| Economy-aware survival | Informational | Living and retaining a weapon can be measured jointly. Purpose, alternatives and deliberate save quality remain unknown. |

The [E6 parser inventory](economy-evidence-inventory.md) supplies raw field
and event availability. The H3 runner also checks raw boundary observations
and reports actual refined and suppressed proposals in the final corpus.
Among 20,140 selected freeze snapshots, 19,973 included equipment value and
all 20,140 included raw balance and accumulated round spend. The H3 ledger
records 6,333 refined proposals and 667 suppressions of the frozen low-gear
tag after a complete comparison. These are evaluated proposals, including
those that lost to a competing action context.
The production adapter still asks for `cash` while native ticks supply
`balance`. That alias and public money support remain a separate parser and
contract change. H3 consumes research snapshots without writing production
artifacts or inventing purchase costs.
