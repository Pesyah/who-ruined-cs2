# Who Ruined CS2

Local-first CS2 demo analysis. Current implementation covers the M0 scaffold and an M1 upload → SQLite job → worker → conservative normalization → round/scoreboard UI slice.

> Status: **M0 and M1 passed on three external real golden demos:** Office,
> Dust2 and Train. The `.dem`/`.dem.info` files remain outside Git. The required
> three-demo count is met; overtime and team-kill positive-case gates remain
> open. M2–M4 have not started.

## Start with Docker

Requirements: Docker Desktop with Compose.

```bash
docker compose up --build
```

- UI: <http://localhost:5173>
- API health: <http://localhost:3000/api/v1/health>
- OpenAPI: <http://localhost:3000/api/docs>

Both published ports bind to host loopback. Uploaded demos and SQLite data remain under `./data` and are ignored by Git.

## Local development

Node.js 22.17+ and pnpm 11.25 are pinned for this milestone.

```bash
pnpm install
copy .env.example .env
pnpm db:generate
pnpm db:push
pnpm dev
```

On PowerShell set `DATABASE_URL=file:../data/app.db` if your environment does not load `.env` automatically (Prisma resolves it relative to `prisma/schema.prisma`).

## Mandatory real-demo probe

```bash
pnpm parser:probe -- C:\path\to\match.dem
```

The command calls `parseHeader`, `parsePlayerInfo`, `listGameEvents`,
`parseEvents`, and event-adjacent `parseTicks`, then writes a sanitized probe
report. It never stores player values. The committed cross-fixture report in
`docs/compatibility.md` also records the manual three-demo reconciliation. See
`tests/golden/README.md` for the path variables and skip behavior.

With an external `.dem.info` sidecar, run the real reconciliation without
copying either file into the repository:

```powershell
$env:GOLDEN_OFFICE_DEMO_PATH = 'C:\external\office.dem'
$env:GOLDEN_OFFICE_INFO_PATH = 'C:\external\office.dem.info'
$env:GOLDEN_DUST2_DEMO_PATH = 'C:\external\dust2.dem'
$env:GOLDEN_DUST2_INFO_PATH = 'C:\external\dust2.dem.info'
$env:GOLDEN_TRAIN_DEMO_PATH = 'C:\external\train.dem'
$env:GOLDEN_TRAIN_INFO_PATH = 'C:\external\train.dem.info'
pnpm test:golden
```

The M1 scoreboard displays the parsed nickname and keeps a separate Steam
profile link for every validated SteamID64. SteamID64 is always handled as a
string.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

M2 features, M3 scoring/reports and M4 robustness/E2E are deliberately outside the current verified gate. No public deployment is configured.
