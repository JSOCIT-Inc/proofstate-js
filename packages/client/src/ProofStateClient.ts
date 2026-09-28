import {
  ProofStateAPIClient,
  PROOFSTATE_SDK_VERSION,
  getGlobalLogger,
  getEnv,
  removeTrailingSlashes,
} from "@proofstate/core";

import { DatasetManager } from "./dataset/index.js";
import { ExperimentManager } from "./experiment/ExperimentManager.js";
import { MediaManager } from "./media/index.js";
import { PromptManager } from "./prompt/index.js";
import { ScoreManager } from "./score/index.js";

/**
 * Configuration parameters for initializing a ProofStateClient instance.
 *
 * @public
 */
export interface ProofStateClientParams {
  /**
   * Public API key for authentication with ProofState.
   * Can also be provided via PROOFSTATE_PUBLIC_KEY environment variable.
   */
  publicKey?: string;

  /**
   * Secret API key for authentication with ProofState.
   * Can also be provided via PROOFSTATE_SECRET_KEY environment variable.
   */
  secretKey?: string;

  /**
   * Base URL of the ProofState instance to connect to.
   *
   *
   * @defaultValue "https://proofstate.ai"
   */
  baseUrl?: string;

  /**
   * Request timeout in seconds.
   * Can also be provided via PROOFSTATE_TIMEOUT environment variable.
   *
   * @defaultValue 5
   */
  timeout?: number;

  /**
   * Additional HTTP headers to include with API requests.
   */
  additionalHeaders?: Record<string, string>;
}

/**
 * Main client for interacting with the ProofState API.
 *
 * The ProofStateClient provides access to all non-tracing ProofState
 * functionality:
 * - Prompt management (`proofstate.prompt`) — fetch, cache, compile, and version prompts
 * - Datasets (`proofstate.dataset`) — manage test datasets and link items to runs
 * - Experiments (`proofstate.experiment`) — run tasks + evaluators over datasets
 * - Scores (`proofstate.score`) — create evaluation/feedback scores for traces and observations
 * - Media (`proofstate.media`) — upload media and resolve media references
 * - Direct API access (`proofstate.api`) — the full generated ProofState REST API client
 *
 * Tracing/observability is intentionally NOT part of this client. To trace
 * your application, use `@proofstate/tracing` (instrumentation) together with
 * the `ProofStateSpanProcessor` from `@proofstate/otel` (export).
 *
 * @example
 * ```typescript
 * // Initialize with explicit credentials
 * const proofstate = new ProofStateClient({
 *   publicKey: "pk-ps-...",
 *   secretKey: "sk-ps-...",
 *   baseUrl: "https://proofstate.ai"
 * });
 *
 * // Use the client
 * const prompt = await proofstate.prompt.get("my-prompt");
 * const compiledPrompt = prompt.compile({ variable: "value" });
 * ```
 * Omit constructor options when credentials are set in `PROOFSTATE_*` environment variables.
 *
 * See the package README for setup and examples.
 *
 * @public
 */
export class ProofStateClient {
  /**
   * Direct access to the underlying ProofState API client.
   * Use this for advanced API operations not covered by the high-level managers.
   */
  public api: ProofStateAPIClient;

  /**
   * Manager for prompt operations including creation, retrieval, and caching.
   */
  public prompt: PromptManager;

  /**
   * Manager for dataset operations including retrieval and item linking.
   */
  public dataset: DatasetManager;

  /**
   * Manager for score creation and batch processing.
   */
  public score: ScoreManager;

  /**
   * Manager for media upload and reference resolution.
   */
  public media: MediaManager;

  /**
   * Manager for running experiments on datasets and data items.
   *
   * The experiment manager provides comprehensive functionality for:
   * - Running tasks on datasets or custom data arrays
   * - Evaluating outputs with custom or pre-built evaluators
   * - Tracking experiment runs with automatic tracing
   * - Generating formatted result summaries
   * - Integrating with AutoEvals library evaluators
   *
   * @example Basic experiment execution
   * ```typescript
   * const proofstate = new ProofStateClient();
   *
   * const result = await proofstate.experiment.run({
   *   name: "Model Evaluation",
   *   description: "Testing model performance on Q&A tasks",
   *   data: [
   *     { input: "What is 2+2?", expectedOutput: "4" },
   *     { input: "What is the capital of France?", expectedOutput: "Paris" }
   *   ],
   *   task: async ({ input }) => {
   *     // Your model/task implementation
   *     const response = await myModel.generate(input);
   *     return response;
   *   },
   *   evaluators: [
   *     async ({ output, expectedOutput }) => ({
   *       name: "exact_match",
   *       value: output.trim().toLowerCase() === expectedOutput.toLowerCase() ? 1 : 0
   *     })
   *   ]
   * });
   *
   * console.log(await result.format());
   * ```
   *
   * @example Using with datasets
   * ```typescript
   * const proofstate = new ProofStateClient();
   * const dataset = await proofstate.dataset.get("my-test-dataset");
   * const result = await dataset.runExperiment({
   *   name: "Production Readiness Test",
   *   task: myTask,
   *   evaluators: [accuracyEvaluator, latencyEvaluator],
   *   runEvaluators: [overallQualityEvaluator]
   * });
   * ```
   *
   * @see {@link ExperimentManager} for detailed API documentation
   * @see {@link ExperimentParams} for configuration options
   * @see {@link ExperimentResult} for result structure
   * @public
   * @since 4.0.0
   */
  public experiment: ExperimentManager;

  private baseUrl: string;
  private projectId: string | null = null;

  /**
   * @deprecated Use prompt.get instead
   */
  public getPrompt: typeof PromptManager.prototype.get;
  /**
   * @deprecated Use prompt.create instead
   */
  public createPrompt: typeof PromptManager.prototype.create;
  /**
   * @deprecated Use prompt.update instead
   */
  public updatePrompt: typeof PromptManager.prototype.update;
  /**
   * @deprecated Use dataset.get instead
   */
  public getDataset: typeof DatasetManager.prototype.get;
  /**
   * @deprecated Use api.trace.get instead
   */
  public fetchTrace: typeof ProofStateAPIClient.prototype.trace.get;
  /**
   * @deprecated Use api.trace.list instead
   */
  public fetchTraces: typeof ProofStateAPIClient.prototype.trace.list;
  /**
   * @deprecated Use api.observations.get instead
   */
  public fetchObservation: typeof ProofStateAPIClient.prototype.legacy.observationsV1.get;
  /**
   * @deprecated Use api.observations.list instead
   */
  public fetchObservations: typeof ProofStateAPIClient.prototype.observations.getMany;
  /**
   * @deprecated Use api.sessions.get instead
   */
  public fetchSessions: typeof ProofStateAPIClient.prototype.sessions.get;
  /**
   * @deprecated Use api.datasets.getRun instead
   */
  public getDatasetRun: typeof ProofStateAPIClient.prototype.datasets.getRun;
  /**
   * @deprecated Use api.datasets.getRuns instead
   */
  public getDatasetRuns: typeof ProofStateAPIClient.prototype.datasets.getRuns;
  /**
   * @deprecated Use api.datasets.create instead
   */
  public createDataset: typeof ProofStateAPIClient.prototype.datasets.create;
  /**
   * @deprecated Use api.datasetItems.get instead
   */
  public getDatasetItem: typeof ProofStateAPIClient.prototype.datasetItems.get;
  /**
   * @deprecated Use dataset.createItem instead.
   *
   * Note: this now routes through {@link DatasetManager.createItem} so that
   * `ProofStateMedia` in the item is uploaded. Its signature therefore differs
   * from the old `api.datasetItems.create` passthrough — it returns a plain
   * `Promise<DatasetItem>` (no `.withRawResponse()`) and does not accept a
   * second `requestOptions` argument. If you need `requestOptions` or the raw
   * response, call `api.datasetItems.create` directly (it does not upload media).
   */
  public createDatasetItem: typeof DatasetManager.prototype.createItem;
  /**
   * @deprecated Use api.media.get instead
   */
  public fetchMedia: typeof ProofStateAPIClient.prototype.media.get;
  /**
   * @deprecated Use media.resolveReferences instead
   */
  public resolveMediaReferences: typeof MediaManager.prototype.resolveReferences;

  /**
   * Creates a new ProofStateClient instance.
   *
   * @param params - Configuration parameters. If not provided, will use environment variables.
   *
   * @throws Will log warnings if required credentials are not provided
   *
   * @example
   * ```typescript
   * // With explicit configuration
   * const client = new ProofStateClient({
   *   publicKey: "pk_...",
   *   secretKey: "sk_...",
   *   baseUrl: "https://proofstate.ai"
   * });
   *
   * // Using environment variables
   * const client = new ProofStateClient();
   * ```
   */
  constructor(params?: ProofStateClientParams) {
    const logger = getGlobalLogger();

    const publicKey = params?.publicKey ?? getEnv("PROOFSTATE_PUBLIC_KEY");
    const secretKey = params?.secretKey ?? getEnv("PROOFSTATE_SECRET_KEY");
    this.baseUrl = removeTrailingSlashes(
      params?.baseUrl ??
        getEnv("PROOFSTATE_BASE_URL") ??
        "https://proofstate.ai",
    );

    if (!publicKey) {
      logger.warn(
        "No public key provided in constructor or as PROOFSTATE_PUBLIC_KEY env var. Client operations will fail.",
      );
    }
    if (!secretKey) {
      logger.warn(
        "No secret key provided in constructor or as PROOFSTATE_SECRET_KEY env var. Client operations will fail.",
      );
    }
    const timeoutSeconds =
      params?.timeout ?? Number(getEnv("PROOFSTATE_TIMEOUT") ?? 5);

    this.api = new ProofStateAPIClient({
      baseUrl: this.baseUrl,
      username: publicKey,
      password: secretKey,
      xProofStatePublicKey: publicKey,
      xProofStateSdkVersion: PROOFSTATE_SDK_VERSION,
      xProofStateSdkName: "proofstate-javascript",
      environment: "", // noop as baseUrl is set
      headers: params?.additionalHeaders,
    });

    logger.debug("Initialized ProofStateClient with params:", {
      publicKey,
      baseUrl: this.baseUrl,
      timeoutSeconds,
    });

    this.prompt = new PromptManager({ apiClient: this.api });
    this.dataset = new DatasetManager({ proofstateClient: this });
    this.score = new ScoreManager({ apiClient: this.api });
    this.media = new MediaManager({ apiClient: this.api });
    this.experiment = new ExperimentManager({ proofstateClient: this });

    // Keep v3 compat by exposing old interface
    this.getPrompt = this.prompt.get.bind(this.prompt); // keep correct this context for cache access
    this.createPrompt = this.prompt.create.bind(this.prompt);
    this.updatePrompt = this.prompt.update.bind(this.prompt);
    this.getDataset = this.dataset.get.bind(this.dataset);
    this.fetchTrace = this.api.trace.get.bind(this.api.trace);
    this.fetchTraces = this.api.trace.list.bind(this.api.trace);
    this.fetchObservation = this.api.legacy.observationsV1.get.bind(
      this.api.legacy.observationsV1,
    );
    this.fetchObservations = this.api.observations.getMany.bind(
      this.api.observations,
    );
    this.fetchSessions = this.api.sessions.get.bind(this.api.sessions);
    this.getDatasetRun = this.api.datasets.getRun.bind(this.api.datasets);
    this.getDatasetRuns = this.api.datasets.getRuns.bind(this.api.datasets);
    this.createDataset = this.api.datasets.create.bind(this.api.datasets);
    this.getDatasetItem = this.api.datasetItems.get.bind(this.api.datasetItems);
    this.createDatasetItem = this.dataset.createItem.bind(this.dataset);
    this.fetchMedia = this.api.media.get.bind(this.api.media);
    this.resolveMediaReferences = this.media.resolveReferences.bind(this.media);
  }

  /**
   * Flushes any pending score events to the ProofState API.
   *
   * This method ensures all queued scores are sent immediately rather than
   * waiting for the automatic flush interval or batch size threshold.
   *
   * @returns Promise that resolves when all pending scores have been sent
   *
   * @example
   * ```typescript
   * proofstate.score.create({ name: "quality", value: 0.8 });
   * await proofstate.flush(); // Ensures the score is sent immediately
   * ```
   */
  public async flush() {
    return this.score.flush();
  }

  /**
   * Gracefully shuts down the client by flushing all pending data.
   *
   * This method should be called before your application exits to ensure
   * all data is sent to ProofState.
   *
   * @returns Promise that resolves when shutdown is complete
   *
   * @example
   * ```typescript
   * // Before application exit
   * await proofstate.shutdown();
   * ```
   */
  public async shutdown() {
    return this.score.shutdown();
  }

  /**
   * Generates a URL to view a specific trace in the ProofState UI.
   *
   * @param traceId - The ID of the trace to generate a URL for
   * @returns Promise that resolves to the trace URL
   *
   * @example
   * ```typescript
   * const traceId = "trace-123";
   * const url = await proofstate.getTraceUrl(traceId);
   * console.log(`View trace at: ${url}`);
   * ```
   */
  public async getTraceUrl(traceId: string) {
    let projectId = this.projectId;

    if (!projectId) {
      projectId = (await this.api.projects.get()).data[0].id;
      this.projectId = projectId;
    }

    const traceUrl = `${this.baseUrl}/project/${projectId}/traces/${traceId}`;

    return traceUrl;
  }
}
