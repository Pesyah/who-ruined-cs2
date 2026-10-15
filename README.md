# Who Ruined CS2

Local-first CS2 demo analysis. Current implementation covers the M0 scaffold and an M1 upload → SQLite job → worker → conservative normalization → round/scoreboard UI slice.

> Status: **M0 real-demo probe pending; M1 golden reconciliation pending.** The repository contained no `.dem`. Synthetic fixtures test engineering invariants only and are never presented as real parser evidence.

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

The command calls `parseHeader`, `parsePlayerInfo`, `listGameEvents`, `parseEvents`, and event-adjacent `parseTicks`, then overwrites `docs/compatibility.md` with sanitized column names and counts. It never stores player values. See `tests/golden/README.md` for the reconciliation gate.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

M2 features, M3 scoring/reports and M4 robustness/E2E are deliberately outside the current verified gate. No public deployment is configured.
