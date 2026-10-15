# Milestone status

## 2026-10-15 — M0 / M1 scaffold

### M0 — pending real-demo gate

Implemented: pnpm/Turbo monorepo, pinned `@laihoe/demoparser2@0.42.0`, parser adapter, Zod IO boundary, executable sanitized capability probe and synthetic adapter tests.

Pending: no real `.dem` was present, so the five parser calls and event/field matrix have not been verified on replay data. `docs/compatibility.md` is explicitly marked pending.

### M1 — implemented slice, pending golden reconciliation

Implemented: `.dem` upload preflight, randomized storage path, SHA-256 dedup key, Prisma/SQLite metadata, job polling, sequential worker, conservative normalization, roster-derived team IDs, round/score validation, atomic gzip artifact, Russian upload/job/match UI, localhost Docker Compose definition.

Pending: the match scoreboard and per-round winners have not been reconciled with a real golden demo. Therefore M1 is not declared complete and no ranking is exposed.

### Verification

- `pnpm lint`: pass (8/8 tasks)
- `pnpm typecheck`: pass (13/13 tasks including dependency builds)
- `pnpm test`: pass (15 substantive tests across parser adapter, domain, API and worker; packages with no tests use `--passWithNoTests`)
- `pnpm build`: pass (8/8 tasks; Vite production bundle built)
- Local smoke: SQLite schema created; API `/api/v1/health` returned 200; empty match list returned 200; wrong upload extension returned typed 415; Vite preview returned 200.
- `docker compose config`: pass; host ports are loopback-only.
- `docker compose up --build`: not run because the Docker daemon was not available on the machine.

Parser discrepancy: the Windows native binding panicked when directly given a 10-byte malformed file. A minimum-length + `PBDEMS2` magic preflight now rejects that input before `parseHeader`; details are in `docs/compatibility.md`.
