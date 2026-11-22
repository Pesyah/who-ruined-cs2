# Economy evidence inventory

Status: H2-E6 research, 2026-11-22. The table distinguishes raw
`demoparser2 0.42.0` observations from fields currently admitted to the
normalized domain. Availability is evidence availability, not permission to
score it.

| Signal | Raw parser source | Normalized / current consumer | Availability and limit |
| --- | --- | --- | --- |
| Current equipment value | tick `current_equip_value` | `NormalizationTickInput.equipmentValue`, `ECONOMY_SNAPSHOT`; M2 and H2 | Available at 1,867/1,890 usable freeze snapshots. It is owned loadout value, not spend. |
| Round-start equipment value | tick `round_start_equip_value` | not normalized | Available in the raw research snapshot; it does not identify how an item was acquired. |
| Inventory names | tick `inventory` | normalized snapshot inventory; not exposed by M2 DTO | Available at 1,890/1,890 usable freeze snapshots. Names have no stable per-item identity. |
| Active weapon name | tick `active_weapon_name` | not normalized | Available at sampled boundaries. It describes only the equipped item. |
| Active weapon entity handle | tick `active_weapon` | not normalized | Available at 1,867/1,890 usable freeze snapshots. Same handle/name across adjacent boundaries supports active-item continuity, not all-inventory continuity. |
| Armor / helmet / kit | `armor_value`, `has_helmet`, `has_defuser` | normalized snapshot | Available per sampled player tick; side remains round-specific. |
| Grenades | names in `inventory` | inventory retained in normalized economy event | Partially reconstructable by item names; counts/types are observations, not effectiveness. |
| Cash balance | tick `balance` | current adapter asks for `cash`, so normalized `cash` is `null` | Raw boundary value was available at 1,890/1,890 usable freeze snapshots. This is a reproducible adapter alias gap, not fixed in E6. |
| Round spend | `cash_spent_this_round` | not normalized | Raw boundary value was available at 1,890/1,890 usable freeze snapshots. It is an accumulated spend field, not an itemized purchase log. |
| Total spend | `total_cash_spent` | not normalized | Raw snapshot available; useful as a consistency diagnostic only. |
| Purchase event | no `item_purchase` in the 15-file event lists | absent | Unavailable in the studied corpus. Do not derive a purchase from equipment delta. |
| Pickup event | `item_pickup`: player, item, defindex, tick | not normalized | Partial. The event includes starting/default issue and buy-zone acquisition as well as floor pickup; it has no donor or entity ID. |
| Drop event | no `item_drop` in the studied event lists | absent | Unavailable. Death loss and manual drop cannot be separated from current game events. |
| Weapon switch | `item_equip`; tick active-weapon fields | absent | Partial. `item_equip` identifies player/item but did not expose a reliable item entity in the probe. |
| Freeze boundary | `round_freeze_end` and normalized round | round `freezeEndTick` | Available for usable normalized rounds. |
| Round-end loadout | tick sample at normalized `endTick` | not normalized as an economy snapshot | Available for usable rounds; terminal timing remains tied to normalized round quality. |
| Stable transfer identity | no entity ID on pickup/drop path | absent | Unavailable. An active-weapon handle cannot link a donor's drop to another player's pickup. |

## Actual parser capability versus the current adapter

`listUpdatedFields()` exposes the underlying money and equipment network
fields, including account, cash-spent, equipment-value and weapon ownership
properties. The public tick aliases tested successfully were `balance`,
`cash_spent_this_round`, `total_cash_spent`, `round_start_equip_value`,
`active_weapon_name` and `active_weapon`.

The current production adapter requests `cash`. In the same demos that alias is
omitted while `balance` is populated. Consequently M2's documented
`money: null` is accurate for the current pipeline but is not a limitation of
the installed native parser. This is a separately reproducible adapter issue;
E6 deliberately does not change production normalization, public DTOs or H2.

## GOTV/pro boundary

Five GOTV/pro files exposed map, ten players, `item_pickup` and one sampled
round boundary with economy fields. The current adapter reconstructed only one
round and no H2-eligible profiles for each. This is partial parser evidence,
not evidence that their remaining rounds lack economy data. They are excluded
from model comparison.

