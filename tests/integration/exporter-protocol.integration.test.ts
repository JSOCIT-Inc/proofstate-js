import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import {
  PROOFSTATE_SDK_VERSION,
  PROOFSTATE_TRACER_NAME,
} from "@proofstate/core";
import { ProofStateSpanProcessor } from "@proofstate/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { describe, expect, it } from "vitest";

describe("ProofState OTel wire protocol", () => {
  it.each(["", "/", "///"])(
    "sends spans to the compatible route with base URL suffix %j",
    async (suffix) => {
      const requests: Array<{
        url: string | undefined;
        headers: Record<string, string | string[] | undefined>;
      }> = [];
      const server = createServer((req, res) => {
        req.resume();
        req.on("end", () => {
          requests.push({ url: req.url, headers: req.headers });
          res.writeHead(200, { "content-type": "application/x-protobuf" });
          res.end();
        });
      });
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );

      try {
        const { port } = server.address() as AddressInfo;
        const processor = new ProofStateSpanProcessor({
          publicKey: "pk-ps-test",
          secretKey: "sk-ps-test",
          baseUrl: `http://127.0.0.1:${port}${suffix}`,
          exportMode: "immediate",
        });
        const provider = new NodeTracerProvider({
          spanProcessors: [processor],
        });

        provider.getTracer(PROOFSTATE_TRACER_NAME).startSpan("test-span").end();
        await provider.forceFlush();
        await provider.shutdown();

        expect(requests).toHaveLength(1);
        expect(requests[0]).toMatchObject({
          url: "/api/public/otel/v1/traces",
          headers: {
            authorization: `Basic ${Buffer.from("pk-ps-test:sk-ps-test").toString("base64")}`,
            "x-proofstate-sdk-name": "proofstate-javascript",
            "x-proofstate-public-key": "pk-ps-test",
            "x-proofstate-ingestion-version": "4",
          },
        });
        expect(requests[0].headers["x-proofstate-sdk-version"]).toBe(
          PROOFSTATE_SDK_VERSION,
        );
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    },
  );
});
