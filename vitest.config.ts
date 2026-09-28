import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    include: [
      "packages/*/src/**/*.test.ts",
      "packages/*/tests/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "coverage/**",
        "dist/**",
        "packages/*/dist/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/node_modules/**",
      ],
    },
    typecheck: {
      checker: "tsc",
      include: ["**/*.test.ts"],
    },
  },
  resolve: {
    alias: {
      "@proofstate/client": new URL(
        "./packages/client/src/index.ts",
        import.meta.url,
      ).pathname,
      "@proofstate/core": new URL(
        "./packages/core/src/index.ts",
        import.meta.url,
      ).pathname,
      "@proofstate/browser": new URL(
        "./packages/browser/src/index.ts",
        import.meta.url,
      ).pathname,
      "@proofstate/tracing": new URL(
        "./packages/tracing/src/index.ts",
        import.meta.url,
      ).pathname,
      "@proofstate/otel": new URL(
        "./packages/otel/src/index.ts",
        import.meta.url,
      ).pathname,
      "@proofstate/langchain": new URL(
        "./packages/langchain/src/index.ts",
        import.meta.url,
      ).pathname,
      "@proofstate/openai": new URL(
        "./packages/openai/src/index.ts",
        import.meta.url,
      ).pathname,
      "@proofstate/vercel-ai-sdk": new URL(
        "./packages/vercel-ai-sdk/src/index.ts",
        import.meta.url,
      ).pathname,
    },
  },
});
