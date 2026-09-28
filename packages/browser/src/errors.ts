import type { ProofStateIngestionError } from "./types.js";

export class ProofStateBrowserError extends Error {
  public readonly status?: number;
  public readonly response?: unknown;
  public readonly errors?: ProofStateIngestionError[];
  public readonly originalError?: unknown;

  constructor(
    message: string,
    options: {
      status?: number;
      response?: unknown;
      errors?: ProofStateIngestionError[];
      originalError?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "ProofStateBrowserError";
    this.status = options.status;
    this.response = options.response;
    this.errors = options.errors;
    this.originalError = options.originalError;
  }
}
