/**
 * Comprehensive tests for experiment attribute propagation.
 *
 * This test suite verifies that experiment context (experiment ID, dataset info,
 * item metadata) automatically propagates to all child spans within an experiment run.
 */

import { ProofStateClient } from "@proofstate/client";
import {
  ProofStateOtelSpanAttributes,
  PROOFSTATE_SDK_EXPERIMENT_ENVIRONMENT,
} from "@proofstate/core";
import { startObservation, startActiveObservation } from "@proofstate/tracing";
import { trace as otelTrace } from "@opentelemetry/api";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  setupTestEnvironment,
  teardownTestEnvironment,
  waitForSpanExport,
  type TestEnvironment,
} from "./helpers/testSetup.js";

describe("Experiment Attribute Propagation", () => {
  let testEnv: TestEnvironment;
  let proofstate: ProofStateClient;

  beforeEach(async () => {
    testEnv = await setupTestEnvironment();
    proofstate = new ProofStateClient({
      publicKey: "test-pk",
      secretKey: "test-sk",
      baseUrl: "http://localhost:3000",
    });
  });

  afterEach(async () => {
    await teardownTestEnvironment(testEnv);
  });

  describe("Basic Experiment Propagation", () => {
    it("should propagate experiment attributes to child spans", async () => {
      await proofstate.experiment.run({
        name: "test-experiment",
        data: [{ input: "test-input" }],
        task: async ({ input }) => {
          // Create child span
          const child = startObservation("child-operation", { input });
          child.end();
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 2); // root + child
      const spans = testEnv.mockExporter.exportedSpans;

      const rootSpan = spans.find((s) => s.name === "experiment-item-run");
      const childSpan = spans.find((s) => s.name === "child-operation");

      // Root span should have experiment attributes
      expect(
        rootSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_ID],
      ).toBeDefined();
      expect(
        rootSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_NAME],
      ).toBeDefined();
      expect(
        rootSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_ITEM_ID],
      ).toBeDefined();

      // Child span should inherit experiment attributes
      expect(
        childSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_ID],
      ).toBe(rootSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_ID]);
      expect(
        childSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_NAME],
      ).toBe(
        rootSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_NAME],
      );
      expect(
        childSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_ITEM_ID],
      ).toBe(
        rootSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_ITEM_ID],
      );
    });

    it("should propagate experiment metadata to child spans", async () => {
      const experimentMetadata = { model: "gpt-4", temperature: "0.7" };

      await proofstate.experiment.run({
        name: "metadata-test",
        metadata: experimentMetadata,
        data: [{ input: "test" }],
        task: async () => {
          const child = startObservation("child");
          child.end();
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 2);
      const spans = testEnv.mockExporter.exportedSpans;
      const childSpan = spans.find((s) => s.name === "child");

      expect(
        childSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_METADATA],
      ).toBeDefined();
      const metadata = JSON.parse(
        childSpan?.attributes[
          ProofStateOtelSpanAttributes.EXPERIMENT_METADATA
        ] as string,
      );
      expect(metadata).toEqual(experimentMetadata);
    });

    it("should propagate experiment item metadata to child spans", async () => {
      const itemMetadata = { source: "user-input", priority: "high" };

      await proofstate.experiment.run({
        name: "item-metadata-test",
        data: [{ input: "test", metadata: itemMetadata }],
        task: async () => {
          const child = startObservation("child");
          child.end();
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 2);
      const spans = testEnv.mockExporter.exportedSpans;
      const childSpan = spans.find((s) => s.name === "child");

      expect(
        childSpan?.attributes[
          ProofStateOtelSpanAttributes.EXPERIMENT_ITEM_METADATA
        ],
      ).toBeDefined();
      const metadata = JSON.parse(
        childSpan?.attributes[
          ProofStateOtelSpanAttributes.EXPERIMENT_ITEM_METADATA
        ] as string,
      );
      expect(metadata).toEqual(itemMetadata);
    });

    it("should preserve run metadata over conflicting item metadata", async () => {
      await proofstate.experiment.run({
        name: "metadata-precedence-test",
        runName: "run-name",
        metadata: { shared: "run" },
        data: [
          {
            input: "test",
            metadata: {
              shared: "item",
              itemOnly: "item",
              experiment_run_name: "item-run-name",
            },
          },
        ],
        task: async () => "output",
      });

      await waitForSpanExport(testEnv.mockExporter, 1);
      const rootSpan = testEnv.mockExporter.exportedSpans.find(
        (span) => span.name === "experiment-item-run",
      );

      expect(
        rootSpan?.attributes[
          `${ProofStateOtelSpanAttributes.OBSERVATION_METADATA}.shared`
        ],
      ).toBe("run");
      expect(
        rootSpan?.attributes[
          `${ProofStateOtelSpanAttributes.OBSERVATION_METADATA}.experiment_run_name`
        ],
      ).toBe("run-name");
      expect(
        rootSpan?.attributes[
          `${ProofStateOtelSpanAttributes.OBSERVATION_METADATA}.itemOnly`
        ],
      ).toBe("item");
    });
  });

  describe("Nested Spans", () => {
    it("should propagate to multiple levels of nested child spans", async () => {
      await proofstate.experiment.run({
        name: "nested-test",
        data: [{ input: "test" }],
        task: async () => {
          await startActiveObservation("level-1", async () => {
            await startActiveObservation("level-2", async () => {
              const level3 = startObservation("level-3");
              level3.end();
            });
          });
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 4); // root + 3 children
      const spans = testEnv.mockExporter.exportedSpans;

      const rootSpan = spans.find((s) => s.name === "experiment-item-run");
      const experimentId =
        rootSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_ID];

      // All nested spans should have the same experiment ID
      const level1 = spans.find((s) => s.name === "level-1");
      const level2 = spans.find((s) => s.name === "level-2");
      const level3 = spans.find((s) => s.name === "level-3");

      expect(
        level1?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_ID],
      ).toBe(experimentId);
      expect(
        level2?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_ID],
      ).toBe(experimentId);
      expect(
        level3?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_ID],
      ).toBe(experimentId);
    });
  });

  describe("Non-Propagated Attributes", () => {
    it("should set description only on root span, not child spans", async () => {
      const description = "Test experiment description";

      await proofstate.experiment.run({
        name: "description-test",
        description,
        data: [{ input: "test" }],
        task: async () => {
          const child = startObservation("child");
          child.end();
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 2);
      const spans = testEnv.mockExporter.exportedSpans;

      const rootSpan = spans.find((s) => s.name === "experiment-item-run");
      const childSpan = spans.find((s) => s.name === "child");

      // Root span should have description
      expect(
        rootSpan?.attributes[
          ProofStateOtelSpanAttributes.EXPERIMENT_DESCRIPTION
        ],
      ).toBe(description);

      // Child span should NOT have description
      expect(
        childSpan?.attributes[
          ProofStateOtelSpanAttributes.EXPERIMENT_DESCRIPTION
        ],
      ).toBeUndefined();
    });

    it("should set expectedOutput only on root span, not child spans", async () => {
      await proofstate.experiment.run({
        name: "expected-output-test",
        data: [{ input: "France", expectedOutput: "Paris" }],
        task: async () => {
          const child = startObservation("child");
          child.end();
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 2);
      const spans = testEnv.mockExporter.exportedSpans;

      const rootSpan = spans.find((s) => s.name === "experiment-item-run");
      const childSpan = spans.find((s) => s.name === "child");

      // Root span should have expected output
      // serializeValue passes strings through unchanged for efficiency
      expect(
        rootSpan?.attributes[
          ProofStateOtelSpanAttributes.EXPERIMENT_ITEM_EXPECTED_OUTPUT
        ],
      ).toBe("Paris");

      // Child span should NOT have expected output
      expect(
        childSpan?.attributes[
          ProofStateOtelSpanAttributes.EXPERIMENT_ITEM_EXPECTED_OUTPUT
        ],
      ).toBeUndefined();
    });
  });

  describe("Multiple Experiment Items", () => {
    it("should share experiment ID across local items while keeping item IDs distinct", async () => {
      const items = [
        { input: "item1", metadata: { index: "1" } },
        { input: "item2", metadata: { index: "2" } },
      ];

      const experimentIds: string[] = [];
      const itemIds: string[] = [];

      const result = await proofstate.experiment.run({
        name: "no-leakage-test",
        data: items,
        task: async (item) => {
          await startActiveObservation("process-item", async (span) => {
            experimentIds.push(
              span.otelSpan.attributes[
                ProofStateOtelSpanAttributes.EXPERIMENT_ID
              ] as string,
            );
            itemIds.push(
              span.otelSpan.attributes[
                ProofStateOtelSpanAttributes.EXPERIMENT_ITEM_ID
              ] as string,
            );
          });
          return `output-${item.input}`;
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 4); // 2 roots + 2 children

      // Each item should have different item IDs
      expect(itemIds[0]).not.toBe(itemIds[1]);

      // All local items should share the same experiment ID
      expect(experimentIds[0]).toBe(experimentIds[1]);
      expect(result.experimentId).toBe(experimentIds[0]);
    });
  });

  describe("Experiment ID Generation", () => {
    it("should generate experiment item ID from input hash for non-dataset items", async () => {
      const input = "test-input-for-hashing";

      await proofstate.experiment.run({
        name: "id-generation-test",
        data: [{ input }],
        task: async () => {
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 1);
      const spans = testEnv.mockExporter.exportedSpans;
      const rootSpan = spans[0];

      const experimentItemId =
        rootSpan.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_ITEM_ID];

      // Should be 16 hex characters (8 bytes)
      expect(experimentItemId).toMatch(/^[0-9a-f]{16}$/);
    });

    it("should use dataset item ID when available", async () => {
      const datasetItemId = "dataset-item-123";

      await proofstate.experiment.run({
        name: "dataset-id-test",
        data: [
          {
            input: "test",
            id: datasetItemId,
            datasetId: "dataset-123",
          } as any,
        ],
        task: async () => {
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 1);
      const spans = testEnv.mockExporter.exportedSpans;
      const rootSpan = spans[0];

      const experimentItemId =
        rootSpan.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_ITEM_ID];

      // Should use the dataset item ID directly
      expect(experimentItemId).toBe(datasetItemId);
    });
  });

  describe("Root Observation ID Propagation", () => {
    it("should propagate the root observation ID to child spans", async () => {
      let rootObservationId: string | undefined;

      await proofstate.experiment.run({
        name: "root-id-test",
        data: [{ input: "test" }],
        task: async () => {
          await startActiveObservation("child", async (span) => {
            rootObservationId = span.otelSpan.attributes[
              ProofStateOtelSpanAttributes.EXPERIMENT_ITEM_ROOT_OBSERVATION_ID
            ] as string;
          });
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 2);
      const spans = testEnv.mockExporter.exportedSpans;

      const rootSpan = spans.find((s) => s.name === "experiment-item-run");

      // Root observation ID should match the root span's ID
      expect(rootObservationId).toBe(rootSpan?.spanContext().spanId);
    });
  });

  describe("Error Handling", () => {
    it("should propagate attributes even when task throws error", async () => {
      try {
        await proofstate.experiment.run({
          name: "error-test",
          data: [{ input: "test" }],
          task: async () => {
            const child = startObservation("child-before-error");
            child.end();

            throw new Error("Task failed");
          },
        });
      } catch {
        // Expected error
      }

      await waitForSpanExport(testEnv.mockExporter, 2);
      const spans = testEnv.mockExporter.exportedSpans;

      const childSpan = spans.find((s) => s.name === "child-before-error");

      // Child span should still have experiment attributes
      expect(
        childSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_ID],
      ).toBeDefined();
      expect(
        childSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_NAME],
      ).toBeDefined();
    });
  });

  describe("Concurrent Experiments", () => {
    it("should not mix attributes between concurrent experiments", async () => {
      const experiment1Promise = proofstate.experiment.run({
        name: "concurrent-exp-1",
        data: [{ input: "input1" }],
        task: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          const child = startObservation("child-exp1");
          child.end();
          return "output1";
        },
      });

      const experiment2Promise = proofstate.experiment.run({
        name: "concurrent-exp-2",
        data: [{ input: "input2" }],
        task: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          const child = startObservation("child-exp2");
          child.end();
          return "output2";
        },
      });

      await Promise.all([experiment1Promise, experiment2Promise]);

      await waitForSpanExport(testEnv.mockExporter, 4); // 2 roots + 2 children
      const spans = testEnv.mockExporter.exportedSpans;

      const child1 = spans.find((s) => s.name === "child-exp1");
      const child2 = spans.find((s) => s.name === "child-exp2");

      const exp1Name =
        child1?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_NAME];
      const exp2Name =
        child2?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_NAME];

      // Each child should have the correct experiment name
      expect(exp1Name).toContain("concurrent-exp-1");
      expect(exp2Name).toContain("concurrent-exp-2");
      expect(exp1Name).not.toBe(exp2Name);
    });
  });

  describe("Serialization", () => {
    it("should serialize complex metadata correctly", async () => {
      const complexMetadata = {
        nested: { key: "value" },
        array: [1, 2, 3],
        boolean: true,
        number: 42,
      };

      await proofstate.experiment.run({
        name: "serialization-test",
        metadata: complexMetadata,
        data: [{ input: "test" }],
        task: async () => {
          const child = startObservation("child");
          child.end();
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 2);
      const spans = testEnv.mockExporter.exportedSpans;
      const childSpan = spans.find((s) => s.name === "child");

      const metadataAttr =
        childSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_METADATA];
      expect(metadataAttr).toBeDefined();

      const parsed = JSON.parse(metadataAttr as string);
      expect(parsed).toEqual(complexMetadata);
    });

    it("should handle string metadata without double serialization", async () => {
      const stringMetadata = '{"already":"serialized"}';

      await proofstate.experiment.run({
        name: "string-metadata-test",
        metadata: stringMetadata as any,
        data: [{ input: "test" }],
        task: async () => {
          const child = startObservation("child");
          child.end();
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 2);
      const spans = testEnv.mockExporter.exportedSpans;
      const childSpan = spans.find((s) => s.name === "child");

      const metadataAttr =
        childSpan?.attributes[ProofStateOtelSpanAttributes.EXPERIMENT_METADATA];

      // Should not be double-serialized
      expect(metadataAttr).toBe(stringMetadata);
    });
  });

  describe("Environment Attribute", () => {
    it("should set experiment environment on ALL spans including root", async () => {
      await proofstate.experiment.run({
        name: "environment-test",
        data: [{ input: "test" }],
        task: async () => {
          await startActiveObservation("level-1", async () => {
            await startActiveObservation("level-2", async () => {
              const level3 = startObservation("level-3");
              level3.end();
            });
          });
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 4); // root + 3 children
      const spans = testEnv.mockExporter.exportedSpans;

      const rootSpan = spans.find((s) => s.name === "experiment-item-run");
      const level1 = spans.find((s) => s.name === "level-1");
      const level2 = spans.find((s) => s.name === "level-2");
      const level3 = spans.find((s) => s.name === "level-3");

      // ALL spans should have the experiment environment attribute
      expect(
        rootSpan?.attributes[ProofStateOtelSpanAttributes.ENVIRONMENT],
      ).toBe(PROOFSTATE_SDK_EXPERIMENT_ENVIRONMENT);
      expect(level1?.attributes[ProofStateOtelSpanAttributes.ENVIRONMENT]).toBe(
        PROOFSTATE_SDK_EXPERIMENT_ENVIRONMENT,
      );
      expect(level2?.attributes[ProofStateOtelSpanAttributes.ENVIRONMENT]).toBe(
        PROOFSTATE_SDK_EXPERIMENT_ENVIRONMENT,
      );
      expect(level3?.attributes[ProofStateOtelSpanAttributes.ENVIRONMENT]).toBe(
        PROOFSTATE_SDK_EXPERIMENT_ENVIRONMENT,
      );
    });

    it("should set experiment environment value to 'sdk-experiment'", async () => {
      await proofstate.experiment.run({
        name: "environment-value-test",
        data: [{ input: "test" }],
        task: async () => {
          const child = startObservation("child");
          child.end();
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 2);
      const spans = testEnv.mockExporter.exportedSpans;
      const childSpan = spans.find((s) => s.name === "child");

      // Verify the exact value
      expect(
        childSpan?.attributes[ProofStateOtelSpanAttributes.ENVIRONMENT],
      ).toBe("sdk-experiment");
    });
  });

  describe("Dataset Attributes", () => {
    it("should propagate dataset ID when using dataset items", async () => {
      const datasetId = "dataset-abc-123";

      await proofstate.experiment.run({
        name: "dataset-test",
        data: [
          {
            input: "test",
            id: "item-1",
            datasetId,
          } as any,
        ],
        task: async () => {
          const child = startObservation("child");
          child.end();
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 2);
      const spans = testEnv.mockExporter.exportedSpans;
      const childSpan = spans.find((s) => s.name === "child");

      expect(
        childSpan?.attributes[
          ProofStateOtelSpanAttributes.EXPERIMENT_DATASET_ID
        ],
      ).toBe(datasetId);
    });

    it("should not have dataset ID for non-dataset experiments", async () => {
      await proofstate.experiment.run({
        name: "non-dataset-test",
        data: [{ input: "test" }],
        task: async () => {
          const child = startObservation("child");
          child.end();
          return "output";
        },
      });

      await waitForSpanExport(testEnv.mockExporter, 2);
      const spans = testEnv.mockExporter.exportedSpans;
      const childSpan = spans.find((s) => s.name === "child");

      expect(
        childSpan?.attributes[
          ProofStateOtelSpanAttributes.EXPERIMENT_DATASET_ID
        ],
      ).toBeUndefined();
    });
  });
});
