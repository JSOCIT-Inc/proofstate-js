import {
  generateUUID,
  PROOFSTATE_SDK_NAME,
  PROOFSTATE_SDK_VERSION,
  type IngestionEvent,
  type IngestionRequest,
} from "@proofstate/core";

import { ProofStateBrowserError } from "./errors.js";
import type {
  ProofStateBrowserClientOptions,
  ProofStateBrowserScoreBody,
  ProofStateBrowserScoreResult,
  ProofStateIngestionResponse,
} from "./types.js";
import {
  filterAdditionalHeaders,
  isIngestionResponse,
  parseErrorResponseBody,
  parseJsonResponse,
  removeTrailingSlash,
} from "./utils.js";

const DEFAULT_BASE_URL = "https://proofstate.ai";
const SDK_INTEGRATION = "browser";

type ProofStateScoreCreateEvent = Extract<
  IngestionEvent,
  { type: "score-create" }
> & {
  body: ProofStateBrowserScoreBody & { id: string };
};

export class ProofStateBrowserClient {
  private readonly publicKey: string;
  private readonly baseUrl: string;
  private readonly environment?: string;
  private readonly additionalHeaders?: Record<string, string>;
  private readonly fetch: typeof fetch;

  constructor(options: ProofStateBrowserClientOptions) {
    if (!options.publicKey) {
      throw new ProofStateBrowserError("ProofState publicKey is required.");
    }

    const fetchImplementation = options.fetch ?? globalThis.fetch;
    if (!fetchImplementation) {
      throw new ProofStateBrowserError(
        "No fetch implementation available. Pass a fetch implementation in the ProofStateBrowser options.",
      );
    }

    this.publicKey = options.publicKey;
    this.baseUrl = removeTrailingSlash(options.baseUrl ?? DEFAULT_BASE_URL);
    this.environment = options.environment;
    this.additionalHeaders = filterAdditionalHeaders(options.additionalHeaders);
    this.fetch = options.fetch ?? fetchImplementation.bind(globalThis);
  }

  /**
   * Creates a score via the ProofState ingestion API.
   *
   * The browser SDK sends scores immediately as single-event ingestion batches.
   */
  public async score(
    body: ProofStateBrowserScoreBody,
  ): Promise<ProofStateBrowserScoreResult> {
    const scoreId = body.id ?? generateUUID(globalThis);
    const event = this.createScoreEvent(scoreId, body);
    const response = await this.postIngestionBatch([event]);

    if (response.errors.length > 0) {
      throw new ProofStateBrowserError("ProofState score ingestion failed.", {
        errors: response.errors,
        response,
      });
    }

    const hasSuccess = response.successes.some(
      (success) => success.id === event.id,
    );
    if (!hasSuccess) {
      throw new ProofStateBrowserError(
        "ProofState score ingestion response did not include the created score event.",
        { response },
      );
    }

    return { id: scoreId };
  }

  private createScoreEvent(
    scoreId: string,
    body: ProofStateBrowserScoreBody,
  ): ProofStateScoreCreateEvent {
    return {
      id: generateUUID(globalThis),
      type: "score-create",
      timestamp: new Date().toISOString(),
      body: {
        ...body,
        id: scoreId,
        environment: body.environment ?? this.environment,
      },
    };
  }

  private async postIngestionBatch(
    batch: ProofStateScoreCreateEvent[],
  ): Promise<ProofStateIngestionResponse> {
    let response: Response;
    try {
      const fetchImplementation = this.fetch;
      const request: IngestionRequest = {
        batch,
        metadata: {
          batch_size: batch.length,
          sdk_name: PROOFSTATE_SDK_NAME,
          sdk_version: PROOFSTATE_SDK_VERSION,
          sdk_integration: SDK_INTEGRATION,
          public_key: this.publicKey,
        },
      };
      response = await fetchImplementation(
        `${this.baseUrl}/api/public/ingestion`,
        {
          method: "POST",
          headers: {
            ...this.additionalHeaders,
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.publicKey}`,
            "X-ProofState-Public-Key": this.publicKey,
            "X-ProofState-Sdk-Name": PROOFSTATE_SDK_NAME,
            "X-ProofState-Sdk-Version": PROOFSTATE_SDK_VERSION,
            "X-ProofState-Sdk-Integration": SDK_INTEGRATION,
          },
          body: JSON.stringify(request),
        },
      );
    } catch (error) {
      throw new ProofStateBrowserError("Failed to send score to ProofState.", {
        originalError: error,
      });
    }

    if (!response.ok) {
      const responseBody = await parseErrorResponseBody(response);
      throw new ProofStateBrowserError(
        `ProofState ingestion request failed with status ${response.status}.`,
        {
          status: response.status,
          response: responseBody,
        },
      );
    }

    const json = await parseJsonResponse(response);
    if (!isIngestionResponse(json)) {
      throw new ProofStateBrowserError(
        "ProofState ingestion response had an unexpected shape.",
        { response: json },
      );
    }

    return json;
  }
}

export * from "./types.js";
export { ProofStateBrowserError } from "./errors.js";
