# Scoring

Scoring is intentionally **not implemented in M0–M2 or M3-A**. M2 emits factual
metrics and categorized facts only. The normative v1 formula remains in
`SPEC.md`; no placeholder score, MVP ranking or Who Ruined verdict is exposed
by the API.

M3-A design documents:

- `m3-scoring-proposal.md` preserves the exact v1 baseline, records conflicts
  with later requirements and proposes a separately versioned evolution;
- `m3-scoring-examples.md` contains the exact SPEC golden example plus edge
  cases;
- `m3-validation-plan.md` defines calibration, fairness and abstention gates.

No candidate formula in those documents is active until the owner approves the
open decisions and M3-B implements a versioned scoring package.
