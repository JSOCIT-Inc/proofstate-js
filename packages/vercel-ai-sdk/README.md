# @proofstate/vercel-ai-sdk

Telemetry integration for Vercel AI SDK v7. Register `ProofStateSpanProcessor` from `@proofstate/otel` to export its spans.

```ts
import { registerTelemetry } from "ai";
import { ProofStateVercelAiSdkIntegration } from "@proofstate/vercel-ai-sdk";
registerTelemetry(new ProofStateVercelAiSdkIntegration());
```

Use the `proofstatePrompt` runtime context key for prompt linking and include it in the AI SDK telemetry context keys. See the [root README](https://github.com/JSOCIT-Inc/proofstate-js#readme) for setup and publishing details.
