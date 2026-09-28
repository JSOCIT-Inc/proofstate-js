import {
  ScoreDataType as CoreScoreDataType,
  type IngestionError,
  type IngestionResponse,
  type IngestionSuccess,
  type ScoreBody,
  type ScoreDataType,
} from "@proofstate/core";

type ProofStateFetch = typeof fetch;

export type ProofStateScoreDataType = ScoreDataType;
export const ProofStateScoreDataType = CoreScoreDataType;

export interface ProofStateBrowserClientOptions {
  /**
   * ProofState public key obtained from the project settings.
   */
  publicKey: string;
  /**
   * ProofState host.
   *
   * @defaultValue "https://proofstate.ai"
   */
  baseUrl?: string;
  /**
   * Environment attached to scores when not provided on the score body.
   */
  environment?: string;
  /**
   * Additional HTTP headers sent with ingestion requests. SDK auth and
   * telemetry headers take precedence over these values.
   */
  additionalHeaders?: Record<string, string>;
  /**
   * Custom fetch implementation. Useful for tests and non-standard runtimes.
   */
  fetch?: ProofStateFetch;
}

export type ProofStateBrowserScoreBody = ScoreBody;

export interface ProofStateBrowserScoreResult {
  id: string;
}

export type ProofStateIngestionError = IngestionError;
export type ProofStateIngestionSuccess = IngestionSuccess;
export type ProofStateIngestionResponse = IngestionResponse;
