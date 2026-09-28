# @proofstate/browser

Browser client for public-key score ingestion. Do not put a secret key in browser code.

```ts
import { ProofStateBrowserClient } from "@proofstate/browser";
const client = new ProofStateBrowserClient({ publicKey: "pk-ps-..." });
await client.score({ traceId: "trace-id", name: "feedback", value: 1 });
```

The default host is `https://proofstate.ai`. See the [root README](../../README.md) for setup and publishing details.
