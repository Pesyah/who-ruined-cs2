# H2-E2 canonical trade contract

Status: research-only, version `h2-e2-canonical-trade@1-research`. This is not
an active H2, M2 or public API contract.

## Accepted evidence

`buildCanonicalTradeLinks()` consumes normalized `MatchData`. A link is
confirmed only when both events are unique `PLAYER_DEATH` facts in the same
valid round and live phase, both stable roster teams are known and opposed,
the revenge killer belongs to the original victim's team, and the revenge
victim is the original killer. Suicide, friendly fire, unknown identity,
unknown team, inconsistent event context, non-live rows and every occurrence
of a duplicate event ID are rejected.

A positive finite tick rate is mandatory. The inclusive window is five
seconds. Unknown, zero or non-finite tick rate produces
`UNAVAILABLE/TICK_RATE_UNAVAILABLE`; the function neither substitutes one
tick/second nor invents elapsed seconds.

Every confirmed link contains:

- original and revenge death event IDs;
- round, victim, original killer and trader IDs;
- exact tick and second delay;
- strict-tick or row-order confirmation state;
- both source row indexes and both roster team IDs as evidence references.

## Chronology and same-tick policy

The default is `STRICT_LATER_TICK`: the revenge tick must be greater. The
separate `ROW_INDEX_ORDERED` research option accepts equal ticks only when the
revenge parser row is later and labels the result explicitly. Same-tick input
is therefore never silently promoted to a production fact.

The conservative recommendation is to retain strict ticks until parser row
ordering is itself characterized as a stable causal ordering guarantee. The
six saved results contained no additional row-ordered-only pair (see
[experiment results](e2-experiment-results.md)); this small sample cannot settle
the policy.

## Matching objective and one-to-one proof

Each round is represented as a bipartite graph: original-death roles on the
left and revenge-death roles on the right. A kill event may occur once on each
side, so it can finish one trade and start a later one, but it cannot be reused
twice in the same role.

Successive shortest augmenting paths implement min-cost maximum flow:

1. augment until no source-to-sink path remains, maximizing link count;
2. use `delayTicks` as edge cost, minimizing total delay at that cardinality;
3. build nodes and edges in event-ID order, making full ties stable.

Unit capacities on source/original, candidate and revenge/sink edges prove one
original and one revenge can each be selected at most once. A runtime integrity
check independently rejects duplicate IDs in either selected role. The bound
is polynomial `O(F*V*E)` per round; no subset enumeration or exponential memo
state is used for malformed large inputs.

## Relation versus H2 coverage

The result is a factual normalized relation. It deliberately does not erase a
relation because one consumer excludes that round. The H2-E2 adapter applies a
link to a player only when that player's status is eligible and the round is in
that player's `countedRoundIds`. Thus:

- an H2-excluded relation remains visible as factual research evidence;
- no excluded victim death is neutralized;
- no excluded trader event receives H2 context tags;
- M2's historical global event universe is not rewritten.

The canonical artifact retains enough normalized identity, team, phase, tick,
row and per-player coverage data to replay this contract. It does not retain
the complete raw parser boundary evidence, so this is normalized-fact
confirmation, not a new raw `.dem` verification.

## Historical compatibility

The [canonical trade evidence](../../../packages/scoring/src/h3/canonical-trades.ts)
is scoped to offline comparison. Active H2 keeps its frozen policy/digest and current
matching. M2 continues to expose its existing `TRADE_KILL` facts. A future
unified factual relation would require a versioned migration plan; historical
reports must continue to identify the semantics that created them.

