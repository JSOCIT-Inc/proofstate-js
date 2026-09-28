import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ProofStateAPIClient,
  type ProofStateAPI,
  type ProofStateAPIClientOptions,
  type legacy,
} from "@proofstate/core";
import { ProofStateClient } from "@proofstate/client";

const request: ProofStateAPI.ScoreBody = {
  traceId: "trace-id",
  name: "quality",
  value: 0.9,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("score create API compatibility", () => {
  it.each([
    ["direct REST", () => new ProofStateAPIClient()],
    ["high-level", () => new ProofStateClient().api],
  ])(
    "uses ProofState defaults for %s client requests",
    async (_, makeClient) => {
      vi.stubEnv("PROOFSTATE_PUBLIC_KEY", "pk-ps-test");
      vi.stubEnv("PROOFSTATE_SECRET_KEY", "sk-ps-test");
      vi.stubEnv("PROOFSTATE_BASE_URL", "");
      const fetchMock = vi.fn(
        async (_input: RequestInfo | URL, _init?: RequestInit) =>
          new Response(JSON.stringify({ id: "score-id" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      );
      vi.stubGlobal("fetch", fetchMock);

      await makeClient().scores.create(request);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://proofstate.ai/api/public/scores");
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe(
        `Basic ${btoa("pk-ps-test:sk-ps-test")}`,
      );
      expect(headers.get("x-proofstate-sdk-name")).toBe(
        "proofstate-javascript",
      );
      expect(headers.get("x-proofstate-public-key")).toBe("pk-ps-test");
    },
  );

  const explicitOptions: ProofStateAPIClientOptions = {
    baseUrl: "https://proofstate.ai///",
  };

  it.each([
    ["direct REST environment", () => new ProofStateAPIClient()],
    ["high-level environment", () => new ProofStateClient().api],
    ["direct REST option", () => new ProofStateAPIClient(explicitOptions)],
    [
      "high-level option",
      () => new ProofStateClient({ baseUrl: "https://proofstate.ai///" }).api,
    ],
  ])("normalizes trailing slashes for %s", async (_, makeClient) => {
    vi.stubEnv("PROOFSTATE_PUBLIC_KEY", "pk-ps-test");
    vi.stubEnv("PROOFSTATE_SECRET_KEY", "sk-ps-test");
    vi.stubEnv("PROOFSTATE_BASE_URL", "https://proofstate.ai///");
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ id: "score-id" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await makeClient().scores.create(request);

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://proofstate.ai/api/public/scores",
    );
  });

  it.each([
    [
      "canonical",
      (client: ProofStateAPIClient) => client.scores.create(request),
    ],
    [
      "legacy",
      (client: ProofStateAPIClient) =>
        client.legacy.scoreV1.create(request as legacy.CreateScoreRequest),
    ],
  ])("sends the same request through the %s path", async (_, createScore) => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ id: "score-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new ProofStateAPIClient({
      environment: "https://proofstate.ai",
      username: "public-key",
      password: "secret-key",
    });

    await createScore(client);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://proofstate.ai/api/public/scores");
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify(request),
    });
  });
});
