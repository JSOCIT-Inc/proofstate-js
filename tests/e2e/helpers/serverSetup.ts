import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ProofStateSpanProcessor,
  type ProofStateSpanProcessorParams,
} from "@proofstate/otel";
import { trace } from "@opentelemetry/api";

export interface ServerTestEnvironment {
  sdk: NodeSDK;
  spanProcessor: ProofStateSpanProcessor;
  shutdown: () => Promise<void>;
  serviceName: string;
}

export interface ServerTestSetupOptions {
  serviceName?: string;
  serviceVersion?: string;
  spanProcessorConfig?: Partial<ProofStateSpanProcessorParams>;
  enableInstrumentation?: boolean;
  timeout?: number;
}

/**
 * Set up an E2E test environment with real ProofState server connection
 */
export async function setupServerTestEnvironment(
  options: ServerTestSetupOptions = {},
): Promise<ServerTestEnvironment> {
  // Create span processor with real ProofState server configuration
  const spanProcessor = new ProofStateSpanProcessor({
    ...options.spanProcessorConfig,
  });

  const serviceName = options.serviceName || `e2e-test-service-${Date.now()}`;

  const sdk = new NodeSDK({
    spanProcessor,
    instrumentations: options.enableInstrumentation ? undefined : [], // No auto-instrumentation by default
  });

  const shutdown = async (): Promise<void> => {
    try {
      await sdk.shutdown();
    } catch (error) {
      console.warn("Error during E2E test environment shutdown:", error);
    }

    // Clear any global tracer state
    trace.disable();
  };

  sdk.start();

  return {
    sdk,
    spanProcessor,
    shutdown,
    serviceName,
  };
}

/**
 * Clean up the E2E test environment
 */
export async function teardownServerTestEnvironment(
  env: ServerTestEnvironment,
): Promise<void> {
  try {
    // Force flush to ensure all spans are sent
    await env.spanProcessor.forceFlush();
    await env.shutdown();
  } catch (error) {
    console.warn("Error during E2E test environment teardown:", error);
  }
}

/**
 * Helper to wait for server-side ingestion processing
 * After forcing flush, we need to wait for async server-side processing
 */
export async function waitForServerIngestion(
  delayMs: number = 2000,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
