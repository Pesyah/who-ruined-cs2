# Repository instructions

- `SPEC.md` supplied by the user is normative.
- Keep parser, normalized domain, features, scoring, reports, API and UI boundaries separate.
- Never infer a stable team from `T`/`CT`; team IDs are roster-based.
- Missing parser values stay unavailable/null. Never invent parser output or claim real-demo validation from synthetic fixtures.
- Ordinary deaths are facts, not tactical blame.
- Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` at each milestone gate.
