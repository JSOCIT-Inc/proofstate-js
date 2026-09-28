import { OpenTelemetry } from "@ai-sdk/otel";
import type {
  EmbedEndEvent,
  EmbedStartEvent,
  EmbeddingModelCallEndEvent,
  EmbeddingModelCallStartEvent,
  GenerateObjectEndEvent,
  GenerateObjectStartEvent,
  GenerateObjectStepEndEvent,
  GenerateObjectStepStartEvent,
  GenerateTextAbortEvent,
  GenerateTextEndEvent,
  GenerateTextStartEvent,
  GenerateTextStepEndEvent,
  GenerateTextStepStartEvent,
  LanguageModelCallEndEvent,
  LanguageModelCallStartEvent,
  RerankEndEvent,
  RerankStartEvent,
  RerankingModelCallEndEvent,
  RerankingModelCallStartEvent,
  Telemetry,
  ToolExecutionEndEvent,
  ToolExecutionStartEvent,
  ToolSet,
} from "ai";

import type { ProofStateVercelAiSdkIntegrationOptions } from "./types.js";
import { createProofStateObservationAttributes } from "./utils.js";

/**
 * ProofState telemetry integration for Vercel AI SDK v7 (`ai@7`).
 *
 * Register this once at application startup (or pass it per-call via
 * `telemetry.integrations`) and every AI SDK call — `generateText`,
 * `streamText`, `generateObject`, `embed`, tool executions — is traced as
 * ProofState observations. Requires the `ProofStateSpanProcessor` from
 * `@proofstate/otel` to be registered with your OpenTelemetry setup; this
 * integration only creates spans, the processor exports them to ProofState.
 *
 * For AI SDK versions ≤6, do not use this class — enable
 * `experimental_telemetry: { isEnabled: true }` on each call instead; the
 * `ProofStateSpanProcessor` picks those spans up without an integration.
 *
 * Trace-level attributes (userId, sessionId, tags, traceName, metadata)
 * should be set with `propagateAttributes` from `@proofstate/tracing` around
 * the AI SDK call. Runtime context keys included via the AI SDK `telemetry`
 * option become ProofState observation metadata; the special key
 * `proofstatePrompt` links a ProofState prompt version to model-call
 * observations instead.
 *
 * @example
 * ```typescript
 * // instrumentation.ts — run once at startup
 * import { registerTelemetry } from "ai";
 * import { ProofStateSpanProcessor } from "@proofstate/otel";
 * import { ProofStateVercelAiSdkIntegration } from "@proofstate/vercel-ai-sdk";
 * import { NodeSDK } from "@opentelemetry/sdk-node";
 *
 * const sdk = new NodeSDK({ spanProcessors: [new ProofStateSpanProcessor()] });
 * sdk.start();
 * registerTelemetry(new ProofStateVercelAiSdkIntegration());
 *
 * // app code
 * import { generateText } from "ai";
 * import { propagateAttributes } from "@proofstate/tracing";
 *
 * const { text } = await propagateAttributes(
 *   { userId: "user-123", sessionId: "session-456" },
 *   () =>
 *     generateText({
 *       model,
 *       prompt: "Explain RAG in one paragraph",
 *       telemetry: { functionId: "chat-assistant" },
 *     }),
 * );
 * ```
 *
 * See the package README for setup and examples.
 *
 * @public
 */
export class ProofStateVercelAiSdkIntegration implements Telemetry {
  private readonly delegate: OpenTelemetry;

  constructor(options: ProofStateVercelAiSdkIntegrationOptions = {}) {
    const openTelemetryOptions: ConstructorParameters<typeof OpenTelemetry>[0] =
      {
        tracer: options.tracer,
        enrichSpan: ({ spanType, runtimeContext }) =>
          createProofStateObservationAttributes({
            spanType,
            runtimeContext,
          }),
      };

    this.delegate = new OpenTelemetry(openTelemetryOptions);
  }

  executeTool<T>(params: {
    callId: string;
    toolCallId: string;
    execute: () => PromiseLike<T>;
  }): PromiseLike<T> {
    return this.delegate.executeTool(params);
  }

  executeLanguageModelCall<T>(params: {
    callId: string;
    execute: () => PromiseLike<T>;
  }): PromiseLike<T> {
    return this.delegate.executeLanguageModelCall(params);
  }

  onStart(
    event:
      | GenerateTextStartEvent
      | GenerateObjectStartEvent
      | EmbedStartEvent
      | RerankStartEvent,
  ): void {
    this.delegate.onStart(event);
  }

  onStepStart(event: GenerateTextStepStartEvent): void {
    this.delegate.onStepStart(event);
  }

  onLanguageModelCallStart(event: LanguageModelCallStartEvent): void {
    this.delegate.onLanguageModelCallStart(event);
  }

  onLanguageModelCallEnd(event: LanguageModelCallEndEvent<ToolSet>): void {
    this.delegate.onLanguageModelCallEnd(event);
  }

  onToolExecutionStart(event: ToolExecutionStartEvent<ToolSet>): void {
    this.delegate.onToolExecutionStart(event);
  }

  onToolExecutionEnd(event: ToolExecutionEndEvent<ToolSet>): void {
    this.delegate.onToolExecutionEnd(event);
  }

  onStepEnd(event: GenerateTextStepEndEvent<ToolSet>): void {
    this.delegate.onStepEnd(event);
  }

  /** @deprecated AI SDK v7 still emits object generation model spans through this callback. */
  onObjectStepStart(event: GenerateObjectStepStartEvent): void {
    this.delegate.onObjectStepStart(event);
  }

  /** @deprecated AI SDK v7 still emits object generation model spans through this callback. */
  onObjectStepEnd(event: GenerateObjectStepEndEvent): void {
    this.delegate.onObjectStepEnd(event);
  }

  onEmbedStart(event: EmbeddingModelCallStartEvent): void {
    this.delegate.onEmbedStart(event);
  }

  onEmbedEnd(event: EmbeddingModelCallEndEvent): void {
    this.delegate.onEmbedEnd(event);
  }

  onRerankStart(event: RerankingModelCallStartEvent): void {
    this.delegate.onRerankStart(event);
  }

  onRerankEnd(event: RerankingModelCallEndEvent): void {
    this.delegate.onRerankEnd(event);
  }

  onEnd(
    event:
      | GenerateTextEndEvent<ToolSet>
      | GenerateObjectEndEvent<unknown>
      | EmbedEndEvent
      | RerankEndEvent,
  ): void {
    this.delegate.onEnd(event);
  }

  onAbort(event: GenerateTextAbortEvent<ToolSet>): void {
    this.delegate.onAbort(event);
  }

  onError(error: unknown): void {
    this.delegate.onError(error);
  }
}
