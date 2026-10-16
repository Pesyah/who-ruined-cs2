# M3 scoring validation and calibration plan

This plan is a gate for M3-B implementation and later product claims. The nine
real demos validate parsing and internal arithmetic; they are not a statistical
calibration corpus and contain no real overtime.

## 1. Validation layers

| Layer | Question | Current evidence |
| --- | --- | --- |
| Parser reconciliation | Were players, rounds, scores and K/D/A reconstructed? | 9/9 real demos pass `.dem.info` reconciliation |
| Feature arithmetic | Are ADR/KAST/trades/utility and phase filters deterministic? | Unit/property tests and nine-demo internal checks pass |
| Scoring arithmetic | Does a version implement its documented formula exactly? | Must be added in M3-B; v1 §11.2 is mandatory |
| Episode validity | Are claimed findings present and attributed correctly? | Requires blinded human review |
| Ranking usefulness | Does ordering align with predeclared expert judgment? | Not tested |
| Fairness/stability | Is result robust across side, map, match length and weights? | Not tested; real overtime absent |

Internal consistency and independent validation must remain separate in every
report. `.dem.info` independently covers K/D/A and score transitions, not ADR,
KAST, trades, clutches, utility impact or scoring.

## 2. Minimum dataset

Follow the SPEC minimum before public claims:

- at least 30 legally acquired complete demos across maps, modes and skill
  bands;
- match-grouped holdout of at least 20%; no episode from one match may appear
  in both calibration and evaluation;
- at least 150–200 sampled meaningful episodes;
- two knowledgeable reviewers, blinded to score and candidate;
- labels: verified harm, strategically questionable, neutral, unclear, plus
  severity, available context and reason;
- Cohen's kappa for agreement and precision/recall for verified harm.

The nine current demos may be part of parser regression only. They must not be
used to fit coefficients and then presented as independent scoring validation.

## 3. Independent metric reconciliation

For each selected demo:

1. retain `.dem.info` checks for score and K/D/A;
2. independently recompute damage from ordered health-before/after evidence and
   compare event IDs, not only totals;
3. hand-audit KAST truth tables for sampled player-rounds;
4. compare every trade against the explicit 5.0-second rule, including exact
   boundary and same-tick order;
5. hand-audit opening, multi-kill and clutch sequences from round timelines;
6. reconcile flash assist and blind duration separately;
7. reconcile enemy/team HE and inferno HP loss with total capped damage;
8. verify freeze equipment snapshots without inferring cash or spend.

External scoreboard providers may be comparison aids only when definitions are
known. A disagreement with HLTV, FACEIT or Leetify is not automatically a bug:
their trade, KAST, economic and rating semantics differ and some formulas are
closed.

## 4. Scoring arithmetic tests for M3-B

Mandatory deterministic tests:

- exact SPEC §11.2 fixture;
- every v1 finding magnitude, confidence and weight;
- kill leverage `2v4=1.25`, `3v3=1.0`, `4v2=0.85`;
- ordinary death, opening death, untraded death and lost clutch add no negative
  finding;
- team kill plus verified friendly damage follows the selected version policy;
- unavailable damage/flash never becomes a zero observation;
- stable sort and repeated execution yield byte-equivalent numeric output apart
  from allowed timestamps;
- shuffled input order converges after canonical sort;
- name changes and T/CT swap do not change stable-team scores;
- all relative indices are bounded `[0,100]`;
- tied raw scores, narrow spread and narrow top margin abstain correctly;
- winning-team players have no Who Ruined relative index;
- `PARTIAL`, tied and unfinished matches return null verdicts;
- highlight clustering never emits the same event as two primary episodes.

Property tests should assert component monotonicity, not naive rank monotonicity:
adding an isolated verified enemy kill cannot reduce that player's positive
component; increasing friendly damage cannot reduce confirmed harm.

## 5. Weight sensitivity

For every candidate config:

- vary each finding coefficient by `±10%`, `±20%` and `±30%` while holding the
  others fixed;
- sweep the shortfall/harm split around v1's `75/25` prior;
- compare player order using Kendall rank correlation;
- record unique-candidate flips, top-two margin and abstention-rate changes;
- run leave-one-match-out analysis and bootstrap whole rounds, never individual
  correlated events;
- reject a “clear” verdict that depends on a narrow coefficient choice.

Thresholds are acceptable only when selected before the final holdout review.
Do not tune them to make the nine known matches look persuasive.

## 6. Fairness scenarios

The review set must include or synthetically isolate, with labels kept explicit:

- T and CT halves for the same stable roster;
- short regulation, long regulation and real overtime when acquired;
- winning-team and losing-team high performers;
- low K/D with high assists/damage and high K/D with low contextual impact;
- openers, passive survivors and utility-heavy players without assigning roles;
- full-buy versus eco/force contexts;
- team kill, team damage, friendly flash and suicide;
- successful and failed 1vX situations;
- saves, exit kills, bomb plants/defuses/explosions;
- reconnects, world deaths, same-tick events and incomplete evidence.

Protected product invariants:

- no penalty solely for position or inferred role;
- no automatic error for missing trade, lost clutch, death, missing drop or low
  K/D;
- no intent/griefing claim;
- identical roster/event facts produce identical output across side swaps;
- missing evidence cannot improve confidence.

## 7. False-positive accusation analysis

Reviewers inspect anti-highlights without seeing player totals. Measure:

- precision of `CONFIRMED_HARM` attribution;
- frequency with which a displayed “error” is judged neutral or unclear;
- candidate rate when no harmful event exists;
- abstention rate and reasons;
- wording failures where descriptive shortfall appears causal.

If independently reviewed harmful-event precision is below 80%, SPEC requires
that no additional tactical mistake labels be introduced. Even above 80%, the
score remains experimental until ranking evaluation is separately acceptable.

## 8. Comparison baselines

Compare candidate ordering against deliberately simple baselines:

- negative K/D difference;
- ADR;
- KAST;
- v1 `net / rounds`;
- exact v1 `ruinRaw`;
- candidate separated shortfall/harm score.

The goal is not maximum agreement with one external rating. The candidate must
show better reviewer alignment or clearer calibrated abstention without a large
increase in false accusations.

## 9. Overtime and missing ground truth

No current real demo contains overtime. Synthetic tests may verify arithmetic,
multiple side swaps and stable IDs but cannot validate parser behavior on a
real overtime recording. The real-overtime acceptance gate remains open.

ADR, KAST, trades, clutches and utility lack independent current references.
Until sampled reconciliation is complete, they may inform an experimental score
only with an explicit internal-validation label. They cannot support a claim of
external accuracy.

## 10. Admission criteria for M3-B

Implementation may begin after the owner approves:

1. whether v1 ships or remains a compatibility baseline;
2. the exact Performance/Impact/Mistakes boundaries;
3. treatment of suicide and team-kill/damage episode overlap;
4. MVP rule and abstention threshold;
5. Who Ruined formula and stability gate;
6. API versioning and names that cannot be mistaken for probabilities;
7. confirmation that empirical win probability remains out of scope.

Before any non-experimental or causal claim, additionally require:

- the 30-demo/150–200 episode review;
- predeclared holdout results;
- acceptable reviewer agreement;
- at least 80% verified-harm precision;
- documented sensitivity and false-positive analysis;
- a real overtime fixture or an explicit unsupported/partial policy;
- independent reconciliation of sampled ADR/KAST/trade outputs.

## 11. M3-A completion checklist

- [x] v1 formula transcribed exactly and retained as baseline.
- [x] conflicts with later requirements documented.
- [x] candidate improvements justified relative to v1.
- [x] numerical and boundary examples documented.
- [x] external systems separated into public facts and closed elements.
- [x] calibration and abstention plan documented.
- [ ] owner decisions in `m3-scoring-proposal.md` section 10 approved.
- [ ] M3-B scoring code implemented — intentionally not started.

