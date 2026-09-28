import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProofStateBrowserClient,
  ProofStateBrowserError,
  ProofStateScoreDataType,
} from "@proofstate/browser";

const createJsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 207,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

describe("ProofStateBrowserClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends a score as a single ingestion batch", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const request = JSON.parse(init?.body as string);
        const eventId = request.batch[0].id;

        return createJsonResponse({
          successes: [{ id: eventId, status: 201 }],
          errors: [],
        });
      },
    );
    const proofstate = new ProofStateBrowserClient({
      publicKey: "pk-ps-test",
      baseUrl: "https://proofstate.ai/",
      environment: "production",
      fetch: fetchMock,
    });

    const result = await proofstate.score({
      id: "score-id",
      traceId: "trace-id",
      observationId: "observation-id",
      name: "user_feedback",
      value: 1,
      dataType: ProofStateScoreDataType.Numeric,
      comment: "Helpful",
      metadata: { source: "button" },
    });

    expect(result).toEqual({ id: "score-id" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://proofstate.ai/api/public/ingestion");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer pk-ps-test",
      "X-ProofState-Public-Key": "pk-ps-test",
      "X-ProofState-Sdk-Name": "proofstate-javascript",
      "X-ProofState-Sdk-Integration": "browser",
    });

    const payload = JSON.parse(init?.body as string);
    expect(payload).toMatchObject({
      metadata: {
        batch_size: 1,
        sdk_name: "proofstate-javascript",
        sdk_integration: "browser",
        public_key: "pk-ps-test",
      },
    });
    expect(payload.metadata.sdk_version).toEqual(expect.any(String));
    expect(payload.batch).toHaveLength(1);
    expect(payload.batch[0]).toMatchObject({
      type: "score-create",
      timestamp: "2026-06-16T12:00:00.000Z",
      body: {
        id: "score-id",
        traceId: "trace-id",
        observationId: "observation-id",
        name: "user_feedback",
        value: 1,
        dataType: "NUMERIC",
        comment: "Helpful",
        metadata: { source: "button" },
        environment: "production",
      },
    });
    expect(payload.batch[0].id).toEqual(expect.any(String));
  });

  it("generates a score id when none is provided", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const request = JSON.parse(init?.body as string);
        const eventId = request.batch[0].id;

        return createJsonResponse({
          successes: [{ id: eventId, status: 201 }],
          errors: [],
        });
      },
    );
    const proofstate = new ProofStateBrowserClient({
      publicKey: "pk-ps-test",
      fetch: fetchMock,
    });

    const result = await proofstate.score({
      traceId: "trace-id",
      name: "user_feedback",
      value: 0,
    });

    expect(result.id).toEqual(expect.any(String));
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://proofstate.ai/api/public/ingestion",
    );

    const payload = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(payload.batch[0].body.id).toBe(result.id);
  });

  it("preserves an explicitly provided empty score id", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const request = JSON.parse(init?.body as string);
        const eventId = request.batch[0].id;

        return createJsonResponse({
          successes: [{ id: eventId, status: 201 }],
          errors: [],
        });
      },
    );
    const proofstate = new ProofStateBrowserClient({
      publicKey: "pk-ps-test",
      fetch: fetchMock,
    });

    const result = await proofstate.score({
      id: "",
      traceId: "trace-id",
      name: "user_feedback",
      value: 0,
    });

    expect(result).toEqual({ id: "" });

    const payload = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(payload.batch[0].body.id).toBe("");
  });

  it("rejects when ingestion returns item errors", async () => {
    const fetchMock = vi.fn(async () =>
      createJsonResponse({
        successes: [],
        errors: [
          {
            id: "event-id",
            status: 400,
            message: "Invalid request data",
            error: "traceId is required",
          },
        ],
      }),
    );
    const proofstate = new ProofStateBrowserClient({
      publicKey: "pk-ps-test",
      fetch: fetchMock,
    });

    await expect(
      proofstate.score({ traceId: "trace-id", name: "feedback", value: 1 }),
    ).rejects.toMatchObject({
      name: "ProofStateBrowserError",
      errors: [
        {
          id: "event-id",
          status: 400,
          error: "traceId is required",
        },
      ],
    });
  });

  it("rejects non-2xx JSON responses", async () => {
    const fetchMock = vi.fn(async () =>
      createJsonResponse(
        { error: "Unauthorized", message: "Invalid public key" },
        { status: 401 },
      ),
    );
    const proofstate = new ProofStateBrowserClient({
      publicKey: "pk-ps-test",
      fetch: fetchMock,
    });

    await expect(
      proofstate.score({ traceId: "trace-id", name: "feedback", value: 1 }),
    ).rejects.toMatchObject({
      name: "ProofStateBrowserError",
      message: "ProofState ingestion request failed with status 401.",
      status: 401,
      response: { error: "Unauthorized", message: "Invalid public key" },
    });
  });

  it("rejects non-2xx non-JSON responses with the HTTP status", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("<html>Unauthorized</html>", {
          status: 401,
          headers: { "Content-Type": "text/html" },
        }),
    );
    const proofstate = new ProofStateBrowserClient({
      publicKey: "pk-ps-test",
      fetch: fetchMock,
    });

    await expect(
      proofstate.score({ traceId: "trace-id", name: "feedback", value: 1 }),
    ).rejects.toMatchObject({
      name: "ProofStateBrowserError",
      message: "ProofState ingestion request failed with status 401.",
      status: 401,
      response: "<html>Unauthorized</html>",
    });
  });

  it("requires a public key", () => {
    expect(
      () => new ProofStateBrowserClient({ publicKey: "", fetch: vi.fn() }),
    ).toThrow(ProofStateBrowserError);
  });

  it("keeps SDK auth headers authoritative over additional headers", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const request = JSON.parse(init?.body as string);
        const eventId = request.batch[0].id;

        return createJsonResponse({
          successes: [{ id: eventId, status: 201 }],
          errors: [],
        });
      },
    );
    const proofstate = new ProofStateBrowserClient({
      publicKey: "pk-ps-test",
      fetch: fetchMock,
      additionalHeaders: {
        Authorization: "Bearer wrong-key",
        authorization: "Bearer lower-case-wrong-key",
        "X-ProofState-Public-Key": "wrong-key",
        "x-proofstate-public-key": "lower-case-wrong-key",
        "x-proofstate-sdk-name": "wrong-sdk-name",
        "X-Custom-Header": "custom",
      },
    });

    await proofstate.score({ traceId: "trace-id", name: "feedback", value: 1 });

    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("authorization")).toBe("Bearer pk-ps-test");
    expect(headers.get("x-proofstate-public-key")).toBe("pk-ps-test");
    expect(headers.get("x-proofstate-sdk-name")).toBe("proofstate-javascript");
    expect(headers.get("x-custom-header")).toBe("custom");
  });

  it("does not rebind a custom fetch implementation", async () => {
    const fetchMock = vi.fn(function (
      this: unknown,
      _input: RequestInfo | URL,
      init?: RequestInit,
    ) {
      expect(this).toBeUndefined();
      const request = JSON.parse(init?.body as string);
      const eventId = request.batch[0].id;

      return Promise.resolve(
        createJsonResponse({
          successes: [{ id: eventId, status: 201 }],
          errors: [],
        }),
      );
    });
    const proofstate = new ProofStateBrowserClient({
      publicKey: "pk-ps-test",
      fetch: fetchMock,
    });

    await proofstate.score({ traceId: "trace-id", name: "feedback", value: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
