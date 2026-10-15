# Golden demos

Real demos and their `.info` sidecars stay outside Git. The test contains no player names,
Steam IDs or fixture paths and is skipped unless both paths are explicitly supplied.

```powershell
$env:GOLDEN_DEMO_PATH = 'C:\external\match.dem'
$env:GOLDEN_INFO_PATH = 'C:\external\match.dem.info'
pnpm test:golden
```

The committed manifest contains only the demo SHA-256 and anonymous expected
counts/score/KDA tuples. The test reconciles all ten K/D/A rows and every round
score transition against both that manifest and the protobuf `.info` sidecar.
It also requires a validated 10-player, two-team normalized match. This is an
independent reference for the available scoreboard data, not proof of tactical
blame or events absent from the sidecar.

The supplied regular MR12 fixture has passed. Two additional real fixtures remain
required for the repository-wide parser acceptance set: overtime (or an expected
`PARTIAL`) and a match exercising team damage/trades/bomb/flash capabilities.
