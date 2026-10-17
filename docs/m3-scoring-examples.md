# M3-A numerical examples and edge cases

All examples are synthetic scoring fixtures. They are not evidence that the
model identifies causes of defeat in real matches.

M3-B note: examples describing successor abstention were M3-A proposals and
are superseded by the approved rule below. The normative v1 examples and
thresholds remain unchanged.

## M3-B successor assignment example

If five eligible losing-team players have identical `ruinRaw=0`, successor
still selects the first stable player ID, sets `primaryScoreTied=true`, lists
all tied IDs and warns that the choice is a deterministic presentation policy.
The same inputs under v1 return no clear ruiner. If the top two successor values
are `0.202083` and `0.200000`, the leader is returned with `close=true`; the
0–100 relative scale must not hide the absolute `0.002083` margin.

For a linked 100-HP team kill, v1 negative is `2.5 + 1.0 = 3.5`.
Baseline successor preserves both source facts but the episode severity is
`2.5`, so no accidental double count occurs. A pre-freeze or post-round suicide
adds zero; a live suicide adds the configured experimental baseline `2.5`.

## 1. Exact normative v1 golden example

This reproduces `SPEC.md` section 11.2 without modification. Five losing-team
players each have 10 valid rounds, net totals `[20, 16, 12, 8, 4]`, and zero
negative totals.

| Player | Net | Performance rate | Shortfall | Harm rate | Ruin raw | Relative index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A | 20 | 2.0 | 0 | 0 | 0 | 0 |
| B | 16 | 1.6 | 0 | 0 | 0 | 0 |
| C | 12 | 1.2 | 0 | 0 | 0 | 0 |
| D | 8 | 0.8 | 0.4 | 0 | 0.3 | 50 |
| E | 4 | 0.4 | 0.8 | 0 | 0.6 | 100 |

The mean performance rate is `1.2`. Spread is `0.6` and the worst-to-second
gap is `0.3`, so v1 permits a unique experimental result. If all five net
totals are 10, every raw score and index is zero and there is no clear ruiner.

## 2. Exact v1 finding arithmetic

### Contextual enemy kill

A player gets the opening kill while outnumbered and has already dealt 80
verified HP to that victim:

```text
ENEMY_KILL   = 1.25 * 1.00 = 1.250
OPENING_KILL = 1.00 * 0.40 = 0.400
ENEMY_DAMAGE = 0.80 * 0.35 = 0.280
positive episode total     = 1.930
```

If the kill is also a valid trade, v1 adds `0.25`, producing `2.180`. The
opening/trade labels add context, while damage deliberately overlaps the kill
under v1 policy.

### Team kill and lethal damage

If the same episode contains 100 verified friendly HP and a team kill:

```text
TEAM_KILL   = 1 * 1 * 2.50 = 2.500
TEAM_DAMAGE = 1 * 1 * 1.00 = 1.000
negative total             = 3.500
```

This is intentional in v1, but the successor proposal presents one bundled
anti-highlight so users do not perceive two separate incidents.

### Friendly flash

A verified three-second friendly flash produces:

`min(3 / 5, 1) * 0.9 * 0.4 = 0.216` negative points.

An unattributed or missing duration is unavailable, not zero.

## 3. Why the separated candidate changes shortfall

Consider five losing-team players with positive contribution rates
`[1.6, 1.4, 1.2, 1.0, 0.8]` and mistake rates `[0, 0, 0, 0.05, 0.10]`.
The positive mean is `1.2`.

| Player | Positive shortfall | Mistake rate | Candidate ruin raw |
| --- | ---: | ---: | ---: |
| A | 0 | 0 | 0 |
| B | 0 | 0 | 0 |
| C | 0 | 0 | 0 |
| D | 0.2 | 0.05 | `0.1625` |
| E | 0.4 | 0.10 | `0.3250` |

For E: `0.75 * 0.4 + 0.25 * 0.10 = 0.325`.

Unlike v1 `net` shortfall, the harmful event does not also reduce the positive
contribution input. The report can truthfully say “positive contribution below
team reference” and “confirmed harm rate 0.10” as separate reasons.

## 4. Performance versus Impact

Two players each deal 90 ADR in 20 rounds.

- Player A records early damage and cleanup kills while already 5v2.
- Player B records a trade and an outnumbered kill in a 2v3.

Their combat Performance can be similar. Their deterministic v1 Impact differs:
Player A's ahead-state kill uses `0.85`; Player B's trade kill uses
`1.25 + 0.25 = 1.50`. No claim is made that these are win probabilities.
Bomb state, time and equipment are shown as context but do not acquire invented
multipliers.

## 5. Multi-kill and clutch double-count protection

A 1v2 clutch with two enemy kills already produces two contextual kill findings
and possibly opening/trade findings. The labels `2K` and `1v2 won` become one
highlight with supporting facts. They do not add independent v1 score unless a
future approved config explicitly introduces and calibrates such a term.

This preserves the unique signal—an explosive, decisive sequence—without
counting `kill + multi-kill + clutch` as three unrelated actions.

## 6. Trade boundary and simultaneous events

- Revenge at exactly `5.000 s`: trade under v1.
- Revenge at `5.001 s`: not a trade.
- Same tick, trustworthy row order: only a later row may trade an earlier row.
- Same tick, ambiguous order: trade unavailable for that sequence.
- A missing trade is a fact; it is not proof that a teammate had a feasible
  opportunity.

## 7. Utility examples

- 40 HE enemy damage is already part of enemy damage/ADR. It can explain the
  source of output but is not added again as independent Performance.
- A flash assist is a unique support fact and may enter a future Support family.
- Enemy blind seconds without a resulting kill remain useful factual support,
  but their tactical value is not known.
- A smoke detonation is factual. Smoke effectiveness is unavailable without a
  spatial/visibility model.
- Inferno damage combines Molotov and Incendiary because the current parser
  evidence does not distinguish them reliably.

## 8. Economy examples

Observed freeze equipment can label a duel as `low equipment versus high
equipment` for analysis. It cannot produce a calibrated economic multiplier
from nine matches. Cash, exact spend and drop attribution remain null. A player
is never penalized for “not dropping” because the opportunity is unobservable.

## 9. MVP edge cases

### Losing-team MVP

If a losing-team player has the highest eligible `net / validRounds` among all
ten players, the v1-compatible MVP rule permits that player to be MVP. Match
winner is not a prerequisite.

### Near tie

If the top two values differ by less than the eventually approved margin, the
result must be co-leaders or “unique MVP cannot be determined.” M3-A deliberately
does not invent a margin because SPEC defines one only for Who Ruined.

### Incomplete data

If one player lacks critical damage coverage, the system does not silently use
zero. It reports unavailable components and either applies an explicitly
approved common-component comparison or abstains. The initial recommendation
is to abstain from a unique MVP.

## 10. Who Ruined abstention cases

- All five raw values equal: indices are zero; no candidate.
- Raw spread below `0.15`: no clear candidate under v1.
- Top gap below `0.10`: no clear candidate under v1.
- Tied, unfinished, `PARTIAL`, unstable roster, or insufficient coverage: no
  verdict.
- No confirmed harm: ranking may describe relative contribution shortfall, but
  must state that no verified harmful action was found.
- Rankings flip under small reasonable weight perturbations: low confidence and
  no unique candidate under the proposed stability gate.

## 11. Pre-freeze, post-round and unusual scenarios

Pre-freeze and post-round deaths remain scoreboard facts where applicable but
do not enter live Performance, Impact or Mistakes. A team kill, suicide or world
death changes live alive counts only when it occurred in the validated live
interval. Disconnect/reconnect reduces evidence quality; it is not a player
performance penalty. Overtime behavior is covered synthetically but remains
unconfirmed on a real demo.

