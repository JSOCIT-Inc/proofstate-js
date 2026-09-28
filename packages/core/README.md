# @proofstate/core

Shared types, generated REST schema, protocol utilities, and the `ProofStateAPIClient` direct REST client. Most applications should use `@proofstate/client` instead. Import `ProofStateAPI` for namespaced generated types and `ProofStateAPIClientOptions` for direct client configuration; upstream generated names remain internal.

```ts
import { ProofStateAPIClient } from "@proofstate/core";
const api = new ProofStateAPIClient(); // reads PROOFSTATE_* keys; defaults to https://proofstate.ai
const observations = await api.observations.getMany();
```

The generated REST routes and wire fields target the matching ProofState server revision; live compatibility still needs authenticated testing. See the [root README](../../README.md) for setup and publishing details.
