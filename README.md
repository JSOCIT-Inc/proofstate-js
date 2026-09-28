# ProofState JavaScript and TypeScript SDK

Eight modular packages for traces, prompts, datasets, scores, and framework integrations with [ProofState](https://proofstate.ai). The required MIT copyright and license notices are in [LICENSE](LICENSE).

This repository contains the `0.1.0-rc.1` source prerelease. The packages are not yet published to npm or verified against the live ProofState deployment. Use them with a matching server revision after authenticated end-to-end checks.

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

## Releasing a prerelease

1. An authorized maintainer must own the npm `@proofstate` organization or scope. GitHub organization membership does not grant npm publication rights. Check `npm whoami` and the npm scope owner before publishing.
2. Deploy the matching ProofState server revision to a test environment and run authenticated `pnpm test:e2e` with test-project keys. Verify a trace, prompt, dataset, and score in ProofState before releasing packages.
3. Run `pnpm install --frozen-lockfile` and `pnpm run ci`. Then run `pnpm release:pack` to build eight tarballs under `release-artifacts/`. The pack script checks lockstep prerelease versions, the package dependency order, public package metadata, bundled license, entrypoints, and converted `workspace:^` ranges. Review the tarballs before the first publication.
4. The first publication needs an interactive npm login because npm trusted publishing can only be configured for a package that already exists. Publish the `release-artifacts/*.tgz` files with `npm publish <tarball> --access public --tag next` in the order printed by the pack script. Use an npm account with two-factor authentication and write access to `@proofstate`; never commit a token. Do not use the default `latest` tag for this prerelease.
5. After all eight packages exist, configure a GitHub Actions trusted publisher **for each package** on npm. Use repository `JSOCIT-Inc/proofstate-js`, workflow filename `publish.yml`, no environment name, and permit direct `npm publish`. The [release workflow](.github/workflows/publish.yml) uses OIDC without npm tokens; npm generates provenance for public packages published from this public repository.
6. For later prereleases, update the root and eight package versions together, verify the matching server and SDK, create and push a `js-v<version>` tag on the reviewed commit, then manually run the `Publish npm prerelease` workflow on that tag. Enter the selected tag exactly in `confirm_tag`. The workflow packs and publishes packages in dependency order under the `next` tag.

Cloning, building, and packing this repository do not publish packages to npm. The release workflow cannot publish until the npm scope and trusted publishers are configured.
