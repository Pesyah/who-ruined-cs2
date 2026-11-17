# EVP-1: Exceptional Valuable Player design proposal

Status: research proposal; no production implementation.  
Research baseline: commit `eb508209e32d181e0dd7fab00ec4319aaa2fa199` (Engineering Quality 12 code present in the inspected checkout).  
Data used: three existing `match-result@1` dev artifacts; no demo was reparsed and no database was changed.

## Summary

EVP should recognize an exceptional, evidence-backed match specialization rather than the next-best aggregate H2 result. The recommended preliminary policy is a two-stage hybrid:

1. a specialization-specific absolute gate proves that the result is meaningful on its own;
2. a small-sample match-relative score measures how strongly the player stands out, without allowing relative rank alone to create an award.

The active MVP is removed before EVP selection. Zero, one, or two remaining players are selected by specialization strength. H2 value and H2 rank are not selection inputs. Missing evidence disables only the affected specialization; it never becomes zero.

The inspected corpus is sufficient to validate mechanics and find failure modes, not to calibrate public thresholds. It contains 3 complete 5v5 matches, 30 player profiles and 59 valid match rounds (two `de_dust2`, one `cs_office`). The recommended constants below are therefore an explicitly **preliminary experimental policy**.

## A. Data Inventory

### Evidence levels and current sources

- **Recorded event:** a normalized parser event stored in `match-result@1`.
- **Deterministic derivative:** a reproducible value computed by [`packages/features`](../packages/features/src/index.ts) from recorded events.
- **Coverage fact:** participation evidence from the active H2 result/recompute seed; it is not a gameplay score.
- **Unavailable:** the current canonical result does not preserve enough evidence for a trustworthy EVP calculation.

The public shapes are defined in [`analytics.ts`](../packages/contracts/src/analytics.ts) and [`participation.ts`](../packages/contracts/src/participation.ts). The behavioral constraints in [`SPEC.md`](../SPEC.md), [`scoring.md`](scoring.md), [`limitations.md`](limitations.md) and [`eval.md`](eval.md) remain applicable.

| Metric | Computed now? | Source and evidence | Unit | Coverage/denominator | Limitations for EVP |
|---|---|---|---|---|---|
| Enemy kills | Yes | `PLAYER_DEATH`; deterministic relation to stable roster teams | count | Nullable aggregate; normalize by verified rounds | A kill may also be an opening, trade and part of a multikill. Ordinary kills alone are not an exceptional specialization. |
| Enemy HP damage | Yes | `PLAYER_HURT`; capped health ledger prevents duplicate/overkill HP | HP | `analytics.availability.damage`; normalize by verified rounds | Unknown damage remains unavailable. Damage is descriptive, not causal impact. |
| ADR | Yes | enemy HP damage divided by `roundsPlayed` | HP/round | Damage availability | Existing `roundsPlayed` is match-wide; EVP should use H2 verified exposure when participation differs. |
| Assists | Yes | assister on `PLAYER_DEATH` | count | Nullable; verified rounds | Includes flash assists, so it must not be combined with flash specialization without subtraction. |
| Flash assists | Yes, indirectly | `assistedFlash` on death becomes an analytics fact with kind `FLASH_ASSIST` | count | Death-event coverage | The top-level DTO has no separate count; count `FLASH_ASSIST` facts. It is still parser attribution, not proof of tactical intent. |
| Enemies flashed | Yes | attributed `PLAYER_BLIND` events | affected-player count | `analytics.availability.flashes` | Counts contacts, not unique enemies or tactical usefulness. |
| Enemy blind duration | Yes | sum of finite attributed blind durations | seconds | Flash availability; normalize by verified rounds | Duration quality depends on parser attribution. It can overlap a flash assist. |
| Teammates flashed / team blind duration | Yes | attributed teammate `PLAYER_BLIND` events | count / seconds | Flash availability | Confirmed same-team effect, but not proof of intent. Useful as same-channel counter-evidence. |
| Trade kills | Yes | deterministic one-to-one revenge matching within 5.0 seconds | count | Requires reliable tick rate and stable teams; verified rounds | Custom project definition, not tactical intent and not a universal CS2 trade definition. One kill can trade at most one death. |
| Deaths traded | Yes | the paired teammate-death side of the same trade algorithm | count | Same as trade kills | Useful for KAST/support context; should not itself create a trade-achievement award for the dead player. |
| Trade participation | Yes | `tradeKills + deathsTraded` | count | Same as trade kills | Blends two different meanings; do not use as the primary Trade Specialist signal. |
| Opening kills/deaths | Yes | first enemy-vs-enemy death in each valid round | count | Valid/verified rounds | Opening death is a fact, not blame. EVP entry evidence should use positive openings and net exposure, not punish a death as a tactical error. |
| 1vX clutches | Yes | sole-survivor state, team wins, candidate survives; maximum X for the round | won rounds by `1vX` bucket | Requires `aliveContext`; no attempt denominator | Only won clutches are known. The backend cannot estimate clutch conversion rate or difficulty beyond X. |
| KAST / KAST rounds | Yes | kill, assist, survival or traded death per round | count / percent | Requires component coverage | Composite and partly passive; useful as corroboration, not a standalone EVP specialization. |
| Survived rounds | Yes | player alive at round end | count | Alive-context coverage | Passive survival can be strategically correct or irrelevant. No standalone award. |
| Multikills | Yes | enemy kills grouped by player and round into 2/3/4/5+ | round counts by tier | Death-event coverage; verified rounds | Shares kill events with entry, trade and clutch. Evidence overlap must not create a diversity bonus. |
| HE enemy damage | Yes | capped enemy HP damage attributed to HE | HP | Damage availability | Throw count is not effectiveness. Overlaps total enemy damage. |
| Inferno enemy damage | Yes | capped enemy HP damage attributed to molotov/incendiary fire | HP | Damage availability | Both fire grenade types are combined. |
| HE/inferno team damage | Yes | capped teammate HP damage by grenade channel | HP | Damage availability | Same-channel counter-evidence for Utility Damage; do not infer griefing. |
| Smoke effectiveness | No | DTO intentionally stores `null` | unavailable | unavailable | A smoke throw count is not evidence of effective area denial. Future only. |
| Bomb plants | Yes | normalized `BOMB_PLANTED` events | count | Bomb scenario; verified rounds | A plant alone is not necessarily round-winning or exceptional. Current analytics does not expose plant opportunities. |
| Bomb defuses | Yes | normalized `BOMB_DEFUSED` events | count | Bomb scenario; verified rounds | Rare and strong, but opportunity is team/side dependent. |
| Hostage actions | Not available to a standalone EVP report | parser participation supplement can observe `hostage_rescued`/`hostage_hurt`, but `match-result@1` analytics and normalized events do not preserve those action facts | count if a future contract stores them | Hostage scenario only | The private H2 seed exposes transformed objective signals, not a reusable verified action ledger. Do not reverse H2 transforms into counts. |
| Participation | Yes | active rating availability plus `coverage` and recompute-seed counted/excluded round IDs | verified/partial/unknown rounds | Per player | Use as evidence eligibility and denominator only. Do not require a high H2 value. |
| Direct team damage | Yes | capped teammate HP loss | HP | Damage availability; verified rounds | Confirmed harm, but not confirmed intent. |
| Team kills | Yes | same-roster `PLAYER_DEATH`, excluding suicide/world | count | Death-event coverage | Strong confirmed harm; one accidental event should not automatically erase an unrelated exceptional achievement. |
| Suicides | Yes | actor equals target | count | Death-event coverage | Self-harm, not teammate harm. It may be reported but is not a default EVP disqualifier. |
| H2 family inputs/attribution | Yes | active H2 report/explanation | model units | H2 applicability/coverage | Must not be reused as EVP evidence: doing so would make EVP another H2 ranking. Negative `CONTEXT` is explicitly not proven harm. |

### Inventory conclusions

The current backend can support seven specializations reliably enough for an experiment: flash support, non-flash assistance, trades, clutches, multikills, entries and damaging utility. A bomb-objective specialization is possible but opportunity-biased. A symmetric bomb/hostage objective specialization is not possible from the current canonical facts and should remain limited/future.

## B. EVP Specializations

The formulas in this section describe the evidence, not a new H2 family.

### 1. Flash Support

- **Primary evidence:** flash-assist count and enemy blind seconds per verified round.
- **Exceptional result:** both a minimum number of converted flash assists and sustained enemy blind effect.
- **Corroboration:** enemies flashed; several distinct rounds/evidence events.
- **Counter-evidence:** excessive teammate blind seconds relative to enemy blind seconds.
- **Double counting:** remove flash assists from generic assists; do not award diversity credit twice for the same blind/death pair.
- **Availability:** current backend when flash availability is `AVAILABLE`.

### 2. Non-flash Assist Support

- **Primary evidence:** `assists - FLASH_ASSIST facts`, total and per verified round.
- **Exceptional result:** high absolute non-flash assist count plus a high exposure-normalized rate.
- **Corroboration:** assists distributed across rounds rather than duplicate facts.
- **Counter-evidence:** none inferred from deaths or H2 context.
- **Double counting:** flash assists are subtracted before evaluation.
- **Availability:** current backend; depends on death/assister evidence.

### 3. Trade Specialist

- **Primary evidence:** confirmed trade kills, total and per verified round.
- **Exceptional result:** several verified one-to-one trade kills, not one isolated revenge.
- **Corroboration:** fast-trade delays and distinct rounds, when evidence IDs are available.
- **Counter-evidence:** none inferred from untraded teammate deaths.
- **Double counting:** a trade kill that is also an entry/multikill/clutch kill belongs to the same kill-evidence group for diversity scoring.
- **Availability:** current backend when tick rate/team identity is reliable.

### 4. Clutch Specialist

- **Primary evidence:** won `1vX` rounds, severity-weighted by X.
- **Exceptional result:** one verified 1v3+ (especially 1v4/1v5) or multiple meaningful clutch wins.
- **Corroboration:** more than one distinct clutch round.
- **Counter-evidence:** losing other clutch attempts is not available and must not be invented.
- **Double counting:** kills inside the clutch cannot independently boost multikill/entry diversity unless disjoint evidence can be proven.
- **Availability:** current backend only with `aliveContext=AVAILABLE`.

### 5. Multikill Specialist

- **Primary evidence:** tiered 2K/3K/4K/5K round counts.
- **Exceptional result:** an ace, a 4K, several 3Ks, or sustained high multikill severity per verified round.
- **Corroboration:** distinct rounds and higher tiers.
- **Counter-evidence:** none based on round outcome; the event itself is factual.
- **Double counting:** grouped once per round; overlapping entry/trade/clutch kills do not create independent-specialization credit.
- **Availability:** current backend.

### 6. Entry Specialist

- **Primary evidence:** opening kills, opening-kill rate and positive `openingKills - openingDeaths` balance.
- **Exceptional result:** several openings with a clearly positive balance, not merely frequent first contact.
- **Corroboration:** distribution across rounds.
- **Counter-evidence:** opening deaths affect the exposure balance but are not labeled mistakes.
- **Double counting:** opening kills that are also trades/multikills stay in the kill-evidence group.
- **Availability:** current backend.

### 7. Utility Damage Specialist

- **Primary evidence:** verified HE + inferno enemy HP damage, total and per verified round.
- **Exceptional result:** high absolute damage and sustained rate.
- **Corroboration:** damage across multiple events/rounds.
- **Counter-evidence:** HE + inferno team damage in the same channel.
- **Double counting:** utility damage is not added again as generic damage for diversity credit.
- **Availability:** current backend only when damage availability is `AVAILABLE`.

### 8. Objective Specialist (limited)

- **Primary evidence:** verified defuses and plants in bomb scenarios.
- **Exceptional result:** a strong weighted combination led by a defuse or an unusually high number of plants.
- **Corroboration:** distinct rounds and, in a future event ledger, successful objective outcomes.
- **Counter-evidence:** no penalty for absent opportunities or playing the non-objective side.
- **Double counting:** objective events are their own evidence group.
- **Availability:** **bomb-only preliminary**. Hostage rescue/harm facts are not currently available in a reusable canonical form; a general objective award must wait for that contract.

KAST, survival, raw kills, ADR and H2 are supporting/contextual displays, not standalone EVP specializations in the recommended policy. This avoids rewarding passive survival or recreating an aggregate performance ranking.

## C. Candidate Algorithms

### Shared eligibility and notation

For player `p`:

- `R_p` is `coverage.verifiedRounds`;
- `R_max` is the largest verified-round count in the match;
- minimum exposure is `R_p >= max(8, ceil(0.60 * R_max))` with no unknown rounds;
- `x[p,s]` is the specialization's comparison scalar;
- unavailable required inputs make specialization `s` unavailable for `p`, not zero;
- the active MVP is evaluated for diagnostics but removed before EVP selection.

The 60% exposure rule is an initial safety threshold, not a claim that 60% is statistically optimal.

### Algorithm A — absolute gate plus match dominance (recommended)

Each specialization has:

1. hard gate `G[p,s]`;
2. bounded absolute-strength score `A[p,s]` in `[0,1]`;
3. match-dominance score `D[p,s]` in `[0,1]`;
4. evidence/channel penalty `P[p,s]` in `[0,0.3]`.

For the eligible players with available evidence:

```text
rankSignal = 1 - (averageRank(x[p,s]) - 1) / (N - 1)
medianGap  = clamp((x[p,s] - median(x[*,s])) / max(abs(x[p,s]), epsilon), 0, 1)
D[p,s]     = 0.60 * rankSignal + 0.40 * medianGap
S[p,s]     = clamp(0.70 * A[p,s] + 0.30 * D[p,s] - P[p,s], 0, 1)
qualifies  = G[p,s] and S[p,s] >= 0.60
```

Average rank gives tied values the same relative strength. The median term is bounded and cannot bypass the absolute gate.

Preliminary hard gates and absolute targets used in the research prototype:

| Specialization | Hard gate `G` | Absolute score `A` / comparison scalar `x` |
|---|---|---|
| Flash Support | flash assists `>=2` and enemy blind `>=2.0 sec/R` | `0.6*clamp(FA/4)+0.4*clamp(blindRate/3)`; `x=FA+0.35*blindRate` |
| Non-flash Assist | non-flash assists `>=8` and `>=0.35/R` | `0.65*clamp(count/12)+0.35*clamp(rate/0.50)`; `x=rate` |
| Trade | trade kills `>=4` and `>=0.16/R` | `0.65*clamp(count/7)+0.35*clamp(rate/0.30)`; `x=rate` |
| Clutch | severity points `>=6`, or at least 2 wins and points `>=4` | weights `1v1=1, 1v2=3, 1v3=6, 1v4=10, 1v5=15`; `A=clamp(points/10)`, `x=points` |
| Multikill | ace, 4K, at least 3 triple-kill rounds, or points `>=8` and `>=0.40/R` | weights `2K=1, 3K=2, 4K=4, 5K=7`; `A=clamp(points/14)`, `x=points/R` |
| Entry | openings `>=4`, opening balance `>=2`, and `>=0.18/R` | `0.7*clamp(balance/5)+0.3*clamp(rate/0.25)`; `x=balance/R` |
| Utility Damage | enemy HE+inferno `>=250 HP` and `>=12 HP/R` | `0.65*clamp(HP/400)+0.35*clamp(rate/17)`; `x=rate` |
| Bomb Objective | `plants + 3*defuses >=6`, and at least one defuse or at least 6 plants | `A=clamp(points/9)`; `x=points/R` |

The formula's constants are readable policy parameters and must live in one versioned scoring module if implemented. They must not be copied into API/frontend code.

Candidate strength is the best qualifying specialization. A secondary specialization can add at most `0.08 * S_secondary`, and only when:

- it independently qualifies at `>=0.60`;
- its evidence group differs from the primary group; and
- its evidence event IDs/rounds do not overlap the primary evidence.

Entry, trade, multikill and clutch are conservatively one kill-evidence group. This deliberately prevents an ace containing an opening and a trade from looking like three independent exceptional performances.

**Strengths:** explainable, rejects weak relative winners, works with zero/flat distributions, produces 0 awards naturally, and supports cross-specialization comparison through bounded scores.  
**Weaknesses:** thresholds and target scales require corpus calibration; rank/median still depend on the ten-player field; objective opportunity is not modeled.

### Algorithm B — robust within-match outlier score

For each specialization scalar:

```text
MAD_s = median(abs(x[*,s] - median(x[*,s])))
z_robust[p,s] = 0.6745 * (x[p,s] - median(x[*,s])) / MAD_s
```

When `MAD_s=0`, the prototype maps a strictly-above-median value to a fixed outlier score and equal values to zero. A candidate needs a minimal absolute guard plus `z_robust >= 2.0`. Cross-specialization scores are a bounded transform of robust z.

**Strengths:** adapts to match style and is less affected by a single extreme value than mean/standard deviation.  
**Weaknesses:** in a ten-player sample, sparse event metrics frequently have median and MAD equal to zero. One nonzero event can then look extreme even when it is not exceptional. Small input changes cause discontinuous awards, and z values across differently sparse metrics are not naturally comparable. Algorithm B is useful as a diagnostic, not as the EVP policy.

### Why not points-only or H2 reuse

- Raw totals favor long matches.
- Per-round leaderboards can award trivial leaders.
- Summing many stats recreates a general rating and rewards duplicate evidence.
- H2 attribution answers a different question and includes transformations/context that are not individual exceptional achievements.

## D. Evaluation Results

### Method and corpus

The prototype read three already-saved, schema-valid `match-result@1` artifacts from the authorized dev data root. It did not open `.dem` files. Player identifiers were replaced with `P01`–`P10` inside each match; names and SteamIDs are not reported.

Corpus:

| Match | Map scenario | Players | Match rounds | Verified rounds/player | Core availability |
|---|---|---:|---:|---|---|
| M1 | `de_dust2` / bomb | 10 | 16 | 15 | damage, flashes, economy, alive context available |
| M2 | `de_dust2` / bomb | 10 | 24 | 23 | damage, flashes, economy, alive context available |
| M3 | `cs_office` / hostage | 10 | 21 | 19–20 | damage, flashes, alive context available; economy partial |

This is only three matches from a single dev corpus. Results demonstrate behavior, not fairness or population-level calibration.

### Algorithm A results

Criterion counts below are the number of players passing each specialization before MVP removal. `Potential` is the number of non-MVP candidates after specialization combination; at most two are then selected.

| Match | Flash | Assist | Trade | Clutch | Multi | Entry | Utility | Objective | Potential → EVP | Selected evidence (H2 rank shown only for research) | MVP candidates excluded |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| M1 | 0 | 0 | 1 | 1 | 2 | 1 | 0 | 1 | 1 → 1 | P09: four 3K rounds plus one 2K, Multikill Specialist, H2 rank 4 | 1 |
| M2 | 0 | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 3 → 2 | P02: won 1v4 (also strong entry/multikill), H2 rank 6; P04: 9 trade kills in 23 verified rounds, H2 rank 5 | 1 |
| M3 | 0 | 2 | 1 | 1 | 1 | 2 | 1 | 0 | 4 → 2 | P05: 262 utility HP / 20 rounds plus 8 non-flash assists, H2 rank 2; P10: 4 openings vs 1 opening death, H2 rank 8 | 1 |

These examples show the desired distinction from H2: two selected players ranked 6th and 8th in H2, while a higher H2 position alone did not guarantee EVP.

### Threshold sensitivity

All hard-gate/absolute targets were varied together by ±15%; the match-relative formula was unchanged.

| Match | −15% | Baseline | +15% | Interpretation |
|---|---|---|---|---|
| M1 | P08 Assist, P09 Multikill | P09 Multikill | P09 Multikill | Second award is threshold-sensitive; P09 is stable. |
| M2 | P02 Clutch, P04 Trade | P02 Clutch, P04 Trade | P04 Trade, P02 Clutch | Set is stable; ordering changes. |
| M3 | P05 Utility, P10 Entry | P05 Utility, P10 Entry | no award | Strong warning that the preliminary thresholds are not calibrated across map/match styles. |

The +15% M3 collapse is a reason to gather more matches, not a reason to tune constants to these three files.

### Algorithm comparison on the same artifacts

| Match | Algorithm A | Algorithm B (robust outlier) | Observation |
|---|---|---|---|
| M1 | P09 Multikill | P09 Multikill | Same selected player, but several sparse metrics had zero MAD. |
| M2 | P02 Clutch, P04 Trade | P04 Trade, P02 Clutch | Same set, reversed ordering. |
| M3 | P05 Utility, P10 Entry | P05 Utility only | Robust outlier rejects a plausible entry performance because the small distribution is not sufficiently separated. |

Algorithm B also treated isolated nonzero sparse metrics as fixed outliers when MAD was zero. That behavior is unsuitable as the primary award rule.

### Synthetic scenarios

All fixtures below were explicitly synthetic 10-player/20-round inputs. They exercised Algorithm A twice where determinism was relevant.

| # | Scenario | Expected/observed result |
|---:|---|---|
| 1 | Nobody meets an absolute gate | 0 EVP — PASS |
| 2 | One exceptional 1v4-equivalent clutch profile | 1 EVP — PASS |
| 3 | One clutch and one utility specialist | 2 EVP — PASS |
| 4 | Three qualified independent candidates | exactly 2 EVP — PASS |
| 5 | MVP has the strongest EVP evidence | MVP excluded; next qualified candidate selected — PASS |
| 6 | H2 rank 9 with exceptional flash support | receives EVP — PASS |
| 7 | 12 non-flash assists in 20 verified rounds | receives EVP — PASS |
| 8 | H2 rank 2 without a specialization gate | no EVP — PASS |
| 9 | Required flash values absent | flash specialization unavailable, no award from it — PASS |
| 10 | One exceptional episode but only 3 verified rounds | fails minimum exposure — PASS |
| 11 | Same input evaluated twice | deep-identical result — PASS |
| 12 | Player input array reversed | identical EVP player set — PASS |

The synthetic checks prove the proposed control flow, not the empirical quality of its thresholds.

## E. Recommended EVP Policy

### Version and scope

Start as `evp-policy@1-experimental`, 5v5 only, with an explicit `calibrated: false` marker. Do not market it as a universal role rating. Keep the policy independent of H2 arithmetic; the only H2-derived selection input is the already-determined MVP player ID used for exclusion.

### Match and player eligibility

1. Require stable 10-player roster/team identity and a current active MVP.
2. Require the player's participation evidence to be eligible, no unknown rounds, and the exposure rule defined above.
3. Evaluate each specialization only when all of its required fields and availability flags are present.
4. An unavailable specialization emits `UNAVAILABLE` with cause codes; it contributes neither zero nor a penalty.

### Qualification and comparison

1. Compute specialization facts in stable event/round order.
2. Apply the absolute gate, then Algorithm A's bounded score.
3. Keep only specialization scores `>=0.60`.
4. Remove the active MVP from the EVP candidate pool.
5. Candidate score is the strongest specialization plus at most an 8% bonus from one demonstrably independent secondary specialization.
6. Sort candidates by candidate score, primary specialization score, primary absolute score, evidence quality/count, then stable canonical `playerId` as the final deterministic tie-break.
7. Select the first two. Never fill an empty slot with an unqualified player.

The final identifier tie-break is deterministic but not a merit claim. The UI explanation must never present it as performance evidence.

### Confirmed harm policy

Only recorded same-team effects are relevant; negative H2 `CONTEXT` is never used.

- **Same-channel counter-evidence:** flash support loses up to 0.30 for high teammate/enemy blind ratio; utility damage loses up to 0.30 for high teammate/enemy utility-damage ratio.
- **Unrelated modest harm:** one team kill or low team damage does not automatically erase an exceptional clutch/assist/etc.; it is shown alongside the award.
- **Severe confirmed harm (preliminary):** no EVP when team kills are at least 3, or when team kills are at least 2 and team damage is at least 8 HP per verified round. This is a safety gate, not a griefing judgment.
- Suicides are reported but are not teammate harm and do not automatically disqualify.

The severe-harm constants need owner approval and empirical review.

### Evidence overlap control

Every specialization result should carry evidence event IDs and round IDs. Secondary diversity credit is allowed only for disjoint evidence groups:

- kill-derived: entry, trade, multikill, clutch;
- flash support;
- non-flash assistance;
- damaging utility;
- objectives.

If exact disjointness cannot be established, the conservative result is no diversity bonus. The primary specialization can still qualify.

### Explanation requirements

Each awarded or near-threshold candidate should be explainable with:

- policy ID/version;
- specialization and human description;
- raw counts, verified-round denominator and normalized rates;
- absolute gate values and pass/fail;
- match median/rank inputs and bounded dominance score;
- evidence quality/availability;
- counted event and round IDs;
- same-channel harm adjustment;
- independent-secondary bonus, if any;
- MVP exclusion and deterministic tie-break facts where applicable.

No explanation should claim tactical intent, causal round impact, or universal player skill.

## F. Radar Data Mapping

Radar values should be descriptive per-match axes with explicit units/coverage. A display normalization may map the match median to a neutral radius, but the underlying value must remain accessible. Radar geometry must not be reused as the EVP decision formula.

| Proposed axis | Source metrics | Normalization / display unit | Better direction | Match average? | EVP link | H2 relation | Information loss / limitation |
|---|---|---|---|---|---|---|---|
| Firepower | enemy HP damage/R; multikill severity/R | HP/R plus bounded within-match display transform | higher | yes, only among comparable coverage | Multikill | mostly COMBAT | Combines sustained damage and burst rounds; keep both raw values in details. |
| Entry Impact | opening kills/R and opening balance/R | openings per verified round | higher positive balance | yes | Entry Specialist | COMBAT/CONTEXT evidence may overlap | Opening death is exposure, not tactical blame. |
| Trading | trade kills/R | trades per verified round | higher | yes | Trade Specialist | COMBAT/CONTEXT overlap | Custom 5-second definition; no intent. |
| Non-flash Support | non-flash assists/R | assists per verified round | higher | yes | Assist Support | SUPPORT | Assists differ in value; no causal credit. |
| Flash Impact | flash assists/R and enemy blind seconds/R, with team-blind disclosure | assists and seconds per verified round | higher enemy effect, lower team effect | yes when flash data available | Flash Support | SUPPORT/DIRECT_HARM may overlap | Contact counts/duration do not prove tactical quality. |
| Damaging Utility | HE+inferno enemy HP/R, with team utility HP/R | HP per verified round | higher enemy, lower team | yes when damage available | Utility Damage | COMBAT/DIRECT_HARM overlap | No smoke value and no placement quality. |
| Clutch/Burst | clutch severity plus high-tier multikill evidence | event severity per match/R | higher | arithmetic mean is possible but not a stable population baseline | Clutch and Multikill | COMBAT/CONTEXT/DEATH_RELATED can overlap | Rare-event axis is discontinuous; show event count and X/tier. |
| Objectives | defuses/plants; future rescues | scenario-specific events per eligible side round when available | higher | only within the same scenario and opportunity model | Objective Specialist | OBJECTIVES | Bomb and hostage units are not interchangeable; current opportunity denominators are weak. |

When this radar replaces the visible six-family summary:

- retain the full H2 family arithmetic and verified evidence in the expandable explanation;
- highlight EVP axes only from the exact specialization evidence in the EVP report;
- highlight MVP using actual nonzero H2 attribution/evidence, not a correlation between radar statistics and rating;
- never describe a radar correlation as the reason H2 selected the MVP.

## G. Open Product Decisions

1. **Objective scope:** ship a bomb-only experimental specialization, or defer the entire objective award until hostage facts and opportunity denominators are canonical.
2. **Exact tie at the second slot:** use stable `playerId` only as a deterministic final tie-break (recommended), or suppress awards at an exact merit tie rather than choose arbitrarily.
3. **Severe harm threshold:** approve/revise the preliminary team-kill/team-damage disqualification. More corpus evidence is needed.
4. **Partial evidence:** recommended first version suppresses a specialization unless its required availability is complete. Decide whether a later version may award from explicitly bounded partial coverage.
5. **Calibration release gate:** define the minimum review corpus. Recommendation: at least 30 matches across map scenarios/ranks, with blind human review of every proposed EVP and every near-threshold rejection before removing the experimental label.

## H. Implementation Plan

### Backend slice

1. Add versioned EVP schemas in `packages/contracts` (for example `experimental-evp@1`) with policy identity, match binding, per-player availability, specialization evidence, scores, selected awards and cause codes.
2. Add one pure scoring module under `packages/scoring` that accepts existing analytics, participation coverage and current MVP ID. Keep all policy constants in that module. Do not import parser/database/filesystem code.
3. Project flash-assist facts and event/round IDs from the existing artifact without changing feature arithmetic. If a required evidence ID is unavailable, omit the diversity bonus rather than synthesize it.
4. Have the worker compute and immutably publish a separate bound EVP report after the active H2 result. Do not silently mutate `match-result@1`; either add an explicitly versioned sibling artifact/pointer or introduce a planned canonical version with old-reader fixtures.
5. On RESCORE, recompute EVP only from the stored canonical result/normalized evidence; never reopen the demo. Bind the report to match ID, source artifact fingerprint and EVP policy digest.
6. Add an API read use case/controller for the stored versioned report. GET must perform bounded integrity/binding validation and must not calculate scoring or write to the database.
7. Add frontend consumption only in a later task, using the contract DTO and localized evidence explanations; no formula duplication.

### Required tests

- exact fixtures for every hard gate just below/at/above threshold;
- all 12 synthetic scenarios from this research;
- missing/null/partial availability per specialization;
- exposure changes, long/short matches and late joiners;
- MVP exclusion and 0/1/2/cap behavior;
- exact ties and input-order/event-order determinism;
- evidence overlap: entry + trade + multikill + clutch from the same kills yields no diversity bonus;
- flash assists excluded from generic assists;
- team blind/utility damage and severe direct-harm policy;
- bomb versus hostage/unknown scenario behavior;
- old canonical result read plus new EVP artifact binding/corruption tests;
- RESCORE equality without demo access;
- property checks: adding unrelated unavailable data cannot create zero evidence, and player display-name changes cannot affect awards.

### Calibration work before a public claim

1. Run the frozen preliminary policy over a larger authorized corpus.
2. Record award rate, specialization frequency, map/side/length sensitivity and threshold margins.
3. Blind-review selected and near-miss cases; do not tune and evaluate on the same matches without reporting it.
4. Version every threshold change and preserve old fixture outputs.

## Final answers

1. A player receives EVP for crossing a specialization's meaningful absolute gate and demonstrating strong match-relative evidence with sufficient coverage.
2. The explanation shows raw events/counts, denominator, threshold, relative comparison and any harm adjustment.
3. A higher-H2 player can remain without EVP because H2 aggregates a different model; aggregate rank is not an exceptional specialization.
4. More than two deserving candidates are compared by bounded specialization strength plus a tightly capped independent-evidence bonus; only the first two are selected.
5. MVP is excluded by product rule so EVP recognizes additional exceptional performances, not duplicate recognition.
6. Every decision is bound to normalized events, deterministic analytics and participation coverage; missing data is unavailable, never zero.
7. A future radar can visualize the same factual axes, while H2 arithmetic remains in its detailed explanation and is not reverse-engineered from radar correlations.
