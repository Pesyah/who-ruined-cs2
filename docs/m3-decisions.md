# M3 decision register

Status: implemented experimental policy, 2026-10-17. `SPEC.md` is unchanged.

| Decision | M3-B policy | Why / caveat |
| --- | --- | --- |
| v1 | Exact separately versioned compatibility scorer | Preserves normative history and §11.2; successor cannot rewrite it |
| Successor formula | Positive contribution shortfall plus separately bundled confirmed harm | Prevents harm from entering both net shortfall and harm term |
| Alpha/beta | 75/25 baseline; 50/50 and 25/75 sensitivity | No split is scientifically approved or fitted to nine demos |
| Harm severity | Baseline teamkill 2.5, team damage 1/100 HP, flash 0.4, suicide 2.5; low/high variants | Product-policy priors, not empirical causal effects |
| Teamkill linkage | One successor episode; v1 retains kill + independently verified lethal HP | Avoids accidental successor double count while keeping evidence |
| Suicide | Live only, strict configurable penalty | Pre-freeze/post-round facts remain unscored; intent unknown |
| MVP | Highest `net / validRounds` among all ten | Experimental baseline; separate from losing-team ranking |
| Who Ruined | Successor always assigns within eligible losing five; v1 abstains by original thresholds | Exact ties use stable ID; close/tie/sensitivity warnings are mandatory |
| Roles/opportunity | No role classifier and no penalty for missing unproven opportunity | Current data lacks tactical assignment, visibility and communication |
| Context terminology | “Context Contribution”, not probabilistic “Impact” | No trained win-probability model exists |
| FF combat context | Score-neutral 0.5/1.0-second research labels | Time proximity cannot prove crossfire, obstruction or intent |
| Re-score | Pure scorer reads stored M2 artifact; no parser call | Old artifacts without M2 analytics return 409 |
| Public claims | All reports remain experimental and non-causal | Overtime, external derived-metric truth and human calibration remain open |

The 9-demo run is sensitivity analysis only. It did not select coefficients,
train a model or provide an external label for Who Ruined.
