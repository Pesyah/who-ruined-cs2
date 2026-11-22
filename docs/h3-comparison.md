# Offline H2/H3 comparison

The production worker and diagnostic CLI use the same H3 projector in `@who-ruined/scoring/h3`. The CLI reads approved demo files and writes a local JSON report.

The production policy is `h3-seven-family@1`, SHA-256 `17b310bd0e8173a899519d91adf5533bf888e9c858b7e04ad93d1bf6ccb0b68a`. Families are COMBAT, SUPPORT, DEATH_RELATED, CONTEXT, OBJECTIVES, ROUND_IMPACT and DIRECT_HARM. The policy retains prepared axes, original coefficients and caps, exact evidence attribution, eligibility, and the H2 projection with the additional ROUND_IMPACT input. Unavailable ROUND_IMPACT remains `null` and leaves the projection unaffected. [Model specification and coverage matrix](research/h2-evolution/h3-seven-family-model.md).

## Reproduce the final comparison

From the repository root, with the approved demo corpus available:

```powershell
pnpm.cmd exec turbo run build --filter=@who-ruined/worker
New-Item -ItemType Directory -Force '_local-archive' | Out-Null
npm.cmd run rating:compare -- 'F:\CS2 Demos' '_local-archive\h3-comparison-next.json' --baseline 'docs/research/h2-evolution/e8-real-demo-results.json'
```

Use a fresh output path for every run. Omit `--baseline` for a different corpus. A baseline run verifies the parser, normalizer, exact relative paths and SHA-256 values, applicability for excluded files and the full H3 result digest after substituting only the frozen research ID and digest. The full digest covers inputs, contributions, awards and the evidence ledger. The report also keeps the production digest per result. H2/H3 player bindings, eligibility and score reconstruction are checked independently. Keep the detailed local output out of Git because it contains demo paths and evidence identifiers.

## Final corpus verification

All 123 bindings matched the [frozen E8 report](research/h2-evolution/e8-real-demo-results.json). This includes all 100 H3 result digests, 983 comparable ratings, and 23 matching exclusions. No unclassified normalized event types were observed.

| Scale | Minimum | Median | P95 | Maximum |
| --- | ---: | ---: | ---: | ---: |
| H2 | 0.426965 | 1.069099 | 1.909404 | 3.092986 |
| H3 | 0.495411 | 1.185922 | 2.030722 | 3.109695 |

All 983 scores were finite and their family contributions reconstructed them within `1e-12`. H3 increased all compared ratings in this corpus. The mean paired increase was `0.109874`, with a maximum of `0.553002`. These are corpus measurements. The scale remains uncalibrated for public interpretation.

### Four confirmed trades without an exact death anchor

The table compares ticks from the separately validated participation scoring window with the normalized trade evidence. Both deaths in all four links were marked `LIVE` by the normalizer and occurred after the verified objective terminal tick that closes the physical scoring window. All four rounds were counted for the player, but neither prepared variant contained a death anchor in the affected round. E2 therefore preserves the trade relation and records `EXACT_DEATH_ANCHOR_UNAVAILABLE`. It cannot remove a penalty without the exact `ownDeaths` input.

| Demo SHA prefix | Map | Round | Objective terminal | Player death | Revenge death |
| --- | --- | ---: | ---: | ---: | ---: |
| `6b12ad85` | `de_dust2` | 8 | 44656 | 45053 | 45067 |
| `a3646b98` | `de_inferno` | 4 | 28281 | 28442 | 28673 |
| `9fca8f1b` | `de_anubis` | 18 | 114112 | 114245 | 114349 |
| `5a86b9b2` | `de_dust2` | 3 | 15471 | 15634 | 15786 |
