# Agent Guidelines for ProofState JS

This is the pnpm/Turbo monorepo for the ProofState JavaScript and TypeScript SDKs. Read the closest package README before editing public behavior. Preserve the MIT LICENSE and upstream copyright history.

## Packages

- `@proofstate/core` owns the generated REST API types, shared utilities, and wire constants.
- `@proofstate/client` owns prompts, datasets, scores, media, and experiments.
- `@proofstate/tracing` creates spans; `@proofstate/otel` exports them.
- `@proofstate/browser` sends public-key scores.
- `@proofstate/openai`, `@proofstate/langchain`, and `@proofstate/vercel-ai-sdk` are integrations.

Keep universal packages free of Node built-ins. Keep internal dependencies on `workspace:^`. Regenerate the REST client from the ProofState API definition, then run `pnpm generated-docs:check`. Do not hand-edit built `dist` files, coverage, or TypeScript build info.

## Protocol boundary

The ProofState server must use the same wire protocol as this SDK. Preserve REST paths, ProofState JSON fields, `X-ProofState-*` headers, `proofstate.*` OpenTelemetry attributes, `@@@proofstateMedia` references, `proofstate_` baggage, and the `proofstate-sdk` instrumentation scope. Send `proofstate-javascript` as the SDK name and `4` as the OTel ingestion version. Use `PROOFSTATE_*` environment variables and `https://proofstate.ai` for public configuration. Coordinate server and SDK deployments when wire fields change.

## Commands

- Install: `pnpm install`
- Build: `pnpm build`
- Unit tests: `pnpm test:unit`
- Integration tests without a server: `pnpm test:integration`
- E2E against a ProofState server: `pnpm test:e2e` with `PROOFSTATE_BASE_URL`, `PROOFSTATE_PUBLIC_KEY`, and `PROOFSTATE_SECRET_KEY`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Format: `pnpm format:check`

Run targeted tests for code behavior changes and `pnpm build`, `pnpm lint`, and `pnpm typecheck` for cross-package changes. Keep `.env.example` in sync with required variables. Do not commit credentials.

## Publishing

Package names are `@proofstate/*`. All eight packages have a `0.1.0-rc.1` prerelease on npm under the `next` tag. Later releases use the reviewed `.github/workflows/publish.yml` workflow with npm trusted publishing scoped separately to each package. Before tagging, audit package contents, run CI and authenticated server compatibility checks, and confirm the matching server protocol. Use the `npm` protected GitHub environment and do not store npm tokens in this repository.
