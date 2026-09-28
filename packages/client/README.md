# @proofstate/client

Universal JavaScript client for ProofState prompts, datasets, experiments, scores, media, and the REST API.

```ts
import { ProofStateClient } from "@proofstate/client";
const client = new ProofStateClient(); // PROOFSTATE_PUBLIC_KEY / SECRET_KEY; https://proofstate.ai
const prompt = await client.prompt.get("greeting");
console.log(prompt.compile({ name: "Ada" }));
client.score.create({ traceId: "trace-id", name: "quality", value: 0.9 });
await client.flush();
```

Create the prompt in ProofState before fetching it. Trace export uses `@proofstate/tracing` and `@proofstate/otel`. See the [root README](https://github.com/JSOCIT-Inc/proofstate-js#readme) for setup and publishing details.
