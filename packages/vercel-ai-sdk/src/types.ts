import type { Tracer } from "@opentelemetry/api";

export type ProofStatePrompt = {
  name: string;
  version: number;
  isFallback?: boolean;
};

export type ProofStateVercelAiSdkIntegrationOptions = {
  tracer?: Tracer;
};
