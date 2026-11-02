# Isolated local Docker runbook

**Status:** current Compose operations. For installation, native hot reload, environment variables and checks, use [development](development.md).

## Start

From the intended worktree:

~~~powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-up.ps1
~~~

Optional parameters:

~~~powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-up.ps1 -ApiPort 3010 -RatingPolicy H1
~~~

The script combines `docker-compose.yml` and `docker-compose.local-dev.yml` under the fixed project `wrc-local-dev`. Before starting it verifies:

- API and worker mount exactly `<worktree>\_local-dev\data` at `/data`;
- that path is not the owner `data` directory;
- API and web published ports are loopback-only;
- the effective configuration is saved at `_local-dev\compose.resolved.yml`.

The local overlay enables participation rating, runs `prisma migrate deploy` in the API container and gives the worker separate resource limits.

## URLs

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:<ApiPort>/api/v1`
- Health: `http://127.0.0.1:<ApiPort>/api/v1/health`
- Swagger: `http://127.0.0.1:<ApiPort>/api/docs`

The container web build proxies `/api` to the Compose API service.

## Inspect

~~~powershell
docker compose -p wrc-local-dev -f .\docker-compose.yml -f .\docker-compose.local-dev.yml ps
docker compose -p wrc-local-dev -f .\docker-compose.yml -f .\docker-compose.local-dev.yml logs api worker web
~~~

Use job/public error codes and request IDs rather than private container paths when reporting a problem.

## Stop

~~~powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-down.ps1
~~~

This stops containers and preserves `_local-dev\data`. It does not remove volumes, images or owner data.

## Isolation rules

- Do not start this fixed Compose profile from two worktrees at once.
- Do not edit the resolved mount to point at another worktree or `data`.
- For simultaneous refactor/stable instances, use the [native isolated setup](development.md#native-development-with-an-isolated-database) with distinct database/data paths and ports.
- Do not run owner policy rebuild, migration, cleanup or demo processing against a data root you did not explicitly select.

## Smoke checklist

After an authorized local start:

1. health returns successfully;
2. the web shell loads at 5173;
3. an already processed isolated match opens without reading a demo;
4. rating/explanation either returns the real DTO or a typed unavailable state;
5. replay availability is independent of the match report;
6. stop the profile and confirm `_local-dev\data` remains.

Uploading a real demo is a separate, explicit test authorization. A synthetic preview is not an integration smoke.
