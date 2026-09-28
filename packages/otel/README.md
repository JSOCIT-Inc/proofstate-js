# @proofstate/otel

`ProofStateSpanProcessor` exports OpenTelemetry spans to ProofState. It reads `PROOFSTATE_PUBLIC_KEY`, `PROOFSTATE_SECRET_KEY`, and optional `PROOFSTATE_BASE_URL` (default `https://proofstate.ai`).

```ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ProofStateSpanProcessor } from "@proofstate/otel";
const sdk = new NodeSDK({ spanProcessors: [new ProofStateSpanProcessor()] });
sdk.start();
```

The processor keeps the server's required OpenTelemetry wire names. See the [root README](../../README.md) for setup and publishing details.
