# Golden demos

No real demo is currently available. This directory intentionally contains no invented replay.

To continue M0/M1:

1. Place a legally obtained CS2 `.dem` outside Git (this directory is ignored for `*.dem`).
2. Run `pnpm parser:probe -- tests/golden/<file>.dem`.
3. Review the generated `docs/compatibility.md`; do not commit player-identifying values.
4. Add the SHA-256 and manually verified round/score/player counts to a manifest.
5. Reconcile all ten scoreboards and per-round winners before marking M1 complete.

At least three real demos are required before the overall golden parser gate passes: regular MR12 with side switch, overtime or expected `PARTIAL`, and a match exercising team damage/trades/bomb/flash capabilities.
