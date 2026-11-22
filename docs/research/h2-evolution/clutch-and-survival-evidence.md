# H2-E4 clutch and survival evidence

## Clutch opportunity

A factual opportunity starts only after a confirmed state has exactly one
named alive player on one stable team and at least two named alive opponents.
The record keeps the creating transition, opponent count and the lone player's
subsequent normalized actions.

Outcome rules:

- `CLUTCH_WON`: the player's team is the confirmed winner and that player is
  confirmed alive at the terminal state;
- `CLUTCH_LOST`: the opponent won or the player is confirmed dead;
- `CLUTCH_OUTCOME_UNAVAILABLE`: winner or survival is unknown.

A later team win alone is insufficient. A partial alive state cannot create a
confirmed clutch opportunity. Sequential 1vX changes retain the first
opportunity and all subsequent actions rather than creating duplicate awards.

## Survival

Per-player terminal facts distinguish:

- confirmed alive;
- confirmed dead;
- unknown;
- win, loss or unknown round result;
- postplant participation;
- confirmed clutch context.

Survival is not a positive contribution by itself. The current evidence cannot
distinguish a valuable save, positional hold and non-participation. Weapon save
therefore remains unavailable until a trustworthy cross-round inventory model
exists.

## Useful actions in lost rounds

E4 retains confirmed enemy kills by the eventual losing team when the action:

- reduces a numerical deficit;
- restores equality; or
- creates an advantage.

For example, the synthetic 1v3 loss records the two kills that move 1v3 to 1v2
and then 1v1, followed by the player's confirmed death. The round loss does not
erase those transitions, but E4 assigns no numeric value to them.

Across the five real development demos, 222 such transition facts appeared in
93 rounds. This is a count from a convenience sample, not evidence that every
transition deserves a rating bonus.

## Known limits

- Position, visibility, tactical intent and weapon preservation are absent.
- Same-tick atomic transitions cannot attribute intermediate advantage.
- Disconnect/reconnect ambiguity inherited from participation coverage remains
  partial.
- A hostage rescue is factual, but this sample is too small to define a
  hostage-specific clutch policy.
- E5 must demonstrate incremental information over existing COMBAT, trade,
  objective and survival signals before adding any score.

