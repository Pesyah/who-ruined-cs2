# Milestone status

## 2026-10-16 — M0 complete, M1 complete

### M0 — capability proof: passed

`pnpm parser:probe` ran against the supplied real CS2 demo with
`@laihoe/demoparser2@0.42.0`. All five required calls succeeded:
`parseHeader`, `parsePlayerInfo`, `listGameEvents`, `parseEvents` and
event-adjacent `parseTicks`. The sanitized event/field matrix is recorded in
`docs/compatibility.md`; it contains no player values.

### M1 — vertical slice: passed for the supplied golden demo

The real demo completed upload → randomized local storage → queued worker →
parsing → normalization → validation → SQLite metadata → atomic gzip JSON
artifact → API → browser-rendered scoreboard.

Verified facts:

- Source 2 demo on `cs_office`; two stable roster-derived teams of five players.
- 21 valid live rounds, no validation issues, final score 13:8 and a confirmed
  halftime side swap.
- 152 death events assigned to live rounds.
- Every score transition and all ten K/D/A rows match the supplied external
  `.dem.info` scoreboard.
- Re-upload returns HTTP 202 with `duplicate: true` for the same parser and
  normalizer versions.
- API result and the real-match UI both show `VALID`, 10 players, 21 rounds and
  the 13:8 final score. No ranking or scoring algorithm is exposed.

### Reconciled parser quirks

- `round_officially_ended` is duplicated at each of the first 20 round-end
  ticks and absent for the final round. Unique ticks are used; the final
  boundary is confirmed by `cs_win_panel_match`.
- At halftime, the round-end tick already exposes the next-half sides. A full
  two-team swap is accepted only at the boundary; partial or inconsistent
  mappings remain invalid.
- Two raw death rows named an assister from the victim's stable team. These are
  excluded from credited assists, bringing every K/D/A row into agreement with
  `.dem.info`.
- Upload POST is explicitly HTTP 202, including deduplicated uploads.

### Verification

- `pnpm lint`: pass, 8/8 workspace tasks.
- `pnpm typecheck`: pass, 13/13 tasks including dependency builds. An earlier
  attempt hit `EPERM` because the smoke-test API/worker held the generated
  Prisma engine; after stopping those processes, the clean rerun passed.
- `pnpm test`: pass, 17 synthetic/contract tests plus 1 executed real golden
  reconciliation. The real test was not skipped.
- `pnpm build`: pass, 8/8 workspace tasks including the Vite production bundle.
- `docker compose config --quiet`: pass. `docker compose up --build` remains
  unexecuted because no Docker daemon is running on this machine.

The real golden regression is available as `pnpm test:golden` and is skipped
unless external `GOLDEN_DEMO_PATH` and `GOLDEN_INFO_PATH` values are supplied.

The repository-wide acceptance target remains one of three real fixtures. Two
additional demos are still required before the global three-demo parser gate:
an overtime/expected-`PARTIAL` case and a fixture covering capabilities such as
team damage, bomb, flash and trade attribution. This does not block the M0/M1
milestone gates, each of which requires one real/golden demo.

M2–M4 and public hosting have not started.
