import { ProofStateOtelSpanAttributes } from "@proofstate/core";
import { describe, expect, it } from "vitest";

import { createProofStateObservationAttributes } from "../../packages/vercel-ai-sdk/src/utils.js";

describe("AI SDK prompt context", () => {
  it("links proofstatePrompt without leaking it into observation metadata", () => {
    const attributes = createProofStateObservationAttributes({
      spanType: "languageModel",
      runtimeContext: {
        proofstatePrompt: { name: "greeting", version: 2 },
        feature: "chat",
      },
    });

    expect(attributes).toMatchObject({
      [ProofStateOtelSpanAttributes.OBSERVATION_PROMPT_NAME]: "greeting",
      [ProofStateOtelSpanAttributes.OBSERVATION_PROMPT_VERSION]: 2,
      [`${ProofStateOtelSpanAttributes.OBSERVATION_METADATA}.feature`]: "chat",
    });
    expect(
      attributes[
        `${ProofStateOtelSpanAttributes.OBSERVATION_METADATA}.proofstatePrompt`
      ],
    ).toBeUndefined();
  });
});
