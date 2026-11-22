# H2 evolution research baseline

Status: H2-E1 through H2-E8 research, 2026-11-22. This directory describes the current implementation and research
candidates; it does not define a replacement production rating.

## Scope and authority

The current worktree is authoritative. The inventory follows normalized
`MatchData`, M2 analytics, the participation sidecar, the frozen family kernel,
H2 projection, EVP input and player-radar projection in that order. Historical
M3 documents are useful provenance but do not override current code.

The E1–E5 work made no production scoring, API, DTO, database, artifact or
frontend change. Executable research modules and explicitly synthetic tests
live under `apps/worker/test`; separate native-parser runners provide the
documented real-demo evidence. Synthetic cases are labelled synthetic and are
never presented as real-demo validation.

## Research set

- [Baseline and next steps](baseline-and-next-steps.md): frozen H2 identity,
  mathematics, deterministic baseline and a future experiment protocol.
- [Evidence inventory](evidence-inventory.md): signal-by-signal source,
  availability, coverage and current M2/H2/EVP use.
- [Trade semantics audit](trade-semantics-audit.md): M2 and H2 matching rules,
  edge cases and the design point for traded-death neutralization.
- [Coverage and double counting](coverage-and-double-counting.md): denominator
  compatibility, false-zero risks and overlapping evidence.
- [Canonical trade contract](trade-contract.md): strict evidence, polynomial
  one-to-one matching, timing availability and coverage separation.
- [Traded-death neutralization](death-neutralization.md): exact anchor-level
  intervention before the unchanged kernel and projection.
- [H2-E2 experiment results](e2-experiment-results.md): synthetic coverage and
  offline comparison over six saved canonical results.
- [Utility evidence](utility-evidence.md): detonation/start facts, effect
  attribution, availability and deduplication boundaries.
- [Utility contribution models](utility-contribution-models.md): three
  cap/weight probes and deterministic reconstruction rules.
- [Utility double counting](utility-double-counting.md): approaches A/B/C and
  the exact-anchor reallocation rule.
- [H2-E3 experiment results](e3-experiment-results.md): 26 synthetic scenarios
  and read-only comparison over the same six saved canonical results.
- [Round timeline contract](round-timeline-contract.md): versioned research
  state, evidence references and same-tick semantics.
- [State reconstruction](state-reconstruction.md): sidecar reuse, invariants,
  objective phases, E2/E3 linkage and performance.
- [Clutch and survival evidence](clutch-and-survival-evidence.md): factual 1vX,
  terminal survival and useful actions in lost rounds.
- [H2-E4 real-demo validation](e4-real-demo-validation.md): five native-parsed
  demos, differential checks and measured limitations.
- [Round-impact evidence](round-impact-evidence.md): E4 confidence closure,
  confirmed impact facts and the `h2-e5-round-impact@1-research` contract.
- [Round-impact models](round-impact-models.md): R1/R2/R3 mathematics, caps,
  exact reconstruction and sensitivity.
- [Clutch, survival and lost-round impact](clutch-and-survival-impact.md):
  factual clutch progression and unavailable plain survival.
- [Impact double counting](impact-double-counting.md): event/semantic ledger,
  E2/E3 composition and the reallocation recommendation.
- [H2-E5 experiment results](e5-experiment-results.md): ten usable real demos,
  five unsupported GOTV files and hypothetical award sensitivity.
- [Economy evidence inventory](economy-evidence-inventory.md): raw parser,
  normalized and consumer-level equipment/money/transition availability.
- [Equipment snapshot reconstruction](equipment-snapshot-reconstruction.md):
  `h2-e6-economy@1-research`, duplicate policy and field-level availability.
- [Weapon transfer and carryover](weapon-transfer-and-carryover.md): strict
  identity requirements, real transfer limits and active-item continuity.
- [Economy contribution models](economy-contribution-models.md): E6-A/B/C/D
  mathematics, caps and diagnostic boundaries.
- [Economy double counting](economy-double-counting.md): current
  LOW_EQUIP_COMBAT audit, attribution ledger and fairness risks.
- [H2-E6 experiment results](e6-experiment-results.md): ten usable plus five
  GOTV/pro demos, availability and model sensitivity.
- [H2-E7 corpus manifest](e7-corpus-manifest.md) and [joint policy contract](joint-policy-contract.md).
- [Joint attribution](joint-attribution-and-reallocation.md) and [calibration methodology](calibration-methodology.md).
- [Candidate comparison](candidate-comparison.md), [validation results](e7-validation-results.md) and [release readiness](e7-release-readiness.md).
- [H2-E8 coverage and H3 seven-family model](h3-seven-family-model.md).

## Findings A–G

### A. H2 is reproducible, experimental and non-causal

The active policy is `P72B_D_P10_N5_K025_A015_H2`, with the fixed digest and
formula recorded in [baseline-and-next-steps.md](baseline-and-next-steps.md).
Existing exact worker snapshots cover empty, complex, excluded-participation
and unknown-scenario inputs. H2 remains explicitly uncalibrated and is not an
estimate of causal responsibility for winning or losing.

### B. M2 and H2 consume different evidence universes

M2 aggregates all normalized live events over all normalized rounds. H2 first
requires a clean round boundary and then rebuilds each player profile from
`countedRoundIds` classified `PRESENT_VERIFIED`. Therefore equal event logic
does not imply equal counts or denominators.

### C. Trade semantics are not unified

M2 uses sequential first-fit matching, parser row order for same-tick events,
and disables trades when tick rate is unknown. H2 maximizes link count, requires
strictly positive elapsed seconds, and currently evaluates an unknown tick rate
with a fallback of one tick per second. A single future factual trade primitive
should replace both interpretations; H2-E1 deliberately does not change them.

### D. `null`, `PARTIAL` and excluded are materially different

An absent parser value is not zero. M2 exposes global availability for damage,
flash, economy and alive context; H2 can withhold an entire profile when a
required HP ledger is incomplete; Radar can mark only one player/axis
`UNAVAILABLE`. These states cannot be collapsed into one Boolean.

### E. The same physical fact can enter several views

A kill may appear as M2 kill, opening, multikill, trade, KAST, an H2 COMBAT
anchor and one H2 context tag, and an EVP specialization input. Within H2 the
kernel selects one physical axis per anchor and one winning context modifier,
which limits but does not globally eliminate cross-model reuse.

### F. Traded deaths are not currently neutralized in H2

The victim's death is an `ownDeaths` episode in `DEATH_RELATED`; the revenge is
a positive event tagged `TRADE`. The two are not linked in the persisted H2
episode representation. A future rule that cancels the negative contribution
of the specific traded death must operate before family centering and nonlinear
negative-mass softening, not by adding fixed final rating points.

### G. Persisted development sample confirms coverage-driven differences

Read-only inspection of six saved canonical `match-result@1` artifacts found 60
players and 116 rounds: 1,089 verified and 71 excluded player-rounds. M2 exposed
126 trade kills while persisted H2 contained 117 TRADE-tagged episodes; all nine
count differences were explained by trade facts in H2-excluded rounds. Eight
players had differing counts. This is a convenience sample (three `de_dust2`,
three `cs_office`), not population validation.

## Backlog boundaries

1. Promote no E2–E5 mechanism until it has held-out calibration and a versioned
   production-policy decision.
2. Preserve the canonical E2 trade relation and unavailable unknown-tick-rate
   semantics if a shared factual primitive is introduced.
3. Decide duplicate-event policy at the normalized factual boundary. Research
   contracts currently reject duplicate IDs rather than inventing identity.
4. Add round-scoped availability where global M2 `PARTIAL` remains too coarse.
5. Test E5 as exact CONTEXT replacement/reallocation; do not add R1/R3 points
   on top of overlapping COMBAT and objective anchors.
6. Carry only E6-B's replacement semantics into E7; do not add E6-C or a
   seventh economy family on top of current COMBAT/context.
7. Treat active-weapon carryover as fact, not save intent or score. A transfer
   remains unavailable without stable drop/pickup identity.
8. Resolve the raw `balance` versus normalized `cash` alias only in a separate
   versioned parser/contract change.

## H2-E2 conclusion

The research contract uses min-cost maximum matching: maximum independent
links, then minimum total tick delay, then stable event-ID ordering. Unknown
tick rate is unavailable, and strict later-tick is the conservative default;
same-tick row order remains an explicit alternative. The experimental adapter
neutralizes only the confirmed victim's exact `ownDeaths` anchor and then calls
the unchanged scoring kernel/projector. It is test-only and has no production
caller.

## H2-E3 conclusion

Usage is new factual information for H2 and can be rewarded only after valid
round, owner, deduplication and participation checks. Confirmed damage, blind
and flash-assist effects overlap current COMBAT/SUPPORT. The naive additive
variant is therefore diagnostic only. The protected research variant removes
only a unique standalone H2 anchor before adding bounded explicit effect; it
refuses composite or unavailable attribution. Six saved matches support
offline comparison but are insufficient for coefficient or fairness claims.

## H2-E4 conclusion

The research timeline reuses the existing participation sidecar for verified
boundaries and start-alive observations, then folds normalized events once. It
preserves named alive-player sets, unknown members, stable teams, round-specific
sides and objective phase. Unique row indexes expose ordered same-tick states;
ambiguous order is atomic. Five raw demos (97 rounds) produced 89 complete,
three partial and five excluded timelines. Thirty persisted-player H2 values
and all counted-round sets remained exactly unchanged. E4 assigns no score;
its confirmed transitions are evidence candidates for H2-E5.

## H2-E5 conclusion

E5 closes the E4 confidence gap before scoring: numerical state alone no
longer attributes an action. Ten usable real demos produced 1,303 confirmed
candidates, one third in lost rounds, but every candidate overlapped an
existing H2 action or objective. Naive R1 and separate-family R3 were materially
larger than the overlap-aware R2 projection. The evidence does not justify a
seventh production family. Further work should test exact replacement inside
CONTEXT on held-out data; current H2, awards, API and worker remain unchanged.

## H2-E6 conclusion

Freeze equipment, inventory, raw balance and accumulated round spend are
observable in the installed parser, but purchases and donor-linked transfers
are not. Active-weapon identity confirms limited carryover, not tactical save
intent. Ten usable matches show that a stricter complete-team
LOW_EQUIP_COMBAT replacement is small and stable, whereas an additive
damage-per-cost bonus overlaps COMBAT and changes ranks more readily. E7 should
evaluate E6-B jointly with E2–E5; current H2, M2, EVP, awards, DTOs and pipeline
remain unchanged.

