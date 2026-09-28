# @proofstate/tracing

OpenTelemetry tracing functions including `startObservation`, `startActiveObservation`, `observe`, and `propagateAttributes`. Pair this package with `@proofstate/otel` to export spans.

```ts
import { startActiveObservation } from "@proofstate/tracing";
await startActiveObservation("answer-question", async (span) => {
  span.update({ input: "Hello", output: "Hi" });
});
```

Register a `ProofStateSpanProcessor` before creating spans. See the [root README](../../README.md) for a complete setup.
