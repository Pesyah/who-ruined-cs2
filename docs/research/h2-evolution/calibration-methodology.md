# H2-E7 calibration methodology

C0–C11 share one immutable prepared input for each demo. The six extra C7
stress configurations vary each of U2, R2 and Economy B independently away
from nominal. E2 stays binary with a debit ceiling. Nominal U2 uses 0.010
per use, factors `[1, 0.60, 0.35, 0.20]` and a 0.022 per-round cap. The
low/high probes use 0.005/0.015 weights and 0.010/0.030 caps, with the factor
arrays in the [versioned run config](e7-run-2026-11-22-v2.json). R2 varies
strength 0.5/1.0/1.5 and round cap 0.025/0.050/0.075, keeping nominal event
and match caps 0.020 and 0.180. Economy strength is 0.5/1.0/1.5.

The development/holdout split yielded 19 and 10 usable matches. The corpus
contains 142 and 79 distinct Steam IDs in the respective partitions, with
5 in common. Several maps and sources occur in both partitions. There are
no independent expert labels or population sampling weights, and no
reconstructable overlap audit against E5/E6 at match level. Treat these runs
as sensitivity and held-out-match stress tests. No coefficient was fitted or
selected on the holdout, rating increases or award identities.

Compare mathematical invariants first, then size of the changes, ranks,
award gaps and sensitivity to perturbations. Inspect mechanism utilization,
overlap, rejections and caps before interpreting any score movement. Side and
win/loss rows use stable roster team and the round’s side assignment. Buy
tiers, player roles and tactical intent lack validated labels for this run.
