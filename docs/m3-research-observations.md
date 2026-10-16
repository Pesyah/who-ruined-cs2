# M3-B research observations

These are anonymous observations from the 9-demo internal batch. They are not
labels of intent, causality or player quality. Ticks and event IDs are retained
only as reproducible anchors; private paths, names and Steam IDs are absent.

| Match / map | Round, ticks | Verified sequence | Research value and limits |
| --- | --- | --- | --- |
| `b399dac43649bbf7` / Mirage | R15, 92575 | `player_hurt:737` caused 3 actual friendly HP, then `player_death:738` recorded the linked team kill | Confirms why lethal HP may be far below 100 and why successor bundles facts. Position, visibility and intent unavailable. |
| `fbe2e6d8d1732efa` / Train | R17, 83587 | `player_hurt:838` caused 33 friendly HP, then `player_death:839` linked team kill | Independent counterexample to assuming every team kill equals 100 fresh HP. One episode, not two successor severities. |
| `b399dac43649bbf7` / Mirage | R15, 92575–92581 | Same shooter dealt firearm friendly damage and firearm enemy damage 6 ticks / 0.09375 s later | Strong FF-combat-context candidate. Could be crossfire, target transition or input error; no line-of-sight/aim evidence. Score-neutral. |
| `240c8d7f81e83696` / Train | R13, 70814–70871 | Same sequence separated by 57 ticks / 0.890625 s | Moderate candidate near the declared boundary; useful for reviewer disagreement tests, not a probability. |
| `4969ca76181eeb1c` / Train | R14, 86842–87965 | Same sequence separated by 1123 ticks / 17.546875 s | Negative control: heuristic explicitly does not trigger above 1 s. Shows that “later enemy damage” alone is not combat-context evidence. |
| `4969ca76181eeb1c` / Train | R13, tick 80053, `player_death:731` | Live suicide | Direct alive-state harm eligible only in successor. Cause and intent unavailable; severity is an experimental policy. |
| `3f7929b0aa2afbd9` / Train | R1, tick 5784, `player_death:47` | Live suicide in the first round | Tests live-phase isolation. “At spawn” is not claimed because spatial verification is absent. |
| `b399dac43649bbf7` / Mirage | R1, 2935–4840, death events 8/11/39 | Three enemy kills by one player; opening is supporting evidence | Useful descriptive multikill/context episode. It receives no additional multikill bonus because kills are already scored. |

The local Git-ignored journal contains 813 factual/research cases: 329
multikill sequences, 320 team-flash episodes, 117 team-damage episodes, 41
FF-combat-context hypotheses, 4 live suicides and 2 team-kill episodes. Volume
is not prevalence evidence: nine matches are a convenience sample and some
episodes share rounds/players. Next steps are independent human labels,
counterexample sampling and a predeclared holdout before proposing any new
metric or changing score.
