# @proofstate/openai

`observeOpenAI` traces OpenAI SDK calls. Register `ProofStateSpanProcessor` from `@proofstate/otel` before using it.

```ts
import OpenAI from "openai";
import { observeOpenAI } from "@proofstate/openai";
const openai = observeOpenAI(new OpenAI());
```

Use `proofstatePrompt` in `ProofStateConfig` to link a prompt version. See the [root README](../../README.md) for setup and publishing details.
