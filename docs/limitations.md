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
