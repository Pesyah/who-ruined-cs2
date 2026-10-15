# Parser compatibility

> Этот файл будет перезаписан командой `pnpm parser:probe -- path/to/demo.dem`. В него попадают только названия колонок и количества строк, без имён и SteamID.

- Probe status: **PENDING — real `.dem` is not present**
- Pinned parser: `@laihoe/demoparser2@0.42.0`
- Development host: Node.js `22.17.0`, Windows x64
- Docker target: Node.js `22.17.0`, Debian bookworm linux/amd64
- `parseHeader`: not probed against a real demo
- `parsePlayerInfo`: not probed against a real demo
- `listGameEvents`: not probed against a real demo
- `parseEvents`: not probed against a real demo
- event-adjacent `parseTicks`: not probed against a real demo

Observed discrepancy on the development host: calling `parseHeader` on a 10-byte malformed file caused a native Rust bounds panic (`range end index 16 out of range`). Upload ingestion therefore checks minimum length and the `PBDEMS2` magic before invoking the native parser. This observation is not a real-demo capability result.

Никакие event/field capabilities не считаются подтверждёнными до запуска команды на легально полученном реальном CS2 demo. До этого нормализатор обязан выдавать `PARTIAL`, если необходимые поля отсутствуют или расходятся.
