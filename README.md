# ProofState JavaScript and TypeScript SDK

Eight modular packages for traces, prompts, datasets, scores, and framework integrations with [ProofState](https://proofstate.ai). This fork is based on an MIT-licensed upstream SDK at version 5.11.1. The original copyright and license remain in [LICENSE](LICENSE).

This repository contains source prereleases. The packages are not yet published to npm or verified against the live ProofState deployment. Use them with a matching server revision after authenticated end-to-end checks.

## Packages

| Package                     | Purpose                                                      |
| --------------------------- | ------------------------------------------------------------ |
| `@proofstate/core`          | Shared API types, protocol utilities, and direct REST client |
| `@proofstate/client`        | Prompts, datasets, experiments, scores, media, and REST API  |
| `@proofstate/tracing`       | OpenTelemetry tracing functions                              |
| `@proofstate/otel`          | Span processor and exporter                                  |
| `@proofstate/browser`       | Public-key browser score ingestion                           |
| `@proofstate/openai`        | OpenAI client tracing wrapper                                |
| `@proofstate/langchain`     | LangChain and LangGraph callback handler                     |
| `@proofstate/vercel-ai-sdk` | Vercel AI SDK v7 telemetry integration                       |

## Local setup

Requires Node.js 20.19+ and pnpm 10.33.0. From this clone:

```bash
pnpm install
pnpm build
pnpm test:unit
pnpm test:integration
```

Use `pnpm run ci` for the full build, local tests, lint, type, generated-doc, and format checks.

The packages have not been published under `@proofstate` yet. Install them from the registry only after the publishing steps below are complete.

## First trace and prompt

Create project keys in ProofState and set these server-side environment variables:

```bash
PROOFSTATE_PUBLIC_KEY="pk-ps-..."
PROOFSTATE_SECRET_KEY="sk-ps-..."
PROOFSTATE_BASE_URL="https://proofstate.ai" # optional; this is the default
```

Once the packages are available to your app, install `@proofstate/tracing`, `@proofstate/otel`, `@proofstate/client`, and `@opentelemetry/sdk-node`:

```ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ProofStateSpanProcessor } from "@proofstate/otel";
import { startActiveObservation } from "@proofstate/tracing";
import { ProofStateClient } from "@proofstate/client";

const sdk = new NodeSDK({ spanProcessors: [new ProofStateSpanProcessor()] });
sdk.start();

await startActiveObservation("first-request", async (span) => {
  span.update({ input: { question: "Hello" }, output: { answer: "Hi" } });
});

const client = new ProofStateClient();
const prompt = await client.prompt.get("greeting"); // create this prompt in ProofState first
console.log(prompt.compile({ name: "Ada" }));

await sdk.shutdown();
```

Use `ProofStateBrowserClient` with a public key for browser scores. Never put the secret key in browser code.

## Protocol compatibility

The SDK sends `X-ProofState-*` headers, `proofstate.*` span attributes, the `proofstate-sdk` instrumentation scope, `proofstate_` baggage, and `@@@proofstateMedia` references. Its SDK name is `proofstate-javascript` and OTel export sets `x-proofstate-ingestion-version: 4`. These wire names require the matching ProofState server update to be deployed at the same time. The bundled REST client mirrors the available API definition; individual methods still require authenticated testing against the target deployment.

## Publishing prerequisites

1. Claim and control the npm `@proofstate` scope. The source repository is [JSOCIT-Inc/proofstate-js](https://github.com/JSOCIT-Inc/proofstate-js); configure its release ownership and credentials.
2. Review the package versions and release process. All eight packages use lockstep versions and workspace dependencies; publish `core` first, then dependent packages in topological order. `pnpm` converts `workspace:^` references when publishing.
3. Run `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm test:unit`, `pnpm test:integration`, `pnpm lint`, `pnpm typecheck`, `pnpm generated-docs:check`, `pnpm format:check`, and inspect `pnpm pack` contents for each package. Run authenticated E2E tests against a ProofState test project.
4. Configure scoped npm credentials and provenance in the new repository, then create a ProofState release workflow. The upstream publish workflow and release scripts were removed from this fork.

Cloning or building this repository does not publish packages to npm.
