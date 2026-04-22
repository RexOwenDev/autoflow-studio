# 0006 — Biome replaces ESLint + Prettier

**Status:** Accepted — 2026-04-22
**Context:** Phase 1 (foundation)

## Context

Every JavaScript/TypeScript repo with CI needs a linter and a formatter. The historical default is ESLint + Prettier, configured via:

- `.eslintrc.{js,cjs,json}` + `eslint.config.{js,mjs}` (flat config transition)
- `.prettierrc.{js,json}`
- `.eslintignore` + `.prettierignore`
- An IDE extension per tool
- `lint-staged` config to bridge them

Maintenance is real:

- ESLint 8 → 9 migration was painful (flat config).
- Plugin compatibility shifts every major version.
- Prettier and ESLint can fight over the same code (hence `eslint-config-prettier`).
- Monorepos compound the pain.

## Decision

Use **Biome v2** (currently 2.4.12). It's a single tool for formatting + linting, written in Rust, with one `biome.json` config. We get:

- `biome check` — lint + format in one command
- `biome check --write` — auto-fix
- `biome ci` — non-mutating CI check
- `biome format` — format-only
- Per-file / per-directory overrides via the `overrides` field

Config lives at repo root: `biome.json`. TypeScript strict rules (`noUnusedVariables`, `noUnusedImports`, `useExhaustiveDependencies`, `noExplicitAny`, `noConsole`, `noNonNullAssertion`, `useTemplate`, `useConst`) are all enforced. Tests and scripts get an `overrides` block that relaxes `noNonNullAssertion`, `useLiteralKeys`, and `noUnusedVariables` so test code can use idiomatic patterns without noise.

## Alternatives considered

- **ESLint 9 + Prettier.** Known-good, larger ecosystem, slower. Two tools, two configs, a bridging plugin, and CI that runs two commands.
- **Deno's built-in linter/formatter.** Rules out the Node ecosystem.
- **Oxc.** Earlier-stage than Biome; performance is compelling but feature coverage and ecosystem maturity lag.

## Consequences

- **Positive:** Single config, single tool. Faster CI (Biome lint + format combined is ~100ms for this repo).
- **Positive:** `biome migrate` handled the schema version bump painlessly during Phase 1.
- **Positive:** Pre-commit hook runs one command, not two.
- **Trade-off:** Biome's rule coverage, while broad, is narrower than ESLint's full plugin ecosystem. For the subset of rules we actually care about, parity is fine. Anything Biome doesn't yet cover (e.g., `eslint-plugin-security` patterns) we add via TypeScript types or Codex adversarial review.
- **Trade-off:** The Tailwind v4 `@theme` at-rule isn't parsed cleanly — we exclude `globals.css` from Biome. Documented in `biome.json`.

## Related

- `biome.json` — config with `overrides` for tests/scripts
- `.husky/pre-commit` — runs `gitleaks protect` + `lint-staged` (which calls Biome)
- `.github/workflows/ci.yml` — `biome ci` step
