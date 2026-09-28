import { ProofStateAPIClient as GeneratedProofStateAPIClient } from "./api/Client.js";
import { PROOFSTATE_SDK_VERSION } from "./constants.js";
import { getEnv, removeTrailingSlashes } from "./utils.js";

export type ProofStateAPIClientOptions =
  Partial<GeneratedProofStateAPIClient.Options>;

/** Direct REST API client with ProofState credentials and host defaults. */
export class ProofStateAPIClient extends GeneratedProofStateAPIClient {
  constructor(options: ProofStateAPIClientOptions = {}) {
    const publicKey = getEnv("PROOFSTATE_PUBLIC_KEY");
    const secretKey = getEnv("PROOFSTATE_SECRET_KEY");
    const configuredBaseUrl = options.baseUrl ?? getEnv("PROOFSTATE_BASE_URL");

    super({
      ...options,
      baseUrl:
        typeof configuredBaseUrl === "string"
          ? removeTrailingSlashes(configuredBaseUrl)
          : configuredBaseUrl,
      environment: options.environment ?? "https://proofstate.ai",
      username: options.username ?? publicKey,
      password: options.password ?? secretKey,
      xProofStatePublicKey: options.xProofStatePublicKey ?? publicKey,
      xProofStateSdkName: options.xProofStateSdkName ?? "proofstate-javascript",
      xProofStateSdkVersion:
        options.xProofStateSdkVersion ?? PROOFSTATE_SDK_VERSION,
    });
  }
}
