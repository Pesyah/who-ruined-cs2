# Limitations

- Only local `.dem` uploads are accepted. Links, `.dem.bz2`, Source 1, POV demos and nonstandard modes are unsupported.
- Real demos remain outside the repository. M0/M1 and M2 consistency have been
  exercised against three external demos; only K/D/A and score transitions have
  an independent `.dem.info` reference.
- M1 deliberately shows no ranking. M2 factual features exist; M3 scoring and
  blame/ranking are not implemented.
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
