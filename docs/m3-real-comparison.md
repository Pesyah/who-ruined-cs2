# M3-B anonymous real-demo comparison

Run: `pnpm score:demos "F:\CS2 Demos"` on 2026-10-17. All 9 discovered
Source 2 demos parsed and scored; failures 0. IDs below are SHA-256 prefixes and
per-match anonymous player aliases. This is internal sensitivity analysis, not
independent truth for MVP or Who Ruined. Existing `.dem.info` sidecars validate
only K/D/A and round score transitions.

| Demo | Map / score | MVP | Successor 75/25 | Gap | v1 clear | Successor sensitivity |
| --- | --- | --- | --- | ---: | --- | --- |
| `b399dac43649bbf7` | Mirage 9:13 | `player_06` | `player_03` | 0.02 close | none | `player_03` / `player_04` |
| `4969ca76181eeb1c` | Train 13:6 | `player_03` | `player_07` | 0.13 | none | `player_07` / `player_10` |
| `3f7929b0aa2afbd9` | Train 11:13 | `player_02` | `player_05` | 0.01 close | none | stable |
| `240c8d7f81e83696` | Train 7:13 | `player_06` | `player_03` | 0.21 | `player_03` | stable |
| `c8b0551fa26ad6dd` | Train 10:13 | `player_04` | `player_03` | 0.18 | `player_03` | stable |
| `fbe2e6d8d1732efa` | Train 13:7 | `player_09` | `player_10` | 0.53 | `player_10` | stable |
| `6b12ad8573d790c5` | Dust2 3:13 | `player_08` | `player_05` | 0.27 | `player_05` | stable |
| `f8ec510829e57ee5` | Office 13:8 | `player_01` | `player_09` | 0.002101 close | none | `player_07` / `player_09` |
| `c939c296a024f3e2` | Dust2 5:13 | `player_08` | `player_01` | 0.19 | `player_01` | stable |

Baseline successor assigned 9/9 eligible matches. v1 returned a clear leader
in 5/9 and correctly abstained in 4/9. Three matches changed leader under at
least one predeclared alpha/beta, harm-severity or flash-support variant. The
local ignored JSON preserves each changed leader's positive shortfall and
confirmed team-damage/teamkill/team-flash/suicide facts; no “preferred” leader
was used to choose weights.

## Immutable configurations

| Version | SHA-256 config hash |
| --- | --- |
| `scoring-v1-compat@1.0.0` | `4fa7eed276c03a7d59b24a8f386a675fa65d9d743beb87ed0f911165a88780d1` |
| `scoring-successor@0.1.0-alpha75-beta25` | `9df625f07dc1304497f68063d3326fff84b116651de9da3bc91e29e90aa4fe62` |
| `scoring-successor@0.1.0-alpha50-beta50` | `abd99fb541e8d4f07abae8bd7a40157a564e329e122938e66ad39d9cf7989ece` |
| `scoring-successor@0.1.0-alpha25-beta75` | `d24a0cb9afdcb633bcf03391a60beb6f6b8d04a5c043853a4bcd1342122236e2` |
| `scoring-successor@0.1.0-harm-low` | `aeac9de6b662eb16414e24b1cd92b6e6a93b60a3311887ef9f2041da4e6a5d1e` |
| `scoring-successor@0.1.0-harm-high` | `242304f60050ad1b6a98b31c3630bfdc8f8b695f9f8b8aeb4a4f974d77231088` |
| `scoring-successor@0.1.0-flash-support-hypothesis` | `5c2f7c6911021b48869f439322ff6eb487a54bbc3a02b18af329e395ba5fb7bf` |

No real overtime appears in this batch. That gate remains open.
