# M3-A scoring proposal

Status: M3-A design retained as rationale; M3-B implements the approved
decisions recorded in `m3-decisions.md`. `SPEC.md` 1.0.0 remains the immutable
v1 compatibility baseline; its numeric constants are product policy, not
validated truths.

## 1. Decision hierarchy

The implementation decision order is:

1. hard safety and evidence constraints from `SPEC.md`;
2. later agreed requirements that explicitly refine M3;
3. the exact v1 formula as a reproducible compatibility baseline;
4. candidate improvements in this document, only after owner approval.

The v1 baseline must remain testable under its own version and must pass the
exact numerical fixture in `SPEC.md` section 11.2. A later model must use a new
version and config hash; it must not silently overwrite v1 semantics.

## 2. Normative v1 baseline

For every finding, v1 defines:

`weightedValue = magnitude * confidence * baseWeight`

The exact weights are:

| Finding | Magnitude | Confidence | Weight |
| --- | ---: | ---: | ---: |
| `ENEMY_KILL` | `killLeverage` (`1.25`, `1.0`, or `0.85`) | 1 | 1.00 |
| `OPENING_KILL` | 1 | 1 | 0.40 |
| `TRADE_KILL` | 1 | 1 | 0.25 |
| `ENEMY_DAMAGE` | actual enemy HP / 100 | 1 when verified | 0.35 |
| `BOMB_DEFUSE` | 1 | 1 | 0.30 |
| `BOMB_PLANT_WIN` | 1 | 1 | 0.15 |
| `TEAM_KILL` | 1 | 1 | 2.50 |
| `TEAM_DAMAGE` | actual friendly HP / 100 | 1 when verified | 1.00 |
| `TEAM_FLASH` | `min(seconds / 5, 1)` per victim/throw | 0.9 | 0.40 |

For player `p`:

```text
positive(p) = sum(POSITIVE weightedValue)
negative(p) = sum(NEGATIVE weightedValue)
net(p) = positive(p) - negative(p)
performanceRate_v1(p) = net(p) / validRounds(p)
```

For the losing roster `L`:

```text
teamMeanRate = mean(performanceRate_v1(p), p in L)
shortfall_v1(p) = max(0, teamMeanRate - performanceRate_v1(p))
harmRate_v1(p) = negative(p) / validRounds(p)
ruinRaw_v1(p) = 0.75 * shortfall_v1(p) + 0.25 * harmRate_v1(p)
```

The within-losing-team display index and no-clear-ruiner rules remain exactly
as specified: spread below `0.15` or top-two gap below `0.10` prevents a unique
verdict. This index is neither probability nor cross-match player quality.

## 3. Conflicts and refinements relative to v1

| Topic | v1 | Later requirement | M3-A resolution |
| --- | --- | --- | --- |
| Analytical entities | One positive/negative/net stream | Separate Performance, Impact, Mistakes | Preserve v1 as baseline; design three separate ledgers for the next version |
| MVP | Not formally defined in section 7 | Best player across both teams | Add a separate all-player MVP rule; never derive MVP from Who Ruined order |
| Who Ruined | Losing-team relative shortfall plus harm, with abstention | Separate positive shortfall and confirmed harm; mandatory leader for eligible successor input | Keep v1 abstention unchanged; successor assigns with explicit close/tie and uncertainty warnings |
| Harm in shortfall | `negative` lowers `net`, then `harmRate` is added | Avoid double counting correlated evidence | Candidate shortfall uses positive contribution only; harm is a separate term |
| Team kill and damage | Deliberately both score | Prevent one episode appearing as several independent reasons | v1 math remains; candidate bundles the episode and calibrates one aggregate severity |
| Deaths | Never a separate penalty | Poor stats are not proof of fault | No change; deaths/opening deaths/untraded deaths remain facts |
| Opportunity | Deterministic alive-state kill leverage; no win probability | Opportunity-based impact desired | Use observed state only in the local heuristic; trained win probability is a future version |
| Roles | No role model | Do not impose mandatory roles | No role labels or role-based penalties |
| Overtime | Allowed only when validated | No real overtime fixture exists | Candidate remains unverified on real overtime and cannot close that gate |

The most important design tension to address in a successor is not that v1 has
the “wrong” coefficient. It is that `negative` affects both
`performanceRate_v1` and `harmRate_v1`. That is explicit, intentional and
reproducible, but it makes explanation harder. The successor should keep harm in the Mistakes
ledger and compute contribution shortfall from positive contribution alone.

## 4. Three separate analytical entities

### 4.1 Performance

Performance answers: how much verified output and consistency did the player
produce? It must not answer whether an action decided a round.

Proposed component vector:

- combat output: enemy actual HP per round, enemy kills per round and credited
  assists per round;
- consistency: KAST and survival as descriptive rates;
- explosive output: multi-kill rounds;
- support output: flash assists and attributable enemy blind duration;
- economy context: observed freeze equipment only, never cash/spend/drop.

ADR and KAST remain displayed facts. They are not simply added to event points:
ADR already includes HE/inferno damage, KAST already includes kill, assist,
survival and traded death, and multi-kills already contain kills. Adding all of
them at full weight would count the same action several times.

For a future calibrated composite, let `z_j(p)` be a clipped standardized rate
against a versioned reference population with map, side and patch metadata:

`z_j = clamp((x_j - median_j) / (1.4826 * MAD_j), -3, 3)`.

An initial, explicitly unvalidated prior is:

```text
Performance_candidate =
  0.60 * CombatFamily +
  0.20 * ConsistencyFamily +
  0.10 * ExplosiveFamily +
  0.10 * SupportFamily
```

Why these families exist:

- Combat is the most direct and best-covered output signal.
- Consistency distinguishes sustained contribution from one burst.
- Explosive output records round concentration, not extra copies of kills.
- Support adds a signal that damage/kills cannot represent.

The coefficients are a calibration hypothesis, not an accepted formula. Until
a reference population exists, the product should expose the component vector
and v1-compatible rates rather than claim a calibrated Performance score.

### 4.2 Impact

Impact answers: how much did an action change the observed round state? The
deterministic v1-compatible impact ledger is:

```text
Impact_v1_points =
  ENEMY_KILL + OPENING_KILL + TRADE_KILL +
  BOMB_DEFUSE + BOMB_PLANT_WIN

Impact_v1_rate = Impact_v1_points / validRounds
```

`ENEMY_DAMAGE` belongs to Performance in the separated view. This avoids using
the same damage both as output and as independent proof of round importance.
Opening, trade and alive-state leverage retain v1 weights. Multi-kill and clutch
labels explain a sequence but receive no extra Impact bonus: their kills and
state transitions are already present.

Time, bomb state, weapon matchup, equipment and stage of round are useful
context, but v1 has no empirical mapping from those states to importance. M3-A
therefore does not invent time multipliers or pseudo-probabilities. They are
stored on the episode and become model inputs only after calibration.

#### Future empirical impact interface

A future version may estimate round win probability `P(win | state)` and use:

`deltaImpact(e) = P(win | stateAfter(e)) - P(win | stateBefore(e))`.

The state would require, at minimum: map, current side, alive players by stable
team, HP, bomb state and timer, freeze equipment bands, event order and patch.
Training requires a large legally acquired CS2 corpus, match-grouped splits,
calibration curves and tests by map/side/economy/rating band. Nine demos cannot
train or validate it. Any such model must use a new versioned interface; its
output must remain unavailable until an actual model exists.

### 4.3 Mistakes

Mistakes is an evidence ledger, not “all bad outcomes.” It has two layers:

1. `CONFIRMED_HARM`: attributable team damage, team kill, attributable friendly
   flash and live suicide. These prove a harmful game-state event, not intent.
2. `POTENTIAL_ERROR`: only a reviewed heuristic with an observable opportunity,
   explicit counterfactual rule and lower confidence. No current M2 fact meets
   that standard merely because a death was untraded or a clutch was lost.

The v1-compatible scalar is:

`Mistakes_v1_rate = negative / validRounds`.

The successor should cluster same-episode evidence before assigning severity.
For example, lethal friendly damage and the corresponding team-kill event form
one anti-highlight. v1 may still produce two findings for compatibility, but
the report must not present them as two independent incidents.

Live suicide is available in M2 but absent from the v1 finding table. Adding it
to a successor is proposed because it is directly attributable and changes the
alive state. Its weight is deliberately unresolved: equating it to a team kill
or to 100 friendly HP is a product policy requiring calibration and approval.

## 5. Opportunity-based impact taxonomy

| Class | Definition | Scoring policy |
| --- | --- | --- |
| Occurred action | Direct event or deterministic sequence actually observed | Eligible for factual Performance/Impact/Mistakes ledger |
| Observable opportunity | All prerequisites and a falsifiable alternative are present in normalized data | May support a future versioned heuristic after review |
| Probable opportunity | Plausible from outcome but missing visibility, position, communication or timing evidence | Explanation only; never scored as a mistake |
| Unassessable | Required parser fields are absent | `null`/`UNAVAILABLE`, never zero |

Examples: a qualifying trade kill is an occurred action. “A teammate should
have traded” is not an observable opportunity with current data because line of
sight, position and tactical feasibility are not normalized. A missing drop is
unassessable because donor/receiver and purchase provenance are unavailable.

## 6. MVP and Who Ruined

### MVP

MVP considers all ten players regardless of match result. The v1-compatible
starting rule is:

`mvpRate_v1(p) = net(p) / validRounds(p)`.

This rewards positive findings and subtracts only confirmed harm. A successor
may report separate Performance and Impact next to it, but must not mix the
losing-team `relativeIndex` into MVP. A unique MVP requires ranking eligibility,
adequate coverage and a calibrated margin; otherwise report co-leaders or
“unique MVP cannot be determined.”

### Who Ruined

Scope remains the five-player losing roster. The exact v1 result remains
available as `ruinRaw_v1`. The proposed separated candidate is:

```text
contributionRate(p) = positive(p) / validRounds(p)
teamReference = mean(contributionRate(p), p in losing roster)
positiveShortfall(p) = max(0, teamReference - contributionRate(p))
mistakeRate(p) = negative(p) / validRounds(p)

ruinRaw_candidate(p) =
  0.75 * positiveShortfall(p) +
  0.25 * mistakeRate(p)
```

This retains v1's provisional 75/25 product policy but removes verified harm
from the shortfall term. It is the smallest explainable change that satisfies
the later separation requirement. The 75/25 split remains a hypothesis to test.

A successor leader is forbidden when the match is tied/partial, coverage fails
or the losing roster is not stable. On eligible input a leader is assigned even
when the margin is tiny, the primary score ties or sensitivity variants change
the ordering; those conditions are exposed as warnings instead of silently
abstaining. v1 retains its original margin/spread abstention. If there are no
confirmed harmful findings, the explanation says that ordering is based on
relative positive contribution, not proven mistakes.

The system never calls a player an intentional ruiner or griefer.

## 7. Highlights and anti-highlights

Every episode has:

```text
episodeId, type, playerId, roundId, tick,
evidenceEventIds, observedFacts, significance,
explanationKey, evidenceStrength, confidence,
supportingFindingCodes
```

Events are clustered by `(roundId, causal event/sequence, primary player)`.
Primary positive priority is objective/clutch, multi-kill, opening, trade, kill;
lower-priority labels become supporting facts. Primary negative priority is
team kill, suicide, team damage, friendly flash. One event ID can contribute to
one primary episode only. Aggregate scoring findings may be more granular, but
the explanation layer lists the episode once and shows its components.

Significance is the sum of unique weighted findings in v1. It is not a win
probability. Confidence comes from evidence strength and feature coverage, not
from how dramatic the outcome appears.

## 8. External rating systems

Research checked on 2026-10-17:

- [HLTV Rating 3.0 introduction](https://www.hltv.org/news/42485/introducing-rating-30)
  publicly describes six sub-ratings: Kills, Damage, Survival, KAST,
  Multi-Kills and Round Swing. It uses map/side/equipment context and attributes
  swing through final damage, damage share, flash assists and trades.
- [HLTV Rating 3.0 adjustments](https://www.hltv.org/news/43047/rating-30-adjustments-go-live)
  documents later reweighting, a 60/40 output-versus-cost balance and known
  single-map sensitivity. Complete constants and reproducible implementation
  are not public, so Who Ruined must not claim to reproduce HLTV.
- [FACEIT Rating FAQ](https://support.faceit.com/hc/en-us/articles/26530513602716-FACEIT-Season-8-FACEIT-Rating-FAQ)
  and [Round Swing explanation](https://support.faceit.com/hc/en-us/articles/27123235446428-FACEIT-Season-8-Understanding-Round-Swing)
  describe a separate performance rating based on contextual changes in round
  win probability. The complete formula/model is not published.
- [FACEIT Elo documentation](https://support.faceit.com/hc/en-us/articles/10525200579740-FACEIT-CS2-Elo-and-skill-levels)
  confirms Elo is a matchmaking skill measure driven primarily by wins/losses
  and expected outcome. FACEIT Elo is not FACEIT performance rating and is not
  an analogue for a single-demo player score.
- [Leetify Rating explanation](https://leetify.com/blog/leetify-rating-explained/)
  publishes a zero-sum round-win-impact design and attribution shares of 35%
  kill, 30% damage, 20% traded player and 15% flash assist. Its learned win
  probability tables are not our data and must not be copied as universal CS2
  truth.

Useful ideas are event context, explicit attribution, economic adjustment,
round normalization, abstention and transparent components. Rejected ideas are
copying closed coefficients, calling a heuristic a probability, importing pro
role norms into amateur matches, or forcing a zero-sum blame verdict.

## 9. Availability and determinism

- Missing values remain `null`/`UNAVAILABLE`; available categories are
  renormalized only by an approved, versioned rule.
- Stable team identity always comes from roster IDs, never T/CT.
- Scores use valid played rounds, so match length and side changes do not alter
  denominators incorrectly.
- Same-tick events use parser row order only where validated; ambiguous order
  reduces confidence or availability.
- No real overtime validation exists. Synthetic coverage does not close it.
- Every config is immutable, Zod-validated, hashed and stored with output.
- Stable arithmetic order is `(roundOrdinal, tick, eventId, code)` with finite
  JS doubles and six-decimal persistence, matching SPEC.

## 10. M3-B decisions (resolved)

1. v1 is a separately versioned exact compatibility baseline.
2. The successor separates positive shortfall and confirmed harm; 75/25 is one
   experiment, compared with predeclared alternatives rather than approved.
3. Live suicide enters successor at configurable baseline severity 2.5; the
   severity remains experimental and live-phase only.
4. Successor bundles team kill with linked lethal friendly damage; v1 remains
   cumulative.
5. MVP starts as `net / validRounds` across all ten players.
6. Eligible successor always assigns Who Ruined; close/tie/sensitivity are
   warnings. v1 retains abstention.
7. The ledger is named Context Contribution, not probabilistic Impact.
8. Win probability, ML and closed third-party formulas remain out of scope.

