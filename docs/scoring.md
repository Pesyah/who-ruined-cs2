# Scoring, participation rating and explanation

**Status:** canonical scoring reference. M3/M4 stage reports are historical evidence; persisted schema versions, policy IDs/digests and arithmetic remain compatibility contracts.

## Keep facts and evaluation separate

`@who-ruined/features` emits factual, availability-aware analytics. `@who-ruined/scoring` consumes those facts and prepared participation evidence. Neither the parser adapter nor the frontend may produce a rating.

Ordinary deaths, low ratings and negative family values are not automatically tactical errors. Missing evidence remains unavailable and can withhold a rating.

## Active H2/H1 participation rating

H2 is the default primary owner policy. H1 is the permanent fallback. They share one kernel and projection path; only the direct-harm multiplier differs.

For the five non-harm family inputs \(v_i\) and the already softened direct-harm input \(H\):

~~~text
P = sum(max(v_i, 0))
N = sum(max(-v_i, 0))
g(z) = z                                      when z <= 0.25
     = 0.25 + 0.15 * log1p((z - 0.25) / 0.15) otherwise

rating = 1 + 10P - g(5N) + hH
h = 2 for H2
h = 1 for H1
~~~

The five negative non-harm attributions split \(-g(5N)\) proportionally to their negative mass. Positive inputs use a linear factor of 10. Direct harm uses \(hH\).

The invariant is:

~~~text
1 + sum(six finalAttribution values) == rating.value
tolerance = 1e-12
~~~

The active DTO records the reconstructed value and requires `exactWithinTolerance: true`.

## Six families

| Family | Meaning | Important caveat |
| --- | --- | --- |
| COMBAT | confirmed combat outcomes and model combat axes | an aggregate contribution can include baseline/residual terms |
| SUPPORT | confirmed assists/support evidence | only evidence represented by the stored prepared input is used |
| DEATH_RELATED | recorded death-related model axes | a death is a fact, not automatically blame |
| DIRECT_HARM | confirmed friendly harm after the kernel softening | H2/H1 multiplier is applied here only |
| CONTEXT | centered/saturated contextual factors | a negative value can come from centering, not a bad action |
| OBJECTIVES | typed bomb/hostage objective factors | positive/negative caps can make it aggregate rather than event-local |

T/CT exposure is coverage context. Player `teamId` remains roster-based across side changes.

## Production call path

New canonical results use one arithmetic path:

~~~text
buildCanonicalMatchResult
  -> buildActiveParticipationRating
  -> projectParticipationRatings
  -> scoreParticipationPreparedProfiles
  -> scoreParticipationPreparedProfile
~~~

The active API reads the stored active DTO. Its compatibility builder `buildParticipationRatingReport` delegates to `buildActiveParticipationRating` after validating the same sidecar.

The explanation reprojects the private seed through `projectP72ParticipationRatings`; that name is a compatibility alias of `projectParticipationRatings`, not a second implementation. It verifies raw inputs, final attributions and the reconstruction against the stored active rating before returning a DTO.

An older worker-only `scoreParticipationSidecar` helper still contains historical report arithmetic and is used by a compatibility test, not the canonical parse/API path. It is listed for P6 migration/removal review in [compatibility adapters](compatibility-adapters.md); its persisted IDs must remain unchanged.

## Availability and awards

Each player has an availability status and explicit coverage:

- verified, absent-full, partial, unknown and globally excluded rounds;
- counted/excluded opportunities;
- T/CT exposure;
- stable cause codes.

A rating can be `null` for insufficient/unknown participation or applicability. Other players can remain calculated, so award pools can be incomplete.

MVP is the highest calculated eligible value. Who Ruined is the lowest calculated eligible value on the losing roster; in a draw its scope is all eligible players. Missing match outcome makes Who Ruined unavailable. Exact ties are retained in `tiedPlayerIds` and resolved deterministically by stable profile key for ordering.

The frontend must not replace a missing active rating with a legacy M3 score.

## Explanation contract

`buildParticipationExplanation` reads only `match-result@1`; GET does not reopen a demo. For each calculated family it returns:

- the exact raw input;
- the exact final attribution;
- typed sources: `EVENT`, `AGGREGATE` or `BASELINE`;
- round and event IDs only when an anchor can be resolved;
- typed transformations such as context centering/saturation, objective caps, negative-mass softening, positive scale and direct-harm multiplier.

Unrecognized anchors do not receive invented event IDs. Residual arithmetic becomes an explicit baseline/aggregate source. Cross-family nonlinear negative-mass softening stays identified as cross-family; it is not falsely distributed as causal event evidence.

The public explanation omits recompute seed, policy digests and complete prepared profiles.

## Important moments

The same explanation response carries a short deterministic selection derived from normalized events and verified M2 facts:

- 2/3/4/5 enemy kills in one round become one multikill card;
- a confirmed trade within the verified five-second one-to-one revenge rule becomes a trade;
- a confirmed trade at or below one second becomes a fast trade when tick rate is known;
- a trade inside a multikill is included in that multikill rather than duplicated;
- ordinary single kills, damage hits, friendly-damage technical events and old arbitrary mistake episodes are excluded;
- at most eight moments are returned per player, sorted by significance then deterministic round/tick/ID order.

When no qualifying moment exists, the DTO contains an empty list.

## Legacy M3 reports

The canonical result still embeds compatible `m3-score-1` reports for existing consumers and RESCORE. They are deterministic rule-based reports from explicit configuration hashes. They are not substituted for the active participation rating.

`POST /rescore` recomputes a requested compatible legacy report from stored normalized data. H2/H1 active-policy rebuild is a separate owner CLI operation that uses the canonical recompute seed.

## Compatibility identities

The following historical names remain public aliases in `@who-ruined/scoring`:

- `P72_*`, `projectP72ParticipationRatings`, `selectP72Awards`;
- `C2S2_*`, `scoreC2S2PreparedProfile(s)`;
- matching historical TypeScript types.

New implementation code should prefer `PARTICIPATION_*`, `projectParticipationRatings` and `scoreParticipationPreparedProfile(s)`. Do not rename serialized versions, policy IDs, digests, hashing inputs or the order of arithmetic.

## Evidence boundary

The model is experimental, uncalibrated and non-causal. It has deterministic and compatibility tests, but no human evaluation proving that it identifies the cause of a loss. The required public-quality evaluation gate remains in [eval](eval.md) and `SPEC.md`.
