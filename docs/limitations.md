# Limitations

- Only local `.dem` uploads are accepted. Links, `.dem.bz2`, Source 1, POV demos and nonstandard modes are unsupported.
- Real demos remain outside the repository. M0/M1 and M2 consistency have been
  exercised against three external demos; only K/D/A and score transitions have
  an independent `.dem.info` reference.
- M3-B exposes an experimental deterministic ranking API. It is not a causal
  blame model, probability of causing defeat, calibrated skill rating or proof
  of intent. Frontend integration remains owned by the separate frontend work.
- A `PARTIAL` result shows recovered facts and exact issues, never a Who Ruined verdict.
- Deaths alone are not described as tactical mistakes, blame or proof of intent.
- The service is localhost-only and has no public-hosting security posture.
- `cash` is unavailable in demoparser2 0.42.0. `item_pickup` does not identify a
  donor or distinguish purchase from pickup, so exact spend/drop metrics remain
  unavailable. Molotov and Incendiary damage is combined as `inferno`.
- An authoritative game-mode field is absent from both the observed Source 2
  headers and the supported `.dem.info` schema. The validator reports mode as
  unavailable rather than inferring it from map or score.
- No real overtime demo was found in the nine-match validation batch. Overtime
  and side-switch logic is covered by an explicitly synthetic regression test,
  not claimed as real-demo validation.
- Independent `.dem.info` validation covers K/D/A and round score transitions.
  ADR, KAST, trades, clutches and utility aggregates have mathematical and
  cross-demo consistency checks but still lack an independent reference source.
- The 9-match M3-B comparison is an internal sensitivity sample, not a training
  corpus. Three matches changed successor leader under at least one predeclared
  coefficient/severity/support variant; this is surfaced rather than optimized
  away.
- `FRIENDLY_FIRE_COMBAT_CONTEXT` is a score-neutral heuristic. Aim direction,
  visibility, spatial obstruction, communication and intent are unavailable.
- Rescore requires a stored `m2-artifact-1`. Older M1 or match-only artifacts
  return 409 and require a real demo reparse; missing values are not fabricated.
