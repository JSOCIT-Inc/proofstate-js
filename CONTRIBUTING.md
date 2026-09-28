# Contributing to ProofState JS

This monorepo contains the eight `@proofstate/*` JavaScript and TypeScript packages. Start with the [root README](README.md) for package roles, local setup, and protocol compatibility.

## Development

```bash
pnpm install
pnpm build
pnpm test:unit
pnpm test:integration
pnpm lint
pnpm typecheck
pnpm format:check
```

End-to-end tests need a reachable ProofState instance and project keys provided through `PROOFSTATE_BASE_URL`, `PROOFSTATE_PUBLIC_KEY`, and `PROOFSTATE_SECRET_KEY`. Do not use production keys for tests. The `.env.example` file lists configuration variables.

Regenerate `packages/core/src/api` from the ProofState API definition. After regeneration, run `pnpm generated-docs:check`; CI checks the result. Preserve the wire protocol names described in [AGENTS.md](AGENTS.md). Include focused tests when behavior changes.

Publishing is not automated in this clone. The [root README](README.md#publishing-prerequisites) lists the steps required before an `@proofstate/*` release.
