# ProofState JavaScript and TypeScript SDK

Eight modular packages for traces, prompts, datasets, scores, and framework integrations with [ProofState](https://proofstate.ai). The required MIT copyright and license notices are in [LICENSE](LICENSE).

All eight `0.1.0-rc.2` packages are published on npm under the `next` dist-tag. Authenticated checks against `https://proofstate.ai` on 2026-09-28 covered tracing, v2 observation readback, and prompt creation, retrieval, and compilation. Use a test project when adopting a prerelease.

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

Install the packages your application needs from npm, for example:

```bash
npm install @proofstate/client@next @proofstate/tracing@next @proofstate/otel@next
```

## First trace and prompt

Create project keys in ProofState and set these server-side environment variables:

```bash
PROOFSTATE_PUBLIC_KEY="pk-ps-..."
PROOFSTATE_SECRET_KEY="sk-ps-..."
PROOFSTATE_BASE_URL="https://proofstate.ai" # optional; this is the default
```

Install `@proofstate/tracing`, `@proofstate/otel`, `@proofstate/client`, and `@opentelemetry/sdk-node`:

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

The SDK sends `X-ProofState-*` headers, `proofstate.*` span attributes, the `proofstate-sdk` instrumentation scope, `proofstate_` baggage, and `@@@proofstateMedia` references. Its SDK name is `proofstate-javascript` and OTel export sets `x-proofstate-ingestion-version: 4`. The matching server protocol is deployed at `https://proofstate.ai`. The bundled REST client mirrors the available API definition; verify other methods against the target deployment before relying on them.

## Releasing a prerelease

1. Use an npm account with write access to the `@proofstate` scope and two-factor authentication. GitHub organization membership alone does not grant npm publication rights.
2. Verify the matching server and SDK with authenticated test-project checks. Run `pnpm install --frozen-lockfile`, `pnpm run ci`, and `pnpm release:pack`. Review the eight tarballs under `release-artifacts/` before publication.
3. Ensure **each of the eight packages** has a GitHub Actions trusted publisher configured on npm for repository `JSOCIT-Inc/proofstate-js`, workflow `publish.yml`, and environment `npm`, with direct publish permission. The [release workflow](.github/workflows/publish.yml) uses OIDC without a stored npm token and publishes public packages with provenance.
4. Update the root and eight package versions together, create and push a `js-v<version>` tag on the reviewed commit, then manually run the `Publish npm prerelease` workflow on that tag. Enter the tag exactly in `confirm_tag`; the workflow publishes in dependency order under `next`.

The first `0.1.0-rc.1` packages were published manually because trusted publishers require packages to exist first. The `0.1.0-rc.2` packages were published by the protected GitHub OIDC workflow. Building or packing this repository does not publish packages.
