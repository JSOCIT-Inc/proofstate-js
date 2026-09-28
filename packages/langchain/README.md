# @proofstate/langchain

`CallbackHandler` traces LangChain and LangGraph calls. Register `ProofStateSpanProcessor` from `@proofstate/otel` before running chains.

```ts
import { CallbackHandler } from "@proofstate/langchain";
const handler = new CallbackHandler({ userId: "user-123" });
// Pass { callbacks: [handler] } to a LangChain invocation.
```

Prompt metadata can use `proofstatePrompt`. See the [root README](https://github.com/JSOCIT-Inc/proofstate-js#readme) for setup and publishing details.
