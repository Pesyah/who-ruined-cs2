# Repository instructions

- `SPEC.md` supplied by the user is normative.
- Keep parser, normalized domain, features, scoring, reports, API and UI boundaries separate.
- Never infer a stable team from `T`/`CT`; team IDs are roster-based.
- Missing parser values stay unavailable/null. Never invent parser output or claim real-demo validation from synthetic fixtures.
- Ordinary deaths are facts, not tactical blame.
- Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` at each milestone gate.

## Responsibility split

- Backend/M2 work owns parser capability mapping, normalized domain events,
  deterministic feature computation, persistence artifacts, API contracts,
  OpenAPI annotations, backend tests and factual documentation.
- Frontend work owns React components, visual design, CSS and interaction
  details. Backend changes must provide versioned DTOs and anonymized fixtures
  so frontend work does not depend on private demos.
- Do not mix M3 scoring, ranking or blame labels into M2 feature code. M2 emits
  factual, availability-aware analytics only.
