# Scoring

M3-B implements two deliberately separate deterministic model families in
`@who-ruined/scoring`. The package accepts only a validated `m2-artifact-1`
value and an immutable, Zod-validated config. It does not parse demos, query a
database or call a network service.

## v1 compatibility baseline

`scoring-v1-compat@1.0.0` reproduces `SPEC.md` §7 and §11.2. Its nine finding
types, weights, confidence, simultaneous `TEAM_KILL` + verified
`TEAM_DAMAGE`, `net / validRounds`, 75/25 formula, 0–100 scale, stable tie-break
and abstention thresholds are unchanged. A spread below `0.15` or top-two gap
below `0.10` yields no clear v1 ruiner. This historical policy is not silently
modified by successor decisions.

## Experimental successor

For the five players on the losing stable roster:

```text
positiveRate = positive / validRounds
teamReference = mean(losing-team positiveRate)
positiveShortfall = max(0, teamReference - positiveRate)
confirmedHarmRate = bundledConfirmedHarm / validRounds
ruinRaw = alpha * positiveShortfall + beta * confirmedHarmRate
```

The baseline experiment is `alpha=0.75`, `beta=0.25`; this split is not
approved as scientifically optimal. The comparison CLI also runs 50/50,
25/75, low/high harm severity and a score-isolated flash-support hypothesis.
No coefficient was fitted to the nine available matches.

On an eligible full match successor always returns one losing-team leader.
Exact primary-score ties use stable player ID and are marked `primaryScoreTied`;
small gaps are marked `close`. v1 continues to abstain. A result is withheld
for partial/unsupported/tied/incomplete/critically under-covered input.

MVP is independent: it compares all ten players by experimental
`net / validRounds`, reports close/tie state and may select a player from either
team.

## Confirmed harm and research

- A live suicide has a strict configurable successor severity (baseline 2.5).
  Pre-freeze and post-round suicides are not scored.
- Successor combines a team kill and its linked lethal friendly HP event into
  one severity episode. v1 retains both findings and their original sum.
- Friendly damage and flash are confirmed facts, not proof of intent.
- `FRIENDLY_FIRE_COMBAT_CONTEXT` records firearm friendly damage followed by
  firearm enemy damage by the same shooter in the same live round. Intervals
  `<=0.5 s`, `(0.5,1] s`, and `>1 s` are labelled strong, moderate and not
  triggered. The hypothesis always has `significance=null` and changes no score.
- Ordinary deaths, untraded deaths, lost clutches, missing drops and inferred
  roles never create negative findings.

Every finding and episode contains player, round, tick, source event IDs,
evidence strength, explanation key, scorer version and config hash. Reports
also include per-round player ledgers. The relative index is not a probability,
causal estimate, proof of intent or cross-match quality score.

Run the private-demo comparison with:

```powershell
pnpm score:demos "F:\CS2 Demos"
```

Exports under `data/reports/` and `data/research/` contain only anonymous IDs;
both directories are ignored by Git.
