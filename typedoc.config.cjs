/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  entryPoints: [
    "./packages/core",
    "./packages/browser",
    "./packages/client",
    "./packages/langchain",
    "./packages/openai",
    "./packages/otel",
    "./packages/tracing",
    "./packages/vercel-ai-sdk",
  ],
  entryPointStrategy: "packages",
  name: "ProofState JS/TS SDKs",
};
