# @proofstate/core

Shared types, generated REST schema, protocol utilities, and the `ProofStateAPIClient` direct REST client. Most applications should use `@proofstate/client` instead. Import `ProofStateAPI` for namespaced generated types and `ProofStateAPIClientOptions` for direct client configuration; upstream generated names remain internal.

```ts
import { ProofStateAPIClient } from "@proofstate/core";
const api = new ProofStateAPIClient(); // reads PROOFSTATE_* keys; defaults to https://proofstate.ai
const observations = await api.observations.getMany();
```

The generated REST routes and wire fields target the matching ProofState server revision. Authenticated production checks covered v2 observation readback and prompt operations on 2026-09-28; verify other methods against your deployment. See the [root README](https://github.com/JSOCIT-Inc/proofstate-js#readme) for setup and release details.
